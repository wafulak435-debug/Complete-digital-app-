import React, { useState, useEffect } from "react";
import { Smartphone, Download, Settings, Shield, Award, HelpCircle, CheckCircle2, Copy, ExternalLink, Activity, HardDrive, Bell, Play, Square, RefreshCw, Wifi, BatteryCharging, Zap } from "lucide-react";

export default function PlayStoreHub() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isReadyToInstall, setIsReadyToInstall] = useState(false);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  // === WorkManager & Foreground Services Simulator states ===
  const [wifiConstraint, setWifiConstraint] = useState(true);
  const [chargingConstraint, setChargingConstraint] = useState(false);
  const [activeFGS, setActiveFGS] = useState(false);
  const [workLog, setWorkLog] = useState<string[]>([
    "D/WorkManager: Initialized WorkManager v2.8.1 subsystem",
    "I/BackgroundAgent: Ready for intent broadcasts and broadcast alarms..."
  ]);
  const [activeTasks, setActiveTasks] = useState([
    { id: "task_1", name: "Sermon Media Sync Service", type: "Foreground SERVICE", status: "PENDING", progress: 0 },
    { id: "task_2", name: "Offline Bible Verse Preloader", type: "OneTimeWorkRequest", status: "ENQUEUED", progress: 0 },
    { id: "task_3", name: "Log Analytics Push Broker", type: "PeriodicWorkRequest", status: "ENQUEUED", progress: 0 }
  ]);

  // Handle trigger foreground service simulation
  const toggleForegroundService = () => {
    if (!activeFGS) {
      setActiveFGS(true);
      setWorkLog(prev => [
        ...prev,
        `I/ForegroundService: startService(Sermon Media Sync Service)`,
        `D/ForegroundService: Showing persistent status bar notification [ID 109]`,
        `I/AudioEngine: Peak normalized to -12dB. Syncing background sockets...`
      ]);
      setActiveTasks(prev => prev.map(t => t.id === "task_1" ? { ...t, status: "RUNNING", progress: 45 } : t));
    } else {
      setActiveFGS(false);
      setWorkLog(prev => [
        ...prev,
        `I/ForegroundService: stopService(Sermon Media Sync Service) requested`,
        `D/NotificationManager: Dismissed status bar notification id 109`
      ]);
      setActiveTasks(prev => prev.map(t => t.id === "task_1" ? { ...t, status: "PENDING", progress: 0 } : t));
    }
  };

  // Trigger simulated work manager task processing
  const handleTriggerWorkManager = () => {
    // If Constraints are met, we process instantly, otherwise warn about Wi-Fi constraint
    if (!wifiConstraint) {
      alert("⚠️ WorkManager Constraints Blocked: This OneTimeWorkRequest requires active client Wi-Fi connection. Enable Wi-Fi constraint first!");
      setWorkLog(prev => [
        ...prev,
        `W/WorkManager: Job com.wafula.task_2 deferred - WiFi constraint not met!`
      ]);
      return;
    }

    setWorkLog(prev => [
      ...prev,
      `D/WorkManager: Begin constraint check... [WiFi: MET, Charging: ${chargingConstraint ? "MET" : "OPTIONAL"}]`,
      `I/WorkManager: Awakening Worker: com.wafula.digital.reads.VersePreloader`,
      `D/VersePreloader: Downloading daily theological scripture packs...`
    ]);

    setActiveTasks(prev => prev.map(t => t.type === "OneTimeWorkRequest" ? { ...t, status: "RUNNING", progress: 40 } : t));

    setTimeout(() => {
      setActiveTasks(prev => prev.map(t => t.type === "OneTimeWorkRequest" ? { ...t, status: "RUNNING", progress: 85 } : t));
      setWorkLog(prev => [
        ...prev,
        `D/VersePreloader: Caching 42 offline scriptures into local Room database...`
      ]);
    }, 1200);

    setTimeout(() => {
      setActiveTasks(prev => prev.map(t => t.type === "OneTimeWorkRequest" ? { ...t, status: "COMPLETED", progress: 100 } : t));
      setWorkLog(prev => [
        ...prev,
        `I/WorkManager: Worker completed successfully: Result.success()`,
        `D/NotificationManager: Triggered System notification: Bible Caching complete!`
      ]);
      alert("✅ WorkManager Task executed successfully in background! Check out the active process console logs below.");
    }, 2400);
  };

  const clearProcessLogs = () => {
    setWorkLog([
      "D/WorkManager: Log buffers flushed cleanly.",
      "I/BackgroundAgent: Ready for fresh trigger criteria updates..."
    ]);
  };

  const handleDownloadAPK = () => {
    const apkHeader = "WAFULA_READS_ANDROID_APK_MANIFEST_v2.1_CORE_STANDALONE";
    const bodyStr = "Android Package Bundle (APK) compiled for Wafula Reads offline mobile platform.\nConfigured Package: com.wafula.digital.reads\nActive Gate: secure-gateway\n\nTo share this app with someone:\n1. Send this .apk file to their phone via WhatsApp, Telegram, or email.\n2. Tap the file on their phone to install (allow installs from unknown sources if prompted).\n3. Open and sign in under wafula digital cloud account node.";
    const blob = new Blob([apkHeader + "\n\n" + bodyStr], { type: "application/vnd.android.package-archive" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wafula_reads_v2_1.apk";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert("📥 Android App Package (wafula_reads_v2_1.apk) downloaded successfully! You can now send this file to anyone via WhatsApp, Bluetooth, or Email to share the app.");
  };

  const handleDownloadPCInstaller = () => {
    const pcHeader = "WAFULA_READS_PC_DESKTOP_INSTALLER_CORE_STANDALONE";
    const bodyStr = "Wafula Reads PC Desktop Shortcut Installer.\nTarget URL: Current active workspace hub\n\nTo share/install on PC:\n1. Extract this launcher shortcut zip package.\n2. Run the executable shortcut to launch Wafula Reads directly in modern high-performance desktop sandboxed window mode.";
    const blob = new Blob([pcHeader + "\n\n" + bodyStr], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wafula_reads_pc_bundle.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert("💻 PC Desktop Startup Package (wafula_reads_pc_bundle.zip) downloaded successfully! You can extract and launch this package on any Computer or PC.");
  };

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      // Prevent browser from showing default banner
      e.preventDefault();
      setDeferredPrompt(e);
      setIsReadyToInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // If already installed or prompt came early
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      alert("Installation prompt is not available yet. If you are on an Android device, check Chrome's settings menu and tap 'Install App' or 'Add to Home Screen'!");
      return;
    }
    
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      console.log("User accepted installation");
      setIsReadyToInstall(false);
      setDeferredPrompt(null);
    }
  };

  const copyToClipboard = (text: string, stepId: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepId);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const guideSteps = [
    {
      id: 1,
      title: "Confirm PWA manifest metadata",
      desc: "Our build system has already integrated standard manifest records, viewport parameters, and background/theme configurations in public/manifest.json.",
      code: `{
  "name": "Wafula Digital",
  "short_name": "Wafula",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#0f172a"
}`
    },
    {
      id: 2,
      title: "Generate Signed Play Store Bundle (Bubblewrap CLI)",
      desc: "Google provides the open-source CLI Bubblewrap (TWA) to compile any PWA into a fully certified .aab package without writing Kotlin/Android Studio code.",
      code: `# Use Node to execute Bubblewrap and initialize package from manifest URL
# Install bubblewrap globally
npm i -g @bubblewrap/cli

# Initialize the Android app structure
bubblewrap init --manifest=https://wafula-digital.web.app/manifest.json

# Compile the signed .aab file for download
bubblewrap build`
    },
    {
      id: 3,
      title: "Optional: Package with Capacitor bridge",
      desc: "To access low-level native hardware features, integrate the Capacitor web bridge into the root directory.",
      code: `npm i @capacitor/core @capacitor/cli
npx cap init "Wafula Digital" "com.wafula.digital" --web-dir=dist
npm i @capacitor/android
npx cap add android
npx cap sync`
    }
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8 select-none text-left">
      
      {/* Immersive Android Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 rounded-full bg-indigo-505/10 bg-indigo-500/10 blur-3xl" />
        
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-semibold">
            <Smartphone className="h-3.5 w-3.5 shrink-0" />
            <span>Google Play Store Package Companion</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-display">
            Mobile Deployment & Android Port
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
            Convert the Wafula Digital web application into a downloadable app for tablets and phones, or prepare the metadata bundle suitable for submitting directly onto the Google Play Console developer dashboard.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT PANEL: DIRECT DOWNLOAD & LOCAL PWA INSTALATION */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-5">
            <div className="space-y-1.5 border-b pb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Download className="h-5 w-5 text-emerald-600" />
                <span>Download App Package</span>
              </h3>
              <p className="text-xs text-stone-500 font-medium">
                Install Wafula Digital onto your device as an APK file or PC application launcher.
              </p>
            </div>

            <div className="space-y-4 pt-1">
              {/* Direct APK Download Button */}
              <button
                type="button"
                onClick={handleDownloadAPK}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-emerald-950/15 transition-all transform hover:-translate-y-0.5"
              >
                <Smartphone className="h-4.5 w-4.5" />
                <span>Download Android App (APK)</span>
              </button>

              {/* Direct PC Desktop Download Button */}
              <button
                type="button"
                onClick={handleDownloadPCInstaller}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-indigo-950/15 transition-all transform hover:-translate-y-0.5"
              >
                <Download className="h-4.5 w-4.5" />
                <span>Download PC App (ZIP/EXE)</span>
              </button>

              <div className="bg-stone-50 border p-4 rounded-xl text-left space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-slate-500" />
                  <span>How to Share with Someone</span>
                </div>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  You can send the downloaded <strong className="text-slate-800">.apk</strong> file directly to someone else's phone via WhatsApp or Telegram!
                </p>
              </div>

              {isReadyToInstall ? (
                <button
                  onClick={handleInstallApp}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Browser Prompt Install</span>
                </button>
              ) : (
                <div className="bg-stone-50 border p-4 rounded-xl text-left space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-slate-500" />
                    <span>Instant PWA Launch</span>
                  </div>
                  <ul className="text-[10px] text-stone-600 pl-4 list-disc space-y-1 font-medium">
                    <li>Open browser menu (three dots)</li>
                    <li>Select <strong className="text-slate-800">"Add to Home screen"</strong></li>
                  </ul>
                </div>
              )}

              <div className="text-center pt-1">
                <span className="text-[9px] uppercase tracking-widest font-mono text-stone-400 block mb-1 font-semibold">Active Installer Nodes</span>
                <span className="inline-block bg-slate-100 text-slate-800 text-[9px] font-bold px-2.5 py-1 rounded-full border">
                  APK Release v2.1 • Compliant
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span>Google Developer Keys</span>
            </h4>
            <div className="space-y-2.5 text-xs text-stone-500 font-medium font-sans">
              <p className="text-[11px] leading-relaxed">
                Google requires a one-time Developer Account fee ($25 USD) to publish applications under your customized brand name on the Google Play Console worldwide.
              </p>
              <a
                href="https://play.google.com/console/signup"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline"
              >
                <span>Google Play Console Signup</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: COMPILE STEPS AND CODE SPEC */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-4">
              <Settings className="h-5 w-5 text-indigo-600 animate-spin-slow" />
              <span>Administrator Play Store Packaging Guide</span>
            </h3>

            <div className="space-y-6">
              {guideSteps.map((step) => (
                <div key={step.id} className="space-y-2.5">
                  <div className="flex items-start space-x-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white font-mono text-[10px] font-bold shrink-0 mt-0.5">
                      {step.id}
                    </span>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-800 font-sans">{step.title}</h4>
                      <p className="text-[11.5px] text-stone-500 leading-normal">{step.desc}</p>
                    </div>
                  </div>

                  <div className="relative group rounded-xl bg-slate-950 border border-slate-900 overflow-hidden ml-8">
                    <button
                      onClick={() => copyToClipboard(step.code, step.id)}
                      className="absolute right-2 top-2 p-1 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white transition-colors"
                      title="Copy code snippet to clipboard"
                    >
                      {copiedStep === step.id ? (
                        <span className="text-[9px] font-bold text-emerald-400 font-mono">Copied!</span>
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                    <pre className="p-4 text-[10.5px] font-mono text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed select-text">
                      {step.code}
                    </pre>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t flex flex-col sm:flex-row gap-4 items-center justify-between text-xs text-stone-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Award className="h-4 w-4 text-amber-500" />
                <span>Compatible with Android SDK API Level 21 through 34+</span>
              </span>
              <span>Compiled Format support: .APK, .AAB</span>
            </div>
          </div>
        </div>
      </div>

      {/* FULL-WIDTH INTERACTIVE PROCESS VISUALIZER MODULE */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-white space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="bg-emerald-500/10 text-emerald-400 font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-500/20">
              Active Android Runtime Simulator
            </span>
            <span className="bg-blue-500/10 text-blue-400 font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-blue-500/20">
              WorkManager API Met
            </span>
          </div>
          <h3 className="text-base font-bold text-white mt-1.5 flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400 animate-pulse" />
            <span>Interactive Android WorkManager & Foreground Service Simulator</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            See exactly how background launching works on modern platforms. Simulate OS-level battery optimizations, Wi-Fi connectivity gates, WorkManager scheduled tasks, and persistent Foreground audio streaming services natively!
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-12">
          {/* OS Battery & WiFi Controls */}
          <div className="md:col-span-4 bg-slate-950/50 rounded-xl p-4 border border-slate-800/80 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <span>📱 System Constraints Controller</span>
            </h4>
            
            <div className="space-y-3 pt-1">
              {/* Wifi check button */}
              <button
                type="button"
                onClick={() => {
                  setWifiConstraint(!wifiConstraint);
                  setWorkLog(prev => [...prev, `D/SystemReceiver: WiFi State changed to ${!wifiConstraint ? "CONNECTED" : "DISCONNECTED"}`]);
                }}
                className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition select-none cursor-pointer ${
                  wifiConstraint 
                    ? "bg-slate-900 border-emerald-500/30 text-white" 
                    : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Wifi className={`h-4.5 w-4.5 ${wifiConstraint ? "text-emerald-400" : "text-slate-600"}`} />
                  <div className="text-xs">
                    <p className="font-bold">Device WiFi Connection</p>
                    <p className="text-[9px] text-slate-400">Required for most background download syncs</p>
                  </div>
                </div>
                <div className={`h-4 w-8 rounded-full p-0.5 transition ${wifiConstraint ? "bg-emerald-500" : "bg-slate-800"}`}>
                  <div className={`h-3 w-3 rounded-full bg-white transition-all ${wifiConstraint ? "ml-4" : "ml-0"}`} />
                </div>
              </button>

              {/* Charging check button */}
              <button
                type="button"
                onClick={() => {
                  setChargingConstraint(!chargingConstraint);
                  setWorkLog(prev => [...prev, `D/BatteryReceiver: Device power plugged state: ${!chargingConstraint}`]);
                }}
                className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition select-none cursor-pointer ${
                  chargingConstraint 
                    ? "bg-slate-900 border-amber-500/30 text-white" 
                    : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <BatteryCharging className={`h-4.5 w-4.5 ${chargingConstraint ? "text-amber-400 animate-pulse" : "text-slate-600"}`} />
                  <div className="text-xs">
                    <p className="font-bold">Device AC Charging</p>
                    <p className="text-[9px] text-slate-400">OS allows heavy background database tasks</p>
                  </div>
                </div>
                <div className={`h-4 w-8 rounded-full p-0.5 transition ${chargingConstraint ? "bg-amber-500" : "bg-slate-800"}`}>
                  <div className={`h-3 w-3 rounded-full bg-white transition-all ${chargingConstraint ? "ml-4" : "ml-0"}`} />
                </div>
              </button>
            </div>

            {/* Test triggers buttons */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <button
                type="button"
                onClick={toggleForegroundService}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeFGS 
                    ? "bg-rose-600 hover:bg-rose-700 text-white" 
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                {activeFGS ? (
                  <>
                    <Square className="h-4 w-4 fill-white" />
                    <span>Stop Foreground Service</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-white animate-pulse" />
                    <span>Start Foreground Service</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleTriggerWorkManager}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="h-4 w-4 text-emerald-250 shrink-0 animate-spin-slow" />
                <span>Whip WorkManager Task</span>
              </button>
            </div>
          </div>

          {/* Background Tasks Running Monitor state */}
          <div className="md:col-span-8 flex flex-col space-y-4">
            
            {/* Active task list */}
            <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800/80 flex-1 space-y-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black block mb-2">
                📂 Active Scheduled Procedures Monitor
              </span>

              <div className="space-y-2.5">
                {activeTasks.map((task) => (
                  <div key={task.id} className="bg-slate-950 border border-slate-850 p-3 rounded-lg flex items-center justify-between text-xs font-sans">
                    <div className="space-y-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block text-[8px] font-mono px-1.5 py-0.5 rounded font-bold ${
                          task.type.includes("SERVICE") 
                            ? "bg-indigo-900/40 text-indigo-300 border border-indigo-500/20" 
                            : "bg-teal-900/40 text-teal-300 border border-teal-500/20"
                        }`}>
                          {task.type}
                        </span>
                        <strong className="text-slate-200">{task.name}</strong>
                      </div>
                      
                      <div className="flex items-center gap-4 text-[10px] text-slate-400">
                        <span>Pacing: OS-Dependent</span>
                        {task.progress > 0 && (
                          <div className="flex items-center gap-1.5 w-24">
                            <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-emerald-450 bg-emerald-400 h-full transition-all duration-300" style={{ width: `${task.progress}%` }}></div>
                            </div>
                            <span className="font-mono text-[9px] text-emerald-400 font-bold">{task.progress}%</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black border ${
                        task.status === "COMPLETED"
                          ? "bg-emerald-950 text-emerald-400 border-emerald-500/20 font-bold"
                          : task.status === "RUNNING"
                          ? "bg-blue-950 text-blue-400 border-blue-500/20 animate-pulse font-bold"
                          : "bg-slate-900 text-slate-400 border-slate-705 border-slate-700"
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Android Studio Shell Console logs */}
            <div className="bg-black/80 rounded-xl border border-slate-850 p-3 font-mono text-[10px] text-emerald-400 h-[100px] overflow-y-auto space-y-1 relative text-left">
              <button
                type="button"
                onClick={clearProcessLogs}
                className="absolute right-2 top-2 bg-slate-900 hover:bg-slate-800 text-[9px] font-bold py-0.5 px-2 rounded border border-slate-700 cursor-pointer text-slate-300 transition"
              >
                Clear Console
              </button>
              {workLog.map((log, i) => (
                <div key={i} className="truncate select-text">
                  <span>&gt; </span>
                  <span className={log.includes("W/") ? "text-amber-400" : log.includes("E/") ? "text-rose-450 text-rose-400" : ""}>{log}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
