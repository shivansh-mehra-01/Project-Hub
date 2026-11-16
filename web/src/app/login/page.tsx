"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { Modal } from "@/design-system/components/Modal";
import { OnboardingModal } from "@/features/auth/OnboardingModal";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { RoleType } from "@/mocks/store-types";
import { cn } from "@/lib/utils";
import { authApi, setAuthSession } from "@/lib/api";
import { showToast } from "@/lib/toast";

export default function LoginPage() {
  const router = useRouter();
  const { switchPersona, toggleFacultyCoordinator, currentPersona } = useProjectHubStore();

  const [mode, setMode] = useState<"signin" | "activate">("signin");
  const [email, setEmail] = useState("0176cs221045@sistec.ac.in");
  const [password, setPassword] = useState("••••••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Activation State
  const [activationEmail, setActivationEmail] = useState("");
  const [activationId, setActivationId] = useState("");
  const [activationPassword, setActivationPassword] = useState("");
  const [activationConfirmPassword, setActivationConfirmPassword] = useState("");
  const [showActivationPassword, setShowActivationPassword] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState(false);
  const [activationError, setActivationError] = useState("");

  // Modals & Panels
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const [resolvedLiveTenant, setResolvedLiveTenant] = useState<{
    name: string;
    short: string;
    code: string;
    isMatched: boolean;
  } | null>(null);

  // Dynamic Tenant Resolution based on email domain
  const getTenantResolution = (inputEmail: string) => {
    const lower = inputEmail.toLowerCase().trim();
    if (lower.includes("@sistec.ac.in") || lower.includes("sistec")) {
      return {
        name: "Sagar Institute of Science & Technology",
        short: "SISTec Bhopal",
        code: "INST-MP-0176",
        isMatched: true,
      };
    }
    if (lower.includes("@bmsce.ac.in") || lower.includes("bmsce")) {
      return {
        name: "B.M.S. College of Engineering",
        short: "BMSCE Bangalore",
        code: "INST-KA-0042",
        isMatched: true,
      };
    }
    if (lower.includes("@rvce.edu.in") || lower.includes("rvce")) {
      return {
        name: "R.V. College of Engineering",
        short: "RVCE Bangalore",
        code: "INST-KA-0019",
        isMatched: true,
      };
    }
    return {
      name: "Institutional Single Sign-On Portal",
      short: "Authorized University SSO",
      code: "IDENTITY-ROUTER",
      isMatched: false,
    };
  };

  // Debounced live tenant resolution from .NET API
  React.useEffect(() => {
    const targetEmail = mode === "signin" ? email : activationEmail;
    if (!targetEmail || !targetEmail.includes("@") || targetEmail.length < 5) {
      setResolvedLiveTenant(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await authApi.resolveTenant(targetEmail);
        if (res.resolved && res.tenantCode) {
          setResolvedLiveTenant({
            name: res.name || res.tenantCode,
            short: `${res.tenantCode} Campus`,
            code: res.ssoDomain || res.tenantCode,
            isMatched: true,
          });
        } else {
          setResolvedLiveTenant(null);
        }
      } catch {
        setResolvedLiveTenant(null);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [email, activationEmail, mode]);

  const activeTenant = resolvedLiveTenant || getTenantResolution(mode === "signin" ? email : activationEmail);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const isInstitutional =
      email.includes("@") &&
      (email.includes("sistec.ac.in") ||
        email.includes("bmsce.ac.in") ||
        email.includes("rvce.edu.in") ||
        email.includes("projecthub") ||
        email.includes(".edu") ||
        email.includes(".ac.in"));

    if (!isInstitutional) {
      setEmailError(
        "Institutional domain required: please provide your authorized college email (@sistec.ac.in, @bmsce.ac.in, @rvce.edu.in)."
      );
      return;
    }
    setEmailError("");
    setIsLoading(true);

    try {
      const auth = await authApi.login({
        email: email.trim().toLowerCase(),
        password: password === "••••••••••••" ? "ProjectHub@2026" : password,
      });

      setAuthSession(auth.token, auth.user, rememberSession);
      showToast(`Welcome back, ${auth.user.fullName}!`, "success");

      if (auth.user.role === "SuperAdmin") {
        switchPersona("SuperAdmin");
        router.push("/admin");
      } else if (auth.user.role === "CollegeAdmin") {
        switchPersona("CollegeAdmin");
        router.push("/college");
      } else if (auth.user.role === "HOD") {
        switchPersona("HOD");
        router.push("/hod");
      } else if (auth.user.role === "Faculty") {
        switchPersona("Faculty");
        if (auth.user.isProjectCoordinator) {
          toggleFacultyCoordinator("usr-fac-verma");
          router.push("/coordinator");
        } else {
          router.push("/faculty");
        }
      } else {
        switchPersona("Student");
        router.push("/student");
      }
    } catch (err: any) {
      if (err.status === 401) {
        setEmailError("Invalid email or password. Please verify your credentials.");
      } else {
        setEmailError(err.message || "Failed to authenticate with campus directory.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationEmail || !activationId || !activationPassword) {
      setActivationError("All fields are mandatory to verify roster enrollment.");
      return;
    }
    if (activationPassword !== activationConfirmPassword) {
      setActivationError("Passwords do not match.");
      return;
    }
    if (activationPassword.length < 6) {
      setActivationError("Password must be at least 6 characters.");
      return;
    }
    setActivationError("");
    setIsLoading(true);

    try {
      const auth = await authApi.activate({
        email: activationEmail.trim().toLowerCase(),
        enrollmentOrEmployeeCode: activationId.trim().toUpperCase(),
        newPassword: activationPassword,
      });

      setAuthSession(auth.token, auth.user, true);
      setActivationSuccess(true);
      showToast("Workspace account activated successfully! Redirecting...", "success");

      setTimeout(() => {
        if (auth.user.role === "Student") {
          switchPersona("TeamLead");
          router.push("/student");
        } else {
          switchPersona(auth.user.role as RoleType);
          router.push("/faculty");
        }
      }, 1000);
    } catch (err: any) {
      setActivationError(err.message || "Failed to activate account. Verify your enrollment code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstitutionalSso = (provider: "Google" | "Microsoft") => {
    showToast(`Redirecting to ${provider} Workspace institutional SSO gateway...`, "info");
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden grid lg:grid-cols-12 bg-white select-none">
      {/* ========================================================================= */}
      {/* LEFT: Brand & Trust Panel (Deep Charcoal #111827)                          */}
      {/* ========================================================================= */}
      <div className="lg:col-span-5 bg-[#111827] text-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden h-full">
        {/* Subtle decorative grid overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#047857_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-700/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top: Navigation Back + Brand Emblem */}
        <div className="relative z-10 space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" strokeWidth={1.75} />
            <span>Back to Overview</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-brand-primary flex items-center justify-center text-white font-bold text-xs shadow-md font-heading shrink-0">
              PH
            </div>
            <div>
              <span className="font-bold text-sm sm:text-base text-white tracking-tight font-heading block">
                Project Hub
              </span>
              <span className="text-[10px] text-emerald-400 font-mono block">
                Institutional Governance Edition
              </span>
            </div>
          </div>
        </div>

        {/* Center: Executive Value Statement + Live Audit Preview Card */}
        <div className="relative z-10 space-y-5 my-auto py-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading leading-tight max-w-md">
              Institutional Governance for Engineering Projects
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Deterministic NBA Criterion 2 &amp; 3 attainment calculation, verified weekly student logbooks, and multi-campus lifecycle automation.
            </p>
          </div>

          {/* Pure-React Live Audit Preview Card (Matching Reference Specs) */}
          <div className="rounded-2xl border border-white/10 bg-[#1F2937]/95 p-4 sm:p-5 shadow-2xl backdrop-blur-md max-w-sm w-full space-y-3.5">
            {/* Top Row: CO-PO Attainment + Bar Chart */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono font-medium">
                <span>CO-PO Attainment</span>
                <span className="text-[10px] text-slate-400">Direct Assessment</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tabular-nums">
                    84.5%
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Verified
                  </span>
                </div>

                {/* Stylized Bar Graph Visualization */}
                <div className="flex items-end gap-1.5 h-7 px-2 py-1 bg-black/30 rounded-lg border border-white/5">
                  <span className="w-1.5 h-3 rounded-full bg-emerald-500/50" />
                  <span className="w-1.5 h-4 rounded-full bg-emerald-500/70" />
                  <span className="w-1.5 h-2.5 rounded-full bg-emerald-500/40" />
                  <span className="w-1.5 h-6 rounded-full bg-white shadow-xs animate-pulse" />
                  <span className="w-1.5 h-4 rounded-full bg-emerald-500/70" />
                  <span className="w-1.5 h-5 rounded-full bg-emerald-500" />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/[0.08]" />

            {/* Middle Row: Weekly Logbook Verification */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-white">Weekly Logbook</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Signed by Prof. S. K. Verma • Week 5
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
                <CheckCircle2 className="w-3 h-3 stroke-[2]" />
                <span>Signed</span>
              </span>
            </div>

            {/* Bottom Sub-row: PostgreSQL Row-Level Security */}
            <div className="pt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                Multi-Tenant Row-Level Isolation
              </span>
              <span className="text-emerald-400 font-semibold">Active</span>
            </div>
          </div>
        </div>

        {/* Bottom: Security & Compliance Footer Badges */}
        <div className="relative z-10 pt-4 border-t border-white/[0.08] flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] sm:text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.75} />
            Zero Public Signup
          </span>
          <span className="text-white/20">•</span>
          <span>Campus SSO Only</span>
          <span className="text-white/20">•</span>
          <span>NBA Criterion 2 &amp; 3 Ready</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT: Authentication Canvas (Clean White, Fixed Viewport on Desktop)     */}
      {/* ========================================================================= */}
      <div className="lg:col-span-7 bg-[#FFFFFF] flex flex-col justify-center items-center px-4 sm:px-6 py-6 lg:py-8 h-full relative overflow-y-auto lg:overflow-hidden">
        <div className="w-full max-w-[390px] my-auto space-y-3.5 flex flex-col justify-center">
          {/* Dynamic Tenant Resolution Pill */}
          <div className="flex justify-center">
            {activeTenant.isMatched ? (
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs animate-in fade-in duration-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Verified Tenant: {activeTenant.short}</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.75} />
                <span>Institutional Single Sign-On Portal</span>
              </div>
            )}
          </div>

          {/* Main Auth Form Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-3.5">
            {/* Two-Mode Segmented Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={cn(
                  "flex-1 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  mode === "signin"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("activate")}
                className={cn(
                  "flex-1 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  mode === "activate"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Activate Account
              </button>
            </div>

            {/* TAB 1: SIGN IN MODE */}
            {mode === "signin" && (
              <div className="space-y-3">
                {/* Institutional SSO Buttons */}
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => handleInstitutionalSso("Google")}
                    className="w-full h-9 flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google Workspace</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInstitutionalSso("Microsoft")}
                    className="w-full h-9 flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 23 23">
                      <path fill="#f35325" d="M1 1h10v10H1z" />
                      <path fill="#81bc06" d="M12 1h10v10H12z" />
                      <path fill="#05a6f0" d="M1 12h10v10H1z" />
                      <path fill="#ffba08" d="M12 12h10v10H12z" />
                    </svg>
                    <span>Continue with Microsoft 365</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="relative flex items-center justify-center my-1">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-2 text-[10px] uppercase font-bold tracking-wider text-slate-400 absolute font-mono">
                    Or
                  </span>
                </div>

                {/* Credentials Form */}
                <form onSubmit={handleSignIn} className="space-y-2.5">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Institutional Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="h-4 w-4" strokeWidth={1.75} />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError("");
                        }}
                        placeholder="name@sistec.ac.in"
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors font-mono"
                      />
                    </div>
                    {emailError && <p className="text-[11px] text-rose-600 mt-1">{emailError}</p>}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(email);
                          setForgotSubmitted(false);
                          setShowForgotModal(true);
                        }}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-4 w-4" strokeWidth={1.75} />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-9 pl-9 pr-10 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 stroke-[1.75]" />
                        ) : (
                          <Eye className="h-4 w-4 stroke-[1.75]" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center text-xs pt-0.5">
                    <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberSession}
                        onChange={(e) => setRememberSession(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-brand-primary accent-brand-primary focus:ring-0"
                      />
                      <span className="text-[11px]">Remember campus session (30 days)</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-9.5 rounded-lg bg-[#047857] hover:bg-[#065F46] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-70 mt-1"
                  >
                    {isLoading ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Sign In to Workspace</span>
                        <ArrowRight className="h-4 w-4 stroke-[2]" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: ACTIVATE ACCOUNT MODE */}
            {mode === "activate" && (
              <div className="space-y-3">
                <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200 text-emerald-950 text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" strokeWidth={1.75} />
                    <span>CSV Pre-Provisioned Accounts Only</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Imported from institutional ERP by the Department Coordinator. Enter your official details to set credentials.
                  </p>
                </div>

                {activationSuccess ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center space-y-2 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                    <div className="text-xs font-bold text-emerald-950">Account Activated Successfully!</div>
                    <p className="text-[11px] text-emerald-800">
                      Redirecting you to your authenticated campus workspace...
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleActivateSubmit} className="space-y-2.5">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Official College Email
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Mail className="h-4 w-4" strokeWidth={1.75} />
                        </div>
                        <input
                          type="email"
                          value={activationEmail}
                          onChange={(e) => setActivationEmail(e.target.value)}
                          placeholder="usn@sistec.ac.in"
                          className="w-full h-8.5 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        University USN or Employee ID
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <User className="h-4 w-4" strokeWidth={1.75} />
                        </div>
                        <input
                          type="text"
                          value={activationId}
                          onChange={(e) => setActivationId(e.target.value)}
                          placeholder="e.g. 0176CS221045 or FAC-CSE-028"
                          className="w-full h-8.5 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          New Password
                        </label>
                        <input
                          type={showActivationPassword ? "text" : "password"}
                          value={activationPassword}
                          onChange={(e) => setActivationPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-8.5 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Confirm Password
                        </label>
                        <input
                          type={showActivationPassword ? "text" : "password"}
                          value={activationConfirmPassword}
                          onChange={(e) => setActivationConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-8.5 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors font-mono"
                        />
                      </div>
                    </div>

                    {activationError && (
                      <p className="text-[11px] text-rose-600">{activationError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-9.5 rounded-lg bg-[#047857] hover:bg-[#065F46] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-70 mt-1"
                    >
                      {isLoading ? (
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Verify &amp; Activate Workspace Access</span>
                          <ArrowRight className="h-4 w-4 stroke-[2]" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Zero-Public-Signup Footer Note */}
          <div className="text-center">
            <p className="text-[11px] text-slate-500">
              Access restricted to authorized university personnel.
            </p>
          </div>
        </div>
      </div>

      {/* Onboarding Wizard Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        initialEmail={email}
        onComplete={() => {
          setShowOnboarding(false);
          switchPersona("TeamLead");
          router.push("/student");
        }}
      />

      {/* Password Reset Modal */}
      <Modal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        title="Reset Institutional Password"
        description="Verification links are dispatched exclusively to authorized campus emails."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowForgotModal(false)}
            >
              Cancel
            </Button>
            {!forgotSubmitted && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setForgotSubmitted(true)}
              >
                Send Recovery OTP
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {forgotSubmitted ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2 text-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
              <div className="font-bold text-sm">Recovery Link Dispatched</div>
              <p className="text-[11px] leading-relaxed">
                A one-time verification link has been sent to{" "}
                <span className="font-mono font-bold">{forgotEmail}</span>.
                Please check your university inbox or contact your department coordinator.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                label="Registered College Email Address"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="your.usn@sistec.ac.in"
                leftIcon={<Mail className="h-4 w-4" />}
                helperText="Must match the pre-registered CSV record on file with your institution"
              />
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-[#64748B] text-[11px] leading-relaxed">
                For security reasons, self-service password reset is restricted to domain-verified
                accounts. If your USN or Roll Number has changed, contact your HOD office.
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
