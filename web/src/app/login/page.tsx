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
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { Badge } from "@/design-system/components/Badge";
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
      // Route based on email domain or role
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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 select-none">
      {/* Background Subtle Accent Pattern */}
      <div className="w-full max-w-[420px] space-y-6">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-12 w-12 rounded-xl bg-brand-primary flex items-center justify-center text-white font-bold text-lg shadow-sm font-heading">
            PH
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight font-heading">
              Project Hub
            </h1>
            <p className="text-xs text-[#475569]">
              {college.name} ({college.code})
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-brand-primary-tint text-brand-primary-text border border-brand-primary-border">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
            <span>NBA Criterion 2 &amp; 3 Production Portal</span>
          </div>
        </div>

        {/* Unified Card Container */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-5">
          {/* Mode Toggle Pills */}
          <div className="flex p-1 bg-[#F1F5F9] rounded-lg border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                mode === "signin"
                  ? "bg-white text-[#0F172A] shadow-xs"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("activate");
                setShowOnboarding(true);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                mode === "activate"
                  ? "bg-white text-[#0F172A] shadow-xs"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              Activate Account
            </button>
          </div>

          {/* Institutional SSO Buttons */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleQuickPersona("Student")}
              className="w-full h-9 flex items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#0F172A] hover:bg-[#F8FAFC] transition-colors cursor-pointer shadow-2xs"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
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
              <span>Continue with College Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickPersona("Student")}
              className="w-full h-9 flex items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-medium text-[#0F172A] hover:bg-[#F8FAFC] transition-colors cursor-pointer shadow-2xs"
            >
              <svg className="h-4 w-4" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
              <span>Continue with Microsoft 365</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#E2E8F0] w-full" />
            <span className="bg-white px-2 text-[10px] uppercase font-bold text-[#94A3B8] absolute">
              Or email credentials
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-3.5">
            <Input
              label="Institutional Email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
              error={emailError}
              placeholder="usn@sistec.ac.in"
              leftIcon={<Mail className="h-4 w-4" />}
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              leftIcon={<Lock className="h-4 w-4" />}
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-1.5 text-[#475569] cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded text-brand-primary focus:ring-0 accent-brand-primary"
                />
                <span>Remember campus session</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotSubmitted(false);
                  setShowForgotModal(true);
                }}
                className="font-medium text-brand-primary hover:underline cursor-pointer"
              >
                Forgot?
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              className="w-full"
            >
              Sign In to Project Hub
            </Button>
          </form>

          {/* Pre-Registered Hint */}
          <div className="p-3 bg-brand-primary-tint rounded-lg border border-brand-primary-border flex items-start gap-2 text-[11px] text-brand-primary-text">
            <CheckCircle2 className="h-4 w-4 text-brand-primary shrink-0 mt-0.5" strokeWidth={1.75} />
            <span>
              <strong>Pre-registered User?</strong> College accounts are
              pre-provisioned via coordinator CSV. Select &ldquo;Activate Account&rdquo;
              to complete your profile.
            </span>
          </div>
        </div>

        {/* Quick Demo Persona Switcher Bar */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A]">
              <Sparkles className="h-3.5 w-3.5 text-brand-primary" strokeWidth={1.75} />
              <span>Instant Persona Evaluation</span>
            </div>
            <span className="text-[10px] text-[#94A3B8]">1-Click Demo</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickPersona("SuperAdmin")}
              className="px-2 py-1.5 rounded-lg border border-[#E2E8F0] text-[11px] font-medium text-left hover:bg-emerald-50/30 hover:border-emerald-500/40 transition-colors group"
            >
              <div className="font-semibold text-[#0F172A] group-hover:text-emerald-800 transition-colors">Super Admin</div>
              <div className="text-[9px] text-[#64748B] truncate">Platform Ops</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickPersona("CollegeAdmin")}
              className="px-2 py-1.5 rounded-lg border border-[#E2E8F0] text-[11px] font-medium text-left hover:bg-emerald-50/30 hover:border-emerald-500/40 transition-colors group"
            >
              <div className="font-semibold text-[#0F172A] group-hover:text-emerald-800 transition-colors">College Admin</div>
              <div className="text-[9px] text-[#64748B] truncate">Principal / IT</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickPersona("HOD")}
              className="px-2 py-1.5 rounded-lg border border-[#E2E8F0] text-[11px] font-medium text-left hover:bg-emerald-50/30 hover:border-emerald-500/40 transition-colors group"
            >
              <div className="font-semibold text-[#0F172A] group-hover:text-emerald-800 transition-colors">HOD (CSE)</div>
              <div className="text-[9px] text-[#64748B] truncate">Dr. R. K. Sharma</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickPersona("Faculty")}
              className="px-2 py-1.5 rounded-lg border border-[#E2E8F0] text-[11px] font-medium text-left hover:bg-emerald-50/30 hover:border-emerald-500/40 transition-colors group"
            >
              <div className="font-semibold text-[#0F172A] group-hover:text-emerald-800 transition-colors">Faculty Guide</div>
              <div className="text-[9px] text-[#64748B] truncate">Prof. Verma</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickPersona("TeamLead")}
              className="px-2 py-1.5 rounded-lg border border-[#E2E8F0] text-[11px] font-medium text-left hover:bg-emerald-50/30 hover:border-emerald-500/40 transition-colors group"
            >
              <div className="font-semibold text-emerald-800 group-hover:text-emerald-900 transition-colors">Student Lead</div>
              <div className="text-[9px] text-[#64748B] truncate">Shivansh Mehra</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickPersona("Student")}
              className="px-2 py-1.5 rounded-lg border border-[#E2E8F0] text-[11px] font-medium text-left hover:bg-emerald-50/30 hover:border-emerald-500/40 transition-colors group"
            >
              <div className="font-semibold text-[#0F172A] group-hover:text-emerald-800 transition-colors">Student Peer</div>
              <div className="text-[9px] text-[#64748B] truncate">Aarav Sharma</div>
            </button>
          </div>
        </div>

        {/* Security / Isolation Footer */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#94A3B8]">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Strict Multi-Tenant Isolation Enforced</span>
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

