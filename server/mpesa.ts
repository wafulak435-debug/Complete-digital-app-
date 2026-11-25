import { Request, Response, Router } from "express";
import crypto from "crypto";
import {
  AuthenticatedRequest,
  hasCapability,
  persistSecurityState,
  recordAuditLog,
  requireAuth,
  requireManagerAccess,
  securityState,
  MpesaTransactionRecord,
} from "./security";

// ============================================================================
// SAFARICOM DARAJA ENVIRONMENT CONFIGURATION
// ============================================================================

export type DarajaEnvironment = "sandbox" | "production";
export type DarajaShortcodeType = "paybill" | "till";

export interface MpesaRuntimeConfig {
  environment: DarajaEnvironment;
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  shortcode: string;
  shortcodeType: DarajaShortcodeType;
  storeNumber?: string;
  callbackUrl: string;
  isLiveConfigured: boolean;
}

const SANDBOX_BASE_URL = "https://sandbox.safaricom.co.ke";
const PRODUCTION_BASE_URL = "https://api.safaricom.co.ke";

// Fallback Sandbox test credentials (standard Safaricom Daraja public sandbox testbed)
const DEFAULT_SANDBOX_SHORTCODE = "174379";
const DEFAULT_SANDBOX_PASSKEY = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";

export function getMpesaConfig(): MpesaRuntimeConfig {
  const isTestMode = process.env.ZION_TEST_MODE === "1";
  const envVar = isTestMode ? "sandbox" : (process.env.MPESA_ENV || "sandbox").toLowerCase().trim();
  const environment: DarajaEnvironment = envVar === "production" ? "production" : "sandbox";

  const consumerKey = isTestMode ? "" : (process.env.MPESA_CONSUMER_KEY || "").trim();
  const consumerSecret = isTestMode ? "" : (process.env.MPESA_CONSUMER_SECRET || "").trim();
  const passkey = isTestMode ? "" : (process.env.MPESA_PASSKEY || "").trim();
  const shortcode = isTestMode ? "" : (process.env.MPESA_SHORTCODE || "").trim();
  const shortcodeType: DarajaShortcodeType =
    (process.env.MPESA_SHORTCODE_TYPE || "").toLowerCase().trim() === "till" ? "till" : "paybill";
  const storeNumber = (process.env.MPESA_STORE_NUMBER || "").trim() || undefined;

  const callbackUrl = (
    process.env.MPESA_CALLBACK_URL ||
    "https://ais-pre-d5s23qoulieuk3cgfupt2h-871905850700.europe-west2.run.app/api/mpesa/callback"
  ).trim();

  const isLiveConfigured = Boolean(
    !isTestMode && environment === "production" && consumerKey && consumerSecret && passkey && shortcode
  );

  return {
    environment,
    consumerKey,
    consumerSecret,
    passkey,
    shortcode,
    shortcodeType,
    storeNumber,
    callbackUrl,
    isLiveConfigured,
  };
}

// Token cache for Daraja OAuth
interface CachedToken {
  token: string;
  expiresAt: number;
}
let tokenCache: Record<DarajaEnvironment, CachedToken | null> = {
  sandbox: null,
  production: null,
};

/**
 * Normalizes any Kenyan phone format (07..., 01..., +254..., 254...) into 2547XXXXXXXX / 2541XXXXXXXX
 */
export function normalizeKenyanPhoneNumber(rawPhone: string): string | null {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("254") && digits.length === 12) {
    return digits;
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `254${digits.slice(1)}`;
  }
  if (digits.length === 9 && (digits.startsWith("7") || digits.startsWith("1"))) {
    return `254${digits}`;
  }
  return null;
}

/**
 * Generates Daraja timestamp in YYYYMMDDHHmmss format (EAT UTC+3 aligned)
 */
export function getDarajaTimestamp(): string {
  const now = new Date();
  // Align to East Africa Time (UTC+3)
  const eatOffsetMs = 3 * 60 * 60 * 1000;
  const eatDate = new Date(now.getTime() + eatOffsetMs);

  const Y = eatDate.getUTCFullYear();
  const M = String(eatDate.getUTCMonth() + 1).padStart(2, "0");
  const D = String(eatDate.getUTCDate()).padStart(2, "0");
  const h = String(eatDate.getUTCHours()).padStart(2, "0");
  const m = String(eatDate.getUTCMinutes()).padStart(2, "0");
  const s = String(eatDate.getUTCSeconds()).padStart(2, "0");

  return `${Y}${M}${D}${h}${m}${s}`;
}

/**
 * Obtains a valid Daraja OAuth 2.0 Access Token
 */
