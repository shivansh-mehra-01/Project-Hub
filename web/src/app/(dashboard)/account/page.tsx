"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import {
  User,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Mail,
  Building2,
  FileSignature,
  Bell,
  Save,
  Upload,
  Globe,
  Laptop,
  Check,
  KeyRound,
  Eye,
  EyeOff,
  Phone,
  MapPin,
  Sparkles,
  Clock,
  Smartphone,
  X,
  AlertCircle,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { formatRoleLabel } from "@/design-system/components/CommandPalette";

export default function AccountPage() {
  const { currentPersona, college, departments } = useProjectHubStore();

  const [activeTab, setActiveTab] = useState<"profile" | "security" | "signature" | "notifications">("profile");

  // Editable Profile States
  const [fullName, setFullName] = useState(currentPersona?.name || "Dr. Keshvendra Choudhary");
  const [phone, setPhone] = useState("+91 98260 12345");
  const [officeCabin, setOfficeCabin] = useState("Administrative Block, Office of the Principal, Room 101");
  const [bio, setBio] = useState(
    "Leading academic excellence, NBA Criterion 2 & 3 governance, and institutional innovation across all engineering and management programs at SISTec."
  );

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Digital Signature State
  const [signatureUrl, setSignatureUrl] = useState<string>("");
  const [isDigitalSealActive, setIsDigitalSealActive] = useState(true);
  const signatureFileInputRef = useRef<HTMLInputElement>(null);

  // Notification States
  const [notifDailyDigest, setNotifDailyDigest] = useState(true);
  const [notifDefenseAlerts, setNotifDefenseAlerts] = useState(true);
  const [notifNbaAlerts, setNotifNbaAlerts] = useState(true);
  const [notifSmsAlerts, setNotifSmsAlerts] = useState(false);

  // Feedback Toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Derive department and institution cleanly without ugly repetitions
  const dept = departments?.find((d) => d.id === currentPersona?.departmentId) || departments?.[0];

  const deptInfo =
    currentPersona?.role === "SuperAdmin"
      ? "Central Platform Operations"
      : currentPersona?.role === "CollegeAdmin"
      ? "Office of the Principal"
      : dept
      ? `${dept.name} (${dept.code})`
      : "Academic Affairs";

  const institutionName =
    currentPersona?.role === "SuperAdmin"
      ? "ProjectHub Platform Cloud"
      : college?.name || "Sagar Institute of Science and Technology (SISTec)";

  const institutionCode = college?.code || "SISTEC";

  const employeeCode =
    currentPersona?.role === "SuperAdmin"
      ? "PLT-ADMIN-001"
      : currentPersona?.role === "CollegeAdmin"
      ? "ADM-PRIN-0176"
      : currentPersona?.role === "HOD"
      ? "FAC-CSE-HOD"
      : "FAC-CSE-028";

  const academicRank =
    currentPersona?.role === "SuperAdmin"
      ? "Platform Engineer"
      : currentPersona?.role === "CollegeAdmin"
      ? "Principal / Dean"
      : currentPersona?.role === "HOD"
      ? "Professor & HOD"
      : currentPersona?.isProjectCoordinator
      ? "Associate Professor (Coordinator)"
      : "Associate Professor";

  const userEmail =
    currentPersona?.email ||
    `${currentPersona?.name
      ?.toLowerCase()
      .replace(/^(dr\.|prof\.|mr\.|ms\.)\s*/, "")
      .replace(/[^a-z]/g, "") || "principal"}@sistec.ac.in`;

  const initials =
    (fullName || "User")
      .replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.|Er\.)\s+/i, "")
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .filter(Boolean)
      .join("")
      .substring(0, 2)
      .toUpperCase() || "KC";

  useDashboardHeader({
    title: "Account",
    breadcrumb: "User credentials, security, and digital signature",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Profile Save
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      showToast("Profile details updated successfully!");
    }, 600);
  };

  // Password Update
  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Password changed successfully!");
    }, 700);
  };

  // Signature Upload
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("Signature file must be under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSignatureUrl(result);
      showToast("Digital signature updated!");
    };
    reader.readAsDataURL(file);
  };

  // Notification Save
  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Notification preferences updated!");
  };

  return (
    <div className="space-y-5 pb-16 font-sans max-w-5xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. EXECUTIVE PROFILE HERO BANNER                                          */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
        {/* Subtle Brand Cover Bar */}
        <div className="h-20 bg-gradient-to-r from-emerald-800 via-slate-800 to-slate-900 px-6 flex items-end justify-end pb-2">
          <span className="text-[11px] font-medium text-emerald-200/80 font-mono">
            Institutional Registry • Verified
          </span>
        </div>

        {/* Profile Header Body */}
        <div className="p-6 pt-0 relative flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-9">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            {/* Avatar with Status Ring */}
            <div className="relative h-20 w-20 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center font-bold text-xl font-mono text-emerald-800 bg-gradient-to-br from-emerald-50 to-emerald-100 shrink-0">
              {initials}
              <span
                className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white"
                title="Active Session"
              />
            </div>

            {/* Name, Role & Details */}
            <div className="min-w-0 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  {fullName}
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Verified
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {academicRank} • <strong className="text-slate-800 font-medium">{deptInfo}</strong>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {institutionName} ({institutionCode})
              </p>
            </div>
          </div>

          {/* Quick Badges */}
          <div className="flex items-center gap-2 self-start sm:self-end pb-1 shrink-0">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {formatRoleLabel(currentPersona?.role)}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
              {employeeCode}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MODERN SEGMENTED PROFILE TABS                                          */}
      {/* ========================================================================= */}
      <div className="flex border-b border-slate-200 gap-1 sm:gap-4 text-xs font-medium overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`pb-3 px-1 transition-all relative inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === "profile"
              ? "text-emerald-700 font-bold border-b-2 border-emerald-600"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <User className="h-4 w-4" />
          <span>Personal & Academic Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`pb-3 px-1 transition-all relative inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === "security"
              ? "text-emerald-700 font-bold border-b-2 border-emerald-600"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Lock className="h-4 w-4" />
          <span>Security & Password</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("signature")}
          className={`pb-3 px-1 transition-all relative inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === "signature"
              ? "text-emerald-700 font-bold border-b-2 border-emerald-600"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileSignature className="h-4 w-4" />
          <span>Digital Signature & Attestation</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notifications")}
          className={`pb-3 px-1 transition-all relative inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === "notifications"
              ? "text-emerald-700 font-bold border-b-2 border-emerald-600"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Bell className="h-4 w-4" />
          <span>Notification Preferences</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PERSONAL & ACADEMIC DETAILS                                        */}
      {/* ========================================================================= */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveProfile} className="space-y-5">
          {/* Section 1A: Official Registry Credentials (Verified) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Institutional Registry Identity</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Academic appointments verified against official registrar and campus HR database
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <Check className="h-3 w-3 text-emerald-600" />
                Registry Synchronized
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1">
                <span className="text-[11px] font-medium text-slate-400 block">Staff / Employee ID</span>
                <span className="font-mono font-bold text-slate-800 block">{employeeCode}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1">
                <span className="text-[11px] font-medium text-slate-400 block">Academic Rank</span>
                <span className="font-bold text-slate-800 block">{academicRank}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1">
                <span className="text-[11px] font-medium text-slate-400 block">Department / Office</span>
                <span className="font-medium text-slate-800 block truncate">{deptInfo}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1">
                <span className="text-[11px] font-medium text-slate-400 block">Campus Email</span>
                <span className="font-mono font-medium text-slate-800 block truncate">{userEmail}</span>
              </div>
            </div>
          </div>

          {/* Section 1B: Editable Contact & Location Details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Contact & Office Details</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update how students, faculty guides, and administrative peers reach you
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  Full Name (with Academic Honorific)
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Keshvendra Choudhary"
                  className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98260 12345"
                  className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  Office / Cabin Location
                </label>
                <input
                  type="text"
                  value={officeCabin}
                  onChange={(e) => setOfficeCabin(e.target.value)}
                  placeholder="e.g. Administrative Block, Room 101"
                  className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Professional Bio / Academic Notes
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Brief academic bio or leadership responsibilities..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{submitting ? "Saving..." : "Save Profile Details"}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SECURITY & PASSWORD CHANGE                                         */}
      {/* ========================================================================= */}
      {activeTab === "security" && (
        <div className="space-y-5">
          {/* 2A. Change Password Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Change Account Password</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ensure your account uses a strong institutional password containing letters, numbers, and symbols
              </p>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-9 pl-3 pr-8 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
                      required
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

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full h-9 pl-3 pr-8 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
                      required
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

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-400">
                  Password must be at least 8 characters long.
                </span>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>

          {/* 2B. Single Sign-On & Active Sessions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Campus SSO Identity</span>
                  <span className="text-[11px] text-slate-500 font-mono block">Google Workspace (@sistec.ac.in)</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                Connected
              </span>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Laptop className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Current Active Session</span>
                  <span className="text-[11px] text-slate-500 font-mono block">Bhopal Campus • 256-bit TLS</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                Active Now
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DIGITAL SIGNATURE & ATTESTATION                                     */}
      {/* ========================================================================= */}
      {activeTab === "signature" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Official Digital Approval Stamp</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cryptographic signature embedded onto NBA Criterion 2 & 3 scorecards, rubrics, and certificates
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
            {/* Signature Preview Frame */}
            <div className="p-5 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/30 flex flex-col items-center justify-center text-center space-y-2">
              <div className="h-12 w-12 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
                <FileSignature className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[11px] font-mono font-bold text-emerald-950 uppercase tracking-wider block">
                  Official Attestation
                </span>
                <span className="text-sm font-extrabold text-slate-900 block mt-0.5">
                  {fullName}
                </span>
                <span className="text-[11px] text-slate-500 font-mono block">
                  {academicRank} • {institutionCode}
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                SHA-256 Cryptographically Attested
              </span>
            </div>

            {/* Signature Settings */}
            <div className="space-y-4">
              {/* Auto Stamp Toggle */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Automatic Stamping</span>
                  <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                    Stamp digital seal automatically when signing off review dossiers
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isDigitalSealActive}
                    onChange={(e) => {
                      setIsDigitalSealActive(e.target.checked);
                      showToast(e.target.checked ? "Automatic stamping enabled." : "Automatic stamping disabled.");
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>

              {/* Upload Action */}
              <div className="space-y-2">
                <input
                  ref={signatureFileInputRef}
                  type="file"
                  accept="image/png,image/svg+xml"
                  onChange={handleSignatureUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => signatureFileInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-2 h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <Upload className="h-4 w-4 text-emerald-600" />
                  <span>Upload Signature Scan / Seal (.png / .svg)</span>
                </button>
                <span className="text-[10px] text-slate-400 block text-center">
                  Recommended: Transparent background PNG or SVG (min 400x150 px)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: NOTIFICATION PREFERENCES                                           */}
      {/* ========================================================================= */}
      {activeTab === "notifications" && (
        <form onSubmit={handleSaveNotifications} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Email & Alert Preferences</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize automated alerts for pending project submissions, viva defense schedules, and NBA sign-offs
            </p>
          </div>

          <div className="space-y-3">
            {/* Daily Morning Digest */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200/90 hover:border-slate-300 transition-colors bg-white">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-900">
                    Daily Morning Executive Digest
                  </span>
                  <span className="text-xs text-slate-500">
                    Daily 8:00 AM summary of pending project proposals, viva defense reports, and department milestones
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={notifDailyDigest}
                  onChange={(e) => setNotifDailyDigest(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>

            {/* Defense Reminders */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200/90 hover:border-slate-300 transition-colors bg-white">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-900">
                    Project Defense &amp; Viva Reminders
                  </span>
                  <span className="text-xs text-slate-500">
                    Real-time notifications 1 hour prior to scheduled student presentations and external evaluations
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={notifDefenseAlerts}
                  onChange={(e) => setNotifDefenseAlerts(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>

            {/* NBA SAR Alerts */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200/90 hover:border-slate-300 transition-colors bg-white">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-900">
                    NBA SAR Criterion 2 &amp; 3 Dossier Alerts
                  </span>
                  <span className="text-xs text-slate-500">
                    Instant alerts when department HODs attest scorecards or request executive sign-off
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={notifNbaAlerts}
                  onChange={(e) => setNotifNbaAlerts(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>

            {/* Urgent SMS Alerts */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200/90 hover:border-slate-300 transition-colors bg-white">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-900">
                    Critical SMS &amp; Security Alerts
                  </span>
                  <span className="text-xs text-slate-500">
                    SMS notifications for urgent security events, campus-wide maintenance, or deadline warnings
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={notifSmsAlerts}
                  onChange={(e) => setNotifSmsAlerts(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Notification Preferences</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
