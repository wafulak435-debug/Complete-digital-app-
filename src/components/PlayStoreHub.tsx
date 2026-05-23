import React, { useState, useEffect } from "react";
import { Smartphone, Download, Settings, Shield, Award, HelpCircle, CheckCircle2, Copy, ExternalLink } from "lucide-react";

export default function PlayStoreHub() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isReadyToInstall, setIsReadyToInstall] = useState(false);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

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
                <span>Download App Directly</span>
              </h3>
              <p className="text-xs text-stone-500 font-medium">
                Install Wafula Digital onto your device as a highly responsive offline-ready app.
              </p>
            </div>

            <div className="space-y-3.5 pt-1">
              {isReadyToInstall ? (
                <button
                  onClick={handleInstallApp}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/15 transition-all transform hover:-translate-y-0.5"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Install App on Device</span>
                </button>
              ) : (
                <div className="bg-stone-50 border p-4 rounded-xl text-left space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-slate-500" />
                    <span>PWA Metadata Configured</span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    If you are on an Android device or using Chrome, you can install the app instantly:
                  </p>
                  <ul className="text-[10px] text-stone-600 pl-4 list-disc space-y-1 font-medium">
                    <li>Tap the circular browser menu button (three dots)</li>
                    <li>Select <strong className="text-slate-800">"Install app"</strong> or <strong className="text-slate-800">"Add to Home screen"</strong></li>
                    <li>Launch direct from your home app launcher offline</li>
                  </ul>
                </div>
              )}

              <div className="text-center pt-2">
                <span className="text-[10px] uppercase tracking-widest font-mono text-stone-400 block mb-1 font-semibold">Offline Attributes</span>
                <span className="inline-block bg-slate-100 text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-full border">
                  PWA Compliant: Yes
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
    </div>
  );
}