export async function getDarajaAccessToken(config: MpesaRuntimeConfig): Promise<string> {
  const env = config.environment;
  const cached = tokenCache[env];
  const now = Date.now();

  if (cached && cached.expiresAt > now + 60_000) {
    return cached.token;
  }

  // Refuse live production requests if credentials are not configured in Secret Manager / process.env
  if (env === "production" && (!config.consumerKey || !config.consumerSecret)) {
    throw new Error(
      "M-PESA Production credentials are missing. Configure MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET in environment secrets."
    );
  }

  // In sandbox, fallback to test keys if not explicitly provided
  const key = config.consumerKey || "dummy_sandbox_key";
  const secret = config.consumerSecret || "dummy_sandbox_secret";

  const baseUrl = env === "production" ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL;
  const authUrl = `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
  const basicAuth = Buffer.from(`${key}:${secret}`).toString("base64");

  try {
    const response = await fetch(authUrl, {
      method: "GET",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Safaricom OAuth error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: string | number };
    const expiresInSec = Number(data.expires_in) || 3599;

    tokenCache[env] = {
      token: data.access_token,
      expiresAt: now + expiresInSec * 1000,
    };

    return data.access_token;
  } catch (err: any) {
    // If running in sandbox and network fails, generate a sandbox test token so developer testing doesn't break
    if (env === "sandbox") {
      console.warn("Using local sandbox fallback token:", err.message);
      const fallbackToken = `sb_token_${crypto.randomBytes(16).toString("hex")}`;
      tokenCache.sandbox = {
        token: fallbackToken,
        expiresAt: now + 3600_000,
      };
      return fallbackToken;
    }
    throw err;
  }
}

/**
 * Resolves authoritative price on the server side to prevent price tampering
 */
function resolveAuthoritativeAmount(purpose: string, targetId: string): { amount: number; title: string } {
  if (purpose === "book") {
    const book = securityState.books[targetId];
    if (book) {
      return { amount: Math.max(1, book.price), title: book.title };
    }
    // Default catalog prices if not found in custom server books
    const catalogPrices: Record<string, { price: number; title: string }> = {
      "1": { price: 350, title: "Rising Beyond Limitations" },
      "2": { price: 400, title: "Children are Parents' Investment" },
      "3": { price: 450, title: "Keys of Strategic Leadership" },
      "4": { price: 500, title: "The Biblical Foundations of Faith" },
    };
    if (catalogPrices[targetId]) {
      return { amount: catalogPrices[targetId].price, title: catalogPrices[targetId].title };
    }
    return { amount: 350, title: "Zion Digital Publication" };
  }

  if (purpose === "course") {
    const enrollment = securityState.enrollments[targetId];
    if (enrollment && enrollment.courseFee > 0) {
      return { amount: enrollment.courseFee, title: `Tuition: ${enrollment.courseTopic}` };
    }
    return { amount: 1500, title: "Leadership & Bible Course Tuition" };
  }

  if (purpose === "fee") {
    const fee = securityState.feePayments[targetId];
    if (fee && fee.amount > 0) {
      return { amount: fee.amount, title: `${fee.planName} Fee` };
    }
    return { amount: 500, title: "Institutional Fee" };
  }

  if (purpose === "subscription") {
    const planPrices: Record<string, { price: number; title: string }> = {
      topup: { price: 250, title: "Credit Top-Up (200 AI Credits)" },
      starter: { price: 500, title: "Starter Scholar Plan (KES 500)" },
      pro: { price: 1500, title: "Executive Ministry Pro (KES 1,500)" },
      unlimited: { price: 3000, title: "Institutional Unlimited (KES 3,000)" },
    };
    if (planPrices[targetId]) {
      return { amount: planPrices[targetId].price, title: planPrices[targetId].title };
    }
    return { amount: 500, title: "Zion Study Subscription" };
  }

  return { amount: 200, title: "Zion Digital Service" };
}

// In-memory rate limiting map for STK Push requests per phone number
const phonePushThrottle = new Map<string, number>();

// ============================================================================
// ROUTER & ENDPOINTS
// ============================================================================

export const mpesaRouter = Router();

/**
 * GET /api/mpesa/config
 * Publicly discloses current M-PESA configuration status (masked for security)
 */
mpesaRouter.get("/config", (_req: Request, res: Response) => {
  const config = getMpesaConfig();
  return res.json({
    success: true,
    environment: config.environment,
    shortcode: config.shortcode || (config.environment === "sandbox" ? DEFAULT_SANDBOX_SHORTCODE : "Not configured"),
    shortcodeType: config.shortcodeType,
    hasStoreNumber: Boolean(config.storeNumber),
    callbackUrl: config.callbackUrl,
    isLiveConfigured: config.isLiveConfigured,
    consumerKeyStatus: config.consumerKey ? "Configured" : "Not set",
    passkeyStatus: config.passkey ? "Configured" : "Not set",
  });
});

/**
 * POST /api/mpesa/stkpush
 * Initiates an authoritative STK Push to the customer's phone
 */
mpesaRouter.post("/stkpush", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.identity!;
    const { phoneNumber, purpose, targetId, customAccountRef } = req.body || {};

    if (!phoneNumber || !purpose || !targetId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: phoneNumber, purpose, and targetId are mandatory.",
      });
    }

    if (!["book", "course", "fee", "subscription"].includes(purpose)) {
      return res.status(400).json({ success: false, error: "Invalid payment purpose." });
    }

    const normalizedPhone = normalizeKenyanPhoneNumber(String(phoneNumber));
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        error: "Invalid Kenyan phone number. Please enter a valid Safaricom number (e.g., 0712345678 or 0114684132).",
      });
    }

    // Rate-limiting: prevent spamming STK pushes to the same phone within 30 seconds
    const lastPush = phonePushThrottle.get(normalizedPhone) || 0;
    const now = Date.now();
    if (now - lastPush < 30_000) {
      const waitSec = Math.ceil((30_000 - (now - lastPush)) / 1000);
      return res.status(429).json({
        success: false,
        error: `Please wait ${waitSec}s before requesting another STK Push to this phone number.`,
      });
    }
    phonePushThrottle.set(normalizedPhone, now);

    const config = getMpesaConfig();
    const isProd = config.environment === "production";

    // Enforce production key presence when in production mode
    if (isProd && (!config.consumerKey || !config.passkey || !config.shortcode)) {
      return res.status(503).json({
        success: false,
        error:
          "M-PESA Production credentials are not fully configured in Google Cloud Secret Manager. Live transactions cannot proceed until approved credentials are set.",
      });
    }

    // Authoritative pricing from server records
    const { amount, title } = resolveAuthoritativeAmount(purpose, String(targetId));

    // Active shortcode & passkey resolution
    const activeShortcode = isProd ? config.shortcode : config.shortcode || DEFAULT_SANDBOX_SHORTCODE;
    const activePasskey = isProd ? config.passkey : config.passkey || DEFAULT_SANDBOX_PASSKEY;

    // Account reference formulation
    let accountRef = (customAccountRef || `ZD-${targetId}`).slice(0, 12).replace(/[^a-zA-Z0-9_-]/g, "");
    if (!accountRef) accountRef = "ZIONDIGITAL";

    const timestamp = getDarajaTimestamp();
    const rawPass = `${activeShortcode}${activePasskey}${timestamp}`;
    const password = Buffer.from(rawPass).toString("base64");

    // Paybill vs Buy Goods Till handling
    const transactionType =
      config.shortcodeType === "till" ? "CustomerBuyGoodsOnline" : "CustomerPayBillOnline";
    const partyB = activeShortcode;

    // Generate unique internal transaction record ID
    const txId = `mp_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const baseUrl = isProd ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL;
    const stkUrl = `${baseUrl}/mpesa/stkpush/v1/processrequest`;

    let checkoutRequestId = "";
    let merchantRequestId = "";
    let customerMessage = "";

    try {
      const accessToken = await getDarajaAccessToken(config);

      const stkPayload = {
        BusinessShortCode: activeShortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: transactionType,
        Amount: amount,
        PartyA: normalizedPhone,
        PartyB: partyB,
        PhoneNumber: normalizedPhone,
        CallBackURL: config.callbackUrl,
        AccountReference: accountRef,
        TransactionDesc: title.slice(0, 20),
      };

      const stkRes = await fetch(stkUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stkPayload),
      });

      const responseBody = await stkRes.json();

      if (responseBody.ResponseCode === "0") {
        checkoutRequestId = responseBody.CheckoutRequestID;
        merchantRequestId = responseBody.MerchantRequestID;
        customerMessage = responseBody.CustomerMessage || "STK Push sent to phone.";
      } else {
        const errMsg = responseBody.errorMessage || responseBody.ResponseDescription || "STK Push rejected by Daraja";
        throw new Error(errMsg);
      }
    } catch (apiErr: any) {
      if (!isProd) {
        // In sandbox / development simulation fallback
        console.warn("Daraja Sandbox endpoint fallback:", apiErr.message);
        checkoutRequestId = `ws_CO_${Date.now().toString().slice(4, 12)}`;
        merchantRequestId = `MR_${Date.now().toString().slice(6, 12)}`;
        customerMessage = "Success. Request accepted for processing (Sandbox Mode).";
      } else {
        recordAuditLog({
          actor: actor || { uid: "guest", email: "guest@zion", name: "Guest", role: "member", isMainAdmin: false, isSuspended: false, capabilities: {} as any, authorizedCourses: [], authSource: "zion_session" },
          category: "PAYMENT_CONFIRMATION",
          action: "MPESA_STK_PUSH_FAILED",
          targetType: "mpesa_stk",
          targetId: txId,
          details: `STK push to ${normalizedPhone} for KES ${amount} failed: ${apiErr.message}`,
          ip: req.ip,
        });
        return res.status(502).json({
          success: false,
          error: `Daraja API Gateway Error: ${apiErr.message}`,
        });
      }
    }

    // Persist pending transaction
    const txRecord: MpesaTransactionRecord = {
      id: txId,
      checkoutRequestId,
      merchantRequestId,
      userId: actor?.uid,
      userEmail: actor?.email || "guest@zion.ke",
      userName: actor?.name || "Customer",
      phoneNumber: normalizedPhone,
      amount,
      currency: "KES",
      purpose: purpose as any,
      targetId: String(targetId),
      targetTitle: title,
      accountReference: accountRef,
      status: "pending",
      environment: config.environment,
      shortcode: activeShortcode,
      shortcodeType: config.shortcodeType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    securityState.mpesaTransactions[checkoutRequestId] = txRecord;
    persistSecurityState();

    recordAuditLog({
      actor: actor || { uid: "guest", email: "guest@zion", name: "Guest", role: "member", isMainAdmin: false, isSuspended: false, capabilities: {} as any, authorizedCourses: [], authSource: "zion_session" },
      category: "PAYMENT_INITIATION",
      action: "MPESA_STK_PUSH_DISPATCHED",
      targetType: "mpesa_transaction",
      targetId: txId,
      details: `Dispatched STK Push for KES ${amount} to ${normalizedPhone} (${title}) [${config.environment.toUpperCase()}]`,
      ip: req.ip,
    });

    return res.status(200).json({
      success: true,
      transactionId: txId,
      checkoutRequestId,
      merchantRequestId,
      amount,
      phoneNumber: normalizedPhone,
      accountReference: accountRef,
      customerMessage,
      environment: config.environment,
    });
  } catch (err: any) {
    console.error("STK Push handler error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error while processing M-PESA STK Push.",
    });
  }
});

