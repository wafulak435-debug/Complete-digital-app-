// Supabase Edge Function: paystack-webhook
// Deploy: supabase functions deploy paystack-webhook
// Config sets verify_jwt = false because Paystack delivers HMAC-signed webhooks without user JWTs.
// Set Secret: supabase secrets set PAYSTACK_SECRET_KEY=sk_live_...

import { withSupabase } from "npm:@supabase/server@1";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function verifyPaystackSignature(
  rawBody: string,
  signatureHeader: string,
  secretKey: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const computedHex = toHex(signatureBuffer).toLowerCase();
  return timingSafeEqualHex(computedHex, signatureHeader.trim().toLowerCase());
}

export default {
  fetch: withSupabase(
    {
      auth: "none",
      cors: "disabled",
    },
    async (req: Request, ctx) => {
      if (req.method !== "POST") {
        return Response.json({ error: "Method not allowed" }, { status: 405 });
      }

      try {
        const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";
        if (!paystackSecretKey) {
          return Response.json(
            { error: "Missing Paystack secret configuration." },
            { status: 500 }
          );
        }

        const signature = req.headers.get("x-paystack-signature") || "";
        const rawBody = await req.text();

        if (!signature) {
          return Response.json({ error: "Missing x-paystack-signature header" }, { status: 401 });
        }

        const isValid = await verifyPaystackSignature(rawBody, signature, paystackSecretKey);
        if (!isValid) {
          return Response.json({ error: "Invalid Paystack webhook signature" }, { status: 401 });
        }

        const event = JSON.parse(rawBody);

        if (event?.event === "charge.success" && event?.data?.status === "success") {
          const txData = event.data;
          const reference = String(txData.reference || "");
          const amountSubunit = Number(txData.amount || 0);
          const amountKes = amountSubunit / 100;
          const currency = String(txData.currency || "KES").toUpperCase();
          const customerEmail = String(txData.customer?.email || "").toLowerCase().trim();
          const metadata = txData.metadata || {};
          const metadataUserId = metadata.user_id ? String(metadata.user_id) : null;
          const planId = String(metadata.plan_id || (amountKes >= 1500 ? "pro" : "starter"));
          const planName = String(
            metadata.plan_name || (amountKes >= 1500 ? "Pro Plan" : amountKes >= 500 ? "Starter Plan" : "Credits Top-Up")
          );
          const creditsToAdd = Number(
            metadata.credits || (amountKes >= 1500 ? 2000 : amountKes >= 500 ? 500 : 200)
          );
          const channel = String(txData.channel || "mobile_money");

          const supabaseAdmin = ctx.supabaseAdmin;

          // Idempotency check so duplicate webhook retries do not double-credit the user
          if (reference) {
            const { data: existingTx } = await supabaseAdmin
              .from("payment_transactions")
              .select("id")
              .eq("reference", reference)
              .maybeSingle();

            if (existingTx) {
              return Response.json({ received: true, duplicate: true }, { status: 200 });
            }
          }

          // Locate user profile by metadata.user_id or customer email
          let profileQuery = supabaseAdmin.from("profiles").select("id, email, credits");
          profileQuery = metadataUserId
            ? profileQuery.eq("id", metadataUserId)
            : profileQuery.eq("email", customerEmail);

          const { data: profileRow, error: profileErr } = await profileQuery.maybeSingle();

          if (profileErr) {
            console.error("Profile lookup failed:", profileErr.message);
          }

          if (profileRow) {
            const nextCredits = Number(profileRow.credits || 0) + creditsToAdd;
            const { error: updateErr } = await supabaseAdmin
              .from("profiles")
              .update({
                subscription_status: "active",
                plan_name: planName,
                credits: nextCredits,
              })
              .eq("id", profileRow.id);

            if (updateErr) {
              console.error("Failed updating profile subscription:", updateErr.message);
            }
          }

          // Record transaction audit log
          if (reference) {
            await supabaseAdmin.from("payment_transactions").insert({
              user_id: profileRow?.id || metadataUserId,
              email: customerEmail || profileRow?.email || "unknown@customer",
              reference,
              amount_kes: currency === "KES" ? amountKes : amountKes,
              plan_id: planId,
              credits_added: creditsToAdd,
              channel,
              status: "success",
              raw_payload: txData,
            });
          }
        }

        return Response.json({ received: true }, { status: 200 });
      } catch (err: any) {
        console.error("paystack-webhook error:", err);
        return Response.json({ error: err?.message || "Webhook processing error" }, { status: 500 });
      }
    }
  ),
};
