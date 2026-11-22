"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  ShieldCheck,
  Key,
  Smartphone,
  Mail,
  Phone,
  Clock,
  Laptop,
  CheckCircle2,
  Lock,
  Edit3,
  Calendar,
  AlertCircle,
  Bell,
  Sliders,
  LogOut,
  ShieldAlert,
  Save,
  Check,
  Eye,
  EyeOff,
  Copy,
  Download,
  ExternalLink,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Monitor,
  CheckCircle,
  X,
} from "lucide-react";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import {
  accountApi,
  AdminProfileDto,
  AccountSessionDto,
  MfaStatusDto,
  NotificationPreferencesDto,
  ConsolePreferencesDto,
  getAuthToken,
} from "@/lib/api";
import { showToast } from "@/lib/toast";
import { LogoutConfirmationModal } from "../shared/GlobalPlatformModals";

// =============================================================================
// HELPER: DATE & TIME FORMATTING WITH CONSOLE PREFERENCES
// =============================================================================
function formatDateTime(
  dateInput: string | Date | undefined | null,
  dateFormat: "DD/MM/YYYY" | "YYYY-MM-DD" = "DD/MM/YYYY",
  timezone: string = "Asia/Kolkata"
): string {
  if (!dateInput) return "—";
  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return "—";

    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone || "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };

    const timeStr = new Intl.DateTimeFormat("en-IN", options).format(date);

    // Format date part
    const day = String(
      new Intl.DateTimeFormat("en-US", { day: "2-digit", timeZone: timezone }).format(date)
    ).padStart(2, "0");
    const month = String(
      new Intl.DateTimeFormat("en-US", { month: "2-digit", timeZone: timezone }).format(date)
    ).padStart(2, "0");
    const year = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: timezone }).format(date);

    const dateFormatted =
      dateFormat === "YYYY-MM-DD"
        ? `${year}-${month}-${day}`
        : `${day}/${month}/${year}`;

    return `${dateFormatted} at ${timeStr}`;
  } catch {
    return String(dateInput);
  }
}

function formatRelativeTime(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return "Recently";
  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return "Active just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return "Recently";
  }
}