/**
 * POST /api/mpesa/callback
 * Secure HTTPS webhook receiver called by Safaricom Daraja upon PIN completion
 */
mpesaRouter.post("/callback", (req: Request, res: Response) => {
  // Safaricom expects instant HTTP 200 acknowledgment with ResultCode: 0
  res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });

  try {
    const callbackData = req.body?.Body?.stkCallback;
    if (!callbackData) {
      console.warn("Received malformed M-Pesa callback:", JSON.stringify(req.body));
      return;
    }

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callbackData;

    const tx = securityState.mpesaTransactions[CheckoutRequestID];
    if (!tx) {
      console.warn(`Callback received for untracked CheckoutRequestID: ${CheckoutRequestID}`);
      return;
    }

    const now = new Date().toISOString();
    tx.resultCode = ResultCode;
    tx.resultDesc = ResultDesc;
    tx.rawCallback = callbackData;
    tx.updatedAt = now;

    if (ResultCode === 0) {
      // Transaction was successful! Parse metadata items
      let mpesaReceiptNumber = "";
      let paidAmount = tx.amount;
      let transactionDate = "";
      let phone = tx.phoneNumber;

      if (Array.isArray(CallbackMetadata?.Item)) {
        for (const item of CallbackMetadata.Item) {
          if (item.Name === "MpesaReceiptNumber") mpesaReceiptNumber = String(item.Value || "");
          if (item.Name === "Amount") paidAmount = Number(item.Value) || tx.amount;
          if (item.Name === "TransactionDate") transactionDate = String(item.Value || "");
          if (item.Name === "PhoneNumber") phone = String(item.Value || tx.phoneNumber);
        }
      }

      if (!mpesaReceiptNumber) {
        mpesaReceiptNumber = `ZD${Date.now().toString().slice(-8).toUpperCase()}`;
      }

      // STRICT IDEMPOTENCY CHECK: Protect against duplicate callbacks & replay attacks
      if (securityState.processedReceipts[mpesaReceiptNumber]) {
        console.warn(`Duplicate M-Pesa receipt callback ignored: ${mpesaReceiptNumber}`);
        return;
      }

      tx.status = "completed";
      tx.mpesaReceiptNumber = mpesaReceiptNumber;
      tx.transactionDate = transactionDate || now;
      tx.amount = paidAmount;
      tx.phoneNumber = phone;

      // Register receipt in idempotency ledger
      securityState.processedReceipts[mpesaReceiptNumber] = {
        transactionId: tx.id,
        processedAt: now,
        amount: paidAmount,
        phone,
      };

      // AUTOMATED POST-PAYMENT FULFILLMENT
      fulfillVerifiedPurchase(tx);

      recordAuditLog({
        actor: { uid: tx.userId || "mpesa", email: tx.userEmail, name: tx.userName || "Customer", role: "member", isMainAdmin: false, isSuspended: false, capabilities: {} as any, authorizedCourses: [], authSource: "zion_session" },
        category: "PAYMENT_CONFIRMATION",
        action: "MPESA_PAYMENT_VERIFIED",
        targetType: "mpesa_transaction",
        targetId: tx.id,
        details: `M-PESA receipt ${mpesaReceiptNumber} verified. KES ${paidAmount} credited for ${tx.purpose} (${tx.targetTitle})`,
      });
    } else {
      // Transaction failed or was cancelled by the user
      tx.status = ResultCode === 1032 ? "cancelled" : "failed";

      recordAuditLog({
        actor: { uid: tx.userId || "mpesa", email: tx.userEmail, name: tx.userName || "Customer", role: "member", isMainAdmin: false, isSuspended: false, capabilities: {} as any, authorizedCourses: [], authSource: "zion_session" },
        category: "PAYMENT_CONFIRMATION",
        action: "MPESA_PAYMENT_DECLINED",
        targetType: "mpesa_transaction",
        targetId: tx.id,
        details: `STK transaction failed: [${ResultCode}] ${ResultDesc}`,
      });
    }

    persistSecurityState();
  } catch (err) {
    console.error("Error processing M-Pesa callback:", err);
  }
});

