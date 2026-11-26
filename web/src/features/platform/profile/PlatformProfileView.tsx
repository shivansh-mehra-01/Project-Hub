"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  ShieldCheck,
  Key,
  Smartphone,
  Mail,
  Phone,
  Laptop,
  CheckCircle2,
  Lock,
  Edit3,
  AlertCircle,
  LogOut,
  Save,
  Copy,
  Download,
  RefreshCw,
  Monitor,
  X,
} from "lucide-react";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import {
  accountApi,
  authApi,
  AdminProfileDto,
  AccountSessionDto,
  MfaStatusDto,
} from "@/lib/api";
import { showToast } from "@/lib/toast";
import { LogoutConfirmationModal } from "../shared/GlobalPlatformModals";

function formatDateTime(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return "—";
  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
}

function formatRelativeTime(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return "Recently";
  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (Number.isNaN(date.getTime())) return "Recently";
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return "Active just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return "Recently";
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const PlatformProfileView: React.FC = () => {
  const router = useRouter();
  const { logout } = useProjectHubStore();

  useDashboardHeader({
    title: "My Profile",
    breadcrumb: "Super Admin / My Profile",
  });

  // Loading & Error
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Authoritative Profile, MFA & Sessions State
  const [profile, setProfile] = useState<AdminProfileDto | null>(null);
  const [mfaStatus, setMfaStatus] = useState<MfaStatusDto | null>(null);
  const [sessions, setSessions] = useState<AccountSessionDto[]>([]);

  // Section A: Edit Profile State
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
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  // Phone Verification Modal State
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneDevOtp, setPhoneDevOtp] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);

  // Section B: Password Change Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Section B: Authenticator App (TOTP) Modal State
  const [showTotpModal, setShowTotpModal] = useState(false);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpOtpAuthUri, setTotpOtpAuthUri] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpEnrollmentRecoveryCodes, setTotpEnrollmentRecoveryCodes] = useState<string[]>([]);
  const [totpError, setTotpError] = useState<string | null>(null);
  const [isTotpLoading, setIsTotpLoading] = useState(false);

  // Section B: Recovery Codes Modal State
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [reauthPassword, setReauthPassword] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryStep, setRecoveryStep] = useState<"reauth" | "view">("reauth");

  // Section C: Session Revocation State
  const [sessionToRevoke, setSessionToRevoke] = useState<AccountSessionDto | null>(null);
  const [isRevokingSession, setIsRevokingSession] = useState(false);
  const [showRevokeOthersModal, setShowRevokeOthersModal] = useState(false);
  const [isRevokingOthers, setIsRevokingOthers] = useState(false);

  // Section D: Sign Out Modal
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const loadAccountData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [profileRes, sessionsRes, mfaRes] = await Promise.all([
        accountApi.getProfile(),
        accountApi.getSessions(),
        accountApi.getMfaStatus(),
      ]);
      setProfile(profileRes);
      setEditName(profileRes.fullName);
      setEditPhone(profileRes.phoneNumber || "");
      setSessions(Array.isArray(sessionsRes) ? sessionsRes : []);
      setMfaStatus(mfaRes);
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load Super Admin profile.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccountData();
  }, [loadAccountData]);

  // ---------------------------------------------------------------------------
  // SECTION A: PERSONAL INFORMATION HANDLERS
  // ---------------------------------------------------------------------------
  const handleStartEdit = () => {
    if (!profile) return;
    setEditName(profile.fullName);
    setEditPhone(profile.phoneNumber || "");
    setIsEditing(true);
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
      showToast("Personal profile updated.", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to save profile changes.", "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleOpenEmailModal = () => {
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
      setEmailError("Please enter a valid email address.");
      return;
    }
    setIsEmailLoading(true);
    setEmailError(null);
    try {
      const res = await accountApi.requestEmailChange({ newEmail: newEmail.trim() });
      setEmailDevOtp(res.devOtp || null);
      setEmailStep("verify");
      showToast("Verification code sent to your new email.", "info");
    } catch (err: any) {
      setEmailError(err?.message || "Failed to send verification code.");
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleVerifyEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailOtp.trim().length !== 6) {
      setEmailError("Please enter the 6-digit verification code.");
      return;
    }
    setIsEmailLoading(true);
    setEmailError(null);
    try {
      const res = await accountApi.verifyEmailChange({
        newEmail: newEmail.trim(),
        otp: emailOtp.trim(),
      });
      setProfile((prev) => (prev ? { ...prev, email: res.email, isEmailVerified: true } : prev));
      setShowEmailModal(false);
      showToast("Email address verified and updated.", "success");
    } catch (err: any) {
      setEmailError(err?.message || "Invalid or expired verification code.");
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleOpenPhoneVerification = async () => {
    setPhoneOtp("");
    setPhoneDevOtp(null);
    setPhoneError(null);
    setShowPhoneModal(true);
    setIsPhoneLoading(true);
    try {
      const res = await accountApi.requestPhoneVerification();
      setPhoneDevOtp(res.devOtp || null);
    } catch (err: any) {
      setPhoneError(err?.message || "Unable to initiate phone verification.");
    } finally {
      setIsPhoneLoading(false);
    }
  };

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneOtp.trim().length !== 6) {
      setPhoneError("Enter the 6-digit verification code.");
      return;
    }
    setIsPhoneLoading(true);
    setPhoneError(null);
    try {
      await accountApi.verifyPhone({ otp: phoneOtp.trim() });
      setProfile((prev) => (prev ? { ...prev, isPhoneVerified: true } : prev));
      setShowPhoneModal(false);
      showToast("Contact number verified.", "success");
    } catch (err: any) {
      setPhoneError(err?.message || "Invalid or expired verification code.");
    } finally {
      setIsPhoneLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // SECTION B: ACCOUNT SECURITY HANDLERS
  // ---------------------------------------------------------------------------
  const isPasswordValid =
    newPassword.length >= 12 &&
    /[A-Z]/.test(newPassword) &&
    /[a-z]/.test(newPassword) &&
    /[0-9]/.test(newPassword) &&
    /[!@#$%^&*()_+\-=\[\]{};':",.<>?/\\|]/.test(newPassword);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }
    if (!isPasswordValid) {
      setPasswordError("New password must be at least 12 characters with uppercase, lowercase, digit, and symbol.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
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
      setProfile((prev) =>
        prev ? { ...prev, passwordChangedAtUtc: res.passwordChangedAtUtc || new Date().toISOString() } : prev
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordModal(false);
      if (revokeOtherSessions) {
        const updatedSessions = await accountApi.getSessions();
        setSessions(updatedSessions);
      }
      showToast("Password updated successfully.", "success");
    } catch (err: any) {
      setPasswordError(err?.message || "Failed to update password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleOpenTotpModal = () => {
    setTotpSecret(null);
    setTotpOtpAuthUri(null);
    setTotpCode("");
    setTotpEnrollmentRecoveryCodes([]);
    setTotpError(null);
    setShowTotpModal(true);
  };

  const handleStartTotpEnrollment = async () => {
    setIsTotpLoading(true);
    setTotpError(null);
    try {
      const res = await authApi.enrollMfa();
      setTotpSecret(res.secret);
      setTotpOtpAuthUri(res.otpauthUri);
      setTotpEnrollmentRecoveryCodes([]);
      setTotpCode("");
    } catch (err: any) {
      setTotpError(err?.message || "Failed to initiate authenticator enrollment.");
    } finally {
      setIsTotpLoading(false);
    }
  };

  const handleConfirmTotpEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.trim().length !== 6) {
      setTotpError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setIsTotpLoading(true);
    setTotpError(null);
    try {
      const res = await authApi.confirmMfa({ code: totpCode.trim() });
      setTotpEnrollmentRecoveryCodes(res.recoveryCodes || []);
      const refreshedMfa = await accountApi.getMfaStatus();
      setMfaStatus(refreshedMfa);
      setProfile((prev) => (prev ? { ...prev, mfaEnabled: true } : prev));
      showToast("Authenticator app enrolled and verified.", "success");
    } catch (err: any) {
      setTotpError(err?.message || "Invalid TOTP verification code.");
    } finally {
      setIsTotpLoading(false);
    }
  };

  const handleOpenRecoveryModal = () => {
    setReauthPassword("");
    setRecoveryCodes([]);
    setRecoveryError(null);
    setRecoveryStep("reauth");
    setShowRecoveryModal(true);
  };

  const handleRegenerateRecoveryCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reauthPassword.trim()) {
      setRecoveryError("Current password is required.");
      return;
    }
    setRecoveryLoading(true);
    setRecoveryError(null);
    try {
      const res = await accountApi.regenerateRecoveryCodes({ currentPassword: reauthPassword });
      setRecoveryCodes(res.codes || []);
      setRecoveryStep("view");
      setReauthPassword("");
      const refreshedMfa = await accountApi.getMfaStatus();
      setMfaStatus(refreshedMfa);
      showToast("New emergency recovery codes generated.", "success");
    } catch (err: any) {
      setRecoveryError(err?.message || "Re-authentication failed.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleDownloadRecoveryCodes = (codesToDownload: string[]) => {
    const content = `COLABEX SUPER ADMIN EMERGENCY RECOVERY CODES\nGenerated: ${new Date().toISOString()}\nAccount: ${profile?.email || ""}\n\nStore these single-use codes in a secure password manager.\n\n${codesToDownload.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `colabex-recovery-codes-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------------------------------------------------------------------------
  // SECTION C: ACTIVE SESSIONS HANDLERS
  // ---------------------------------------------------------------------------
  const handleConfirmRevokeSession = async () => {
    if (!sessionToRevoke) return;
    setIsRevokingSession(true);
    try {
      await accountApi.revokeSession(sessionToRevoke.id);
      setSessions((prev) => prev.filter((s) => s.id !== sessionToRevoke.id));
      showToast("Session revoked.", "success");
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
      showToast(res.message || "Signed out of other devices.", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to revoke other sessions.", "error");
    } finally {
      setIsRevokingOthers(false);
      setShowRevokeOthersModal(false);
    }
  };

  // ---------------------------------------------------------------------------
  // SECTION D: SIGN OUT HANDLER
  // ---------------------------------------------------------------------------
  const handleConfirmSignOut = async (signOutAllSessions: boolean) => {
    setShowSignOutModal(false);
    try {
      if (signOutAllSessions) {
        await accountApi.revokeOtherSessions().catch(() => {});
      }
      await accountApi.logout().catch(() => {});
    } finally {
      logout();
      router.replace("/login");
    }
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrentSession).length;
  const totpMethod = mfaStatus?.methods.find((m) => m.type === "TOTP");
  const isTotpConfigured = Boolean(totpMethod?.isConfigured);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-xs text-slate-500">
        Loading Super Admin profile...
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 space-y-3">
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{loadError || "Unable to load profile."}</span>
          </div>
          <button
            type="button"
            onClick={loadAccountData}
            className="px-3 py-1 bg-white border border-rose-300 rounded-md font-semibold hover:bg-rose-100 cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 pt-2 px-4 sm:px-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Profile</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your personal Super Admin account details, security credentials, and active sessions.
        </p>
      </div>

      {/* ===================================================================== */}
      {/* A. PERSONAL INFORMATION                                               */}
      {/* ===================================================================== */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-sm flex items-center justify-center shrink-0">
              {getInitials(profile.fullName)}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-600" />
                Personal Information
              </h2>
              <p className="text-[11px] text-slate-500">Authenticated operator identity and verified contact channels.</p>
            </div>
          </div>

          {!isEditing && (
            <button
              type="button"
              onClick={handleStartEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label htmlFor="profile-fullname" className="block font-semibold text-slate-700">
                  Full Name
                </label>
                <input
                  id="profile-fullname"
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="profile-phone" className="block font-semibold text-slate-700">
                  Contact Number
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91 98XXXXXXXX"
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
                <p className="text-[11px] text-slate-500">Changing your contact number requires re-verification.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingProfile ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] text-slate-500 block">Full Name</span>
              <span className="font-semibold text-slate-900 block">{profile.fullName}</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[11px] text-slate-500 block">Admin Role</span>
              <span className="font-semibold text-slate-900 inline-flex items-center gap-1.5">
                {profile.role}
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600">
                  Read-only
                </span>
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email Address
                </span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    profile.isEmailVerified
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {profile.isEmailVerified ? "Verified" : "Pending Verification"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-medium text-slate-900 truncate">{profile.email}</span>
                <button
                  type="button"
                  onClick={handleOpenEmailModal}
                  className="text-[11px] font-semibold text-emerald-700 hover:underline shrink-0 cursor-pointer"
                >
                  Change Email
                </button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Contact Number
                </span>
                {profile.phoneNumber ? (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      profile.isPhoneVerified
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {profile.isPhoneVerified ? "Verified" : "Unverified"}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Not set</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-medium text-slate-900">
                  {profile.phoneNumber || "—"}
                </span>
                {profile.phoneNumber && !profile.isPhoneVerified && (
                  <button
                    type="button"
                    onClick={handleOpenPhoneVerification}
                    className="text-[11px] font-semibold text-emerald-700 hover:underline shrink-0 cursor-pointer"
                  >
                    Verify Number
                  </button>
                )}
              </div>
            </div>

            {profile.adminId && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1 sm:col-span-2">
                <span className="text-[11px] text-slate-500 block">Admin Identifier</span>
                <span className="font-mono text-xs font-semibold text-slate-800">{profile.adminId}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* B. ACCOUNT SECURITY                                                   */}
      {/* ===================================================================== */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Account Security
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Password policy, mandatory multi-factor authentication, and emergency recovery codes.
          </p>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {/* Change Password */}
          <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-500" />
                Password
              </div>
              <p className="text-[11px] text-slate-500">
                Last changed: {formatDateTime(profile.passwordChangedAtUtc)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPasswordError(null);
                setShowPasswordModal(true);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg self-start sm:self-auto cursor-pointer"
            >
              Change Password
            </button>
          </div>

          {/* Mandatory MFA Status + Authenticator App */}
          <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                Authenticator App (TOTP)
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                    isTotpConfigured
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  {isTotpConfigured ? "Active (Mandatory)" : "Enrollment Required (Mandatory)"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                MFA is mandatory for Super Admin accounts and cannot be disabled.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenTotpModal}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg self-start sm:self-auto cursor-pointer"
            >
              Manage Authenticator
            </button>
          </div>

          {/* Passkey / Security Key (Honest Availability) */}
          <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-900 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                Passkey / Security Key (FIDO2)
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  Unavailable
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                WebAuthn / FIDO2 hardware key enrollment is not configured on this server.
              </p>
            </div>
          </div>

          {/* Emergency Recovery Codes */}
          <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="font-semibold text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                Emergency Recovery Codes
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                    mfaStatus?.recoveryCodesConfigured
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {mfaStatus?.recoveryCodesConfigured ? "Configured" : "Not Generated"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Single-use backup codes for account recovery. Requires password re-authentication.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenRecoveryModal}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg self-start sm:self-auto cursor-pointer"
            >
              Regenerate Recovery Codes
            </button>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* C. ACTIVE SESSIONS                                                    */}
      {/* ===================================================================== */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Laptop className="w-4 h-4 text-emerald-600" />
              Active Sessions
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Authenticated sessions for <span className="font-mono">{profile.email}</span>.
            </p>
          </div>

          {otherSessionsCount > 0 && (
            <button
              type="button"
              onClick={() => setShowRevokeOthersModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg self-start sm:self-auto cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out Other Devices ({otherSessionsCount})
            </button>
          )}
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3.5">Device / Browser</th>
                <th className="py-2.5 px-3.5">Login Time</th>
                <th className="py-2.5 px-3.5">Last Active</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No active sessions found.
                  </td>
                </tr>
              ) : (
                sessions.map((sess) => (
                  <tr key={sess.id} className={sess.isCurrentSession ? "bg-emerald-50/30" : "hover:bg-slate-50/70"}>
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-900">{sess.device || "Unknown Device"}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {sess.browser || "Unknown Browser"}
                            {sess.ipAddress ? ` • ${sess.ipAddress}` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-slate-600">{formatDateTime(sess.loginTimeUtc)}</td>
                    <td className="py-3 px-3.5 text-slate-600">
                      {sess.isCurrentSession ? (
                        <span className="text-emerald-700 font-medium">Active now</span>
                      ) : (
                        formatRelativeTime(sess.lastActiveTimeUtc)
                      )}
                    </td>
                    <td className="py-3 px-3.5">
                      {sess.isCurrentSession ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                          Current Session
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 rounded">
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
                          className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded cursor-pointer"
                        >
                          Revoke Session
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
      {/* D. SIGN OUT                                                           */}
      {/* ===================================================================== */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Sign Out</h2>
          <p className="text-[11px] text-slate-500">
            Terminate your current authenticated session and return to the sign-in screen.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowSignOutModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </section>

      {/* ===================================================================== */}
      {/* MODALS                                                                */}
      {/* ===================================================================== */}

      {/* Change Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Change Email Address</h3>
              <button type="button" onClick={() => setShowEmailModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            {emailError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{emailError}</div>
            )}
            {emailStep === "input" ? (
              <form onSubmit={handleRequestEmailOtp} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">New Email Address</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="admin@domain.edu.in"
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowEmailModal(false)} className="px-3 py-1.5 bg-slate-100 rounded-lg font-semibold cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={isEmailLoading} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold cursor-pointer">
                    {isEmailLoading ? "Sending..." : "Send Verification Code"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyEmailChange} className="space-y-3 text-xs">
                <p className="text-slate-600">
                  Enter the 6-digit verification code sent to <span className="font-mono font-semibold">{newEmail}</span>.
                </p>
                {emailDevOtp && (
                  <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] font-mono text-amber-800">
                    Development OTP: {emailDevOtp}
                  </div>
                )}
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit code"
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono text-xs"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setEmailStep("input")} className="px-3 py-1.5 bg-slate-100 rounded-lg font-semibold cursor-pointer">
                    Back
                  </button>
                  <button type="submit" disabled={isEmailLoading} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold cursor-pointer">
                    {isEmailLoading ? "Verifying..." : "Verify & Update"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Verify Phone Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Verify Contact Number</h3>
              <button type="button" onClick={() => setShowPhoneModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            {phoneError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{phoneError}</div>
            )}
            {phoneDevOtp && (
              <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] font-mono text-amber-800">
                Development OTP: {phoneDevOtp}
              </div>
            )}
            <form onSubmit={handleVerifyPhone} className="space-y-3 text-xs">
              <p className="text-slate-600">
                Enter the 6-digit verification code for <span className="font-mono font-semibold">{profile.phoneNumber}</span>.
              </p>
              <input
                type="text"
                maxLength={6}
                required
                value={phoneOtp}
                onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="6-digit code"
                className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono text-xs"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowPhoneModal(false)} className="px-3 py-1.5 bg-slate-100 rounded-lg font-semibold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isPhoneLoading} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold cursor-pointer">
                  {isPhoneLoading ? "Verifying..." : "Verify Number"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Change Password</h3>
              <button type="button" onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            {passwordError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{passwordError}</div>
            )}
            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Minimum 12 characters with uppercase, lowercase, number, and special symbol.
                </p>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={revokeOtherSessions}
                  onChange={(e) => setRevokeOtherSessions(e.target.checked)}
                />
                <span className="text-slate-700">Sign out of all other active devices</span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-3 py-1.5 bg-slate-100 rounded-lg font-semibold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isChangingPassword} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold cursor-pointer">
                  {isChangingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Authenticator (TOTP) Modal */}
      {showTotpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                Manage Authenticator App (TOTP)
              </h3>
              <button type="button" onClick={() => setShowTotpModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {totpError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{totpError}</div>
            )}

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900 block">Current Status</span>
                  <span className="text-[11px] text-slate-500">
                    {isTotpConfigured ? "TOTP Authenticator is active" : "TOTP enrollment required"}
                  </span>
                </div>
                <CheckCircle2 className={`w-4 h-4 ${isTotpConfigured ? "text-emerald-600" : "text-amber-500"}`} />
              </div>

              {totpEnrollmentRecoveryCodes.length > 0 ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
                    Authenticator app verified. Save these new single-use recovery codes:
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px]">
                    {totpEnrollmentRecoveryCodes.map((c) => (
                      <div key={c} className="px-2 py-1 bg-white rounded border border-slate-100 text-center">{c}</div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadRecoveryCodes(totpEnrollmentRecoveryCodes)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTotpModal(false)}
                      className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-semibold cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : !totpSecret ? (
                <div className="space-y-3">
                  <p className="text-slate-600 leading-relaxed">
                    Generate a new TOTP secret key to enroll or rotate your authenticator app. Confirming a new secret replaces the previous authenticator configuration.
                  </p>
                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setShowTotpModal(false)} className="px-3 py-1.5 bg-slate-100 rounded-lg font-semibold cursor-pointer">
                      Close
                    </button>
                    <button
                      type="button"
                      disabled={isTotpLoading}
                      onClick={handleStartTotpEnrollment}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold cursor-pointer"
                    >
                      {isTotpLoading ? "Generating..." : isTotpConfigured ? "Rotate Authenticator Key" : "Start Enrollment"}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleConfirmTotpEnrollment} className="space-y-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <span className="font-semibold text-slate-800 block">Secret Key</span>
                    <div className="flex items-center justify-between bg-white border border-slate-200 rounded p-2 font-mono text-xs">
                      <span className="truncate pr-2">{totpSecret}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(totpSecret);
                          showToast("Secret copied to clipboard.", "info");
                        }}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Copy Secret"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {totpOtpAuthUri && (
                      <p className="text-[10px] text-slate-500 break-all font-mono">
                        URI: {totpOtpAuthUri}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Confirm 6-digit TOTP Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="Enter 6-digit code"
                      className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowTotpModal(false)} className="px-3 py-1.5 bg-slate-100 rounded-lg font-semibold cursor-pointer">
                      Cancel
                    </button>
                    <button type="submit" disabled={isTotpLoading} className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-semibold cursor-pointer">
                      {isTotpLoading ? "Confirming..." : "Verify & Activate"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recovery Codes Modal */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Emergency Recovery Codes</h3>
              <button type="button" onClick={() => setShowRecoveryModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {recoveryError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">{recoveryError}</div>
            )}

            {recoveryStep === "reauth" ? (
              <form onSubmit={handleRegenerateRecoveryCodes} className="space-y-3 text-xs">
                <p className="text-slate-600">
                  Enter your current password to invalidate existing recovery codes and generate 10 new single-use codes.
                </p>
                <input
                  type="password"
                  required
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowRecoveryModal(false)} className="px-3 py-1.5 bg-slate-100 rounded-lg font-semibold cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={recoveryLoading} className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-semibold cursor-pointer">
                    {recoveryLoading ? "Generating..." : "Confirm & Regenerate"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <p className="text-slate-600">
                  Save these single-use recovery codes now. They will not be shown again.
                </p>
                <div className="grid grid-cols-2 gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px]">
                  {recoveryCodes.map((c) => (
                    <div key={c} className="px-2 py-1 bg-white rounded border border-slate-100 text-center">{c}</div>
                  ))}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(recoveryCodes.join("\n"));
                      showToast("Recovery codes copied.", "info");
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-lg font-semibold cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadRecoveryCodes(recoveryCodes)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-lg font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRecoveryModal(false)}
                    className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-semibold cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Revoke Single Session Confirmation Modal */}
      {sessionToRevoke && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 space-y-4 shadow-xl text-xs">
            <h3 className="text-sm font-bold text-slate-900">Revoke Session</h3>
            <p className="text-slate-600">
              Sign out <strong>{sessionToRevoke.device || "this device"}</strong> ({sessionToRevoke.browser || "browser"}) immediately?
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setSessionToRevoke(null)} className="px-3 py-1.5 bg-slate-100 rounded-lg font-semibold cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                disabled={isRevokingSession}
                onClick={handleConfirmRevokeSession}
                className="px-4 py-1.5 bg-rose-600 text-white rounded-lg font-semibold cursor-pointer"
              >
                {isRevokingSession ? "Revoking..." : "Revoke Session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke All Other Sessions Confirmation Modal */}
      {showRevokeOthersModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 space-y-4 shadow-xl text-xs">
            <h3 className="text-sm font-bold text-slate-900">Sign Out Other Devices</h3>
            <p className="text-slate-600">
              This will immediately terminate {otherSessionsCount} other active session(s). Your current session will remain active.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowRevokeOthersModal(false)} className="px-3 py-1.5 bg-slate-100 rounded-lg font-semibold cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                disabled={isRevokingOthers}
                onClick={handleConfirmRevokeOthers}
                className="px-4 py-1.5 bg-rose-600 text-white rounded-lg font-semibold cursor-pointer"
              >
                {isRevokingOthers ? "Signing out..." : "Sign Out Other Devices"}
              </button>
            </div>
          </div>
        </div>
      )}

      <LogoutConfirmationModal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={handleConfirmSignOut}
      />
    </div>
  );
};
