import React, { useState, useEffect } from "react";
import { 
  Phone, Key, Terminal, Server, Send, CheckCircle2, 
  XCircle, RefreshCw, FileText, Smartphone, Laptop, 
  HelpCircle, CreditCard, ShieldCheck, Database
} from "lucide-react";
import { Book } from "../types";

interface MpesaApiConsoleProps {
  onUnlockBookManual?: (bookId: string) => void;
  books: Book[];
  currentUser: any;
}

export default function MpesaApiConsole({ onUnlockBookManual, books, currentUser }: MpesaApiConsoleProps) {
  // Config state
  const [consumerKey, setConsumerKey] = useState("mp8sA_Safaricom_Daraja_ConsumerKey_x92k");
  const [consumerSecret, setConsumerSecret] = useState("K92lA_Safaricom_Secret_v38m1_Lnm");
  const [shortcode, setShortcode] = useState("174379");
  const [passkey, setPasskey] = useState("bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919");
  
  // Transaction State
  const [selectedBook, setSelectedBook] = useState<Book | null>(books[0] || null);
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.email ? "0712345678" : "0722000111");
  const [customAmount, setCustomAmount] = useState("200");
  const [accountRef, setAccountRef] = useState("WafulaBooksStore");
  const [transactionDesc, setTransactionDesc] = useState("Ebook Purchase");

  // Step state
  const [simStep, setSimStep] = useState<"idle" | "token" | "stk" | "popup" | "callback" | "success" | "failed">("idle");
  const [pinInput, setPinInput] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [checkoutRequestId, setCheckoutRequestId] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");

  // Payloads displays
  const [tokenPayload, setTokenPayload] = useState("");
  const [stkPayload, setStkPayload] = useState("");
  const [callbackPayload, setCallbackPayload] = useState("");

  // Previous transactions store in localStorage
  const [savedTx, setSavedTx] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("M_PESA_SIM_TRANSACTIONS");
    if (saved) {
      try { return setSavedTx(JSON.parse(saved)); } catch (_) {}
    }
    // Seed templates
    const initialTx = [
      {
        id: "TX_LNM_9281a",
        phoneNumber: "0712345678",
        amount: 200,
        bookTitle: "Children are parents' investment",
        receipt: "RFT9X8W7Y2",
        date: new Date(Date.now() - 3600000 * 2).toLocaleString(),
        status: "COMPLETED"
      },
      {
        id: "TX_LNM_4102d",
        phoneNumber: "0722000111",
        amount: 580,
        bookTitle: "Sapiens: A Brief History of Humankind",
        receipt: "QND1M3B6Z8",
        date: new Date(Date.now() - 3600000 * 24).toLocaleString(),
        status: "COMPLETED"
      }
    ];
    setSavedTx(initialTx);
    localStorage.setItem("M_PESA_SIM_TRANSACTIONS", JSON.stringify(initialTx));
  }, []);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleStartSimulation = () => {
    if (!phoneNumber) {
      alert("Please enter a Safaricom phone number!");
      return;
    }
    setLogs([]);
    setSimStep("token");
    addLog("🔒 Initiating Lipa Na M-Pesa payment pipeline...");
    addLog("🔑 Generating OAuth Access Token from Safaricom API Gateway...");
    
    // Construct dynamic Access Token mock response
    const mockTokenRes = {
      access_token: "daraja_jwt_" + Math.random().toString(36).substr(2, 24),
      expires_in: "3599"
    };
    setTokenPayload(JSON.stringify(mockTokenRes, null, 2));

    setTimeout(() => {
      addLog("✓ Access Token retrieved successfully!");
      addLog("📤 Formulating STK Push (LNM Online) API payload...");
      setSimStep("stk");

      const amountToCharge = selectedBook ? (selectedBook.price || 200) : parseInt(customAmount) || 200;
      const computedRef = selectedBook ? selectedBook.id : accountRef;
      const computedDesc = selectedBook ? `Pay for ${selectedBook.title}` : transactionDesc;
      
      const payloadId = "ws_CO_" + Date.now().toString().substr(4, 8);
      setCheckoutRequestId(payloadId);

      // Secure timestamp
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
      // Password = base64(Shortcode + Passkey + Timestamp)
      const rawPassword = shortcode + passkey + timestamp;
      const b64Password = btoa(unescape(encodeURIComponent(rawPassword))).substring(0, 32);

      const mockStkRequest = {
        BusinessShortCode: shortcode,
        Password: b64Password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amountToCharge,
        PartyA: phoneNumber.replace(/^0/, "254"),
        PartyB: shortcode,
        PhoneNumber: phoneNumber.replace(/^0/, "254"),
        CallBackURL: "https://yourdomain.com/api/v1/mpesa/callback",
        AccountReference: computedRef,
        TransactionDesc: computedDesc
      };
      setStkPayload(JSON.stringify(mockStkRequest, null, 2));

      setTimeout(() => {
        addLog(`✓ STK Push request posted to https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest`);
        addLog(`📱 Emitting STK prompt Signal to Customer phone (${phoneNumber})...`);
        setSimStep("popup");
        setPinInput("");
      }, 2000);

    }, 2000);
  };

  const handleConfirmPin = (userPin: string) => {
    if (userPin.length < 4) {
      alert("Please enter a 4-digit M-Pesa PIN!");
      return;
    }
    addLog("🔒 Mobile PIN verified by Safaricom secure hardware secure-enclave!");
    addLog("⏳ Waiting for Daraja Instant Payment Notification callback...");
    setSimStep("callback");

    const amountCharged = selectedBook ? (selectedBook.price || 200) : parseInt(customAmount) || 200;
    const computedTitle = selectedBook ? selectedBook.title : "Simulated Custom Bill";
    const receipt = "KNL" + Math.random().toString(36).substring(2, 8).toUpperCase() + "7Y";
    setReceiptNumber(receipt);

    const mockCallback = {
      Body: {
        stkCallback: {
          MerchantRequestID: "ws_MR_" + Math.random().toString(36).substring(2, 6),
          CheckoutRequestID: checkoutRequestId,
          ResultCode: 0,
          ResultDesc: "The service request processed successfully.",
          CallbackMetadata: {
            Item: [
              { Name: "Amount", Value: amountCharged },
              { Name: "MpesaReceiptNumber", Value: receipt },
              { Name: "Balance", Value: 0 },
              { Name: "TransactionDate", Value: parseInt(new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)) },
              { Name: "PhoneNumber", Value: phoneNumber.replace(/^0/, "254") }
            ]
          }
        }
      }
    };
    setCallbackPayload(JSON.stringify(mockCallback, null, 2));

    setTimeout(() => {
      addLog("✓ Post Request callback received on /api/v1/mpesa/callback with status 200 OK");
      addLog(`🎉 Transaction approved! Receipt issued: ${receipt}`);
      
      // Save transaction to history
      const newTx = {
        id: "TX_LNM_" + Date.now().toString().substring(8),
        phoneNumber,
        amount: amountCharged,
        bookTitle: computedTitle,
        receipt,
        date: new Date().toLocaleString(),
        status: "COMPLETED"
      };

      const updatedTxs = [newTx, ...savedTx];
      setSavedTx(updatedTxs);
      localStorage.setItem("M_PESA_SIM_TRANSACTIONS", JSON.stringify(updatedTxs));

      // Trigger automatic unlock
      if (selectedBook && onUnlockBookManual) {
        onUnlockBookManual(selectedBook.id);
        addLog(`🔑 eBook "${selectedBook.title}" successfully unlocked for reading!`);
      }

      setSimStep("success");
    }, 2000);
  };

  const handleSimReject = () => {
    addLog("❌ STK Push rejected or cancelled by the user.");
    setSimStep("failed");
  };

  const handleReset = () => {
    setSimStep("idle");
    setLogs([]);
    setTokenPayload("");
    setStkPayload("");
    setCallbackPayload("");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-8" id="mpesa-api-console">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 dark:border-slate-800 pb-5">
        <div className="text-left">
          <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
            Safaricom Daraja API
          </span>
          <h2 className="text-2xl font-black text-stone-900 dark:text-white font-display mt-2">
            Lipa Na M-Pesa Online Sandbox Simulator
          </h2>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed max-w-2xl">
            Simulate and debug the Safaricom M-Pesa dynamic STK Push payment flow for purchasing library eBooks. Inspect JSON request tokens, live device dialogue prompt payloads, and Webhook callback notifications.
          </p>
        </div>
        <div className="flex shrink-0">
          <button 
            onClick={handleReset} 
            className="flex items-center space-x-1.5 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-stone-700 dark:text-stone-300 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset Console</span>
          </button>
        </div>
      </div>

      {/* Main Grid: split between Configuration, Interactive Flow and JSON inspect */}
      <div className="grid gap-6 lg:grid-cols-12 text-left">
        
        {/* LEFT COLUMN: Setup Configuration */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-stone-200 dark:border-slate-800 flex flex-col space-y-4">
          <div className="flex items-center space-x-2 text-stone-800 dark:text-stone-200 font-bold border-b border-stone-100 dark:border-slate-800/80 pb-3">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm uppercase tracking-wide font-display">1. API Keys & Daraja Config</h3>
          </div>

          <div className="space-y-4 text-xs font-medium">
            <div className="space-y-1">
              <label className="text-[11px] text-stone-500 dark:text-slate-400">Consumer Key or Client ID</label>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-3.5 w-3.5 text-stone-400" />
                <input 
                  type="text" 
                  value={consumerKey}
                  onChange={(e) => setConsumerKey(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-850 rounded-xl font-mono text-[11px] text-stone-700 dark:text-stone-300 outline-none focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-stone-500 dark:text-slate-400">Consumer Secret Token</label>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-3.5 w-3.5 text-stone-400" />
                <input 
                  type="password" 
                  value={consumerSecret}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-850 rounded-xl font-mono text-[11px] text-stone-700 dark:text-stone-300 outline-none focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-stone-500 dark:text-slate-400 font-bold">Business Shortcode</label>
                <input 
                  type="text" 
                  value={shortcode}
                  onChange={(e) => setShortcode(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-850 rounded-xl font-mono text-[11px] text-stone-700 dark:text-stone-300 outline-none focus:bg-white text-center font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-stone-500 dark:text-slate-400 font-bold">Lipa Na M-Pesa Passkey</label>
                <input 
                  type="password" 
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-850 rounded-xl font-mono text-[11px] text-stone-700 dark:text-stone-300 outline-none focus:bg-white text-center"
                />
              </div>
            </div>

            <div className="border-t border-stone-100 dark:border-slate-800/80 pt-4 space-y-3">
              <div className="flex items-center space-x-2 text-stone-800 dark:text-stone-200 font-bold mb-1">
                <CreditCard className="h-4 w-4 text-blue-500" />
                <span className="text-xs uppercase tracking-wide font-display">2. Billing Details</span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-stone-500 dark:text-slate-400">Select Ebook for simulated checkout</label>
                <select 
                  className="w-full p-2.5 border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-850 rounded-xl outline-none text-stone-800 dark:text-stone-200 font-semibold"
                  value={selectedBook?.id || ""}
                  onChange={(e) => {
                    const match = books.find(b => b.id === e.target.value);
                    if (match) setSelectedBook(match);
                  }}
                >
                  {books.map(b => (
                    <option key={b.id} value={b.id}>
                      📖 {b.title} (KES {b.price || 200})
                    </option>
                  ))}
                  <option value="">⚙️ Trigger Custom Checkout Billing...</option>
                </select>
              </div>

              {!selectedBook && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500">Amount (KES)</label>
                    <input 
                      type="number" 
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full px-2 py-1 border border-stone-200 dark:border-slate-800 rounded bg-white text-stone-800 font-mono text-center font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500">Account Ref</label>
                    <input 
                      type="text" 
                      value={accountRef}
                      onChange={(e) => setAccountRef(e.target.value)}
                      className="w-full px-2 py-1 border border-stone-200 dark:border-slate-800 rounded bg-white text-stone-800 font-mono text-center"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] text-stone-500 dark:text-slate-400">Safaricom Sim Number (Party A)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-3.5 w-3.5 text-emerald-600 font-bold" />
                  <input 
                    type="text" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 0712345678"
                    className="w-full pl-9 pr-3 py-2 border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-850 rounded-xl font-mono text-[11px] text-stone-700 dark:text-stone-300 outline-none focus:bg-white text-stone-900"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleStartSimulation}
              disabled={simStep !== "idle"}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase tracking-wider rounded-xl shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer mt-4 flex items-center justify-center space-x-1"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Simulate Pay Bill Complete</span>
            </button>
          </div>
        </div>

        {/* CENTER COLUMN: Process Flow & Phone Screen overlay */}
        <div className="lg:col-span-4 bg-stone-50 dark:bg-slate-950 p-5 rounded-2xl border border-stone-200 dark:border-slate-800 flex flex-col justify-between space-y-6">
          <div className="space-y-4 flex-grow flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-stone-250 dark:border-slate-800/80">
              <div className="flex items-center space-x-2 text-stone-800 dark:text-stone-200 font-bold">
                <Terminal className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm uppercase tracking-wide font-display">Run Execution Pipeline</h3>
              </div>
              <span className={`h-2.5 w-2.5 rounded-full ${simStep !== "idle" ? "bg-emerald-500 animate-pulse" : "bg-stone-300"}`} />
            </div>

            {/* Standard Terminal Terminal Logging Container */}
            <div className="flex-grow min-h-[160px] bg-slate-950 text-emerald-400 font-mono text-[11px] p-4 rounded-xl space-y-2 overflow-y-auto border border-slate-800 text-left">
              {logs.length === 0 ? (
                <div className="text-slate-500 flex flex-col items-center justify-center h-full pt-10 text-center">
                  <Terminal className="h-8 w-8 mb-2 opacity-30" />
                  <p>Awaiting STK transaction simulation kickoff...</p>
                </div>
              ) : (
                logs.map((log, i) => <div key={i}>{log}</div>)
              )}
            </div>

            {/* Simulated Smartphone dialogue overlay */}
            <div className="relative mx-auto w-full max-w-[280px]">
              {simStep === "popup" && (
                <div className="w-full bg-[#111] text-white rounded-3xl p-5 border-4 border-neutral-800 shadow-2xl relative animate-in zoom-in-95 duration-150">
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-neutral-800 rounded-full" />
                  
                  <div className="mt-4 pt-1 border-t border-neutral-900 border-none">
                    <div className="h-10 w-10 mx-auto rounded-full bg-emerald-500 flex items-center justify-center text-white font-extrabold text-lg mb-2 shadow-lg shadow-emerald-500/20">
                      M
                    </div>
                    
                    <h4 className="text-xs font-black text-center text-neutral-300 uppercase tracking-widest font-mono">SIMTOOLKIT SAFARICOM</h4>
                    
                    <div className="my-4 p-3 bg-neutral-900 rounded-xl border border-neutral-800 text-[10px] text-center leading-relaxed">
                      Pay <strong className="text-emerald-400 font-mono">KES {selectedBook ? (selectedBook.price || 200) : customAmount}</strong> to <strong className="text-slate-100">Wafula Reads Store</strong>. Enter your M-Pesa PIN:
                    </div>

                    <input 
                      type="password"
                      maxLength={4}
                      placeholder="••••"
                      value={pinInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, "");
                        setPinInput(val);
                        if (val.length === 4) {
                          setTimeout(() => {
                            handleConfirmPin(val);
                          }, 500);
                        }
                      }}
                      className="w-full text-center tracking-[1em] text-sm bg-neutral-900 border border-neutral-850 p-2.5 rounded-lg text-emerald-400 font-bold focus:outline-none placeholder-stone-700"
                    />

                    <p className="text-[8px] text-amber-500 font-medium text-center mt-2 font-mono">Enter any 4 digits to simulate</p>

                    <div className="grid grid-cols-2 gap-2 mt-4 pt-2 border-t border-neutral-900">
                      <button 
                        onClick={handleSimReject}
                        className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-850 text-neutral-400 font-extrabold text-[9px] uppercase tracking-wider text-center flex items-center justify-center cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => handleConfirmPin(pinInput || "1234")}
                        className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[9px] uppercase tracking-wider text-center flex items-center justify-center cursor-pointer"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {simStep === "success" && (
                <div className="w-full bg-slate-900 border border-emerald-500/30 text-white rounded-2xl p-5 shadow-2xl text-center space-y-3 animate-in fade-in duration-300">
                  <div className="h-10 w-10 bg-emerald-950 border border-emerald-500 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-sm font-black">
                    ✓
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-emerald-400 uppercase tracking-widest font-mono">STK PIN UNLOCKED!</h5>
                    <p className="text-[10px] text-stone-400 leading-normal mt-1">
                      The Safaricom wallet instantly transacted, pushing payment details. eBook catalog cleared.
                    </p>
                  </div>
                  <button 
                    onClick={handleReset}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white uppercase text-[9px] font-extrabold rounded-lg tracking-wider"
                  >
                    Simulate Another Transaction
                  </button>
                </div>
              )}

              {simStep === "failed" && (
                <div className="w-full bg-slate-900 border border-red-500/30 text-white rounded-2xl p-5 shadow-2xl text-center space-y-3 animate-in fade-in duration-300">
                  <div className="h-10 w-10 bg-red-950 border border-red-500 text-red-500 rounded-full flex items-center justify-center mx-auto text-sm font-black">
                    ✗
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-red-400 uppercase tracking-widest font-mono">TRANSACTION CANCELLED</h5>
                    <p className="text-[10px] text-stone-400 leading-normal mt-1">
                      User rejected the prompt, or Safaricom API registration timeout happened. Try again.
                    </p>
                  </div>
                  <button 
                    onClick={handleReset}
                    className="w-full py-2 bg-slate-850 hover:bg-slate-800 text-neutral-300 uppercase text-[9px] font-extrabold rounded-lg tracking-wider"
                  >
                    Retry Simulation
                  </button>
                </div>
              )}

              {simStep !== "popup" && simStep !== "success" && simStep !== "failed" && (
                <div className="w-full border-2 border-stone-200 border-dashed rounded-3xl p-6 h-[240px] flex flex-col items-center justify-center text-center text-stone-400">
                  <Smartphone className="h-10 w-10 text-stone-300 animate-bounce" />
                  <p className="text-[9.5px] mt-2 leading-relaxed">
                    Smartphone STK Simulator<br />
                    <span className="text-[8px] text-neutral-500">Kickoff paybill process to display simulated dial prompt</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: JSON Payload Inspectors */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-stone-200 dark:border-slate-800 flex flex-col space-y-4">
          <div className="flex items-center space-x-2 text-stone-800 dark:text-stone-200 font-bold border-b border-stone-100 dark:border-slate-800/80 pb-3">
            <Server className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm uppercase tracking-wide font-display">REST API Payload Inspect</h3>
          </div>

          <div className="space-y-4 text-xs font-medium flex-grow flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[9.5px] font-mono font-black text-blue-600 block uppercase">1. OAuth Token Response (API Gateway)</span>
              <pre className="p-3 bg-stone-50 dark:bg-slate-950 border border-stone-150 dark:border-slate-850 rounded-xl overflow-x-auto text-[9.5px] font-mono text-stone-600 dark:text-stone-400 max-h-[100px] text-left">
                {tokenPayload || "{\n  // Awaiting token issuance loop...\n}"}
              </pre>
            </div>

            <div className="space-y-1">
              <span className="text-[9.5px] font-mono font-black text-rose-600 block uppercase">2. STK Push JSON Payload (/mpesa/stkpush/v1)</span>
              <pre className="p-3 bg-stone-50 dark:bg-slate-950 border border-stone-150 dark:border-slate-850 rounded-xl overflow-x-auto text-[9.5px] font-mono text-stone-600 dark:text-stone-400 max-h-[140px] text-left">
                {stkPayload || "{\n  // Awaiting STK push constructor payload...\n}"}
              </pre>
            </div>

            <div className="space-y-1">
              <span className="text-[9.5px] font-mono font-black text-emerald-600 block uppercase">3. Webhook Callback Payload (To CallbackURL)</span>
              <pre className="p-3 bg-stone-50 dark:bg-slate-950 border border-stone-150 dark:border-slate-850 rounded-xl overflow-x-auto text-[9.5px] font-mono text-stone-600 dark:text-stone-400 max-h-[160px] text-left font-semibold">
                {callbackPayload || "{\n  // Awaiting customer PIN authorization callback...\n}"}
              </pre>
            </div>
          </div>
        </div>

      </div>

      {/* FOOTER SCHEMA TABLE: Ledger Transactions */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-stone-200 dark:border-slate-800 text-left space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2 text-stone-800 dark:text-stone-200 font-bold">
            <Database className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm uppercase tracking-wide font-display">Simulated safaricom transactions ledger</h3>
          </div>
          <span className="text-[10px] font-mono text-stone-400">Count: {savedTx.length} lines</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 dark:border-slate-800 text-stone-500 font-bold">
                <th className="py-2.5">TX ID / Ref</th>
                <th className="py-2.5">Phone Number</th>
                <th className="py-2.5">Item Title</th>
                <th className="py-2.5 text-center">Amount (KES)</th>
                <th className="py-2.5">Receipt Number</th>
                <th className="py-2.5">Processed Time</th>
                <th className="py-2.5 text-center">API Ledger Status</th>
              </tr>
            </thead>
            <tbody>
              {savedTx.map((tx, idx) => (
                <tr key={idx} className="border-b border-stone-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-850/40 text-stone-700 dark:text-stone-300 font-medium">
                  <td className="py-3 font-mono text-[10px] text-slate-500 select-all">{tx.id}</td>
                  <td className="py-3 font-mono">{tx.phoneNumber}</td>
                  <td className="py-3 truncate max-w-[200px]">{tx.bookTitle}</td>
                  <td className="py-3 font-mono text-center font-bold text-slate-800 dark:text-slate-200">KES {tx.amount}</td>
                  <td className="py-3 font-mono font-bold text-emerald-600 select-all">{tx.receipt}</td>
                  <td className="py-3 text-[11px] text-neutral-400 font-mono">{tx.date}</td>
                  <td className="py-3 text-center">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 text-[9px] font-mono font-bold uppercase">
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
