"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  Compass,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import {
  authApi,
  setAuthSession,
  getAuthToken,
  getUserProfile,
  UserProfileDto,
} from "@/lib/api";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { CollabexLogo } from "@/components/brand/CollabexLogo";

export default function LoginPage() {
  const router = useRouter();
  const { hydrateSessionUser } = useProjectHubStore();

  // Mode: "login" | "otp"
  const [viewMode, setViewMode] = useState<"login" | "otp">("login");
  const [otpStep, setOtpStep] = useState<1 | 2>(1);

  // Standard Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTestRole, setSelectedTestRole] = useState<string | null>(null);

  const testRoleAccounts = [
    {
      role: "SuperAdmin",
      label: "Super Admin",
      email: "superadmin@collabex.in",
      password: "Pass@1234",
      icon: ShieldCheck,
    },
    {
      role: "CollegeAdmin",
      label: "College Admin",
      email: "collegeadmin@sistec.ac.in",
      password: "Pass@1234",
      icon: Building2,
    },
    {
      role: "HOD",
      label: "HOD",
      email: "hod@sistec.ac.in",
      password: "Pass@1234",
      icon: UserCheck,
    },
    {
      role: "Coordinator",
      label: "Coordinator",
      email: "coordinator@sistec.ac.in",
      password: "Pass@1234",
      icon: Compass,
    },
    {
      role: "Faculty",
      label: "Faculty",
      email: "faculty@sistec.ac.in",
      password: "Pass@1234",
      icon: GraduationCap,
    },
    {
      role: "Student",
      label: "Student",
      email: "student@sistec.ac.in",
      password: "Pass@1234",
      icon: Users,
    },
  ];

  // OTP / Set Password State
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Reset all auth form fields and errors to pristine state
  const resetAuthFormState = () => {
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setEmailError("");
    setIsLoading(false);
    setOtpEmail("");
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setOtpError("");
    setSuccessMessage("");
    setDevOtp(null);
    setIsOtpLoading(false);
    setCooldown(0);
    setOtpStep(1);
  };

  const navigateToWorkspace = (user: UserProfileDto) => {
    hydrateSessionUser(user);
    if (user.role === "SuperAdmin") {
      router.replace("/admin");
    } else if (user.role === "CollegeAdmin") {
      router.replace("/college");
    } else if (user.role === "HOD") {
      router.replace("/hod");
    } else if (user.role === "Faculty") {
      if (user.isProjectCoordinator) {
        router.replace("/coordinator");
      } else {
        router.replace("/faculty");
      }
    } else {
      router.replace("/student");
    }
  };

  // Guard: Redirect immediately if already authenticated with active HttpOnly session
  useEffect(() => {
    let active = true;
    authApi
      .session()
      .then((res) => {
        if (!active) return;
        if (res.authenticated && res.user) {
          setAuthSession(null, res.user);
          navigateToWorkspace(res.user);
        } else {
          resetAuthFormState();
          setIsCheckingSession(false);
        }
      })
      .catch(() => {
        if (!active) return;
        resetAuthFormState();
        setIsCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // 30-Second Resend OTP Cooldown Timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setEmailError("Please enter a valid official college email address.");
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
        email: cleanEmail,
        password: password,
      });

      setAuthSession(null, auth.user);
      showToast(`Welcome back, ${auth.user.fullName}!`, "success");
      resetAuthFormState();
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
    resetAuthFormState();
    if (target && target.includes("@")) {
      setOtpEmail(target.trim().toLowerCase());
    }
    setViewMode("otp");
  };

  const switchToLogin = () => {
    resetAuthFormState();
    setViewMode("login");
  };

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cooldown > 0) return;

    const cleanEmail = otpEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setOtpError("Please enter a valid official college email address.");
      return;
    }

    setOtpError("");
    setSuccessMessage("");
    setIsOtpLoading(true);

    try {
      const res = await authApi.requestPasswordOtp({
        email: cleanEmail,
      });

      setCooldown(30);
      const msg = res.message || "Verification code dispatched to your email.";
      setSuccessMessage(msg);
      showToast(msg, "success");
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
    const cleanOtp = otpCode.trim();

    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setOtpError("Please enter a valid 6-digit numeric verification code.");
      return;
    }
    if (!newPassword || newPassword.length < 12) {
      setOtpError("Password must be at least 12 characters with uppercase, lowercase, digit, and symbol.");
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
        otp: cleanOtp,
        newPassword: newPassword,
      });

      setAuthSession(null, auth.user);
      showToast("Password set successfully! Entering your workspace...", "success");
      resetAuthFormState();
      navigateToWorkspace(auth.user);
    } catch (err: any) {
      setOtpError(err.message || "Invalid or expired verification code.");
    } finally {
      setIsOtpLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-slate-600 select-none">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-emerald-700 border-t-transparent animate-spin text-emerald-700" />
          <span className="text-xs text-slate-600 font-mono">
            Verifying session credentials...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-6 lg:p-8 select-none">
      <div className="w-full max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-8 sm:gap-10 lg:gap-14">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Minimal Brand & Value Proposition                            */}
        {/* ========================================================================= */}
        <div className="space-y-6 sm:space-y-8 max-w-lg">
          {/* Top Brand Lockup: Lockup A (collabex + flowing 4-node metaball icon) */}
          <div>
            <CollabexLogo variant="light" size="lg" />
          </div>

          {/* Subtle Pill Badge */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#047857] border border-emerald-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-[#047857]" />
              <span>Built for Educational Excellence</span>
            </div>
          </div>

          {/* Bold Display Headline & Subtext */}
          <div className="space-y-2 sm:space-y-3">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 font-heading leading-tight">
              Plan. Track. Achieve.
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-md">
              The complete workspace for college projects and structured evaluation.
            </p>
          </div>

          {/* Minimal Single-Line 3-Item Feature Strip */}
          <div className="border-t border-slate-200/80 pt-5 sm:pt-6 flex flex-wrap lg:flex-nowrap items-center gap-3 sm:gap-4 text-xs text-slate-500 font-medium">
            <span className="inline-flex items-center gap-1.5 whitespace-normal sm:whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#047857] shrink-0" strokeWidth={2} />
              <span>Manage Projects Efficiently</span>
            </span>
            <span className="hidden lg:inline-block h-3.5 w-px bg-slate-300" />
            <span className="inline-flex items-center gap-1.5 whitespace-normal sm:whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 text-[#047857] shrink-0" strokeWidth={2} />
              <span>Ensure Evaluation Integrity</span>
            </span>
            <span className="hidden lg:inline-block h-3.5 w-px bg-slate-300" />
            <span className="inline-flex items-center gap-1.5 whitespace-normal sm:whitespace-nowrap">
              <TrendingUp className="w-3.5 h-3.5 text-[#047857] shrink-0" strokeWidth={2} />
              <span>Track Progress with Ease</span>
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CENTER DIVIDER: Vertical Faded Gradient Line                              */}
        {/* ========================================================================= */}
        <div className="hidden lg:block w-px h-[380px] bg-gradient-to-b from-transparent via-slate-300 to-transparent" />

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Unboxed, Clean Login Form                                   */}
        {/* ========================================================================= */}
        <div className="max-w-sm sm:max-w-md w-full mx-auto">
          {/* VIEW 1: STANDARD LOGIN */}
          {viewMode === "login" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading tracking-tight">
                  Login
                </h2>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4" noValidate>
                {/* Your Email Address Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Your Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" strokeWidth={1.75} />
                    </div>
                    <input
                      type="email"
                      autoComplete="username"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError("");
                      }}
                      className="w-full h-11 sm:h-10 min-h-[44px] pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-base sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors font-mono"
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
                      className="w-full h-11 sm:h-10 min-h-[44px] pl-9 pr-11 rounded-lg border border-slate-200 bg-white text-base sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 h-11 w-11 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
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
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1 max-h-24 overflow-hidden">
                    <p className="line-clamp-2">{emailError}</p>
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
                  aria-busy={isLoading}
                  className="w-full h-11 sm:h-10 min-h-[44px] rounded-lg bg-[#047857] hover:bg-[#065F46] text-white font-medium text-base sm:text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70 shadow-xs"
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

                {/* Onboarding & Forgot Password Links */}
                <div className="flex items-center justify-between pt-1 gap-2">
                  <a
                    href="/onboarding"
                    className="text-sm font-medium text-slate-600 hover:text-[#047857] hover:underline min-h-[36px] flex items-center"
                  >
                    Activate via college roster
                  </a>
                  <button
                    type="button"
                    onClick={() => switchToOtp()}
                    className="text-sm font-medium text-[#047857] hover:underline cursor-pointer min-h-[36px] flex items-center"
                  >
                    Forgot password?
                  </button>
                </div>
                <p className="text-xs text-slate-500 text-center pt-1">
                  First time? Use &apos;Forgot password&apos; to set your password.
                </p>
              </form>
            </div>
          )}

          {/* VIEW 2: INLINE SET / FORGOT PASSWORD (OTP) */}
          {viewMode === "otp" && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading tracking-tight">
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
                <form onSubmit={handleRequestOtp} className="space-y-4" noValidate>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Your Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="h-4 w-4" strokeWidth={1.75} />
                      </div>
                      <input
                        type="email"
                        autoComplete="off"
                        value={otpEmail}
                        onChange={(e) => {
                          setOtpEmail(e.target.value);
                          if (otpError) setOtpError("");
                        }}
                        className="w-full h-11 sm:h-10 min-h-[44px] pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-base sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors font-mono"
                      />
                    </div>
                  </div>

                  {otpError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs max-h-24 overflow-hidden">
                      <p className="line-clamp-2">{otpError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isOtpLoading}
                    aria-busy={isOtpLoading}
                    className="w-full h-11 sm:h-10 min-h-[44px] rounded-lg bg-[#047857] hover:bg-[#065F46] text-white font-medium text-base sm:text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70 shadow-xs"
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
                      onClick={switchToLogin}
                      className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline inline-flex items-center gap-1 cursor-pointer min-h-[36px]"
                    >
                      <span>&larr; Back to Login</span>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Enter OTP & Set New Password */}
              {otpStep === 2 && (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4" noValidate>
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
                        className="text-[11px] font-semibold text-amber-800 underline hover:text-amber-950 cursor-pointer min-h-[36px] flex items-center"
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
                        className="text-[11px] text-[#047857] hover:underline font-medium cursor-pointer min-h-[32px] flex items-center"
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
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => {
                          setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                          if (otpError) setOtpError("");
                        }}
                        className="w-full h-11 sm:h-10 min-h-[44px] pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-base sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors font-mono tracking-widest"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      New Password (min 8 chars)
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
                        className="w-full h-11 sm:h-10 min-h-[44px] pl-9 pr-11 rounded-lg border border-slate-200 bg-white text-base sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 h-11 w-11 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showNewPassword ? "Hide password" : "Show password"}
                        tabIndex={-1}
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
                        className="w-full h-11 sm:h-10 min-h-[44px] pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-base sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors font-mono"
                      />
                    </div>
                  </div>

                  {otpError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs max-h-24 overflow-hidden">
                      <p className="line-clamp-2">{otpError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isOtpLoading}
                    aria-busy={isOtpLoading}
                    className="w-full h-11 sm:h-10 min-h-[44px] rounded-lg bg-[#047857] hover:bg-[#065F46] text-white font-medium text-base sm:text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70 shadow-xs"
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
                      onClick={() => handleRequestOtp()}
                      disabled={isOtpLoading || cooldown > 0}
                      className={cn(
                        "font-medium cursor-pointer transition-colors min-h-[36px] flex items-center",
                        cooldown > 0
                          ? "text-slate-400 cursor-not-allowed"
                          : "text-slate-500 hover:text-[#047857] underline"
                      )}
                    >
                      {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
                    </button>
                    <button
                      type="button"
                      onClick={switchToLogin}
                      className="text-slate-600 hover:text-slate-900 hover:underline cursor-pointer font-medium min-h-[36px] flex items-center"
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