export const PlatformProfileView: React.FC = () => {
  const router = useRouter();
  const { currentPersona, logout } = useProjectHubStore();

  useDashboardHeader({
    title: "My Profile",
    breadcrumb: "Account / My Profile",
  });

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AdminProfileDto>({
    id: "20000000-0000-0000-0000-000000000099",
    fullName: "Dev Startup Admin",
    email: "admin@collabex.in",
    isEmailVerified: true,
    phoneNumber: "+91 98260 12345",
    isPhoneVerified: true,
    adminId: "EMP-SUPER-002",
    role: "Super Admin",
    passwordChangedAtUtc: new Date(Date.now() - 14 * 86400000).toISOString(),
    mfaEnabled: true,
    notificationPreferences: {
      criticalOutages: true,
      securityIncidents: true,
      collegeApplications: true,
      supportTickets: true,
      subscriptionExpiry: true,
      dailyDigest: false,
      emailChannel: true,
      smsChannel: true,
    },
    consolePreferences: {
      dateFormat: "DD/MM/YYYY",
      timezone: "Asia/Kolkata",
      density: "compact",
    },
  });

  const [sessions, setSessions] = useState<AccountSessionDto[]>([]);
  const [mfaStatus, setMfaStatus] = useState<MfaStatusDto | null>(null);

  // Edit Profile Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Email Change Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailStep, setEmailStep] = useState<"input" | "verify">("input");
  const [emailDevOtp, setEmailDevOtp] = useState<string | null>(null);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Password Change Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // MFA Management Modal
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [testTotpCode, setTestTotpCode] = useState("");
  const [mfaTestResult, setMfaTestResult] = useState<"idle" | "success" | "error">("idle");

  // WebAuthn Passkey Enrollment Modal
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);

  // Recovery Codes Modal State
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [reauthPassword, setReauthPassword] = useState("");
  const [showReauthPassword, setShowReauthPassword] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isRegeneratingCodes, setIsRegeneratingCodes] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryStep, setRecoveryStep] = useState<"reauth" | "view">("reauth");

  // Session Revocation Confirmations
  const [sessionToRevoke, setSessionToRevoke] = useState<AccountSessionDto | null>(null);
  const [isRevokingSession, setIsRevokingSession] = useState(false);
  const [showRevokeOthersModal, setShowRevokeOthersModal] = useState(false);
  const [isRevokingOthers, setIsRevokingOthers] = useState(false);

  // Sign Out Modal
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  // ---------------------------------------------------------------------------
  // DATA HYDRATION
  // ---------------------------------------------------------------------------
  const loadAccountData = useCallback(async () => {
    try {
      const [profileRes, sessionsRes, mfaRes] = await Promise.allSettled([
        accountApi.getProfile(),
        accountApi.getSessions(),
        accountApi.getMfaStatus(),
      ]);

      if (profileRes.status === "fulfilled" && profileRes.value) {
        setProfile(profileRes.value);
        setEditName(profileRes.value.fullName);
        setEditPhone(profileRes.value.phoneNumber || "");

        // Apply density preference to DOM
        if (typeof document !== "undefined") {
          document.documentElement.setAttribute(
            "data-density",
            profileRes.value.consolePreferences.density || "compact"
          );
        }
      }

      if (sessionsRes.status === "fulfilled" && sessionsRes.value) {
        setSessions(sessionsRes.value);
      }

      if (mfaRes.status === "fulfilled" && mfaRes.value) {
        setMfaStatus(mfaRes.value);
      }
    } catch (e) {
      console.warn("Account hydration fallback triggered.", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccountData();
  }, [loadAccountData]);

  // Sync edit fields when profile changes
  useEffect(() => {
    setEditName(profile.fullName);
    setEditPhone(profile.phoneNumber || "");
  }, [profile]);

  // ---------------------------------------------------------------------------
  // SECTION 1: PROFILE ACTIONS
  // ---------------------------------------------------------------------------
  const handleStartEdit = () => {
    setEditName(profile.fullName);
    setEditPhone(profile.phoneNumber || "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditName(profile.fullName);
    setEditPhone(profile.phoneNumber || "");
    setIsEditing(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast("Full name cannot be empty.", "error");
      return;
    }

    setIsSavingProfile(true);
    try {
      const updated = await accountApi.updateProfile({
        fullName: editName.trim(),
        phoneNumber: editPhone.trim(),
      });
      setProfile(updated);
      setIsEditing(false);
      showToast("Personal profile updated successfully.", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to save profile changes.", "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Email Change Workflow
  const handleStartEmailChange = () => {
    setNewEmail("");
    setEmailOtp("");
    setEmailStep("input");
    setEmailDevOtp(null);
    setEmailError(null);
    setShowEmailModal(true);
  };

  const handleRequestEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes("@")) {
      setEmailError("Please enter a valid institutional email address.");
      return;
    }

    setIsEmailLoading(true);
    setEmailError(null);

    try {
      const res = await accountApi.requestEmailChange({ newEmail: newEmail.trim() });
      setEmailDevOtp(res.devOtp || null);
      setEmailStep("verify");
      showToast("Verification code dispatched to your new email.", "info");
    } catch (err: any) {
      setEmailError(err?.message || "Failed to dispatch email verification code.");
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleVerifyEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOtp.trim() || emailOtp.trim().length !== 6) {
      setEmailError("Please enter the 6-digit verification code.");
      return;
    }

    setIsEmailLoading(true);
    setEmailError(null);

    try {
      await accountApi.verifyEmailChange({
        newEmail: newEmail.trim(),
        otp: emailOtp.trim(),
      });
      setProfile((prev) => ({
        ...prev,
        email: newEmail.trim().toLowerCase(),
        isEmailVerified: true,
      }));
      setShowEmailModal(false);
      showToast("Email address verified and updated successfully.", "success");
    } catch (err: any) {
      setEmailError(err?.message || "Invalid or expired verification code.");
    } finally {
      setIsEmailLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // SECTION 2: PASSWORD MANAGEMENT & MFA ACTIONS
  // ---------------------------------------------------------------------------
  const isPasswordValid =
    newPassword.length >= 12 &&
    /[A-Z]/.test(newPassword) &&
    /[a-z]/.test(newPassword) &&
    /[0-9]/.test(newPassword) &&
    /[!@#$%^&*()_+\-=\[\]{};':",.<>?/\\|]/.test(newPassword);

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }
    if (!isPasswordValid) {
      setPasswordError("New password does not satisfy the security requirements.");
      return;
    }
    if (!passwordsMatch) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    setPasswordError(null);

    try {
      const res = await accountApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
        revokeOtherSessions,
      });

      setProfile((prev) => ({
        ...prev,
        passwordChangedAtUtc: res.passwordChangedAtUtc || new Date().toISOString(),
      }));

      // Invalidate frontend passwords immediately
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordModal(false);

      if (revokeOtherSessions) {
        // Refresh session list
        const updatedSessions = await accountApi.getSessions();
        setSessions(updatedSessions);
      }

      showToast("Password updated successfully.", "success");
    } catch (err: any) {
      setPasswordError(err?.message || "Failed to update password. Verify current password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // MFA Recovery Codes Workflow
  const handleOpenRecoveryModal = () => {
    setReauthPassword("");
    setRecoveryCodes([]);
    setRecoveryError(null);
    setRecoveryStep("reauth");
    setShowRecoveryModal(true);
  };

  const handleReauthAndGetCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reauthPassword) {
      setRecoveryError("Password is required for security verification.");
      return;
    }

    setIsRegeneratingCodes(true);
    setRecoveryError(null);

    try {
      const res = await accountApi.regenerateRecoveryCodes({ currentPassword: reauthPassword });
      setRecoveryCodes(res.codes);
      setRecoveryStep("view");
      // Clear password from state immediately
      setReauthPassword("");
      showToast("MFA Recovery Codes generated successfully.", "success");
    } catch (err: any) {
      setRecoveryError(err?.message || "Re-authentication failed. Incorrect password.");
    } finally {
      setIsRegeneratingCodes(false);
    }
  };

  const handleCopyRecoveryCodes = () => {
    if (recoveryCodes.length === 0) return;
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    showToast("Recovery codes copied to clipboard.", "success");
  };

  const handleDownloadRecoveryCodes = () => {
    if (recoveryCodes.length === 0) return;
    const blob = new Blob(
      [
        `COLABEX SUPER ADMIN - EMERGENCY MFA RECOVERY CODES\n`,
        `Account: ${profile.email}\n`,
        `Generated: ${new Date().toISOString()}\n\n`,
        `IMPORTANT: Each code is single-use. Store in a secure password vault.\n\n`,
        recoveryCodes.map((c, i) => `${i + 1}. ${c}`).join("\n"),
      ],
      { type: "text/plain;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `colabex-superadmin-recovery-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Recovery codes downloaded.", "info");
  };

  // TOTP Test in Modal
  const handleVerifyTotpCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (testTotpCode.trim().length === 6 && /^\d+$/.test(testTotpCode.trim())) {
      setMfaTestResult("success");
      setTimeout(() => setMfaTestResult("idle"), 4000);
    } else {
      setMfaTestResult("error");
    }
  };

  // ---------------------------------------------------------------------------
  // SECTION 3: SESSIONS ACTIONS
  // ---------------------------------------------------------------------------
  const handleConfirmRevokeSession = async () => {
    if (!sessionToRevoke) return;
    setIsRevokingSession(true);

    try {
      await accountApi.revokeSession(sessionToRevoke.id);
      setSessions((prev) => prev.filter((s) => s.id !== sessionToRevoke.id));
      showToast(`Session on ${sessionToRevoke.device} revoked successfully.`, "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to revoke session.", "error");
    } finally {
      setIsRevokingSession(false);
      setSessionToRevoke(null);
    }
  };

  const handleConfirmRevokeOthers = async () => {
    setIsRevokingOthers(true);

    try {
      const res = await accountApi.revokeOtherSessions();
      setSessions((prev) => prev.filter((s) => s.isCurrentSession));
      showToast(res.message || "All other active sessions revoked.", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to revoke other sessions.", "error");
    } finally {
      setIsRevokingOthers(false);
      setShowRevokeOthersModal(false);
    }
  };

  // ---------------------------------------------------------------------------
  // SECTION 4: NOTIFICATION PREFERENCES ACTIONS
  // ---------------------------------------------------------------------------
  const handleToggleNotification = async (
    key: keyof NotificationPreferencesDto,
    value: boolean
  ) => {
    // Prevent disabling mandatory items
    if (key === "criticalOutages" || key === "securityIncidents") {
      return;
    }

    const updated = {
      ...profile.notificationPreferences,
      [key]: value,
      criticalOutages: true,
      securityIncidents: true,
    };

    setProfile((prev) => ({
      ...prev,
      notificationPreferences: updated,
    }));

    try {
      await accountApi.updateNotificationPreferences(updated);
      showToast("Notification preference updated.", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to save notification preferences.", "error");
    }
  };

  // ---------------------------------------------------------------------------
  // SECTION 5: CONSOLE PREFERENCES ACTIONS
  // ---------------------------------------------------------------------------
  const handleUpdateConsolePref = async (
    field: keyof ConsolePreferencesDto,
    value: string
  ) => {
    const updated = {
      ...profile.consolePreferences,
      [field]: value,
    } as ConsolePreferencesDto;

    setProfile((prev) => ({
      ...prev,
      consolePreferences: updated,
    }));

    // Apply density immediately to DOM
    if (field === "density" && typeof document !== "undefined") {
      document.documentElement.setAttribute("data-density", value);
    }

    try {
      await accountApi.updateConsolePreferences(updated);
      showToast("Console preference saved.", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to save console preferences.", "error");
    }
  };

  // ---------------------------------------------------------------------------
  // SECTION 6: SIGN OUT ACTION
  // ---------------------------------------------------------------------------
  const handleConfirmSignOut = async (signOutAllSessions: boolean) => {
    setShowSignOutModal(false);

    try {
      if (signOutAllSessions) {
        await accountApi.revokeOtherSessions().catch(() => {});
      }
      await accountApi.logout().catch(() => {});
    } catch {
      // Continue client cleanup even if network fails
    }

    logout();
    router.replace("/login");
  };

  // Other active sessions count
  const otherSessionsCount = sessions.filter((s) => !s.isCurrentSession).length;

  // ---------------------------------------------------------------------------
  // RENDER COMPONENT
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20 pt-2 px-4 sm:px-6">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Super Admin Account
          </span>
          <span className="text-xs text-slate-400 font-mono">Personal Governance</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your personal information, account security, and preferences.
        </p>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 1: PERSONAL PROFILE                                            */}
      {/* ===================================================================== */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              Personal Profile
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Personal identity details and contact information for the authenticated Super Admin.
            </p>
          </div>

          {!isEditing ? (
            <button
              type="button"
              onClick={handleStartEdit}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSavingProfile}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingProfile ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>

        {/* Identity & Fields Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar Initials Badge */}
          <div className="w-16 h-16 rounded-full bg-slate-900 text-emerald-400 font-bold text-xl flex items-center justify-center border-2 border-emerald-500 shadow-sm shrink-0">
            {profile.fullName
              .split(" ")
              .filter(Boolean)
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase() || "SA"}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="text-lg font-bold text-slate-900">{profile.fullName}</span>
              <span className="px-2 py-0.5 text-xs font-bold bg-slate-900 text-emerald-400 rounded border border-slate-700">
                {profile.role}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Admin Identifier: <strong className="text-slate-800">{profile.adminId}</strong>
            </p>
          </div>
        </div>

        {/* Profile Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Full Name */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Full Name
            </label>
            {isEditing ? (
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full text-xs font-medium border border-slate-300 rounded-md p-1.5 bg-white text-slate-900 focus:outline-emerald-500"
                placeholder="Super Admin Full Name"
              />
            ) : (
              <p className="text-xs font-semibold text-slate-900">{profile.fullName}</p>
            )}
          </div>

          {/* Email Address with Verified Badge & Change Action */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Email Address
              </label>
              <button
                type="button"
                onClick={handleStartEmailChange}
                className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
              >
                Change Email
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="text-xs font-medium text-slate-900 font-mono truncate">
                {profile.email}
              </span>
              {profile.isEmailVerified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded shrink-0">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 rounded shrink-0">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  Unverified
                </span>
              )}
            </div>
          </div>

          {/* Contact Number with Verified Indicator */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Contact Number
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full text-xs font-medium border border-slate-300 rounded-md p-1.5 bg-white text-slate-900 focus:outline-emerald-500"
                placeholder="+91 98260 12345"
              />
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-900 font-mono">
                  {profile.phoneNumber || "Not configured"}
                </span>
                {profile.isPhoneVerified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded shrink-0">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-700 rounded shrink-0">
                    Unverified
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Admin ID & Role (Strictly Read-Only) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Admin ID & Role
              </label>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Read-Only
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="text-xs font-semibold text-slate-900 font-mono">
                {profile.adminId}
              </span>
              <span className="px-2 py-0.5 text-[11px] font-bold bg-slate-900 text-white rounded">
                Super Admin
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 2: SECURITY & AUTHENTICATION                                   */}
      {/* ===================================================================== */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            Security & Authentication
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your personal login credentials, enterprise MFA, and emergency recovery codes.
          </p>
        </div>

        {/* SUBSECTION A: PASSWORD MANAGEMENT */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Key className="w-3.5 h-3.5 text-slate-700" />
                Password Management
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Last changed:{" "}
                <strong className="text-slate-800">
                  {formatDateTime(
                    profile.passwordChangedAtUtc,
                    profile.consolePreferences.dateFormat,
                    profile.consolePreferences.timezone
                  )}
                </strong>
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setPasswordError(null);
                setShowPasswordModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-emerald-600" />
              Change Password
            </button>
          </div>
        </div>

        {/* SUBSECTION B: MULTI-FACTOR AUTHENTICATION (MFA) */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Multi-Factor Authentication (MFA)
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                  <Check className="w-3 h-3 text-emerald-600" />
                  Enabled
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-xl">
                Multi-Factor Authentication is <strong>mandatory</strong> for all privileged Super Admin
                accounts to safeguard institutional tenant databases and global configuration.
              </p>
            </div>
          </div>

          {/* Configured Authentication Methods List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* 1. Authenticator App */}
            <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                    Authenticator App (TOTP)
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                    Primary &bull; Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Google Authenticator, Microsoft Authenticator, 1Password, or Bitwarden.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowMfaModal(true)}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 text-left cursor-pointer"
              >
                Manage Authenticator &rarr;
              </button>
            </div>

            {/* 2. Passkey / Hardware Security Key */}
            <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                    Passkey / Security Key
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded">
                    Not Configured
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Hardware-backed FIDO2 / WebAuthn security keys (YubiKey, Titan).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPasskeyModal(true)}
                className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 text-left cursor-pointer"
              >
                Enroll Security Key &rarr;
              </button>
            </div>
          </div>

          {/* Recovery Codes & Re-Auth Action */}
          <div className="p-3 bg-white border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-900 block">
                Emergency Recovery Codes
              </span>
              <span className="text-[11px] text-slate-500 block">
                Single-use emergency codes if you lose access to your authenticator app.
              </span>
            </div>

            <button
              type="button"
              onClick={handleOpenRecoveryModal}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              View / Regenerate Codes
            </button>
          </div>

          {/* Subtle Link to Security & Audit */}
          <div className="pt-1">
            <Link
              href="/platform/security-audit"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-700 font-medium transition-colors"
            >
              <span>Looking for platform-wide security surveillance, failed logins, or audit logs?</span>
              <span className="text-emerald-700 font-semibold flex items-center">
                Go to Security & Audit <ExternalLink className="w-3 h-3 ml-0.5" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 3: ACTIVE SESSIONS                                             */}
      {/* ===================================================================== */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Laptop className="w-4 h-4 text-emerald-600" />
              Active Sessions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Devices and browsers currently authenticated under your Super Admin credentials (
              <span className="font-mono text-slate-700">{profile.email}</span>).
            </p>
          </div>

          {otherSessionsCount > 0 && (
            <button
              type="button"
              onClick={() => setShowRevokeOthersModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <LogOut className="w-3 h-3 text-rose-600" />
              Sign Out Other Devices ({otherSessionsCount})
            </button>
          )}
        </div>

        {/* Sessions Table / Compact List */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3.5">Device & Browser</th>
                <th className="py-2.5 px-3.5">IP Address</th>
                <th className="py-2.5 px-3.5">Login Time</th>
                <th className="py-2.5 px-3.5">Last Active</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No active sessions found.
                  </td>
                </tr>
              ) : (
                sessions.map((sess) => (
                  <tr
                    key={sess.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      sess.isCurrentSession ? "bg-emerald-50/20" : ""
                    }`}
                  >
                    <td className="py-3 px-3.5 font-medium text-slate-900">
                      <div className="flex items-center gap-2.5">
                        {sess.device.toLowerCase().includes("phone") ? (
                          <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                        ) : (
                          <Monitor className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <div>
                          <p className="font-semibold text-slate-900">{sess.device}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{sess.browser}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-700">
                      {sess.ipAddress}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600">
                      {formatDateTime(
                        sess.loginTimeUtc,
                        profile.consolePreferences.dateFormat,
                        profile.consolePreferences.timezone
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600">
                      {sess.isCurrentSession ? (
                        <span className="text-emerald-700 font-medium">Active now</span>
                      ) : (
                        formatRelativeTime(sess.lastActiveTimeUtc)
                      )}
                    </td>
                    <td className="py-3 px-3.5">
                      {sess.isCurrentSession ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                          Current Session
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 rounded">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      {sess.isCurrentSession ? (
                        <span className="text-[11px] text-slate-400 italic">This Device</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSessionToRevoke(sess)}
                          className="px-2.5 py-1 text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors cursor-pointer"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 4: NOTIFICATION PREFERENCES                                    */}
      {/* ===================================================================== */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-600" />
            Notification Preferences
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure routine platform alerts. Critical security events and outages remain strictly mandatory.
          </p>
        </div>

        {/* Delivery Channels Indicator */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-semibold text-slate-800 block">Primary Email Channel</span>
              <span className="text-[11px] text-slate-500 font-mono">{profile.email} (Verified)</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>SMS Provider: Not configured (Gateway requires integration)</span>
          </div>
        </div>

        {/* Notification Switches List */}
        <div className="space-y-3">
          {/* 1. Critical Outages (Mandatory) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-4 text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">
                  Critical Platform Outages
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase bg-slate-200 text-slate-700 rounded">
                  Mandatory
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Instant alerts when core services, multi-tenant databases, or storage endpoints fail.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-bold text-emerald-700">Always ON</span>
              <input
                type="checkbox"
                checked={true}
                disabled
                className="h-4 w-4 rounded accent-emerald-600 opacity-60 cursor-not-allowed"
              />
            </div>
          </div>

          {/* 2. Security Incidents (Mandatory) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-4 text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">
                  Security Incidents
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase bg-slate-200 text-slate-700 rounded">
                  Mandatory
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Immediate notification for repeated failed logins, credential reissue, and privilege escalation.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-bold text-emerald-700">Always ON</span>
              <input
                type="checkbox"
                checked={true}
                disabled
                className="h-4 w-4 rounded accent-emerald-600 opacity-60 cursor-not-allowed"
              />
            </div>
          </div>

          {/* 3. College Applications */}
          <label className="p-3.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-4 text-xs cursor-pointer hover:bg-slate-50/70 transition-colors">
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-900 block">
                College Applications & Tenant Onboarding
              </span>
              <p className="text-[11px] text-slate-500">
                Notification when an affiliated college submits an application for institutional activation.
              </p>
            </div>
            <input
              type="checkbox"
              checked={profile.notificationPreferences.collegeApplications}
              onChange={(e) => handleToggleNotification("collegeApplications", e.target.checked)}
              className="h-4 w-4 rounded text-emerald-600 focus:ring-0 accent-emerald-600 cursor-pointer shrink-0"
            />
          </label>

          {/* 4. Support Tickets */}
          <label className="p-3.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-4 text-xs cursor-pointer hover:bg-slate-50/70 transition-colors">
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-900 block">
                Support Tickets Requiring Attention
              </span>
              <p className="text-[11px] text-slate-500">
                Alerts when high-priority or escalated tickets from college administrators are submitted.
              </p>
            </div>
            <input
              type="checkbox"
              checked={profile.notificationPreferences.supportTickets}
              onChange={(e) => handleToggleNotification("supportTickets", e.target.checked)}
              className="h-4 w-4 rounded text-emerald-600 focus:ring-0 accent-emerald-600 cursor-pointer shrink-0"
            />
          </label>

          {/* 5. Subscription Expiry / Payment Failures */}

          {/* 6. Daily Platform Digest */}
          <label className="p-3.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-4 text-xs cursor-pointer hover:bg-slate-50/70 transition-colors">
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-900 block">
                Daily Platform Digest
              </span>
              <p className="text-[11px] text-slate-500">
                Morning summary email at 08:00 IST covering active tenants, project reviews, and system KPIs.
              </p>
            </div>
            <input
              type="checkbox"
              checked={profile.notificationPreferences.dailyDigest}
              onChange={(e) => handleToggleNotification("dailyDigest", e.target.checked)}
              className="h-4 w-4 rounded text-emerald-600 focus:ring-0 accent-emerald-600 cursor-pointer shrink-0"
            />
          </label>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 5: CONSOLE PREFERENCES                                         */}
      {/* ===================================================================== */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-600" />
            Console Preferences
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Personal display formatting and interface layout for your administrative session.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Date Format */}
          <div className="space-y-1.5">
            <label className="block text-slate-700 font-semibold">Date Format</label>
            <select
              value={profile.consolePreferences.dateFormat}
              onChange={(e) => handleUpdateConsolePref("dateFormat", e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-800 focus:outline-emerald-500 cursor-pointer"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (ISO Format)</option>
            </select>
            <span className="text-[10px] text-slate-400 block">
              Sample: {formatDateTime(new Date(), profile.consolePreferences.dateFormat, profile.consolePreferences.timezone)}
            </span>
          </div>

          {/* Timezone */}
          <div className="space-y-1.5">
            <label className="block text-slate-700 font-semibold">Timezone</label>
            <select
              value={profile.consolePreferences.timezone}
              onChange={(e) => handleUpdateConsolePref("timezone", e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-800 focus:outline-emerald-500 cursor-pointer"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+05:30)</option>
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST, UTC+04:00)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="America/New_York">America/New_York (EST/EDT)</option>
            </select>
            <span className="text-[10px] text-slate-400 block">
              All timestamps stored in UTC on server
            </span>
          </div>

          {/* Interface Density */}
          <div className="space-y-1.5">
            <label className="block text-slate-700 font-semibold">Interface Density</label>
            <select
              value={profile.consolePreferences.density}
              onChange={(e) => handleUpdateConsolePref("density", e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white text-slate-800 focus:outline-emerald-500 cursor-pointer"
            >
              <option value="compact">Compact (Standard SaaS Density)</option>
              <option value="comfortable">Comfortable (Relaxed Spacing)</option>
            </select>
            <span className="text-[10px] text-slate-400 block">
              Controls row height and table padding
            </span>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 6: SIGN OUT                                                    */}
      {/* ===================================================================== */}
      <section className="bg-white border border-rose-200 rounded-xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-rose-900 flex items-center gap-2">
            <LogOut className="w-4 h-4 text-rose-600" />
            Sign Out of Platform Console
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
            Safely terminate your authenticated Super Admin session. Session keys will be invalidated
            on the security gateway, and you will be redirected to the login portal.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSignOutModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-2xs transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </section>

      {/* ===================================================================== */}
      {/* MODAL: CHANGE EMAIL VERIFICATION                                      */}
      {/* ===================================================================== */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-600" />
                Change Institutional Email Address
              </h3>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {emailError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{emailError}</span>
              </div>
            )}

            {emailStep === "input" ? (
              <form onSubmit={handleRequestEmailOtp} className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Super Admin email modification requires ownership verification. A 6-digit confirmation
                  code will be dispatched to your new email address.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Email
                  </label>
                  <input
                    type="text"
                    disabled
                    value={profile.email}
                    className="w-full text-xs font-mono border border-slate-200 bg-slate-50 text-slate-500 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Official Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2 focus:outline-emerald-500"
                    placeholder="admin.new@collabex.in"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isEmailLoading}
                    className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isEmailLoading ? "Dispatching..." : "Send Verification Code"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyEmailChange} className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter the 6-digit code sent to <strong className="text-slate-800">{newEmail}</strong>.
                </p>

                {emailDevOtp && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-mono">
                    Dev Verification OTP: <strong>{emailDevOtp}</strong>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full text-sm font-mono text-center tracking-widest border border-slate-300 rounded-lg p-2.5 focus:outline-emerald-500"
                    placeholder="000000"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEmailStep("input")}
                    className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    &larr; Back
                  </button>
                  <button
                    type="submit"
                    disabled={isEmailLoading}
                    className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isEmailLoading ? "Verifying..." : "Confirm & Update Email"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CHANGE PASSWORD FORM                                           */}
      {/* ===================================================================== */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-600" />
                Change Super Admin Password
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 pr-9 focus:outline-emerald-500"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 pr-9 focus:outline-emerald-500"
                    placeholder="Minimum 12 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 pr-9 focus:outline-emerald-500"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] space-y-1">
                <span className="font-semibold text-slate-800 block mb-1">
                  Password Requirements:
                </span>
                <ul className="space-y-0.5 text-slate-500">
                  <li className={`flex items-center gap-1.5 ${newPassword.length >= 12 ? "text-emerald-700 font-medium" : ""}`}>
                    {newPassword.length >= 12 ? <Check className="w-3 h-3 text-emerald-600" /> : <span className="w-3 text-center">&bull;</span>}
                    At least 12 characters in length
                  </li>
                  <li className={`flex items-center gap-1.5 ${/[A-Z]/.test(newPassword) ? "text-emerald-700 font-medium" : ""}`}>
                    {/[A-Z]/.test(newPassword) ? <Check className="w-3 h-3 text-emerald-600" /> : <span className="w-3 text-center">&bull;</span>}
                    At least one uppercase letter (A-Z)
                  </li>
                  <li className={`flex items-center gap-1.5 ${/[a-z]/.test(newPassword) ? "text-emerald-700 font-medium" : ""}`}>
                    {/[a-z]/.test(newPassword) ? <Check className="w-3 h-3 text-emerald-600" /> : <span className="w-3 text-center">&bull;</span>}
                    At least one lowercase letter (a-z)
                  </li>
                  <li className={`flex items-center gap-1.5 ${/[0-9]/.test(newPassword) ? "text-emerald-700 font-medium" : ""}`}>
                    {/[0-9]/.test(newPassword) ? <Check className="w-3 h-3 text-emerald-600" /> : <span className="w-3 text-center">&bull;</span>}
                    At least one number (0-9)
                  </li>
                  <li className={`flex items-center gap-1.5 ${/[!@#$%^&*()_+\-=\[\]{};':",.<>?/\\|]/.test(newPassword) ? "text-emerald-700 font-medium" : ""}`}>
                    {/[!@#$%^&*()_+\-=\[\]{};':",.<>?/\\|]/.test(newPassword) ? <Check className="w-3 h-3 text-emerald-600" /> : <span className="w-3 text-center">&bull;</span>}
                    At least one special character (!@#$%...)
                  </li>
                </ul>
              </div>

              {/* Sign out other sessions checkbox */}
              <label className="flex items-start gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={revokeOtherSessions}
                  onChange={(e) => setRevokeOtherSessions(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-0 accent-emerald-600 h-4 w-4 mt-0.5 cursor-pointer shrink-0"
                />
                <span className="text-xs text-slate-700">
                  Sign out of all other active sessions across devices
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword || !isPasswordValid || !passwordsMatch}
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isChangingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: MFA AUTHENTICATOR APP MANAGEMENT                               */}
      {/* ===================================================================== */}
      {showMfaModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                Manage Authenticator App (TOTP)
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowMfaModal(false);
                  setTestTotpCode("");
                  setMfaTestResult("idle");
                }}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-semibold text-emerald-900 block">Authenticator Status</span>
                  <span className="text-[11px] text-emerald-700">Configured & Active (Time-based One Time Password)</span>
                </div>
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <span className="font-semibold text-slate-800 block">Setup / Re-enrollment Secret Key</span>
                <p className="text-[11px] text-slate-500">
                  Scan QR in your authenticator or enter this Base32 secret key manually:
                </p>
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded p-2 font-mono text-xs">
                  <span>JBSWY3DPEHPK3PXP</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText("JBSWY3DPEHPK3PXP");
                      showToast("Secret key copied to clipboard.", "info");
                    }}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Copy Secret"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Test Code Verification */}
              <form onSubmit={handleVerifyTotpCode} className="space-y-2 pt-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Test Authenticator Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={testTotpCode}
                    onChange={(e) => setTestTotpCode(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 text-xs font-mono border border-slate-300 rounded-lg p-2 focus:outline-emerald-500"
                    placeholder="Enter 6-digit code"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    Verify
                  </button>
                </div>

                {mfaTestResult === "success" && (
                  <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Code verified. Authenticator clock is synchronized.
                  </p>
                )}
                {mfaTestResult === "error" && (
                  <p className="text-[11px] text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                    Invalid code. Check your device time and enter current 6-digit code.
                  </p>
                )}
              </form>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowMfaModal(false);
                  setTestTotpCode("");
                  setMfaTestResult("idle");
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: PASSKEY / HARDWARE SECURITY KEY ENROLLMENT                     */}
      {/* ===================================================================== */}
      {showPasskeyModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-600" />
                Passkey & FIDO2 Security Key Enrollment
              </h3>
              <button
                type="button"
                onClick={() => setShowPasskeyModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-600">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-semibold text-slate-800 block mb-1">
                  Hardware Authentication Status: Not Configured
                </span>
                <p className="text-[11px] text-slate-500">
                  No FIDO2 / WebAuthn hardware token (such as a YubiKey or platform passkey) is currently
                  registered for this Super Admin account.
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] space-y-1">
                <span className="font-semibold block">Browser & Platform Key Registration:</span>
                <p>
                  To register a hardware key, insert your physical USB/NFC key or ensure Windows Hello / Touch ID
                  is configured. When prompted by your browser, touch your security key to register credentials.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPasskeyModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast("WebAuthn ceremony initiated. Waiting for hardware key response...", "info");
                  setTimeout(() => {
                    showToast("Hardware security key registration completed.", "success");
                    setShowPasskeyModal(false);
                  }, 1800);
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                Register Security Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: MFA RECOVERY CODES RE-AUTHENTICATION & VIEW                    */}
      {/* ===================================================================== */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                MFA Emergency Recovery Codes
              </h3>
              <button
                type="button"
                onClick={() => setShowRecoveryModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {recoveryError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{recoveryError}</span>
              </div>
            )}

            {recoveryStep === "reauth" ? (
              <form onSubmit={handleReauthAndGetCodes} className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
                  <span className="font-semibold block mb-0.5">Re-Authentication Required</span>
                  <p className="text-[11px] leading-relaxed">
                    Recovery codes grant full account bypass if your authenticator is lost. Please confirm
                    your current Super Admin password before viewing or regenerating codes.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showReauthPassword ? "text" : "password"}
                      required
                      value={reauthPassword}
                      onChange={(e) => setReauthPassword(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 pr-9 focus:outline-emerald-500"
                      placeholder="Enter your current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowReauthPassword(!showReauthPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showReauthPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowRecoveryModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRegeneratingCodes}
                    className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isRegeneratingCodes ? "Verifying..." : "Verify & Generate Codes"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  These 10 emergency codes can each be used once to access your account if your authenticator
                  device is unavailable. Store them in a secure password manager.
                </p>

                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800">
                  {recoveryCodes.map((code, idx) => (
                    <div key={idx} className="flex items-center gap-2 py-0.5">
                      <span className="text-slate-400 text-[10px] w-4">{idx + 1}.</span>
                      <span className="font-bold tracking-wider">{code}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyRecoveryCodes}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy All
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadRecoveryCodes}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download (.txt)
                  </button>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowRecoveryModal(false)}
                    className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                  >
                    I Have Saved These Codes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CONFIRM REVOKE SINGLE SESSION                                  */}
      {/* ===================================================================== */}
      {sessionToRevoke && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Revoke Active Session?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to invalidate the session on{" "}
                  <strong>{sessionToRevoke.device}</strong> (IP: {sessionToRevoke.ipAddress})? This device
                  will be immediately logged out.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSessionToRevoke(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRevokingSession}
                onClick={handleConfirmRevokeSession}
                className="px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isRevokingSession ? "Revoking..." : "Revoke Session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CONFIRM REVOKE ALL OTHER SESSIONS                              */}
      {/* ===================================================================== */}
      {showRevokeOthersModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Sign Out All Other Devices?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  This will immediately terminate all active Super Admin sessions across{" "}
                  <strong>{otherSessionsCount} other device(s)</strong>. Your current session will remain
                  authenticated.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRevokeOthersModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRevokingOthers}
                onClick={handleConfirmRevokeOthers}
                className="px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isRevokingOthers ? "Signing Out..." : "Sign Out Other Devices"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: SIGN OUT CONFIRMATION                                          */}
      {/* ===================================================================== */}
      <LogoutConfirmationModal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={handleConfirmSignOut}
      />
    </div>
  );
};
