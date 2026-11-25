import React, { useState, useEffect } from "react";
import {
  Phone,
  Terminal,
  Server,
  Send,
  RefreshCw,
  ShieldCheck,
  Database,
  QrCode,
} from "lucide-react";
import { Book } from "../types";
import { secureApiFetch } from "../lib/aiClient";

interface MpesaApiConsoleProps {
  onUnlockBookManual?: (bookId: string) => void;
  books: Book[];
  currentUser: any;
}

interface DarajaPublicConfig {
  environment: "sandbox" | "production";
  shortcode: string;
  shortcodeType: "paybill" | "till";
  callbackUrl: string;
  isLiveConfigured: boolean;
  consumerKeyStatus: string;
  passkeyStatus: string;
}

export default function MpesaApiConsole({
  onUnlockBookManual,
  books,
  currentUser,
}: MpesaApiConsoleProps) {
  const [serverConfig, setServerConfig] = useState<DarajaPublicConfig | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(books[0] || null);
  const [phoneNumber, setPhoneNumber] = useState(
    currentUser?.phone || currentUser?.phone_number || "0712345678"
  );
  const [accountRef, setAccountRef] = useState("ZIONDIGITAL");

  const [stepStatus, setStepStatus] = useState<
    "idle" | "pushing" | "waiting" | "success" | "failed"
  >("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [checkoutRequestId, setCheckoutRequestId] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [configResponseJson, setConfigResponseJson] = useState("");
  const [stkResponseJson, setStkResponseJson] = useState("");
  const [queryResponseJson, setQueryResponseJson] = useState("");
  const [ledgerReceipts, setLedgerReceipts] = useState<any[]>([]);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const loadConfigAndReceipts = async () => {
    try {
      const cfgRes = await fetch("/api/mpesa/config");
      const cfgData = await cfgRes.json().catch(() => ({}));
      if (cfgRes.ok && cfgData?.success) {
        setServerConfig(cfgData);
        setConfigResponseJson(JSON.stringify(cfgData, null, 2));
      }
    } catch {
      // ignore offline
    }

    try {
      const recRes = await secureApiFetch("/api/mpesa/receipts");
      const recData = await recRes.json().catch(() => ({}));
      if (recRes.ok && Array.isArray(recData?.receipts)) {
        setLedgerReceipts(recData.receipts);
      }
    } catch {
      // ignore unauthenticated
    }
  };

  useEffect(() => {
    void loadConfigAndReceipts();
  }, []);

  const checkTransactionStatus = async (checkoutId: string) => {
    if (!checkoutId) return;
    try {
      const res = await secureApiFetch(`/api/mpesa/query/${encodeURIComponent(checkoutId)}`);
      const data = await res.json().catch(() => ({}));
      setQueryResponseJson(JSON.stringify(data, null, 2));
      if (!res.ok) return;

      if (data.status === "completed") {
        setReceiptNumber(String(data.receiptNumber || checkoutId));
        setStepStatus("success");
        addLog(`Payment confirmed. Receipt: ${data.receiptNumber || checkoutId}`);
        if (selectedBook && onUnlockBookManual) {
          onUnlockBookManual(selectedBook.id);
        }
        void loadConfigAndReceipts();
      } else if (data.status === "cancelled" || data.status === "failed") {
        setErrorMessage(String(data.resultDesc || "Payment cancelled or failed."));
        setStepStatus("failed");
        addLog(`Transaction did not complete: ${data.resultDesc || data.status}`);
      }
    } catch {
      // keep waiting
    }
  };

  useEffect(() => {
    if (stepStatus !== "waiting" || !checkoutRequestId) return;
    const interval = setInterval(() => {
      void checkTransactionStatus(checkoutRequestId);
    }, 3500);
    return () => clearInterval(interval);
  }, [stepStatus, checkoutRequestId]);

  const handleDispatchStk = async () => {
    setErrorMessage("");
    setLogs([]);
    if (!phoneNumber.trim()) {
      setErrorMessage("Enter a Safaricom phone number (e.g. 0712345678).");
      return;
    }

    setStepStatus("pushing");
    addLog("Connecting to Zion backend Daraja gateway...");

    try {
      const res = await secureApiFetch("/api/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          purpose: selectedBook ? "book" : "subscription",
          targetId: selectedBook ? selectedBook.id : "starter",
          customAccountRef: accountRef.trim() || "ZIONDIGITAL",
        }),
      });
      const data = await res.json().catch(() => ({}));
      setStkResponseJson(JSON.stringify(data, null, 2));

      if (!res.ok || !data?.success || !data?.checkoutRequestId) {
        setErrorMessage(data?.error || "Daraja STK Push request failed.");
        setStepStatus("failed");
        addLog(`Error: ${data?.error || "STK Push rejected"}`);
        return;
      }

      setCheckoutRequestId(String(data.checkoutRequestId));
      setStepStatus("waiting");
      addLog(`STK Push sent to ${data.phoneNumber} for KES ${data.amount}.`);
      addLog(`CheckoutRequestID: ${data.checkoutRequestId}`);
      addLog("Waiting for handset PIN approval and Safaricom callback...");
    } catch (err: any) {
      setErrorMessage(err?.message || "Network error contacting Daraja gateway.");
      setStepStatus("failed");
    }
  };

  const handleGenerateQr = async () => {
    setErrorMessage("");
    try {
      const res = await secureApiFetch("/api/mpesa/qrcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: selectedBook ? "book" : "subscription",
          targetId: selectedBook ? selectedBook.id : "starter",
          customAccountRef: accountRef.trim() || "ZIONDIGITAL",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.qrCode) {
        setQrCodeBase64(String(data.qrCode));
        addLog(`Generated Daraja Dynamic QR for PayBill ${data.shortcode}.`);
      } else {
        setErrorMessage(data?.message || data?.error || "Could not generate QR code.");
      }
    } catch {
      setErrorMessage("Failed to request Daraja QR code.");
    }
  };

  const handleReset = () => {
    setStepStatus("idle");
    setLogs([]);
    setErrorMessage("");
    setCheckoutRequestId("");
    setReceiptNumber("");
    setStkResponseJson("");
    setQueryResponseJson("");
    setQrCodeBase64(null);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-8" id="mpesa-api-console">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 dark:border-slate-800 pb-5">
        <div className="text-left">
          <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
            Safaricom Daraja API ({serverConfig?.environment || "production"})
          </span>
          <h2 className="text-2xl font-black text-stone-900 dark:text-white font-display mt-2">
            Lipa Na M-Pesa Live Payment Console
          </h2>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed max-w-2xl">
            Dispatch real Safaricom M-Pesa STK Push requests, generate PayBill Dynamic QR codes, and inspect verified Daraja callbacks and transaction receipts.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void loadConfigAndReceipts()}
            className="flex items-center space-x-1.5 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-stone-700 dark:text-stone-300 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Ledger</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-stone-700 dark:text-stone-300 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 text-left">
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-stone-200 dark:border-slate-800 flex flex-col space-y-4">
          <div className="flex items-center space-x-2 text-stone-800 dark:text-stone-200 font-bold border-b border-stone-100 dark:border-slate-800/80 pb-3">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm uppercase tracking-wide font-display">1. Server Gateway Status</h3>
          </div>

          <div className="rounded-xl bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-800 p-3.5 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-stone-500">Environment:</span>
              <strong className="text-emerald-700 dark:text-emerald-400 uppercase">
                {serverConfig?.environment || "checking..."}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Business Shortcode:</span>
              <strong className="text-stone-900 dark:text-white">{serverConfig?.shortcode || "1171473"}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Credentials:</span>
              <strong className="text-stone-900 dark:text-white">
                {serverConfig?.consumerKeyStatus || "Configured"} / {serverConfig?.passkeyStatus || "Configured"}
              </strong>
            </div>
          </div>

          <div className="space-y-3 text-xs font-medium">
            <div className="space-y-1">
              <label className="text-[11px] text-stone-500 dark:text-slate-400">Catalog Item</label>
              <select
                className="w-full p-2.5 border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 rounded-xl outline-none text-stone-800 dark:text-stone-200 font-semibold"
                value={selectedBook?.id || ""}
                onChange={(e) => {
                  const match = books.find((b) => b.id === e.target.value) || null;
                  setSelectedBook(match);
                }}
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} (KES {b.price || 350})
                  </option>
                ))}
                <option value="">Starter Subscription Plan (KES 500)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-stone-500 dark:text-slate-400">Account Reference</label>
              <input
                type="text"
                value={accountRef}
                onChange={(e) => setAccountRef(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 rounded-xl font-mono text-[11px] text-stone-800 dark:text-stone-200 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-stone-500 dark:text-slate-400">Safaricom Number (Party A)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-3.5 w-3.5 text-emerald-600" />
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 0712345678"
                  className="w-full pl-9 pr-3 py-2 border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950 rounded-xl font-mono text-[11px] text-stone-900 dark:text-stone-200 outline-none"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-800 p-2.5 text-[11px] font-semibold">
                {errorMessage}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => void handleGenerateQr()}
                className="px-3 py-2.5 border border-stone-300 dark:border-slate-700 rounded-xl font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>QR</span>
              </button>
              <button
                type="button"
                onClick={() => void handleDispatchStk()}
                disabled={stepStatus === "pushing"}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase tracking-wider rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{stepStatus === "pushing" ? "Sending..." : "Send STK Push"}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-stone-50 dark:bg-slate-950 p-5 rounded-2xl border border-stone-200 dark:border-slate-800 flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-slate-800">
            <div className="flex items-center space-x-2 text-stone-800 dark:text-stone-200 font-bold">
              <Terminal className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm uppercase tracking-wide font-display">2. Live Execution Log</h3>
            </div>
            <span className="text-[10px] font-mono uppercase text-stone-500">{stepStatus}</span>
          </div>

          <div className="flex-grow min-h-[180px] bg-slate-950 text-emerald-400 font-mono text-[11px] p-4 rounded-xl space-y-2 overflow-y-auto border border-slate-800 text-left">
            {logs.length === 0 ? (
              <div className="text-slate-500 flex flex-col items-center justify-center h-full pt-8 text-center">
                <Terminal className="h-8 w-8 mb-2 opacity-30" />
                <p>Send a live STK Push or QR request to inspect Daraja events.</p>
              </div>
            ) : (
              logs.map((log, i) => <div key={i}>{log}</div>)
            )}
          </div>

          {stepStatus === "waiting" && checkoutRequestId && (
            <button
              type="button"
              onClick={() => void checkTransactionStatus(checkoutRequestId)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
            >
              Query Safaricom Status Now
            </button>
          )}

          {stepStatus === "success" && receiptNumber && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
              Verified Receipt: {receiptNumber}
            </div>
          )}

          {qrCodeBase64 && (
            <div className="p-3 rounded-xl bg-white border border-stone-200 text-center space-y-2">
              <p className="text-[10px] font-bold uppercase text-stone-600">Daraja Dynamic QR</p>
              <img
                src={`data:image/png;base64,${qrCodeBase64}`}
                alt="Safaricom Daraja Dynamic QR Code"
                className="w-40 h-40 mx-auto rounded-lg"
              />
            </div>
          )}
        </div>

        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-stone-200 dark:border-slate-800 flex flex-col space-y-4">
          <div className="flex items-center space-x-2 text-stone-800 dark:text-stone-200 font-bold border-b border-stone-100 dark:border-slate-800/80 pb-3">
            <Server className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm uppercase tracking-wide font-display">3. API Response Inspector</h3>
          </div>

          <div className="space-y-3 text-xs font-medium flex-grow">
            <div className="space-y-1">
              <span className="text-[9.5px] font-mono font-black text-blue-600 block uppercase">
                Daraja Config (/api/mpesa/config)
              </span>
              <pre className="p-3 bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-800 rounded-xl overflow-x-auto text-[10px] font-mono text-stone-700 dark:text-stone-300 max-h-[120px] text-left">
                {configResponseJson || "{}"}
              </pre>
            </div>

            <div className="space-y-1">
              <span className="text-[9.5px] font-mono font-black text-rose-600 block uppercase">
                STK Push Response (/api/mpesa/stkpush)
              </span>
              <pre className="p-3 bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-800 rounded-xl overflow-x-auto text-[10px] font-mono text-stone-700 dark:text-stone-300 max-h-[120px] text-left">
                {stkResponseJson || "{\n  // Awaiting dispatch...\n}"}
              </pre>
            </div>

            <div className="space-y-1">
              <span className="text-[9.5px] font-mono font-black text-emerald-600 block uppercase">
                Status Query (/api/mpesa/query)
              </span>
              <pre className="p-3 bg-stone-50 dark:bg-slate-950 border border-stone-200 dark:border-slate-800 rounded-xl overflow-x-auto text-[10px] font-mono text-stone-700 dark:text-stone-300 max-h-[120px] text-left">
                {queryResponseJson || "{\n  // Awaiting query...\n}"}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-stone-200 dark:border-slate-800 text-left space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2 text-stone-800 dark:text-stone-200 font-bold">
            <Database className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm uppercase tracking-wide font-display">Server M-Pesa Transactions Ledger</h3>
          </div>
          <span className="text-[10px] font-mono text-stone-400">Count: {ledgerReceipts.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 dark:border-slate-800 text-stone-500 font-bold">
                <th className="py-2.5">TX ID / Ref</th>
                <th className="py-2.5">Phone Number</th>
                <th className="py-2.5">Item Title</th>
                <th className="py-2.5 text-center">Amount (KES)</th>
                <th className="py-2.5">Receipt</th>
                <th className="py-2.5">Created</th>
                <th className="py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {ledgerReceipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-stone-500">
                    Sign in to view recorded M-Pesa receipts for your account.
                  </td>
                </tr>
              ) : (
                ledgerReceipts.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-stone-100 dark:border-slate-800 text-stone-700 dark:text-stone-300 font-medium"
                  >
                    <td className="py-3 font-mono text-[10px] text-slate-500">{tx.id}</td>
                    <td className="py-3 font-mono">{tx.phoneNumber}</td>
                    <td className="py-3 truncate max-w-[200px]">{tx.targetTitle || tx.purpose}</td>
                    <td className="py-3 font-mono text-center font-bold">KES {tx.amount}</td>
                    <td className="py-3 font-mono font-bold text-emerald-600">
                      {tx.mpesaReceiptNumber || "Pending"}
                    </td>
                    <td className="py-3 text-[11px] text-neutral-400 font-mono">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ""}
                    </td>
                    <td className="py-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 text-[9px] font-mono font-bold uppercase">
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
