"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Mail,
  Building2,
  Save,
  KeyRound,
  Eye,
  EyeOff,
  Phone,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { authApi, UserProfileDto } from "@/lib/api";
import { formatRoleLabel } from "@/design-system/components/CommandPalette";

export default function AccountPage() {

  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Editable personal profile fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useDashboardHeader({
    title: "Account",
    breadcrumb: "Personal profile and security settings",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    let active = true;
    setLoadingProfile(true);
    setProfileError(null);

    authApi
      .getProfile()
      .then((res) => {
        if (!active) return;
        setProfile(res);
        setFullName(res.fullName || "");
        setPhone(res.phoneNumber || "");
      })
      .catch((err: any) => {
        if (!active) return;
        setProfileError(err?.message || "Failed to load your account profile.");
      })
      .finally(() => {
        if (active) setLoadingProfile(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const displayName = profile?.fullName || "User";
  const displayEmail = profile?.email || "";
  const displayRole = profile?.role || "";
  const displayCollege =
    displayRole === "SuperAdmin"
      ? "Colabex Platform Administration"
      : profile?.collegeName || "Not assigned";
  const displayDepartment =
    displayRole === "SuperAdmin"
      ? "Platform Operations"
      : displayRole === "CollegeAdmin"
      ? "Institutional Administration"
      : profile?.departmentName || "Not assigned";
  const displayCode = profile?.enrollmentOrEmployeeCode || "Not assigned";

  const initials =
    displayName
      .replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.|Er\.)\s+/i, "")
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .filter(Boolean)
      .join("")
      .substring(0, 2)
      .toUpperCase() || "U";

  const hasProfileChanges =
    profile !== null &&
    (fullName.trim() !== (profile.fullName || "") || phone.trim() !== (profile.phoneNumber || ""));

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    const trimmedName = fullName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 150) {
      setProfileError("Full name must be between 2 and 150 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const updated = await authApi.updateProfile({
        fullName: trimmedName,
        phoneNumber: phone.trim() || undefined,
      });
      setProfile(updated);
      setFullName(updated.fullName || "");
      setPhone(updated.phoneNumber || "");
      showToast("Personal profile updated.");
    } catch (err: any) {
      setProfileError(err?.data?.message || err?.message || "Failed to update profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (newPassword.length < 12) {
      setPasswordError(
        "New password must be at least 12 characters with uppercase, lowercase, digit, and symbol."
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast(res?.message || "Password changed successfully.");
    } catch (err: any) {
      setPasswordError(err?.data?.message || err?.message || "Failed to update password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-16 font-sans max-w-4xl mx-auto">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {loadingProfile ? (
        <div className="space-y-4">
          <div className="h-32 rounded-2xl border border-slate-200 bg-white animate-pulse" />
          <div className="h-64 rounded-2xl border border-slate-200 bg-white animate-pulse" />
        </div>
      ) : (
        <>
          {/* PROFILE HERO */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="h-16 bg-gradient-to-r from-emerald-800 via-slate-800 to-slate-900" />
            <div className="p-6 pt-0 relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                <div className="h-16 w-16 rounded-2xl border-4 border-white bg-emerald-700 text-white flex items-center justify-center text-lg font-bold shadow-md shrink-0">
                  {initials}
                </div>
                <div className="space-y-1 pt-2 sm:pt-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg font-bold text-slate-900">{displayName}</h1>
                    {displayRole && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                        <ShieldCheck className="h-3 w-3" />
                        {formatRoleLabel(displayRole)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {displayCollege} • {displayDepartment}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                ID: {displayCode}
              </span>
            </div>
          </div>

          {/* TABS */}
          <div className="flex border-b border-slate-200 gap-6 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={`pb-3 px-1 inline-flex items-center gap-2 cursor-pointer ${
                activeTab === "profile"
                  ? "text-emerald-700 font-bold border-b-2 border-emerald-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <User className="h-4 w-4" />
              <span>Personal Profile</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className={`pb-3 px-1 inline-flex items-center gap-2 cursor-pointer ${
                activeTab === "security"
                  ? "text-emerald-700 font-bold border-b-2 border-emerald-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Lock className="h-4 w-4" />
              <span>Password & Security</span>
            </button>
          </div>

          {activeTab === "profile" && (
            <form
              onSubmit={handleSaveProfile}
              className="rounded-xl border border-slate-200 bg-white p-5 space-y-5"
            >
              <div>
                <h2 className="text-sm font-bold text-slate-900">Personal Account Details</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Authenticated profile details for your user account. Role, email, and college assignment are managed by administrators.
                </p>
              </div>

              {profileError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    maxLength={150}
                    className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    Contact Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter contact phone number"
                    maxLength={30}
                    className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    Registered Email
                  </label>
                  <input
                    type="email"
                    value={displayEmail}
                    disabled
                    readOnly
                    className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    Assigned Institution
                  </label>
                  <input
                    type="text"
                    value={displayCollege}
                    disabled
                    readOnly
                    className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={!hasProfileChanges || submitting}
                  className="inline-flex items-center gap-2 h-9 px-5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === "security" && (
            <form
              onSubmit={handleUpdatePassword}
              className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
            >
              <div>
                <h2 className="text-sm font-bold text-slate-900">Change Password</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Password must be at least 12 characters with uppercase, lowercase, digit, and symbol.
                </p>
              </div>

              {passwordError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="space-y-3 max-w-md">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="w-full h-9 pl-3 pr-9 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full h-9 pl-3 pr-9 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 h-9 px-5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
