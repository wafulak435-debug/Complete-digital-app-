import React, { useEffect, useState } from "react";
import PaystackPop from "@paystack/inline-js";
import {
  isPaystackConfigured,
  paystackPublicKey,
  fetchUserProfile,
} from "../lib/supabaseClient";
import { secureApiFetch } from "../lib/aiClient";
import type { User } from "../types";
import { X, Check, Smartphone, CreditCard, Sparkles, ShieldCheck, Loader2 } from "lucide-react";

export interface PricingPlan {
  id: string;
  name: string;
  priceKes: number;
  credits: number;
  badge?: string;
  description: string;
  features: string[];
}

export const KES_PLANS: PricingPlan[] = [
  {
    id: "topup",
    name: "Credit Top-Up",
    priceKes: 250,
    credits: 200,
    description: "Quick boost for extra AI study queries and document exports.",
    features: [
      "200 AI Studio & Companion Credits",
      "Instant M-Pesa STK Push activation",
      "Never expires on your account",
    ],
  },
  {
    id: "starter",
    name: "Starter Plan",
    priceKes: 500,
    credits: 500,
    badge: "Popular in Kenya",
    description: "Ideal for students, pastors, and researchers across East Africa.",
    features: [
      "500 AI Credits per top-up",
      "Full Offline Bible & Dictionary Sync",
      "Private Cloud Document Storage (user-uploads)",
      "Swahili / Luhya Language Teacher AI",
    ],
  },
  {
    id: "pro",
    name: "Pro Plan",
    priceKes: 1500,
    credits: 2000,
    badge: "Best Value",
    description: "Full creative suite, eBook publishing, and priority AI access.",
    features: [
      "2,000 AI Credits + Priority Gemini Edge Access",
      "AI Image & Video Studio Synthesis",
      "Leadership & Bible School Certificates",
      "Full Doc Studio PDF & Word Publishing",
    ],
  },
];

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSubscriptionUpdated: (updates: Partial<User>) => void;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  currentUser,
  onSubscriptionUpdated,
}: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan>(KES_PLANS[1]);
  const [phoneInput, setPhoneInput] = useState(
    currentUser.phone_number || currentUser.phone || ""
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [darajaConfig, setDarajaConfig] = useState<{
    shortcode: string;
    environment: "sandbox" | "production";
    isLiveConfigured: boolean;
  }>({ shortcode: "1171473", environment: "production", isLiveConfigured: true });
  const [pendingCheckoutId, setPendingCheckoutId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/mpesa/config")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          setDarajaConfig({
            shortcode: String(data.shortcode || "1171473"),
            environment: data.environment === "production" ? "production" : "sandbox",
            isLiveConfigured: Boolean(data.isLiveConfigured),
          });
        }
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!pendingCheckoutId) return;
    const timer = setInterval(async () => {
      try {
        const res = await secureApiFetch(`/api/mpesa/query/${encodeURIComponent(pendingCheckoutId)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        if (data.status === "completed") {
          setPendingCheckoutId(null);
          setIsProcessing(false);
          const nextCredits = (currentUser.credits || 0) + selectedPlan.credits;
          onSubscriptionUpdated({
            subscription_status: "active",
            plan_name: selectedPlan.name,
            credits: nextCredits,
          });
          setStatusMessage({
            type: "success",
            text: `M-Pesa payment confirmed (Receipt: ${data.receiptNumber || pendingCheckoutId}). Activated ${selectedPlan.name} with +${selectedPlan.credits} credits.`,
          });
        } else if (data.status === "cancelled" || data.status === "failed") {
          setPendingCheckoutId(null);
          setIsProcessing(false);
          setStatusMessage({
            type: "error",
            text: String(data.resultDesc || "M-Pesa payment was cancelled or declined on your handset."),
          });
        }
      } catch {
        // continue polling
      }
    }, 3500);
    return () => clearInterval(timer);
  }, [pendingCheckoutId, selectedPlan, currentUser.credits, onSubscriptionUpdated]);

  if (!isOpen) return null;

  const handleDarajaStkCheckout = async () => {
    setStatusMessage(null);
    if (!phoneInput.trim() || phoneInput.replace(/\D/g, "").length < 9) {
      setStatusMessage({
        type: "error",
        text: "Enter your Safaricom M-Pesa phone number (e.g. 0712345678) to receive the STK prompt.",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await secureApiFetch("/api/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phoneInput.trim(),
          purpose: "subscription",
          targetId: selectedPlan.id,
          customAccountRef: (currentUser.email || selectedPlan.id).slice(0, 12),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success || !data?.checkoutRequestId) {
        setIsProcessing(false);
        setStatusMessage({
          type: "error",
          text: data?.error || "Could not dispatch M-Pesa STK Push. Check your number and try again.",
        });
        return;
      }

      setPendingCheckoutId(String(data.checkoutRequestId));
      setStatusMessage({
        type: "info",
        text: `STK Push sent to ${data.phoneNumber || phoneInput.trim()} via PayBill ${darajaConfig.shortcode}. Enter your M-Pesa PIN on your phone to complete KES ${selectedPlan.priceKes.toLocaleString()}.`,
      });
    } catch (err: any) {
      setIsProcessing(false);
      setStatusMessage({
        type: "error",
        text: err?.message || "Network error connecting to Safaricom Daraja.",
      });
    }
  };

  const handlePaystackCheckout = () => {
    setStatusMessage(null);

    if (!currentUser.email) {
      setStatusMessage({
        type: "error",
        text: "A valid email address on your account is required for Paystack checkout.",
      });
      return;
    }

    if (!isPaystackConfigured) {
      void handleDarajaStkCheckout();
      return;
    }

    setIsProcessing(true);
    try {
      const paystack = new PaystackPop();
      const reference = `ZION_${selectedPlan.id.toUpperCase()}_${Date.now()}`;
      const amountInCents = Math.round(selectedPlan.priceKes * 100);

      paystack.newTransaction({
        key: paystackPublicKey,
        email: currentUser.email,
        amount: amountInCents,
        currency: "KES",
        channels: ["mobile_money", "card"],
        reference,
        metadata: {
          user_id: currentUser.id || "",
          plan_id: selectedPlan.id,
          plan_name: selectedPlan.name,
          credits: selectedPlan.credits,
          phone_number: phoneInput.trim(),
          custom_fields: [
            {
              display_name: "Plan",
              variable_name: "plan_name",
              value: selectedPlan.name,
            },
            {
              display_name: "M-Pesa Phone",
              variable_name: "phone_number",
              value: phoneInput.trim() || "Not Provided",
            },
          ],
        },
        onSuccess: async (transaction: { reference?: string }) => {
          setIsProcessing(false);
          setStatusMessage({
            type: "success",
            text: `Payment confirmed (Ref: ${transaction?.reference || reference})! Activating your ${selectedPlan.name}...`,
          });

          // Refresh profile from Supabase after webhook processes (with brief retry)
          if (currentUser.id) {
            setTimeout(async () => {
              const updatedProfile = await fetchUserProfile(currentUser.id!);
              if (updatedProfile) {
                onSubscriptionUpdated({
                  subscription_status: updatedProfile.subscription_status,
                  plan_name: updatedProfile.plan_name,
                  credits: updatedProfile.credits,
                });
              } else {
                onSubscriptionUpdated({
                  subscription_status: "active",
                  plan_name: selectedPlan.name,
                  credits: (currentUser.credits || 0) + selectedPlan.credits,
                });
              }
            }, 2000);
          } else {
            onSubscriptionUpdated({
              subscription_status: "active",
              plan_name: selectedPlan.name,
              credits: (currentUser.credits || 0) + selectedPlan.credits,
            });
          }
        },
        onCancel: () => {
          setIsProcessing(false);
          setStatusMessage({
            type: "info",
            text: "Checkout cancelled. No funds were charged.",
          });
        },
        onError: (err: any) => {
          setIsProcessing(false);
          setStatusMessage({
            type: "error",
            text: err?.message || "Paystack checkout encountered an error. Please try again.",
          });
        },
      });
    } catch (err: any) {
      setIsProcessing(false);
      setStatusMessage({
        type: "error",
        text: err?.message || "Could not launch Paystack checkout.",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto text-left">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Upgrade or Top Up (KES)
              </h2>
              <p className="text-[11px] text-emerald-300 font-mono">
                Pay instantly via M-Pesa STK Push or Visa / Mastercard
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800/50 p-3 flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Safaricom Daraja {darajaConfig.isLiveConfigured ? "Live Production" : "Gateway"}:</strong>{" "}
              PayBill <strong>{darajaConfig.shortcode}</strong> is active for direct M-Pesa STK Push checkout.
              {!isPaystackConfigured && " Card checkout via Paystack is optional."}
            </span>
          </div>

          {/* Plan Selection Cards */}
          <div className="grid gap-3.5 sm:grid-cols-3">
            {KES_PLANS.map((plan) => {
              const isSelected = selectedPlan.id === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className={`relative text-left rounded-2xl p-4 border-2 transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 shadow-md"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950/50"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                        {plan.name}
                      </span>
                      {plan.badge && (
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                          {plan.badge}
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-xs font-bold text-slate-500">KES</span>
                      <span className="text-2xl font-black text-slate-900 dark:text-white">
                        {plan.priceKes.toLocaleString()}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                      {plan.description}
                    </p>

                    <ul className="space-y-1.5">
                      {plan.features.map((feat, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-1.5 text-[11px] text-slate-700 dark:text-slate-300"
                        >
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </button>
              );
            })}
          </div>

          {/* M-Pesa Number & Account Summary */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 grid gap-4 sm:grid-cols-2 items-center">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Safaricom M-Pesa Number
              </label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="0712345678 or 254712345678"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Current Balance:</span>
                <strong className="text-slate-900 dark:text-white">
                  {currentUser.credits ?? 0} Credits ({currentUser.plan_name || "Free"})
                </strong>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Selected Upgrade:</span>
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {selectedPlan.name} (+{selectedPlan.credits} Credits)
                </strong>
              </div>
              <div className="flex justify-between text-slate-900 dark:text-white font-black text-sm pt-1 border-t border-slate-200 dark:border-slate-800">
                <span>Total Due:</span>
                <span>KES {selectedPlan.priceKes.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {statusMessage && (
            <div
              className={`rounded-xl p-3 text-xs font-semibold border ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200"
                  : statusMessage.type === "error"
                  ? "bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200"
                  : "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200"
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                Daraja PayBill {darajaConfig.shortcode}
              </span>
              {isPaystackConfigured && (
                <span className="flex items-center gap-1">
                  <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                  Visa / Mastercard
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => void handleDarajaStkCheckout()}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>
                  Pay KES {selectedPlan.priceKes.toLocaleString()} with M-Pesa
                </span>
              </button>

              {isPaystackConfigured && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handlePaystackCheckout}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white font-bold text-xs uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Pay with Card</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