/**
 * Fulfills digital goods, enrolments, or fees upon confirmed payment
 */
function fulfillVerifiedPurchase(tx: MpesaTransactionRecord) {
  const now = new Date().toISOString();

  if (tx.purpose === "book") {
    // 1. Grant book entitlement
    const entitlementKey = `${tx.targetId}:${tx.userEmail.toLowerCase()}`;
    securityState.bookEntitlements[entitlementKey] = {
      bookId: tx.targetId,
      userEmail: tx.userEmail.toLowerCase(),
      orderId: tx.id,
      grantedAt: now,
    };

    // 2. Locate or create confirmed Order record
    const existingOrder = Object.values(securityState.orders).find(
      (o) => o.bookId === tx.targetId && o.userEmail.toLowerCase() === tx.userEmail.toLowerCase()
    );

    if (existingOrder) {
      existingOrder.status = "approved";
      existingOrder.paymentReference = tx.mpesaReceiptNumber;
      existingOrder.verifiedBy = `M-PESA Automated (${tx.environment})`;
      existingOrder.updatedAt = now;
    } else {
      const orderId = `ord_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
      securityState.orders[orderId] = {
        id: orderId,
        userId: tx.userId || "anon",
        userEmail: tx.userEmail.toLowerCase(),
        userName: tx.userName || "Customer",
        bookId: tx.targetId,
        bookTitle: tx.targetTitle || "Zion Digital Publication",
        price: tx.amount,
        status: "approved",
        paymentReference: tx.mpesaReceiptNumber,
        verifiedBy: `M-PESA Automated (${tx.environment})`,
        date: now,
        updatedAt: now,
      };
    }
  } else if (tx.purpose === "course") {
    // Locate student enrollment and mark paid
    const enrollment = Object.values(securityState.enrollments).find(
      (e) =>
        (e.id === tx.targetId || e.courseId === tx.targetId) &&
        e.userEmail.toLowerCase() === tx.userEmail.toLowerCase()
    );

    if (enrollment) {
      enrollment.feeStatus = "paid";
      enrollment.status = "approved";
      enrollment.mpesaTransactionCode = tx.mpesaReceiptNumber;
      enrollment.updatedAt = now;
    }
  } else if (tx.purpose === "fee") {
    const fee = securityState.feePayments[tx.targetId];
    if (fee) {
      fee.status = "confirmed";
      fee.verifiedBy = `M-PESA Automated (${tx.mpesaReceiptNumber})`;
      fee.updatedAt = now;
    }
  } else if (tx.purpose === "subscription") {
    recordAuditLog({
      actor: {
        uid: tx.userId || "mpesa",
        email: tx.userEmail,
        name: tx.userName || "Customer",
        role: "member",
        isMainAdmin: false,
        isSuspended: false,
        capabilities: {} as any,
        authorizedCourses: [],
        authSource: "zion_session",
      },
      category: "PAYMENT_CONFIRMATION",
      action: "MPESA_SUBSCRIPTION_ACTIVATED",
      targetType: "subscription",
      targetId: tx.targetId,
      details: `Subscription ${tx.targetTitle} activated via M-Pesa receipt ${tx.mpesaReceiptNumber || tx.checkoutRequestId}`,
    });
  }
}

/**
 * GET /api/mpesa/query/:checkoutRequestId
 * Polls status of an active STK Push. Performs live Daraja Query if still pending.
 */
mpesaRouter.get("/query/:checkoutRequestId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.identity!;
    const { checkoutRequestId } = req.params;
    const tx = securityState.mpesaTransactions[checkoutRequestId];

    if (!tx) {
      return res.status(404).json({ success: false, error: "Transaction not found." });
    }

    const isFinance = hasCapability(actor, "allowConfirmPayments") || actor.role === "manager" || actor.isMainAdmin;
    const isOwner =
      (tx.userId && tx.userId === actor.uid) ||
      tx.userEmail.toLowerCase() === actor.email.toLowerCase();
    if (!isFinance && !isOwner) {
      return res.status(403).json({ success: false, error: "Not authorized to inspect this transaction." });
    }

    // If transaction already resolved, return final status immediately
    if (tx.status === "completed" || tx.status === "failed" || tx.status === "cancelled") {
      return res.json({
        success: true,
        status: tx.status,
        amount: tx.amount,
        receiptNumber: tx.mpesaReceiptNumber,
        resultDesc: tx.resultDesc,
        transactionDate: tx.transactionDate,
      });
    }

    // If pending for more than 15s, proactively query Daraja STK Query API
    const config = getMpesaConfig();
    const isProd = config.environment === "production";
    const ageSeconds = (Date.now() - new Date(tx.createdAt).getTime()) / 1000;

    if (ageSeconds > 15 && isProd && config.isLiveConfigured) {
      try {
        const accessToken = await getDarajaAccessToken(config);
        const timestamp = getDarajaTimestamp();
        const rawPass = `${config.shortcode}${config.passkey}${timestamp}`;
        const password = Buffer.from(rawPass).toString("base64");

        const queryUrl = `${PRODUCTION_BASE_URL}/mpesa/stkquery/v1/query`;
        const queryRes = await fetch(queryUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            BusinessShortCode: config.shortcode,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestId,
          }),
        });

        const queryBody = await queryRes.json();

        if (queryBody.ResultCode === "0") {
          const nowIso = new Date().toISOString();
          tx.status = "completed";
          tx.resultCode = 0;
          tx.resultDesc = queryBody.ResultDesc || "The service request is processed successfully.";
          tx.mpesaReceiptNumber = tx.mpesaReceiptNumber || checkoutRequestId;
          tx.transactionDate = tx.transactionDate || nowIso;
          tx.updatedAt = nowIso;
          fulfillVerifiedPurchase(tx);
          persistSecurityState();
        } else if (queryBody.ResultCode) {
          tx.status = queryBody.ResultCode === "1032" ? "cancelled" : "failed";
          tx.resultCode = Number(queryBody.ResultCode);
          tx.resultDesc = queryBody.ResultDesc;
          tx.updatedAt = new Date().toISOString();
          persistSecurityState();
        }
      } catch (qErr) {
        console.warn("Daraja live status query check failed:", qErr);
      }
    }

    // Auto-timeout transactions pending for over 2 minutes
    if (ageSeconds > 120 && tx.status === "pending") {
      tx.status = "failed";
      tx.resultDesc = "Payment session timed out awaiting user PIN authorization.";
      tx.updatedAt = new Date().toISOString();
      persistSecurityState();
    }

    return res.json({
      success: true,
      status: tx.status,
      amount: tx.amount,
      receiptNumber: tx.mpesaReceiptNumber,
      resultDesc: tx.resultDesc,
      transactionDate: tx.transactionDate,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: "Failed to query transaction status." });
  }
});

/**
 * GET /api/mpesa/receipts
 * Returns user transaction receipts (or all receipts for finance admins)
 */
mpesaRouter.get("/receipts", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const isFinance = hasCapability(actor, "allowConfirmPayments") || actor.role === "manager" || actor.isMainAdmin;

  const allTx = Object.values(securityState.mpesaTransactions);
  const filtered = allTx
    .filter((t) => isFinance || t.userEmail.toLowerCase() === actor.email.toLowerCase())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({ success: true, receipts: filtered });
});

/**
 * GET /api/mpesa/admin/overview
 * Comprehensive financial dashboard metrics and audit logs for executive admins
 */
mpesaRouter.get("/admin/overview", requireAuth, requireManagerAccess, (req: AuthenticatedRequest, res: Response) => {
  const allTx = Object.values(securityState.mpesaTransactions);

  let totalRevenueKes = 0;
  let completedCount = 0;
  let failedCount = 0;
  let pendingCount = 0;

  const revenueByCategory: Record<string, number> = {
    book: 0,
    course: 0,
    fee: 0,
    subscription: 0,
  };

  const today = new Date().toISOString().split("T")[0];
  let todayRevenueKes = 0;

  for (const t of allTx) {
    if (t.status === "completed") {
      totalRevenueKes += t.amount;
      completedCount++;
      revenueByCategory[t.purpose] = (revenueByCategory[t.purpose] || 0) + t.amount;
      if (t.createdAt.startsWith(today)) {
        todayRevenueKes += t.amount;
      }
    } else if (t.status === "failed" || t.status === "cancelled") {
      failedCount++;
    } else if (t.status === "pending") {
      pendingCount++;
    }
  }

  const config = getMpesaConfig();

  // Audit logs related to payments
  const paymentAuditLogs = securityState.auditLogs
    .filter((log) => log.category === "PAYMENT_CONFIRMATION" || log.category === "PAYMENT_INITIATION")
    .slice(0, 30);

  return res.json({
    success: true,
    metrics: {
      totalRevenueKes,
      todayRevenueKes,
      completedCount,
      failedCount,
      pendingCount,
      revenueByCategory,
    },
    config: {
      environment: config.environment,
      shortcode: config.shortcode || (config.environment === "sandbox" ? DEFAULT_SANDBOX_SHORTCODE : "Not configured"),
      shortcodeType: config.shortcodeType,
      isLiveConfigured: config.isLiveConfigured,
      callbackUrl: config.callbackUrl,
    },
    recentTransactions: allTx
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50),
    auditLogs: paymentAuditLogs,
  });
});

/**
 * POST /api/mpesa/admin/simulate-sandbox-callback
 * Enables developers and managers to test end-to-end receipt generation in sandbox mode
 */
mpesaRouter.post("/admin/simulate-sandbox-callback", requireAuth, requireManagerAccess, (req: AuthenticatedRequest, res: Response) => {
  const { checkoutRequestId, success = true } = req.body || {};
  const tx = securityState.mpesaTransactions[checkoutRequestId];

  if (!tx) {
    return res.status(404).json({ success: false, error: "Transaction not found." });
  }

  const now = new Date().toISOString();

  if (success) {
    const mockReceipt = `ZD${Date.now().toString().slice(-8).toUpperCase()}`;
    tx.status = "completed";
    tx.resultCode = 0;
    tx.resultDesc = "The service request is processed successfully (Sandbox Simulated).";
    tx.mpesaReceiptNumber = mockReceipt;
    tx.transactionDate = now;
    tx.updatedAt = now;

    securityState.processedReceipts[mockReceipt] = {
      transactionId: tx.id,
      processedAt: now,
      amount: tx.amount,
      phone: tx.phoneNumber,
    };

    fulfillVerifiedPurchase(tx);
  } else {
    tx.status = "cancelled";
    tx.resultCode = 1032;
    tx.resultDesc = "Request cancelled by user (Sandbox Simulated).";
    tx.updatedAt = now;
  }

  persistSecurityState();
  return res.json({ success: true, transaction: tx });
});

/**
 * GET /api/mpesa/admin/test-auth
 * Verifies live Daraja OAuth 2.0 token issuance without returning the bearer token
 */
mpesaRouter.get("/admin/test-auth", requireAuth, requireManagerAccess, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const config = getMpesaConfig();
    const token = await getDarajaAccessToken(config);
    return res.json({
      success: Boolean(token),
      environment: config.environment,
      shortcode: config.shortcode || DEFAULT_SANDBOX_SHORTCODE,
      isLiveConfigured: config.isLiveConfigured,
    });
  } catch (err: any) {
    return res.status(502).json({
      success: false,
      error: err?.message || "Failed to authenticate with Safaricom Daraja OAuth gateway.",
    });
  }
});

/**
 * POST /api/mpesa/qrcode
 * Generates a Daraja Dynamic QR payload for PayBill / Buy Goods checkout
 */
mpesaRouter.post("/qrcode", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { purpose, targetId, customAccountRef } = req.body || {};
    if (!["book", "course", "fee", "subscription"].includes(purpose) || !targetId) {
      return res.status(400).json({ success: false, error: "Valid purpose and targetId are required." });
    }

    const config = getMpesaConfig();
    const isProd = config.environment === "production";
    const activeShortcode = isProd ? config.shortcode : config.shortcode || DEFAULT_SANDBOX_SHORTCODE;
    const { amount, title } = resolveAuthoritativeAmount(purpose, String(targetId));
    const refNo = String(customAccountRef || `ZD-${targetId}`).slice(0, 12).replace(/[^a-zA-Z0-9_-]/g, "") || "ZIONDIGITAL";

    if (!isProd) {
      return res.json({
        success: true,
        environment: "sandbox",
        shortcode: activeShortcode,
        amount,
        reference: refNo,
        qrCode: null,
        message: "Dynamic Daraja QR renders live in production mode.",
      });
    }

    const accessToken = await getDarajaAccessToken(config);
    const qrRes = await fetch(`${PRODUCTION_BASE_URL}/mpesa/qrcode/v1/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        MerchantName: "Zion Digital",
        RefNo: refNo,
        Amount: amount,
        TrxCode: config.shortcodeType === "till" ? "BG" : "PB",
        CPI: activeShortcode,
        Size: "300",
      }),
    });

    const qrJson = await qrRes.json().catch(() => ({}));
    if (!qrRes.ok || !qrJson?.QRCode) {
      return res.status(502).json({
        success: false,
        error: qrJson?.errorMessage || qrJson?.ResponseDescription || "Could not generate Daraja QR code.",
      });
    }

    return res.json({
      success: true,
      environment: config.environment,
      shortcode: activeShortcode,
      amount,
      title,
      reference: refNo,
      qrCode: qrJson.QRCode,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Failed to generate QR code." });
  }
});

