"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Lock,
  Mail,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Check,
  Server,
} from "lucide-react";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { Modal } from "@/design-system/components/Modal";
import { OnboardingModal } from "@/features/auth/OnboardingModal";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { RoleType } from "@/mocks/store-types";

export default function LoginPage() {
  const router = useRouter();
  const { switchPersona, college } = useProjectHubStore();

  const [mode, setMode] = useState<"signin" | "activate">("signin");
  const [email, setEmail] = useState("0176cs221045@sistec.ac.in");
  const [password, setPassword] = useState("••••••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const isInstitutional =
      email.includes("@") &&
      (email.includes("sistec.ac.in") ||
        email.includes("projecthub") ||
        email.includes(".edu") ||
        email.includes(".ac.in"));

    if (!isInstitutional) {
      setEmailError(
        "Institutional domain required: only @sistec.ac.in or authorized campus accounts are permitted."
      );
      return;
    }
    setEmailError("");
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (email.includes("admin@projecthub")) {
        switchPersona("SuperAdmin");
        router.push("/admin");
      } else if (email.includes("principal")) {
        switchPersona("CollegeAdmin");
        router.push("/college");
      } else if (email.includes("hod")) {
        switchPersona("HOD");
        router.push("/hod");
      } else if (email.includes("verma")) {
        switchPersona("Faculty");
        router.push("/faculty");
      } else {
        switchPersona("TeamLead");
        router.push("/student");
      }
    }, 400);
  };

  const handleQuickPersona = (role: RoleType) => {
    switchPersona(role);
    if (role === "SuperAdmin") router.push("/admin");
    else if (role === "CollegeAdmin") router.push("/college");
    else if (role === "HOD") router.push("/hod");
    else if (role === "Faculty") router.push("/faculty");
    else router.push("/student");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col justify-between selection:bg-[#ECFDF5] selection:text-[#065F46]">
      {/* ========================================================================= */}
      {/* 1. TOP CHARCOAL NAVBAR (#111827, 60px) — Seamless Home Harmony            */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 h-15 bg-[#111827] border-b border-[#1F2937] text-white select-none shrink-0">
        <div className="max-w-[1200px] h-full mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Left Brand Mark */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-7 w-7 rounded-lg bg-brand-primary flex items-center justify-center text-white font-bold text-xs shadow-xs font-heading group-hover:bg-brand-primary-hover transition-colors">
              PH
            </div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-sm sm:text-base tracking-tight text-white leading-none">
                Project Hub
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-white/10 text-slate-300">
                SSO Portal
              </span>
            </div>
          </Link>

          {/* Right Navigation & Status */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#1F2937] border border-[#374151] text-[11px] text-[#9CA3AF]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>NBA Criterion 2 &amp; 3 Gateway</span>
            </div>

            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-medium text-[#9CA3AF] hover:text-white transition-colors py-1 px-2.5 rounded-lg hover:bg-white/5"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>Back to Overview</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN WORKSPACE CANVAS                                                  */}
      {/* ========================================================================= */}
      <main className="flex-1 flex items-center justify-center py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-[1140px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-stretch">
          
          {/* --------------------------------------------------------------------- */}
          {/* LEFT COLUMN: Clean Minimalist Sign-In Form (7 cols)                   */}
          {/* --------------------------------------------------------------------- */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            
            {/* Elevated Form Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-lg shadow-slate-200/40 p-5 sm:p-7 space-y-4">
              
              {/* Card Header & Title */}
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-brand-primary-tint border border-brand-primary-border text-brand-primary-text text-[11px] font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
                  <span>{college.name} • Institutional Single Sign-On</span>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-heading">
                  Sign in to your campus workspace
                </h1>
                <p className="text-xs text-slate-500 font-sans leading-relaxed">
                  Enter your university credentials or select your pre-provisioned batch role.
                </p>
              </div>

              {/* Mode Toggle Segmented Control */}
              <div className="flex p-0.5 bg-slate-100/90 rounded-xl border border-slate-200 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    mode === "signin"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Sign In with Credentials
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("activate");
                    setShowOnboarding(true);
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    mode === "activate"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <span>Activate Account</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-brand-primary-tint text-brand-primary-text border border-brand-primary-border">
                    New USN
                  </span>
                </button>
              </div>

              {/* Institutional Single Sign-On Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickPersona("Student")}
                  className="h-9 px-3 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
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
                  <span>Google Workspace</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickPersona("Student")}
                  className="h-9 px-3 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 23 23">
                    <path fill="#f35325" d="M1 1h10v10H1z" />
                    <path fill="#81bc06" d="M12 1h10v10H12z" />
                    <path fill="#05a6f0" d="M1 12h10v10H1z" />
                    <path fill="#ffba08" d="M12 12h10v10H12z" />
                  </svg>
                  <span>Microsoft 365</span>
                </button>
              </div>

              {/* Minimal Divider */}
              <div className="relative flex items-center justify-center my-1">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-2.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider absolute">
                  Or institutional email
                </span>
              </div>

              {/* Credentials Form */}
              <form onSubmit={handleSignIn} className="space-y-3">
                <Input
                  label="Institutional Email / Roll Number"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  error={emailError}
                  placeholder="0176cs221045@sistec.ac.in"
                  leftIcon={<Mail className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.75} />}
                  helperText="Authorized @sistec.ac.in student, faculty or administrator email"
                />

                <div className="space-y-1">
                  <div className="relative">
                    <Input
                      label="Password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter account password"
                      leftIcon={<Lock className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.75} />}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-[32px] text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    >
                      {showPassword ? (
                        <EyeOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                      ) : (
                        <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer select-none text-[11px]">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="rounded text-brand-primary focus:ring-0 accent-brand-primary h-3.5 w-3.5 cursor-pointer"
                      />
                      <span>Keep signed in</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setForgotSubmitted(false);
                        setShowForgotModal(true);
                      }}
                      className="text-[11px] font-medium text-brand-primary hover:text-brand-primary-hover hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  className="w-full h-10 text-xs font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Sign In to Project Hub</span>
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                </Button>
              </form>

              {/* Pre-Registered Callout Banner */}
              <div className="p-2.5 bg-brand-primary-tint/60 rounded-xl border border-brand-primary-border/70 flex items-start gap-2 text-[11px] text-brand-primary-text leading-relaxed">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-primary shrink-0 mt-0.5" strokeWidth={1.75} />
                <div>
                  <span className="font-semibold">Pre-provisioned user?</span> Profiles are imported via coordinator CSV. Select{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("activate");
                      setShowOnboarding(true);
                    }}
                    className="font-bold underline hover:text-brand-primary-hover cursor-pointer"
                  >
                    Activate Account
                  </button>{" "}
                  to claim your USN.
                </div>
              </div>

              {/* 1-Click Role Sandbox Selector */}
              <div className="pt-2.5 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                    <Sparkles className="h-3.5 w-3.5 text-brand-primary" strokeWidth={1.75} />
                    <span>Instant Role Sandbox</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    1-Click Evaluation
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickPersona("TeamLead")}
                    className="p-1.5 rounded-lg border border-slate-200/90 hover:border-brand-primary hover:bg-brand-primary-tint/30 transition-all text-left group cursor-pointer"
                  >
                    <div className="text-[11px] font-bold text-slate-800 group-hover:text-brand-primary">
                      Student Lead
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">Shivansh (Sem 8)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickPersona("Faculty")}
                    className="p-1.5 rounded-lg border border-slate-200/90 hover:border-brand-primary hover:bg-brand-primary-tint/30 transition-all text-left group cursor-pointer"
                  >
                    <div className="text-[11px] font-bold text-slate-800 group-hover:text-brand-primary">
                      Faculty Guide
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">Prof. Verma</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickPersona("HOD")}
                    className="p-1.5 rounded-lg border border-slate-200/90 hover:border-brand-primary hover:bg-brand-primary-tint/30 transition-all text-left group cursor-pointer"
                  >
                    <div className="text-[11px] font-bold text-slate-800 group-hover:text-brand-primary">
                      HOD (CSE)
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">Dr. R. K. Sharma</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickPersona("CollegeAdmin")}
                    className="p-1.5 rounded-lg border border-slate-200/90 hover:border-brand-primary hover:bg-brand-primary-tint/30 transition-all text-left group cursor-pointer"
                  >
                    <div className="text-[11px] font-bold text-slate-800 group-hover:text-brand-primary">
                      College Admin
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">Principal Office</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickPersona("SuperAdmin")}
                    className="p-1.5 rounded-lg border border-slate-200/90 hover:border-brand-primary hover:bg-brand-primary-tint/30 transition-all text-left group cursor-pointer"
                  >
                    <div className="text-[11px] font-bold text-slate-800 group-hover:text-brand-primary">
                      Super Admin
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">Platform Ops</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickPersona("Student")}
                    className="p-1.5 rounded-lg border border-slate-200/90 hover:border-brand-primary hover:bg-brand-primary-tint/30 transition-all text-left group cursor-pointer"
                  >
                    <div className="text-[11px] font-bold text-slate-800 group-hover:text-brand-primary">
                      Student Peer
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">Aarav Sharma</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Security Note */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 select-none">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-primary" strokeWidth={1.75} />
                <span>Multi-tenant campus partition isolation</span>
              </span>
              <span className="hidden sm:inline">Zero Public Signup Enforced</span>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* RIGHT COLUMN: Institutional Showcase & Dark Charcoal Slate Anchor     */}
          {/* --------------------------------------------------------------------- */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
            
            {/* Charcoal Slate Showcase Card (#111827) */}
            <div className="rounded-2xl border border-slate-800 bg-[#111827] text-white p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between flex-1">
              
              {/* Subtle Ambient Emerald Glow */}
              <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

              {/* Card Top: Institutional Identity */}
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="h-8 w-8 rounded-lg bg-brand-primary flex items-center justify-center text-white font-bold text-xs font-heading shadow-md">
                    PH
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-medium font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>INST-MP-0176</span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                    Campus Partition
                  </div>
                  <h2 className="text-lg font-bold font-heading text-white tracking-tight leading-snug">
                    {college.name}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Bhopal, Madhya Pradesh • Affiliated with RGPV
                  </p>
                </div>

                {/* Live Cycle Snapshot Card */}
                <div className="rounded-xl bg-[#1F2937]/90 border border-slate-700/80 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-700/60">
                    <span className="text-slate-400">Active Academic Batch</span>
                    <span className="font-mono font-semibold text-emerald-300">2024–2025 Even Sem</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-0.5">
                    <div className="p-1.5 rounded-lg bg-[#111827]/80 border border-slate-700/60">
                      <div className="font-heading font-bold text-sm text-white">1,280</div>
                      <div className="text-[9px] text-slate-400">Students</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[#111827]/80 border border-slate-700/60">
                      <div className="font-heading font-bold text-sm text-white">94</div>
                      <div className="text-[9px] text-slate-400">Teams</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[#111827]/80 border border-slate-700/60">
                      <div className="font-heading font-bold text-sm text-emerald-400">100%</div>
                      <div className="text-[9px] text-slate-400">NBA Ready</div>
                    </div>
                  </div>
                </div>

                {/* Key Architectural Pillars */}
                <div className="space-y-2 pt-0.5">
                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <div className="h-4.5 w-4.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                    </div>
                    <div>
                      <span className="font-semibold text-white">NBA Criterion 2 &amp; 3 Compliant</span>
                      <p className="text-[11px] text-slate-400">
                        Direct mapping from weekly rubric scores to Program Outcomes (POs).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <div className="h-4.5 w-4.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                    </div>
                    <div>
                      <span className="font-semibold text-white">Continuous Guide Reviews</span>
                      <p className="text-[11px] text-slate-400">
                        Friday student logbooks, mentor feedback, and locked defense rubrics.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs text-slate-300">
                    <div className="h-4.5 w-4.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 text-emerald-400">
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                    </div>
                    <div>
                      <span className="font-semibold text-white">1-Click Defense Dossier ZIP</span>
                      <p className="text-[11px] text-slate-400">
                        Cryptographically stamped audit dossiers ready for peer inspection.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer: Enterprise Security Footnote */}
              <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between relative z-10 mt-3">
                <span className="flex items-center gap-1.5">
                  <Server className="h-3 w-3 text-emerald-400" strokeWidth={1.75} />
                  <span>SISTec Dedicated Partition</span>
                </span>
                <span className="text-slate-500">Tier-II Accredited</span>
              </div>
            </div>

            {/* Quick Helper Links */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
              <Link href="/" className="hover:text-slate-700 transition-colors">
                Public Overview
              </Link>
              <span>•</span>
              <a href="#compliance" className="hover:text-slate-700 transition-colors">
                NBA Guidelines
              </a>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setShowForgotModal(true);
                }}
                className="hover:text-slate-700 transition-colors cursor-pointer"
              >
                Help &amp; Recovery
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* ========================================================================= */}
      {/* 3. MINIMAL FOOTER                                                         */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-200 py-3 bg-white text-xs text-slate-500 select-none shrink-0">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[11px]">
          <div>
            © 2026 Project Hub. Built for College Projects &amp; NBA Compliance.
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span>SISTec Dedicated Instance</span>
            <span>•</span>
            <span>Zero Public Signup Enforced</span>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}
      
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
                helperText="Must match the pre-registered CSV record on file with SISTec"
              />
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-[#64748B] text-[11px] leading-relaxed">
                For security reasons, self-service password reset is restricted to domain-verified
                accounts. If your roll number has changed, contact the HOD office.
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
