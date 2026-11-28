import React, { useState, useEffect } from "react";
import {
  Smartphone,
  QrCode,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Terminal,
  Copy,
  Check,
  ArrowRight,
  Clock,
  Receipt,
} from "lucide-react";
import { User, Book } from "../types";
import { QRCodeGenerator } from "../utils/qrCode";
import { secureApiFetch } from "../lib/aiClient";

interface MpesaApiConsoleProps {
  currentUser: User | null;
  books: Book[];
  onUnlockBookManual?: (bookId: string) => void;
}

interface MpesaTxRecord {
  id: string;
  checkoutRequestId: string;
  merchantRequestId: string;
  phoneNumber: string;
  amount: number;
  purpose: string;
  referenceId?: string;
  accountReference: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  mpesaReceiptNumber?: string;
  resultDesc?: string;
  createdAt: string;
}

export default function MpesaApiConsole({ currentUser }: MpesaApiConsoleProps) {
  const [config, setConfig] = useState<any>(null);
  const [phone, setPhone] = useState("254712345678");
  const [amount, setAmount] = useState<number>(200);
  const [reference, setReference] = useState("ZION-ORDER-01");
  const [description, setDescription] = useState("Zion Digital Purchase");
  const [purpose, setPurpose] = useState<"credits" | "book" | "tuition">("credits");

  const [isLoadingStk, setIsLoadingStk] = useState(false);
  const [stkResult, setStkResult] = useState<any>(null);
  const [stkError, setStkError] = useState<string | null>(null);

  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [qrResult, setQrResult] = useState<any>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  const [queryId, setQueryId] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(null);

  const [receipts, setReceipts] = useState<MpesaTxRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending" | "failed">("all");
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [showInspector, setShowInspector] = useState(false);

  const loadConfigAndReceipts = async () => {
    try {
      const cfgRes = await fetch("/api/mpesa/config");
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        setConfig(cfg);
      }
    } catch {
      // Ignore config fetch failure
    }

    if (currentUser && currentUser.role !== "guest") {
      setIsLoadingReceipts(true);
      try {
        const recRes = await secureApiFetch("/api/mpesa/receipts");
        if (recRes.ok) {
          const data = await recRes.json();
          setReceipts(data.receipts || []);
        }
      } catch {
        // Ignore receipts fetch error
      } finally {
        setIsLoadingReceipts(false);
      }
    }
  };

  useEffect(() => {
    void loadConfigAndReceipts();
  }, [currentUser?.email]);

  const handleQueryStatus = async (targetCheckoutId?: string) => {
    const checkoutId = (targetCheckoutId || queryId).trim();
    if (!checkoutId) return;
    setIsQuerying(true);
    setQueryId(checkoutId);
    try {
      const res = await secureApiFetch(`/api/mpesa/query/${encodeURIComponent(checkoutId)}`);
      const data = await res.json();
      setQueryResult(data);
      if (data.status === "completed") {
        void loadConfigAndReceipts();
      }
    } catch (err: any) {
      setQueryResult({ error: err.message });
    } finally {
      setIsQuerying(false);
    }
  };

  const handleStkPush = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingStk(true);
    setStkError(null);
    setStkResult(null);

    try {
      const res = await secureApiFetch("/api/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phone.trim(),
          amount: Number(amount),
          purpose,
          accountReference: reference.trim(),
          transactionDesc: description.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "STK Push initiation failed.");
      }
      setStkResult(data);
      if (data.checkoutRequestId) {
        setQueryId(data.checkoutRequestId);
      }
      void loadConfigAndReceipts();
    } catch (err: any) {
      setStkError(err.message || "Network error during STK Push.");
    } finally {
      setIsLoadingStk(false);
    }
  };

  const handleGenerateQr = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingQr(true);
    setQrError(null);
    setQrResult(null);
    try {
      const res = await secureApiFetch("/api/mpesa/qrcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          refNo: reference.trim(),
          merchantName: "Zion Digital Books & Academy",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate Dynamic M-Pesa QR.");
      }
      setQrResult(data);
    } catch (err: any) {
      setQrError(err.message || "Error connecting to Daraja QR API.");
    } finally {
      setIsLoadingQr(false);
    }
  };

  const totalConfirmedKes = receipts
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const completedCount = receipts.filter((r) => r.status === "completed").length;
  const pendingCount = receipts.filter((r) => r.status === "pending").length;
  const filteredReceipts = receipts.filter((r) => statusFilter === "all" || r.status === statusFilter);

  return (
    <div className="space-y-6 text-left" id="mpesa-api-console">
      {/* Executive Header */}
      <div className="rounded-2xl bg-[#0B254D] text-white p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#F5B82E] font-bold">
            Admin Finance &amp; Daraja Gateway
          </p>
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
            Safaricom M-Pesa Payment Console
          </h2>
          <p className="text-xs text-blue-100/85 max-w-xl">
            Manage M-Pesa Express STK push requests, dynamic Lipa Na M-Pesa QR codes, live Daraja status queries, and reconciled Paybill receipts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {config && (
            <div className="flex items-center gap-3 rounded-xl bg-white/10 border border-white/15 px-3.5 py-2 text-xs">
              <div>
                <p className="text-[10px] font-mono uppercase text-blue-200">
                  {config.environment === "production" ? "Production" : "Sandbox"} ·{" "}
                  {config.shortcodeType === "till" ? "Buy Goods Till" : "Paybill"}
                </p>
                <p className="font-mono font-bold text-[#F5B82E]">Shortcode: {config.shortcode || "Not Set"}</p>
              </div>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  config.configured ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
            </div>
          )}

          <button
            type="button"
            onClick={loadConfigAndReceipts}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#F5B82E] hover:bg-[#E5A91E] text-[#0B254D] px-4 py-2.5 text-xs font-bold transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingReceipts ? "animate-spin" : ""}`} />
            <span>Sync Ledger</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-[#0B254D] dark:text-white tabular-nums">
              KES {totalConfirmedKes.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500">Confirmed Revenue ({completedCount} receipts)</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-bold text-[#0B254D] dark:text-white tabular-nums">
              {pendingCount}
            </p>
            <p className="text-xs text-slate-500">Pending STK Requests</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#155EEF] flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#0B254D] dark:text-white">
              {config?.configured ? "Daraja API Active" : "Fallback Configuration"}
            </p>
            <p className="text-xs text-slate-500 truncate max-w-[200px]">
              {config?.callbackUrl ? "HTTPS Callback Verified" : "Awaiting Callback URL"}
            </p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: STK Push & Dynamic QR */}
        <div className="lg:col-span-5 space-y-6">
          <form
            onSubmit={handleStkPush}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-2xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-emerald-600" />
                <h3 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                  Initiate M-Pesa Express (STK Push)
                </h3>
              </div>
              <span className="text-[10px] font-mono uppercase text-slate-400">Daraja v1</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Safaricom Phone
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="254712345678"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono outline-none focus:border-[#155EEF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Amount (KES)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={150000}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono outline-none focus:border-[#155EEF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Payment Purpose
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:border-[#155EEF]"
                >
                  <option value="credits">App Credits Top-Up</option>
                  <option value="book">Book Order Settlement</option>
                  <option value="tuition">School Tuition / Filing</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Account Reference
                </label>
                <input
                  type="text"
                  required
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono outline-none focus:border-[#155EEF]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Transaction Description
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:border-[#155EEF]"
              />
            </div>

            {stkError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <XCircle className="h-4 w-4 shrink-0" />
                <span>{stkError}</span>
              </div>
            )}

            {stkResult && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs text-emerald-800 dark:text-emerald-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{stkResult.customerMessage || "STK Prompt sent to phone."}</span>
                </p>
                <p className="font-mono text-[10px]">
                  CheckoutRequestID: {stkResult.checkoutRequestId}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoadingStk}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white py-3 text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              {isLoadingStk ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              <span>{isLoadingStk ? "Sending STK Prompt..." : "Send M-Pesa STK Push"}</span>
            </button>
          </form>

          {/* Dynamic Lipa Na M-Pesa QR */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-[#155EEF]" />
                <h3 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                  Lipa Na M-Pesa Dynamic QR
                </h3>
              </div>
              <button
                type="button"
                onClick={handleGenerateQr}
                disabled={isLoadingQr}
                className="rounded-lg bg-[#0B254D] hover:bg-[#155EEF] text-white px-3 py-1.5 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
              >
                {isLoadingQr ? "Generating..." : "Generate QR"}
              </button>
            </div>

            {qrError && <p className="text-xs text-rose-600">{qrError}</p>}

            {qrResult ? (
              <div className="flex flex-col items-center gap-3 pt-1">
                <div className="p-3 rounded-xl bg-white border border-slate-200">
                  {qrResult.qrCode ? (
                    <img
                      src={`data:image/png;base64,${qrResult.qrCode}`}
                      alt="M-Pesa Dynamic QR"
                      className="h-40 w-40 object-contain"
                    />
                  ) : (
                    <QRCodeGenerator
                      value={qrResult.qrPayloadString || `MPESA:${amount}:${reference}`}
                      size={160}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      qrResult.qrPayloadString || `Pay KES ${amount} Ref: ${reference}`
                    );
                    setCopiedPayload(true);
                    setTimeout(() => setCopiedPayload(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#155EEF] hover:underline cursor-pointer"
                >
                  {copiedPayload ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedPayload ? "Copied Payload" : "Copy QR Payload String"}</span>
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Click "Generate QR" to create a scannable Paybill QR code for KES {amount} ({reference}).
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Live Query & Receipt Ledger */}
        <div className="lg:col-span-7 space-y-6">
          {/* Status Query Bar */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 shadow-2xs">
            <h3 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
              Verify STK Transaction Status
            </h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={queryId}
                onChange={(e) => setQueryId(e.target.value)}
                placeholder="Paste CheckoutRequestID (e.g. ws_CO_...)"
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs font-mono outline-none focus:border-[#155EEF]"
              />
              <button
                type="button"
                disabled={isQuerying || !queryId.trim()}
                onClick={() => handleQueryStatus()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0B254D] hover:bg-[#155EEF] text-white px-4 py-2 text-xs font-bold transition cursor-pointer disabled:opacity-45"
              >
                {isQuerying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                <span>Query Status</span>
              </button>
            </div>
            {queryResult && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 text-xs space-y-1">
                <p className="font-bold text-[#0B254D] dark:text-white">
                  Status: {String(queryResult.status || "checked").toUpperCase()}
                </p>
                {queryResult.resultDesc && <p className="text-slate-600 dark:text-slate-300">{queryResult.resultDesc}</p>}
                {queryResult.mpesaReceiptNumber && (
                  <p className="font-mono text-emerald-700 dark:text-emerald-400">
                    Receipt: {queryResult.mpesaReceiptNumber}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Receipt Ledger Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-[#155EEF]" />
                <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
                  M-Pesa Receipt Ledger ({filteredReceipts.length})
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                {(["all", "completed", "pending", "failed"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setStatusFilter(f)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold capitalize transition cursor-pointer ${
                      statusFilter === f
                        ? "bg-[#155EEF] text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {filteredReceipts.length === 0 ? (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-8 text-center text-xs text-slate-500">
                No M-Pesa transactions match the selected filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono uppercase text-slate-400">
                      <th className="pb-2 pr-3">Reference</th>
                      <th className="pb-2 pr-3">Phone</th>
                      <th className="pb-2 pr-3">Amount</th>
                      <th className="pb-2 pr-3">Receipt</th>
                      <th className="pb-2 pr-3">Status</th>
                      <th className="pb-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredReceipts.map((tx) => (
                      <tr key={tx.id || tx.checkoutRequestId}>
                        <td className="py-2.5 pr-3">
                          <p className="font-bold text-[#0B254D] dark:text-white">{tx.accountReference}</p>
                          <p className="text-[10px] text-slate-400 capitalize">{tx.purpose}</p>
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-slate-600 dark:text-slate-300">
                          {tx.phoneNumber}
                        </td>
                        <td className="py-2.5 pr-3 font-bold tabular-nums">
                          KES {Number(tx.amount).toLocaleString()}
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-[11px]">
                          {tx.mpesaReceiptNumber || "Pending"}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                              tx.status === "completed"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : tx.status === "pending"
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleQueryStatus(tx.checkoutRequestId)}
                            className="text-[11px] font-semibold text-[#155EEF] hover:underline cursor-pointer"
                          >
                            Check
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Collapsible Raw API Payload Inspector */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowInspector((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0B254D] dark:hover:text-white cursor-pointer"
              >
                <Terminal className="h-3.5 w-3.5" />
                <span>{showInspector ? "Hide API Payload Inspector" : "Show API Payload Inspector"}</span>
              </button>

              {showInspector && (
                <pre className="mt-3 rounded-xl bg-slate-950 text-emerald-300 p-4 text-[10.5px] font-mono overflow-x-auto max-h-56">
                  {JSON.stringify(
                    {
                      config: config || "loading",
                      lastStkPush: stkResult || null,
                      lastStatusQuery: queryResult || null,
                    },
                    null,
                    2
                  )}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
