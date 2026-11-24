import React, { useEffect, useState } from "react";
import {
  supabase,
  isSupabaseConfigured,
  ensureUserProfile,
  mapProfileToAppUser,
} from "../lib/supabaseClient";
import { secureApiFetch, setSessionToken } from "../lib/aiClient";
import {
  loadShowcaseLocal,
  fetchShowcaseFromServer,
  subscribeShowcaseUpdates,
  type SiteShowcaseConfig,
} from "../lib/showcase";
import zionLogo from "../assets/images/zion_digital_logo_1781070536038.png";
import type { User } from "../types";
import {
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  KeyRound,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  HardDrive,
  Smartphone,
  BookOpen,
} from "lucide-react";

interface AuthScreenProps {
  onAuthenticated: (user: User, methodLabel: string) => void;
  onDemoFallbackLogin?: (user: User, methodLabel: string) => void;
}

export default function AuthScreen({
  onAuthenticated,
  onDemoFallbackLogin,
}: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "signup" | "reset" | "admin">("login");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminClaimRequired, setAdminClaimRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Live 2-second editorial showcase carousel synced with Manager Portal & server
  const [showcase, setShowcase] = useState<SiteShowcaseConfig>(() => loadShowcaseLocal());
  const [slideIndex, setSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    secureApiFetch("/api/auth/bootstrap-status")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          setAdminClaimRequired(Boolean(data.adminClaimRequired));
        }
      })
      .catch(() => {});

    fetchShowcaseFromServer().then(setShowcase);
    return subscribeShowcaseUpdates(setShowcase);
  }, []);

  const slides = showcase.slides;
  const activeSlide = slides[slideIndex % Math.max(1, slides.length)] || slides[0];
  const slideDuration = Math.max(1500, showcase.intervalMs || 2000);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % slides.length);
    }, slideDuration);
    return () => window.clearInterval(timer);
  }, [isPaused, slides.length, slideDuration]);

  const exchangeServerSession = async (body: Record<string, any>): Promise<User> => {
    const res = await secureApiFetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data?.success || !data?.user) {
      throw new Error(data?.error || "Authentication failed. Please check your credentials.");
    }
    if (data.sessionToken) {
      setSessionToken(data.sessionToken);
    }
    return data.user as User;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (mode === "admin") {
      if (password.length < (adminClaimRequired ? 8 : 1)) {
        setErrorMsg(
          adminClaimRequired
            ? "Choose an administrator passcode of at least 8 characters."
            : "Please enter your administrator passcode."
        );
        return;
      }
      setIsLoading(true);
      try {
        const verifiedAdmin = await exchangeServerSession({
          mode: adminClaimRequired ? "bootstrap_admin" : "admin_passcode",
          email: trimmedEmail,
          passcode: password,
          name: fullName.trim() || undefined,
        });
        setAdminClaimRequired(false);
        onAuthenticated(verifiedAdmin, "Verified Principal Admin");
      } catch (err: any) {
        setErrorMsg(err?.message || "Administrator verification failed.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      if (mode === "reset") {
        setSuccessMsg(
          `Preview Mode: Configure Supabase environment variables to send live password reset emails for ${trimmedEmail}.`
        );
        return;
      }

      setIsLoading(true);
      try {
        const serverUser = await exchangeServerSession({
          mode: mode === "signup" ? "register" : "login",
          email: trimmedEmail,
          password,
          name: fullName.trim() || undefined,
          phone: phoneNumber.trim() || undefined,
        });
        const mergedUser: User = {
          ...serverUser,
          phone_number: phoneNumber.trim() || serverUser.phone_number,
          subscription_status: "free",
          plan_name: "Kenya Hub Member",
          credits: 50,
          readingStreak: 1,
          dailyGoalMinutes: 30,
        };
        (onDemoFallbackLogin || onAuthenticated)(
          mergedUser,
          mode === "signup" ? "Account Registered" : "Account Sign-In"
        );
      } catch (err: any) {
        setErrorMsg(err?.message || "Authentication failed. Please verify your email and password.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    try {
      if (mode === "reset") {
        const redirectTo = `${window.location.origin}/`;
        const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo,
        });
        if (error) throw error;
        setSuccessMsg(
          `Password reset link sent to ${trimmedEmail}. Please check your inbox and spam folder.`
        );
        return;
      }

      if (mode === "signup") {
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters long.");
        }
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim() || trimmedEmail.split("@")[0],
              phone_number: phoneNumber.trim() || null,
            },
          },
        });
        if (error) throw error;

        if (data.user && data.session) {
          const profile = await ensureUserProfile(data.user);
          const appUser = mapProfileToAppUser(data.user, profile);
          const serverSynced = await exchangeServerSession({
            mode: "supabase",
            accessToken: data.session.access_token,
          });
          onAuthenticated(
            {
              ...appUser,
              role: serverSynced.role,
              isMainAdmin: serverSynced.isMainAdmin,
              permissions: serverSynced.permissions,
              authorizedCourses: serverSynced.authorizedCourses,
            },
            "Supabase Sign-Up"
          );
        } else {
          setSuccessMsg(
            `Account created for ${trimmedEmail}! Check your email to confirm your account, then sign in.`
          );
          setMode("login");
        }
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (error) throw error;
      if (!data.user || !data.session) throw new Error("Could not retrieve user session.");

      const profile = await ensureUserProfile(data.user);
      const appUser = mapProfileToAppUser(data.user, profile);
      const serverSynced = await exchangeServerSession({
        mode: "supabase",
        accessToken: data.session.access_token,
      });
      onAuthenticated(
        {
          ...appUser,
          role: serverSynced.role,
          isMainAdmin: serverSynced.isMainAdmin,
          permissions: serverSynced.permissions,
          authorizedCourses: serverSynced.authorizedCourses,
        },
        "Supabase Email Login"
      );
    } catch (err: any) {
      setErrorMsg(err?.message || "Authentication failed. Please verify your details.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleOAuth = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!isSupabaseConfigured || !supabase) {
      setErrorMsg(
        "Google Sign-In requires Supabase Auth configuration in production, or use Email Sign-In / Instant Member Preview."
      );
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err?.message || "Google sign-in failed. Ensure Google OAuth is enabled in Supabase.");
      setIsLoading(false);
    }
  };

  const handleQuickDemoAccess = async () => {
    setErrorMsg("");
    setIsLoading(true);
    try {
      const serverDemoUser = await exchangeServerSession({ mode: "demo_member" });
      const demoUser: User = {
        ...serverDemoUser,
        phone_number: "+254712345678",
        subscription_status: "free",
        plan_name: "Member Preview",
        credits: 50,
        readingStreak: 1,
        dailyGoalMinutes: 30,
      };
      (onDemoFallbackLogin || onAuthenticated)(demoUser, "Demo Member Preview");
    } catch (err: any) {
      setErrorMsg(err?.message || "Could not start demo member session.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#1F1B18] font-sans antialiased">
      {/* Top Editorial Identity Bar */}
      <header className="border-b border-[#E7E1D8] bg-[#FAF8F4]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={zionLogo}
              alt="Zion Digital"
              className="h-9 w-9 rounded-full object-cover border border-[#E7E1D8]"
            />
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-lg font-bold text-[#1F1B18]">Zion</span>
              <span className="font-mono text-[11px] tracking-[0.22em] text-[#6E655E] uppercase">
                Digital
              </span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-5 text-xs text-[#6E655E]">
            <span>Books &amp; Publishing</span>
            <span>Leadership &amp; Bible School</span>
            <span>Sermons &amp; Video Hub</span>
            <span className="font-medium text-[#A8421B]">{showcase.slogan}</span>
          </div>
        </div>
      </header>

      {/* Split Editorial Showcase + Sign-In Card */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Live 2-Second Editorial Slideshow & Vision/Mission */}
          <section className="lg:col-span-7 space-y-6 text-left">
            <div className="space-y-3">
              <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-[#A8421B] font-medium">
                {showcase.heroEyebrow}
              </p>
              <h1 className="font-serif text-3xl sm:text-5xl font-bold leading-[1.08] text-[#1F1B18]">
                {showcase.heroTitleLead}
                <br />
                <span className="italic font-semibold text-[#A8421B]">
                  {showcase.heroTitleAccent}
                </span>
              </h1>
              <p className="text-sm sm:text-[15px] text-[#6E655E] max-w-xl leading-relaxed">
                {showcase.heroDescription}
              </p>
            </div>

            {/* 2-Second Auto-Sliding Visual Showcase */}
            {activeSlide && (
              <div
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                className="rounded-2xl border border-[#E7E1D8] bg-white shadow-sm overflow-hidden"
              >
                <div className="px-4 sm:px-5 py-3.5 border-b border-[#E7E1D8] flex items-center justify-between gap-3 bg-[#F7F4EE]">
                  <div>
                    <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#A8421B] font-semibold block">
                      {activeSlide.category}
                    </span>
                    <h2 className="font-serif text-lg sm:text-xl font-semibold text-[#1F1B18] leading-snug">
                      {activeSlide.title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setSlideIndex((prev) => (prev - 1 + slides.length) % slides.length)
                      }
                      aria-label="Previous highlight"
                      className="h-8 w-8 rounded-full border border-[#E7E1D8] bg-white hover:bg-[#FAF8F4] text-[#1F1B18] flex items-center justify-center cursor-pointer transition"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="font-mono text-xs tabular-nums text-[#6E655E] px-1">
                      {String(slideIndex + 1).padStart(2, "0")} /{" "}
                      {String(slides.length).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSlideIndex((prev) => (prev + 1) % slides.length)}
                      aria-label="Next highlight"
                      className="h-8 w-8 rounded-full border border-[#E7E1D8] bg-white hover:bg-[#FAF8F4] text-[#1F1B18] flex items-center justify-center cursor-pointer transition"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="relative aspect-[16/9] w-full bg-[#EFEAE1] overflow-hidden">
                  {slides.map((s, idx) => (
                    <img
                      key={s.id}
                      src={s.imageUrl}
                      alt={s.title}
                      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                        idx === slideIndex ? "opacity-100" : "opacity-0 pointer-events-none"
                      }`}
                    />
                  ))}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1F1B18]/85 via-[#1F1B18]/40 to-transparent p-4 sm:p-5 text-white">
                    <p className="text-xs sm:text-sm text-[#FAF8F4]/95 leading-relaxed max-w-lg">
                      {activeSlide.subtitle}
                    </p>
                  </div>
                </div>

                {/* Slide selector tabs */}
                <div className="px-4 py-3 bg-[#FAF8F4] flex flex-wrap items-center justify-between gap-2 border-t border-[#E7E1D8]">
                  <div className="flex flex-wrap gap-1.5">
                    {slides.map((s, idx) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSlideIndex(idx)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                          idx === slideIndex
                            ? "bg-[#A8421B] text-white"
                            : "bg-white border border-[#E7E1D8] text-[#6E655E] hover:text-[#1F1B18]"
                        }`}
                      >
                        {s.category}
                      </button>
                    ))}
                  </div>
                  <span className="font-mono text-[10px] text-[#6E655E] tabular-nums">
                    Auto-advances every {(slideDuration / 1000).toFixed(0)}s
                  </span>
                </div>
              </div>
            )}

            {/* Vision, Mission & Slogan Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="rounded-xl border border-[#E7E1D8] bg-white p-4 space-y-1.5">
                <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-[#A8421B] font-semibold">
                  Our Vision
                </span>
                <p className="text-xs text-[#6E655E] leading-relaxed">{showcase.vision}</p>
              </div>
              <div className="rounded-xl border border-[#E7E1D8] bg-white p-4 space-y-1.5">
                <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-[#A8421B] font-semibold">
                  Our Mission
                </span>
                <p className="text-xs text-[#6E655E] leading-relaxed">{showcase.mission}</p>
              </div>
              <div className="rounded-xl border border-[#E7E1D8] bg-white p-4 space-y-1.5">
                <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-[#A8421B] font-semibold">
                  Slogan
                </span>
                <p className="font-serif italic text-base font-semibold text-[#1F1B18]">
                  "{showcase.slogan}"
                </p>
                <p className="text-[11px] text-[#6E655E]">{showcase.tagline}</p>
              </div>
            </div>

            {/* Supported Payment & Storage Providers */}
            <div className="rounded-xl border border-[#E7E1D8] bg-[#F7F4EE] p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-[#1F1B18] font-semibold">
                <CreditCard className="h-4 w-4 text-[#A8421B]" />
                <span>Payments &amp; Cloud Storage Ready</span>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] text-[#6E655E]">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-[#E7E1D8]">
                  <Smartphone className="h-3 w-3 text-[#2E7D32]" />
                  Safaricom M-Pesa STK (KES)
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-[#E7E1D8]">
                  <CreditCard className="h-3 w-3 text-[#A8421B]" />
                  Paystack Cards &amp; Mobile Money
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-[#E7E1D8]">
                  <HardDrive className="h-3 w-3 text-[#1F1B18]" />
                  Supabase Vault &amp; Offline IndexedDB
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-[#E7E1D8]">
                  <BookOpen className="h-3 w-3 text-[#A8421B]" />
                  66-Book NIV Bible Included
                </span>
              </div>
            </div>
          </section>

          {/* RIGHT: Clean Sign-In / Registration Card */}
          <section className="lg:col-span-5 space-y-4">
            {!isSupabaseConfigured && (
              <div className="rounded-xl border border-[#E7C6B6] bg-[#FBF1EB] p-3.5 text-left text-xs text-[#5E2812] flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-[#A8421B] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-[11px] uppercase tracking-wider text-[#A8421B]">
                    Server Session Mode
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Configure <code className="bg-white/70 px-1 rounded">VITE_SUPABASE_URL</code> and{" "}
                    <code className="bg-white/70 px-1 rounded">VITE_SUPABASE_PUBLISHABLE_KEY</code> (or{" "}
                    <code className="bg-white/70 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>) to connect external cloud authentication.
                  </p>
                </div>
              </div>
            )}

            <div className="w-full bg-white border border-[#E7E1D8] rounded-2xl p-6 sm:p-7 shadow-sm">
              <div className="flex items-center gap-3 pb-5 mb-5 border-b border-[#E7E1D8] text-left">
                <img
                  src={zionLogo}
                  alt="Zion Digital"
                  className="h-11 w-11 rounded-full object-cover border border-[#E7E1D8]"
                />
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#1F1B18]">
                    {mode === "login"
                      ? "Welcome Back"
                      : mode === "signup"
                      ? "Join Zion Digital"
                      : mode === "admin"
                      ? "Administrator Sign-In"
                      : "Reset Password"}
                  </h2>
                  <p className="text-xs text-[#6E655E]">
                    Access your books, Bible study, academy cohorts &amp; community
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 bg-[#F3EFE8] p-1 rounded-xl border border-[#E7E1D8] mb-5 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className={`py-2 rounded-lg transition cursor-pointer ${
                    mode === "login"
                      ? "bg-[#A8421B] text-white shadow-xs"
                      : "text-[#6E655E] hover:text-[#1F1B18]"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className={`py-2 rounded-lg transition cursor-pointer ${
                    mode === "signup"
                      ? "bg-[#A8421B] text-white shadow-xs"
                      : "text-[#6E655E] hover:text-[#1F1B18]"
                  }`}
                >
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("reset");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className={`py-2 rounded-lg transition cursor-pointer ${
                    mode === "reset"
                      ? "bg-[#A8421B] text-white shadow-xs"
                      : "text-[#6E655E] hover:text-[#1F1B18]"
                  }`}
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("admin");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className={`py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                    mode === "admin"
                      ? "bg-[#1F1B18] text-white shadow-xs"
                      : "text-[#6E655E] hover:text-[#1F1B18]"
                  }`}
                >
                  <ShieldCheck className="h-3 w-3" /> Admin
                </button>
              </div>

              {errorMsg && (
                <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-medium text-rose-900 text-left">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-medium text-emerald-900 text-left flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {mode === "admin" && (
                <div className="mb-4 rounded-xl border border-[#E7E1D8] bg-[#F7F4EE] p-3 text-[11px] text-[#6E655E] leading-relaxed text-left">
                  {adminClaimRequired
                    ? "First-time setup: enter your principal administrator email and choose an 8+ character passcode."
                    : "Administrator portal sign-in requires verified principal credentials and the configured server passcode."}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                {mode === "signup" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6E655E] block">
                        Full Name
                      </label>
                      <div className="relative">
                        <UserIcon className="h-4 w-4 text-[#6E655E] absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Kelvin Opara Wafula"
                          className="w-full rounded-xl border border-[#E7E1D8] bg-[#FAF8F4] pl-10 pr-3 py-2.5 text-xs text-[#1F1B18] placeholder-[#9B9189] outline-none focus:border-[#A8421B] focus:bg-white transition"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6E655E] block">
                        M-Pesa Phone Number (Kenya)
                      </label>
                      <div className="relative">
                        <Phone className="h-4 w-4 text-[#6E655E] absolute left-3 top-3" />
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+254712345678"
                          className="w-full rounded-xl border border-[#E7E1D8] bg-[#FAF8F4] pl-10 pr-3 py-2.5 text-xs text-[#1F1B18] placeholder-[#9B9189] outline-none focus:border-[#A8421B] focus:bg-white transition"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6E655E] block">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-[#6E655E] absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.co.ke"
                      className="w-full rounded-xl border border-[#E7E1D8] bg-[#FAF8F4] pl-10 pr-3 py-2.5 text-xs text-[#1F1B18] placeholder-[#9B9189] outline-none focus:border-[#A8421B] focus:bg-white transition"
                    />
                  </div>
                </div>

                {mode !== "reset" && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6E655E] block">
                        {mode === "admin"
                          ? adminClaimRequired
                            ? "Set Administrator Passcode"
                            : "Administrator Passcode"
                          : "Password"}
                      </label>
                      {mode === "login" && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode("reset");
                            setErrorMsg("");
                            setSuccessMsg("");
                          }}
                          className="text-[11px] font-medium text-[#A8421B] hover:underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="h-4 w-4 text-[#6E655E] absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        minLength={mode === "admin" ? (adminClaimRequired ? 8 : 1) : 6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={
                          mode === "admin"
                            ? adminClaimRequired
                              ? "Minimum 8 characters"
                              : "Enter administrator passcode"
                            : "Minimum 6 characters"
                        }
                        className="w-full rounded-xl border border-[#E7E1D8] bg-[#FAF8F4] pl-10 pr-3 py-2.5 text-xs text-[#1F1B18] placeholder-[#9B9189] outline-none focus:border-[#A8421B] focus:bg-white transition"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full rounded-xl text-white font-semibold py-3 text-xs tracking-wide shadow-xs flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-60 cursor-pointer ${
                    mode === "admin"
                      ? "bg-[#1F1B18] hover:bg-[#352F2A]"
                      : "bg-[#A8421B] hover:bg-[#8F3614]"
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : mode === "reset" ? (
                    <KeyRound className="h-4 w-4" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  <span>
                    {mode === "login"
                      ? "Sign In to Zion Digital"
                      : mode === "signup"
                      ? "Create Account"
                      : mode === "admin"
                      ? adminClaimRequired
                        ? "Claim Principal Admin"
                        : "Verify Admin Access"
                      : "Send Reset Email"}
                  </span>
                </button>
              </form>

              {mode !== "reset" && mode !== "admin" && (
                <>
                  <div className="relative my-5 flex items-center justify-center">
                    <div className="w-full border-t border-[#E7E1D8]" />
                    <span className="absolute bg-white px-3 font-mono text-[10px] uppercase tracking-wider text-[#6E655E]">
                      Or Continue With
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleOAuth}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-[#E7E1D8] bg-[#FAF8F4] hover:bg-[#F3EFE8] text-[#1F1B18] text-xs font-semibold py-2.5 transition cursor-pointer"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>
                </>
              )}

              {!isSupabaseConfigured && mode !== "admin" && (
                <button
                  type="button"
                  onClick={handleQuickDemoAccess}
                  disabled={isLoading}
                  className="mt-3 w-full rounded-xl border border-[#E7E1D8] bg-[#F7F4EE] hover:bg-[#ECE7DF] text-[#1F1B18] text-xs font-semibold py-2.5 transition cursor-pointer disabled:opacity-60"
                >
                  Enter as Guest / Member Preview
                </button>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