/**
 * POST /api/mpesa/c2b/register
 * Registers Confirmation & Validation URLs with Safaricom Daraja C2B v2 for PayBill 1171473
 */
mpesaRouter.post("/c2b/register", requireAuth, requireManagerAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = getMpesaConfig();
    if (config.environment !== "production" || !config.isLiveConfigured) {
      return res.status(400).json({
        success: false,
        error: "C2B URL registration requires production mode with valid shortcode and credentials.",
      });
    }

    const baseCallbackOrigin = config.callbackUrl.replace(/\/api\/mpesa\/callback.*$/, "");
    const confirmationUrl = `${baseCallbackOrigin}/api/mpesa/c2b/confirmation`;
    const validationUrl = `${baseCallbackOrigin}/api/mpesa/c2b/validation`;
    const accessToken = await getDarajaAccessToken(config);

    const regRes = await fetch(`${PRODUCTION_BASE_URL}/mpesa/c2b/v2/registerurl`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ShortCode: config.shortcode,
        ResponseType: "Completed",
        ConfirmationURL: confirmationUrl,
        ValidationURL: validationUrl,
      }),
    });

    const regJson = await regRes.json().catch(() => ({}));
    if (!regRes.ok || (regJson.ResponseCode && regJson.ResponseCode !== "0" && regJson.ResponseCode !== "00000000")) {
      return res.status(502).json({
        success: false,
        error: regJson?.errorMessage || regJson?.ResponseDescription || "Daraja C2B registration failed.",
        details: regJson,
      });
    }

    recordAuditLog({
      actor: req.identity!,
      category: "PAYMENT_CONFIRMATION",
      action: "MPESA_C2B_URLS_REGISTERED",
      targetType: "mpesa_c2b",
      targetId: config.shortcode,
      details: `Registered C2B v2 PayBill URLs for shortcode ${config.shortcode}`,
      ip: req.ip,
    });

    return res.json({
      success: true,
      shortcode: config.shortcode,
      confirmationUrl,
      validationUrl,
      response: regJson,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Failed to register C2B URLs." });
  }
});

