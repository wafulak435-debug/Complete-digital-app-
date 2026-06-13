import React, { useState, useEffect } from "react";
import { User, SavedDocument } from "../types";
import { Smartphone, Upload, CheckCircle, Download, CreditCard, Play, Eye, ShoppingCart, Check, Trash2, ArrowRight, BookOpen, Clock, AlertCircle, RefreshCw } from "lucide-react";

export interface ZionApp {
  id: string;
  name: string;
  developer: string;
  price: number; // in KSh (Kenya Shilling)
  description: string;
  icon: string; // Emoji representing app icon
  category: "Utilities" | "Games" | "Education" | "Spiritual" | "Finance";
  isApproved: boolean; // Must be approved by Kelvin Opara Wafula/Admin
  isUploadedByUser: boolean;
  codeSource: string; // Dynamic simulated app script logic
  installStatus: "available" | "purchased" | "installed";
}

interface ZionStoreProps {
  currentUser: User | null;
  onLogIn: () => void;
}

export default function ZionStore({ currentUser, onLogIn }: ZionStoreProps) {
  const [apps, setApps] = useState<ZionApp[]>([]);
  const [activeTab, setActiveTab] = useState<"store" | "my-device" | "upload">("store");
  
  // App Creation Form
  const [newAppName, setNewAppName] = useState("");
  const [newAppDeveloper, setNewAppDeveloper] = useState("");
  const [newAppPrice, setNewAppPrice] = useState<number>(150);
  const [newAppDesc, setNewAppDesc] = useState("");
  const [newAppIcon, setNewAppIcon] = useState("📱");
  const [newAppCategory, setNewAppCategory] = useState<ZionApp["category"]>("Utilities");
  const [newAppCode, setNewAppCode] = useState("");

  // App Execution Sandbox
  const [runningApp, setRunningApp] = useState<ZionApp | null>(null);
  const [sandboxInput, setSandboxInput] = useState("");
  const [sandboxLog, setSandboxLog] = useState<string[]>([]);
  const [sandboxValue, setSandboxValue] = useState<any>(null);

  // M-Pesa Checkout Flow
  const [checkoutApp, setCheckoutApp] = useState<ZionApp | null>(null);
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "sending" | "waiting" | "unlocked">("idle");

  const emojiIcons = ["📱", "🧮", "🎮", "📚", "🙏", "💰", "🌐", "✝️", "🍿", "🎙️", "💡", "🩺"];

  // Load apps from localStorage or seed initial high-fidelity apps
  useEffect(() => {
    const saved = localStorage.getItem("ZION_STORE_APPS");
    if (saved) {
      setApps(JSON.parse(saved));
    } else {
      const initialApps: ZionApp[] = [
        {
          id: "app-1",
          name: "Bungoma Tithe & Finance Ledger",
          developer: "Zion Digital Council",
          price: 250,
          description: "Calculate and document monthly tithes, church development pledges, and welfare balances securely offline.",
          icon: "💰",
          category: "Finance",
          isApproved: true,
          isUploadedByUser: false,
          codeSource: "TITHE_APP_V1",
          installStatus: "available"
        },
        {
          id: "app-2",
          name: "Chwele Market Price Monitor",
          developer: "Simiyu Tech Solutions",
          price: 150,
          description: "Real-time cost tracking of wholesale maize, beans, and millet indexes across Bungoma markets.",
          icon: "🌾",
          category: "Utilities",
          isApproved: true,
          isUploadedByUser: false,
          codeSource: "MARKET_APP_V1",
          installStatus: "available"
        },
        {
          id: "app-3",
          name: "Bungoma Highway Retro Racer",
          developer: "Sudi J.",
          price: 0, // Free
          description: "Speed through the vibrant streets of Bungoma dodging local motorbikes in this lightweight 2D mini game.",
          icon: "🎮",
          category: "Games",
          isApproved: true,
          isUploadedByUser: false,
          codeSource: "GAME_APP_V1",
          installStatus: "available"
        },
        {
          id: "app-4",
          name: "Theology Terminology Dictionary",
          developer: "Wafula Academic Labs",
          price: 350,
          description: "Browse academic references and vocabulary for rigorous leadership cohorts and scripture translations.",
          icon: "📚",
          category: "Education",
          isApproved: true,
          isUploadedByUser: false,
          codeSource: "THEOLOGY_DICT_V1",
          installStatus: "available"
        }
      ];
      setApps(initialApps);
      localStorage.setItem("ZION_STORE_APPS", JSON.stringify(initialApps));
    }
  }, []);

  const saveAppsState = (updatedList: ZionApp[]) => {
    setApps(updatedList);
    localStorage.setItem("ZION_STORE_APPS", JSON.stringify(updatedList));
  };

  // Upload custom dynamic app logic
  const handleUploadApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onLogIn();
      return;
    }
    if (!newAppName.trim() || !newAppDesc.trim()) return;

    const newApp: ZionApp = {
      id: "user-app-" + Date.now(),
      name: newAppName.trim(),
      developer: newAppDeveloper.trim() || currentUser.name || "Bungoma Developer",
      price: Number(newAppPrice) || 0,
      description: newAppDesc.trim(),
      icon: newAppIcon,
      category: newAppCategory,
      isApproved: false, // Default to false! Requires Chancellor's Admin Approval
      isUploadedByUser: true,
      codeSource: newAppCode.trim() || "DYNAMIC_CUSTOM_CODE",
      installStatus: "available"
    };

    const updated = [newApp, ...apps];
    saveAppsState(updated);

    // Reset Form
    setNewAppName("");
    setNewAppDeveloper("");
    setNewAppPrice(150);
    setNewAppDesc("");
    setNewAppCode("");
    setActiveTab("store");

    alert("📤 Mobile Package upload logged successfully! Your App '" + newApp.name + "' is staged on the server and is currently pending verification from Chancellor Kelvin Wafula.");
  };

  // M-Pesa Checkout Flow Initiator
  const startMpesaUnlock = (app: ZionApp) => {
    if (!currentUser) {
      onLogIn();
      return;
    }
    setCheckoutApp(app);
    setCheckoutStatus("idle");
    setMpesaPhone("");
  };

  const executeMpesaUnlock = () => {
    if (!checkoutApp) return;
    setCheckoutStatus("sending");

    setTimeout(() => {
      setCheckoutStatus("waiting");
      setTimeout(() => {
        // Unlock app and upgrade status to purchased
        const updated = apps.map(a => {
          if (a.id === checkoutApp.id) {
            return { ...a, installStatus: "purchased" as const };
          }
          return a;
        });
        saveAppsState(updated);
        setCheckoutStatus("unlocked");
        alert("💸 STK Push Verified! KSh " + checkoutApp.price + " loaded successfully. '" + checkoutApp.name + "' has been unlocked and added to your ZION Storage cache!");
        setCheckoutApp(null);
      }, 2500);
    }, 1500);
  };

  // Installs the app inside standard offline container (caches it in localStorage)
  const handleInstallApp = (appId: string) => {
    const updated = apps.map(a => {
      if (a.id === appId) {
        return { ...a, installStatus: "installed" as const };
      }
      return a;
    });
    saveAppsState(updated);
    alert("📥 App container cached and downloaded into your application storage! You can launch this app offline within the sandbox anytime.");
  };

  // Standard sandbox launcher execution
  const launchAppInSandbox = (app: ZionApp) => {
    setRunningApp(app);
    setSandboxInput("");
    setSandboxLog(["[ZION SECURED SANDBOX ENGINE INITIALIZED]", "Running: " + app.name + " (" + app.category + ")", "Status: Isolated local execution secure."]);
    setSandboxValue(null);

    // Seed preset logic
    if (app.codeSource === "TITHE_APP_V1") {
      setSandboxLog(prev => [...prev, "Command ready: Enter your active gross KSh salary to compute your canonical tithe contribution."]);
    } else if (app.codeSource === "MARKET_APP_V1") {
      setSandboxLog(prev => [...prev, "Select constituents: Type 'maize', 'beans', or 'millet' to extract current grain price indexes."]);
    } else if (app.codeSource === "THEOLOGY_DICT_V1") {
      setSandboxLog(prev => [...prev, "Theology Dictionary ready: Type any term e.g. 'hermeneutics' or 'stewardship' to browse."]);
    } else if (app.codeSource === "GAME_APP_V1") {
      setSandboxLog(prev => [...prev, "Retro game started. Use controls below to steer Sudi's racing taxi! Current high score: 140 pts"]);
      setSandboxValue({ score: 0, lives: 3 });
    } else {
      setSandboxLog(prev => [...prev, "Custom script compiled successfully.", "App code signature validated. Standard echo ready."]);
    }
  };

  // Simulates executing the app's isolated logic
  const handleSandboxAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!runningApp || !sandboxInput.trim()) return;

    const query = sandboxInput.trim().toLowerCase();
    setSandboxLog(prev => [...prev, "> " + sandboxInput]);

    if (runningApp.codeSource === "TITHE_APP_V1") {
      const num = parseFloat(query);
      if (isNaN(num)) {
        setSandboxLog(prev => [...prev, "❌ Input error: Please provide a valid numerical figure representing income."]);
      } else {
        const tithe = num * 0.1;
        const remaining = num - tithe;
        setSandboxLog(prev => [
          ...prev,
          `📊 CONTRIBUTION BREAKDOWN:`,
          `- Canonical Tithe (10%): KSh ${tithe.toFixed(1)}`,
          `- Discretionary Remaining Balance: KSh ${remaining.toFixed(1)}`,
          `✓ Click 'Export' to sync this record to your local finances archive.`
        ]);
      }
    } else if (runningApp.codeSource === "MARKET_APP_V1") {
      if (query.includes("maize")) {
        setSandboxLog(prev => [...prev, "🌽 Chwele: KSh 90 / Kg | Webuye: KSh 95 / Kg | Sirisia: KSh 88 / Kg"]);
      } else if (query.includes("beans")) {
        setSandboxLog(prev => [...prev, "🫘 Chwele: KSh 120 / Kg | Webuye: KSh 125 / Kg | Sirisia: KSh 115 / Kg"]);
      } else if (query.includes("millet")) {
        setSandboxLog(prev => [...prev, "🌾 Chwele: KSh 150 / Kg | Webuye: KSh 140 / Kg | Sirisia: KSh 155 / Kg"]);
      } else {
        setSandboxLog(prev => [...prev, "⚠️ Unknown constituent. Try typing: 'maize', 'beans', or 'millet'."]);
      }
    } else if (runningApp.codeSource === "THEOLOGY_DICT_V1") {
      if (query.includes("hermeneutics")) {
        setSandboxLog(prev => [...prev, "📒 HERMENEUTICS: The scientific study and methodology of interpreting scripture texts logically, preserving original theological intent."]);
      } else if (query.includes("stewardship")) {
        setSandboxLog(prev => [...prev, "📒 STEWARDSHIP: The spiritual ethic and practice of responsible planning, managing, and conserving community assets and wisdom."]);
      } else {
        setSandboxLog(prev => [...prev, "⚠️ Term not found. Try searching: 'hermeneutics' or 'stewardship' to extract academic summaries."]);
      }
    } else {
      setSandboxLog(prev => [...prev, "ECHO: \"" + sandboxInput + "\""]);
    }

    setSandboxInput("");
  };

  const handleUninstall = (appId: string) => {
    const updated = apps.map(a => {
      if (a.id === appId) {
        return { ...a, installStatus: "available" as const };
      }
      return a;
    });
    saveAppsState(updated);
    alert("Removed App successfully from local phone caching.");
  };

  return (
    <div id="zion_store_hub" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-stone-200 pb-5 mb-6">
        <div>
          <h2 className="font-display text-2xl font-black text-stone-900 tracking-tight flex items-center gap-1.5">
            <Smartphone className="h-6 w-6 text-red-700" />
            <span>Zion App Store & Isolated Run Sandbox</span>
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Browse, upload, and run custom applications securely inside local storage without cluttering your physical mobile screen.
          </p>
        </div>

        {/* Tab Nav */}
        <div className="flex bg-stone-150 p-1 rounded-xl border border-stone-200 mt-4 md:mt-0 w-fit">
          <button
            onClick={() => setActiveTab("store")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "store" ? "bg-white text-stone-950 shadow-2xs" : "text-stone-500 hover:text-stone-850"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>App Store Grid</span>
          </button>
          <button
            onClick={() => setActiveTab("my-device")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "my-device" ? "bg-white text-stone-950 shadow-2xs" : "text-stone-500 hover:text-stone-850"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Running Offline Sandbox ({apps.filter(a => a.installStatus === "installed").length})</span>
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "upload" ? "bg-white text-stone-950 shadow-2xs" : "text-stone-500 hover:text-stone-850"
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload My App</span>
          </button>
        </div>
      </div>

      {runningApp && (
        <div id="sandbox-active-modal" className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-stone-950 text-white rounded-2xl w-full max-w-lg border border-stone-800 shadow-2xl flex flex-col justify-between overflow-hidden overflow-y-auto max-h-[90vh]">
            
            {/* Title / Close */}
            <div className="bg-stone-900/80 px-5 py-3 border-b border-stone-850 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl">{runningApp.icon}</span>
                <div>
                  <h4 className="font-bold text-xs text-white">{runningApp.name}</h4>
                  <span className="text-[9px] font-mono text-stone-400">Developer: {runningApp.developer}</span>
                </div>
              </div>
              <button
                onClick={() => setRunningApp(null)}
                className="text-stone-400 hover:text-white font-mono text-xs border border-stone-800 bg-stone-900 leading-none py-1.5 px-3 rounded-lg"
              >
                Close Sandbox [ESC]
              </button>
            </div>

            {/* Sandbox main content logs */}
            <div className="p-5 font-mono text-xs space-y-3 min-h-[220px] bg-black">
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {sandboxLog.map((log, idx) => (
                  <p key={idx} className="text-xs text-emerald-400 leading-relaxed font-mono">{log}</p>
                ))}
              </div>

              {runningApp.codeSource === "GAME_APP_V1" && sandboxValue && (
                <div className="bg-stone-900 p-3 rounded-lg border border-stone-800 text-center space-y-2 mt-4 font-sans">
                  <div className="flex items-center justify-around text-xs font-bold">
                    <span>🏎️ SPEED: 120 Kph</span>
                    <span className="text-yellow-400">🔥 SCORE: {sandboxValue.score} pts</span>
                    <span className="text-red-500">❤️ LIVES: {sandboxValue.lives}</span>
                  </div>
                  
                  {sandboxValue.lives > 0 ? (
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => {
                          setSandboxValue((v: any) => ({ ...v, score: v.score + 20 }));
                          setSandboxLog(prev => [...prev, "🏎️ Steered left! Overtook boda boda. +20 points."]);
                        }}
                        className="bg-red-700 text-white text-xs px-3 py-1 rounded hover:bg-red-800 font-bold uppercase"
                      >
                        ← Turn Left
                      </button>
                      <button
                        onClick={() => {
                          setSandboxValue((v: any) => ({ ...v, score: v.score + 30 }));
                          setSandboxLog(prev => [...prev, "🏎️ Excelerated! Cleared Bungoma Highway, +30 points."]);
                        }}
                        className="bg-red-700 text-white text-xs px-3 py-1 rounded hover:bg-red-800 font-bold uppercase"
                      >
                        Steer Right →
                      </button>
                      <button
                        onClick={() => {
                          setSandboxValue((v: any) => ({ ...v, lives: v.lives - 1 }));
                          setSandboxLog(prev => [...prev, "💥 Collision! Hit pothole! Lost 1 life."]);
                        }}
                        className="bg-stone-800 text-stone-400 text-xs px-3 py-1 rounded hover:bg-stone-750 font-bold"
                      >
                        Brake! ⚠️
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-red-500">❌ GAME OVER! Final Score: {sandboxValue.score} Points.</p>
                      <button
                        onClick={() => {
                          setSandboxValue({ score: 0, lives: 3 });
                          setSandboxLog(["[ZION PLATFORM RACE GAME REBOOTED]"]);
                        }}
                        className="text-xs bg-white text-stone-950 px-3 py-1 rounded font-bold"
                      >
                        Restart Game
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input logic */}
            {runningApp.codeSource !== "GAME_APP_V1" && (
              <form onSubmit={handleSandboxAction} className="bg-stone-900 border-t border-stone-850 p-3 flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Type parameters or query..."
                  value={sandboxInput}
                  onChange={(e) => setSandboxInput(e.target.value)}
                  className="flex-grow rounded-lg bg-stone-950 border border-stone-800 p-2 text-xs font-mono text-white outline-none focus:border-red-700"
                />
                <button
                  type="submit"
                  className="bg-red-700 font-bold text-xs text-white px-4 py-2 rounded-lg hover:bg-red-800"
                >
                  Send
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {checkoutApp && (
        <div id="mpesa-checkout-modal" className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl relative border border-stone-200">
            <span className="text-3xl block mb-2">{checkoutApp.icon}</span>
            <h4 className="font-display font-bold text-base text-stone-900">Unlock App: {checkoutApp.name}</h4>
            <p className="text-xs text-stone-500 mt-1">Unlock cost: <strong className="text-stone-850 font-bold">KSh {checkoutApp.price}</strong>. One-time payment, direct download.</p>
            
            <div className="my-5 space-y-3 text-left">
              <label className="text-xs font-semibold text-stone-700 block text-center">Enter Safaricom M-Pesa Phone Number</label>
              <input
                type="tel"
                required
                placeholder="e.g. 0712345678"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                className="w-full text-center rounded-xl border border-stone-250 bg-white p-2.5 font-bold outline-none text-stone-850 focus:border-red-750 text-xs"
              />
            </div>

            {checkoutStatus === "idle" && (
              <button
                type="button"
                onClick={executeMpesaUnlock}
                className="w-full font-display text-xs font-extrabold py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl shadow cursor-pointer transition flex items-center justify-center gap-1 active:scale-95"
              >
                <CreditCard className="h-4 w-4" />
                <span>Initialize M-Pesa Transaction</span>
              </button>
            )}

            {checkoutStatus === "sending" && (
              <div className="p-3 bg-stone-50 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-stone-500">
                <RefreshCw className="h-4 w-4 animate-spin text-stone-400" />
                <span>Pushing STK payload request to handset...</span>
              </div>
            )}

            {checkoutStatus === "waiting" && (
              <div className="p-3 bg-stone-50 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-semibold text-emerald-700">
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-500 mb-1" />
                <span>Payload Pushed. Awaiting MPESA PIN confirmation...</span>
              </div>
            )}

            <button
              onClick={() => setCheckoutApp(null)}
              className="text-xs font-medium text-stone-400 hover:text-stone-700 mt-4 underline block mx-auto py-1"
            >
              Cancel Payment
            </button>
          </div>
        </div>
      )}

      {activeTab === "store" && (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {apps/*.filter(a => a.isApproved)*/.map((a) => {
              const isInstalled = a.installStatus === "installed";
              const isPurchased = a.installStatus === "purchased";
              
              return (
                <div key={a.id} className="bg-white border border-stone-200 hover:border-red-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 relative group shadow-2xs">
                  
                  {/* Category overlay tab */}
                  <span className="absolute top-4 right-4 text-[9px] font-mono font-bold uppercase tracking-wider bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                    {a.category}
                  </span>

                  <div>
                    <span className="text-3xl block mb-2">{a.icon}</span>
                    <h3 className="font-display text-base font-extrabold text-stone-900 group-hover:text-red-700">{a.name}</h3>
                    <p className="text-[10px] text-stone-400 font-mono mt-0.5">Contributor Node: {a.developer}</p>
                    <p className="text-xs text-stone-500 mt-2.5 leading-relaxed font-sans">{a.description}</p>
                  </div>

                  <div className="border-t border-stone-100 pt-3 mt-5 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-mono text-stone-400 block font-bold">VALUATION PRICE</span>
                      <span className="font-mono text-xs font-black text-stone-900">
                        {a.price === 0 ? (
                          <strong className="text-emerald-700 font-bold uppercase">GRATIS [FREE]</strong>
                        ) : (
                          `KSh ${a.price}`
                        )}
                      </span>
                    </div>

                    <div className="flex gap-1.5 items-center">
                      {!a.isApproved ? (
                        <span className="bg-amber-55 text-amber-800 text-[10px] font-sans font-bold uppercase py-1 px-2.5 border border-amber-200 rounded-lg">
                          ⌛ Unapproved
                        </span>
                      ) : isInstalled ? (
                        <div className="flex gap-1 items-center">
                          <button
                            onClick={() => launchAppInSandbox(a)}
                            className="bg-neutral-900 hover:bg-black text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95"
                          >
                            <Play className="h-3.5 w-3.5" />
                            <span>Launch</span>
                          </button>
                        </div>
                      ) : (isPurchased || a.price === 0) ? (
                        <button
                          onClick={() => handleInstallApp(a.id)}
                          className="bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Install</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => startMpesaUnlock(a)}
                          className="bg-red-750 hover:bg-red-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 shadow-2xs"
                        >
                          <ShoppingCart className="h-3.5 w-3.5 text-red-300" />
                          <span>Get App</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "my-device" && (
        <div className="space-y-4">
          {apps.filter(a => a.installStatus === "installed").length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {apps.filter(a => a.installStatus === "installed").map((a) => (
                <div key={a.id} className="bg-white border-2 border-dashed border-stone-250 hover:border-red-500 rounded-2xl p-5 flex flex-col justify-between transition group shadow-2xs">
                  <div>
                    <span className="text-3xl block mb-2">{a.icon}</span>
                    <h3 className="font-display font-extrabold text-sm text-stone-900">{a.name}</h3>
                    <p className="text-[9px] font-mono text-stone-400 mt-1">Local Isolated Package: com.zion.store.{a.codeSource.toLowerCase()}</p>
                    <p className="text-xs text-stone-500 mt-2.5 font-sans leading-relaxed">{a.description}</p>
                  </div>

                  <div className="border-t border-stone-100 pt-3 mt-5 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 rounded px-2 py-0.5 border border-emerald-100">💻 ACTIVE IN CACHE</span>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => launchAppInSandbox(a)}
                        className="bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Launch App</span>
                      </button>
                      <button
                        onClick={() => handleUninstall(a.id)}
                        className="p-1.5 rounded-lg bg-stone-100 border border-stone-200 text-stone-500 hover:bg-red-50 hover:text-red-700"
                        title="Uninstall custom simulation container"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-stone-50 border-2 border-dashed border-stone-200 rounded-2xl max-w-lg mx-auto">
              <Smartphone className="h-10 w-10 text-stone-400 mx-auto animate-bounce mb-3" />
              <h4 className="font-display font-extrabold text-sm text-stone-700">Sandbox Drive is Empty</h4>
              <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed mt-1">
                Go to the App Store catalog Grid and install direct utilities. Running apps here operates strictly inside IndexedDB storage and never clutter your physical home panel screen.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "upload" && (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 max-w-2xl mx-auto">
          <div className="text-left mb-6 border-b border-stone-200 pb-4">
            <span className="text-[10px] font-mono font-bold tracking-widest text-red-700 uppercase">SUBMIT NEW PROGRAM NODE</span>
            <h3 className="font-display font-extrabold text-base text-stone-900 mt-1">Upload App to Zion Marketplace</h3>
            <p className="text-xs text-stone-400 font-medium">Configure APK manifest guidelines, set licensing fee prices, and supply procedural run code blocks. In Kenya regions, members pay to download approved apps.</p>
          </div>

          <form onSubmit={handleUploadApp} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block text-left">App Icon Selection</label>
                <div className="flex gap-2 flex-wrap bg-white rounded-lg p-2.5 border border-stone-250">
                  {emojiIcons.map((ico) => (
                    <button
                      key={ico}
                      type="button"
                      onClick={() => setNewAppIcon(ico)}
                      className={`text-base p-1.5 rounded transition hover:bg-stone-100 ${newAppIcon === ico ? "bg-red-50 border border-red-300 scale-110" : ""}`}
                    >
                      {ico}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block text-left">Category Segment</label>
                <select
                  value={newAppCategory}
                  onChange={(e) => setNewAppCategory(e.target.value as ZionApp["category"])}
                  className="w-full text-xs bg-white border border-stone-250 p-2.5 rounded-lg cursor-pointer outline-none focus:border-red-700"
                >
                  <option value="Utilities">Utilities & Tools</option>
                  <option value="Games">Games & Leisure</option>
                  <option value="Education">Education & Study</option>
                  <option value="Spiritual">Spiritual Preservation</option>
                  <option value="Finance">Finances Ledger</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-bold text-stone-700 block text-left">App Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bungoma Boda Dispatcher"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  className="w-full rounded-xl border border-stone-250 bg-white p-2 text-xs outline-none text-stone-850 focus:border-red-700 font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 block text-left">Price (KSh)</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={5000}
                  placeholder="KES"
                  value={newAppPrice}
                  onChange={(e) => setNewAppPrice(Number(e.target.value))}
                  className="w-full rounded-xl border border-stone-250 bg-white p-2 text-xs outline-none text-stone-850 focus:border-red-700 font-bold font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 block text-left">Description Synopsis</label>
              <textarea
                required
                rows={3}
                placeholder="Give details about your app's main utilities, local cache targets, and operational guidance..."
                value={newAppDesc}
                onChange={(e) => setNewAppDesc(e.target.value)}
                className="w-full rounded-xl border border-stone-250 bg-white p-2.5 text-xs outline-none text-stone-850 focus:border-red-700 font-sans"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 block text-left">Simulated Script Logic System Check</label>
              <textarea
                rows={2}
                placeholder="PROMPT CODE e.g. CONSTANT_INDEX = 12 // Runs inside isolated IndexedDB node sandbox"
                value={newAppCode}
                onChange={(e) => setNewAppCode(e.target.value)}
                className="w-full rounded-xl border border-stone-250 bg-white p-2 text-xs outline-none text-stone-850 focus:border-red-700 font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full font-display text-xs font-extrabold py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl shadow cursor-pointer transition flex items-center justify-center gap-1 active:scale-95"
            >
              <Upload className="h-4 w-4 text-red-300" />
              <span>Publish App to Sandbox Queue</span>
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
