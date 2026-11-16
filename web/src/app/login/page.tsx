"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ChevronLeft,
} from "lucide-react";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { authApi, setAuthSession, UserProfileDto } from "@/lib/api";
import { showToast } from "@/lib/toast";

export default function LoginPage() {
  const router = useRouter();
  const { switchPersona, toggleFacultyCoordinator } = useProjectHubStore();

  // Mode: "login" | "otp"
  const [viewMode, setViewMode] = useState<"login" | "otp">("login");
  const [otpStep, setOtpStep] = useState<1 | 2>(1);

  // Standard Login State
  const [email, setEmail] = useState("0176cs221045@sistec.ac.in");
  const [password, setPassword] = useState("ProjectHub@2026");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // OTP / Set Password State
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [isOtpLoading, setIsOtpLoading] = useState(false);

  // Dynamic Tenant Resolution
  const [resolvedLiveTenant, setResolvedLiveTenant] = useState<{
    name: string;
    short: string;
    code: string;
    isMatched: boolean;
  } | null>(null);

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
    return null;
  };

  // Debounced live tenant resolution from .NET API
  useEffect(() => {
    const targetEmail = viewMode === "login" ? email : otpEmail;
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
            short:
              res.name && res.name.toLowerCase().includes("sagar")
                ? "SISTec Bhopal"
                : res.name || `${res.tenantCode} Campus`,
            code: res.ssoDomain || res.tenantCode,
            isMatched: true,
          });
        } else {
          setResolvedLiveTenant(getTenantResolution(targetEmail));
        }
      } catch {
        setResolvedLiveTenant(getTenantResolution(targetEmail));
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [email, otpEmail, viewMode]);

  const activeTenant =
    resolvedLiveTenant || getTenantResolution(viewMode === "login" ? email : otpEmail);

  const navigateToWorkspace = (user: UserProfileDto) => {
    if (user.role === "SuperAdmin") {
      switchPersona("SuperAdmin");
      router.push("/admin");
    } else if (user.role === "CollegeAdmin") {
      switchPersona("CollegeAdmin");
      router.push("/college");
    } else if (user.role === "HOD") {
      switchPersona("HOD");
      router.push("/hod");
    } else if (user.role === "Faculty") {
      switchPersona("Faculty");
      if (user.isProjectCoordinator) {
        toggleFacultyCoordinator("usr-fac-verma");
        router.push("/coordinator");
      } else {
        router.push("/faculty");
      }
    } else {
      switchPersona("Student");
      router.push("/student");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setEmailError("Please enter your valid college email address.");
      return;
    }
    if (!password) {
      setEmailError("Please enter your password.");
      return;
    }

    setEmailError("");
    setIsLoading(true);

    try {
      const auth = await authApi.login({
        email: email.trim().toLowerCase(),
        password: password,
      });

      setAuthSession(auth.token, auth.user, true);
      showToast(`Welcome back, ${auth.user.fullName}!`, "success");
      navigateToWorkspace(auth.user);
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

  const switchToOtp = (initialEmail?: string) => {
    const target = initialEmail || email;
    setOtpEmail(target);
    setOtpStep(1);
    setOtpError("");
    setDevOtp(null);
    setViewMode("otp");
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpEmail || !otpEmail.includes("@")) {
      setOtpError("Please enter a valid official college email address.");
      return;
    }

    setOtpError("");
    setIsOtpLoading(true);

    try {
      const res = await authApi.requestPasswordOtp({
        email: otpEmail.trim().toLowerCase(),
      });

      showToast(res.message || "Verification code dispatched to your email.", "success");
      if (res.devOtp) {
        setDevOtp(res.devOtp);
        setOtpCode(res.devOtp);
      }
      setOtpStep(2);
    } catch (err: any) {
      setOtpError(err.message || "Failed to dispatch verification code. Please check your email.");
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpError("Please enter the 6-digit verification code.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setOtpError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setOtpError("Passwords do not match.");
      return;
    }

    setOtpError("");
    setIsOtpLoading(true);

    try {
      const auth = await authApi.resetPassword({
        email: otpEmail.trim().toLowerCase(),
        otp: otpCode.trim(),
        newPassword: newPassword,
      });

      setAuthSession(auth.token, auth.user, true);
      showToast("Password set successfully! Entering your workspace...", "success");
      navigateToWorkspace(auth.user);
    } catch (err: any) {
      setOtpError(err.message || "Invalid or expired verification code.");
    } finally {
      setIsOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-6 sm:px-10 lg:px-16 py-12 select-none">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1.1fr_auto_1fr] items-center gap-10 lg:gap-16">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Minimal Brand & Value Proposition                            */}
        {/* ========================================================================= */}
        <div className="space-y-6 sm:space-y-8 max-w-lg">
          {/* Top Brand Lockup */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#047857] flex items-center justify-center text-white font-bold text-sm shadow-xs font-heading shrink-0">
              PH
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 font-heading">
              ProjectHub
            </span>
          </div>

          {/* Subtle Pill Badge */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#047857] border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-[#047857]" />
              <span>Built for Educational Excellence</span>
            </div>
          </div>

          {/* Bold Display Headline & Subtext */}
          <div className="space-y-3">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 font-heading leading-tight">
              Plan. Track. Achieve.
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-md">
              The complete workspace for college projects and NBA compliance.
            </p>
          </div>

          {/* Minimal 3-Item Feature Strip */}
          <div className="pt-6 sm:pt-8 border-t border-slate-200/60 flex flex-wrap items-center gap-y-2 text-xs sm:text-sm text-slate-500 font-medium">
            <span>Manage Projects Efficiently</span>
            <span className="hidden sm:inline-block w-px h-3.5 bg-slate-300 mx-3" />
            <span>Ensure NBA Compliance</span>
            <span className="hidden sm:inline-block w-px h-3.5 bg-slate-300 mx-3" />
            <span>Track Progress with Ease</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CENTER DIVIDER: Vertical Faded Gradient Line                              */}
        {/* ========================================================================= */}
        <div className="hidden lg:block w-px h-80 bg-gradient-to-b from-transparent via-slate-200 to-transparent" />

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Unboxed, Clean Login Form                                   */}
        {/* ========================================================================= */}
        <div className="max-w-sm w-full mx-auto">
          {/* VIEW 1: STANDARD LOGIN */}
          {viewMode === "login" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 font-heading tracking-tight">
                  Login
                </h2>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                {/* Your Email Address Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      Your Email Address
                    </label>
                    {activeTenant?.isMatched && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#047857] animate-in fade-in duration-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#047857]" />
                        {activeTenant.short}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" strokeWidth={1.75} />
                    </div>
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError("");
                      }}
                      placeholder="you@college.edu"
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* Your Password Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Your Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" strokeWidth={1.75} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10 pl-9 pr-10 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono transition-colors"
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

                {emailError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                    <p>{emailError}</p>
                    {emailError.toLowerCase().includes("forgot password") && (
                      <button
                        type="button"
                        onClick={() => switchToOtp()}
                        className="font-semibold text-rose-900 underline hover:text-rose-950 block text-[11px] cursor-pointer"
                      >
                        Click here to set your password &rarr;
                      </button>
                    )}
                  </div>
                )}

                {/* Full-width Deep Forest Emerald Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 rounded-lg bg-[#047857] hover:bg-[#065F46] text-white font-medium text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70 shadow-xs"
                >
                  {isLoading ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Log In</span>
                      <span>&rarr;</span>
                    </>
                  )}
                </button>

                {/* Right-aligned Forgot Password Link */}
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => switchToOtp()}
                    className="text-sm font-medium text-[#047857] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VIEW 2: INLINE SET / FORGOT PASSWORD (OTP) */}
          {viewMode === "otp" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold text-slate-900 font-heading tracking-tight">
                  {otpStep === 1 ? "Reset Password" : "Verification Code"}
                </h2>
                <p className="text-xs text-slate-500">
                  {otpStep === 1
                    ? "Enter your email to receive a 6-digit verification code."
                    : `Enter the 6-digit OTP sent to ${otpEmail}`}
                </p>
              </div>

              {/* STEP 1: Enter Email & Request OTP */}
              {otpStep === 1 && (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">
                        Your Email Address
                      </label>
                      {activeTenant?.isMatched && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#047857] animate-in fade-in duration-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#047857]" />
                          {activeTenant.short}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="h-4 w-4" strokeWidth={1.75} />
                      </div>
                      <input
                        type="email"
                        autoComplete="email"
                        value={otpEmail}
                        onChange={(e) => {
                          setOtpEmail(e.target.value);
                          if (otpError) setOtpError("");
                        }}
                        placeholder="you@college.edu"
                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors font-mono"
                      />
                    </div>
                  </div>

                  {otpError && (
                    <p className="text-xs text-rose-600">{otpError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isOtpLoading}
                    className="w-full h-10 rounded-lg bg-[#047857] hover:bg-[#065F46] text-white font-medium text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70 shadow-xs"
                  >
                    {isOtpLoading ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Send OTP</span>
                        <span>&rarr;</span>
                      </>
                    )}
                  </button>

                  <div className="flex justify-start pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode("login");
                        setOtpStep(1);
                        setOtpError("");
                      }}
                      className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>&larr; Back to Login</span>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Enter OTP & Set New Password */}
              {otpStep === 2 && (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                  {devOtp && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-semibold block text-[11px]">Development OTP:</span>
                        <span className="font-mono text-sm font-bold tracking-widest text-amber-950">
                          {devOtp}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOtpCode(devOtp)}
                        className="text-[11px] font-semibold text-amber-800 underline hover:text-amber-950 cursor-pointer"
                      >
                        Auto-filled
                      </button>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">
                        6-Digit Verification Code
                      </label>
                      <button
                        type="button"
                        onClick={() => setOtpStep(1)}
                        className="text-[11px] text-[#047857] hover:underline font-medium cursor-pointer"
                      >
                        Edit Email
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="h-4 w-4" strokeWidth={1.75} />
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => {
                          setOtpCode(e.target.value.replace(/\D/g, ""));
                          if (otpError) setOtpError("");
                        }}
                        placeholder="123456"
                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors font-mono tracking-widest"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-4 w-4" strokeWidth={1.75} />
                      </div>
                      <input
                        type={showNewPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full h-10 pl-9 pr-10 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 stroke-[1.75]" />
                        ) : (
                          <Eye className="h-4 w-4 stroke-[1.75]" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-4 w-4" strokeWidth={1.75} />
                      </div>
                      <input
                        type={showNewPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors font-mono"
                      />
                    </div>
                  </div>

                  {otpError && (
                    <p className="text-xs text-rose-600">{otpError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isOtpLoading}
                    className="w-full h-10 rounded-lg bg-[#047857] hover:bg-[#065F46] text-white font-medium text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70 shadow-xs"
                  >
                    {isOtpLoading ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Set Password &amp; Log In</span>
                        <span>&rarr;</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      disabled={isOtpLoading}
                      className="text-slate-500 hover:text-[#047857] underline cursor-pointer"
                    >
                      Resend OTP
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode("login");
                        setOtpStep(1);
                        setOtpError("");
                      }}
                      className="text-slate-600 hover:text-slate-900 hover:underline cursor-pointer font-medium"
                    >
                      &larr; Back to Login
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}