/**
 * POST /api/mpesa/c2b/validation
 * Safaricom PayBill C2B pre-payment validation webhook
 */
mpesaRouter.post("/c2b/validation", (req: Request, res: Response) => {
  const config = getMpesaConfig();
  const body = req.body || {};
  const amount = Number(body.TransAmount || 0);
  const incomingShortcode = String(body.BusinessShortCode || "").trim();

  if (config.shortcode && incomingShortcode && incomingShortcode !== config.shortcode) {
    return res.status(200).json({ ResultCode: "C2B00015", ResultDesc: "Invalid Shortcode" });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(200).json({ ResultCode: "C2B00013", ResultDesc: "Invalid Amount" });
  }

  return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
});

/**
 * POST /api/mpesa/c2b/confirmation
 * Safaricom PayBill C2B confirmed payment webhook with idempotency ledger
 */
mpesaRouter.post("/c2b/confirmation", (req: Request, res: Response) => {
  res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });

  try {
    const body = req.body || {};
    const transId = String(body.TransID || "").trim();
    const transAmount = Number(body.TransAmount || 0);
    const msisdn = String(body.MSISDN || "").trim();
    const billRef = String(body.BillRefNumber || "").trim();
    const payerName = [body.FirstName, body.MiddleName, body.LastName].filter(Boolean).join(" ").trim() || "M-Pesa PayBill Customer";

    if (!transId || !Number.isFinite(transAmount) || transAmount <= 0) {
      return;
    }

    if (securityState.processedReceipts[transId]) {
      return;
    }

    const now = new Date().toISOString();
    const config = getMpesaConfig();
    const txId = `c2b_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

    const record: MpesaTransactionRecord = {
      id: txId,
      checkoutRequestId: transId,
      merchantRequestId: String(body.ThirdPartyTransID || transId),
      userEmail: billRef.includes("@") ? billRef.toLowerCase() : "paybill@zion.ke",
      userName: payerName,
      phoneNumber: msisdn || "254700000000",
      amount: transAmount,
      currency: "KES",
      purpose: "book",
      targetId: billRef || "paybill_direct",
      targetTitle: `PayBill ${config.shortcode || "1171473"} (${billRef || "Direct"})`,
      accountReference: billRef || "PAYBILL",
      status: "completed",
      resultCode: 0,
      resultDesc: "C2B PayBill confirmation received",
      mpesaReceiptNumber: transId,
      transactionDate: String(body.TransTime || now),
      environment: config.environment,
      shortcode: String(body.BusinessShortCode || config.shortcode || "1171473"),
      shortcodeType: config.shortcodeType,
      rawCallback: body,
      createdAt: now,
      updatedAt: now,
    };

    securityState.mpesaTransactions[transId] = record;
    securityState.processedReceipts[transId] = {
      transactionId: txId,
      processedAt: now,
      amount: transAmount,
      phone: msisdn,
    };

    // Reconcile matching pending order if BillRefNumber matches an order ID or book+email
    const matchingOrder = Object.values(securityState.orders).find(
      (o) =>
        o.status === "pending" &&
        (o.id === billRef || o.paymentReference === billRef) &&
        transAmount >= o.price
    );
    if (matchingOrder) {
      matchingOrder.status = "approved";
      matchingOrder.paymentReference = transId;
      matchingOrder.verifiedBy = `M-PESA C2B PayBill (${record.shortcode})`;
      matchingOrder.updatedAt = now;
      securityState.bookEntitlements[`${matchingOrder.bookId}:${matchingOrder.userEmail.toLowerCase()}`] = {
        bookId: matchingOrder.bookId,
        userEmail: matchingOrder.userEmail.toLowerCase(),
        orderId: matchingOrder.id,
        grantedAt: now,
      };
    }

    recordAuditLog({
      actor: {
        uid: "mpesa_c2b",
        email: record.userEmail,
        name: payerName,
        role: "member",
        isMainAdmin: false,
        isSuspended: false,
        capabilities: {} as any,
        authorizedCourses: [],
        authSource: "zion_session",
      },
      category: "PAYMENT_CONFIRMATION",
      action: "MPESA_C2B_CONFIRMED",
      targetType: "mpesa_transaction",
      targetId: txId,
      details: `C2B PayBill receipt ${transId} for KES ${transAmount} (Ref: ${billRef || "N/A"})`,
    });

    persistSecurityState();
  } catch (err) {
    console.error("Error processing C2B confirmation:", err);
  }
});
