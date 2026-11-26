"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Building2,
  Landmark,
  MapPin,
  Layers,
  CheckCircle2,
  Save,
  Loader2,
  Upload,
  Trash2,
  Users,
  HardDrive,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { collegeApi } from "@/lib/api/collegeApi";
import { AcademicSessionDto, CollegeSettingsDto } from "@/lib/api/types";
import { ApiConnectionBanner } from "../components/ApiConnectionBanner";

function toDateInputValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export const CollegeSettingsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "academic" | "plan">("general");

  // Authoritative loaded settings
  const [settings, setSettings] = useState<CollegeSettingsDto | null>(null);
  const [collegeName, setCollegeName] = useState("");
  const [affiliatedUniversity, setAffiliatedUniversity] = useState("");
  const [campusAddress, setCampusAddress] = useState("");
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [savingGeneral, setSavingGeneral] = useState(false);

  // Logo upload state
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const crestFileInputRef = useRef<HTMLInputElement>(null);

  // Academic Session state
  const [sessions, setSessions] = useState<AcademicSessionDto[]>([]);
  const [activeSession, setActiveSession] = useState<AcademicSessionDto | null>(null);
  const [sessionLabel, setSessionLabel] = useState("");
  const [sessionStartDate, setSessionStartDate] = useState("");
  const [sessionEndDate, setSessionEndDate] = useState("");
  const [allowInterdisciplinary, setAllowInterdisciplinary] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [savingSession, setSavingSession] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useDashboardHeader({
    title: "College Settings",
    breadcrumb: "Institution identity, academic session configuration, and resource usage",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const applySettings = (res: CollegeSettingsDto) => {
    setSettings(res);
    setCollegeName(res.name || "");
    setAffiliatedUniversity(res.affiliatedUniversity || "");
    setCampusAddress(res.campusAddress || "");
    setImageError(false);
  };

  const applySession = (session: AcademicSessionDto | null) => {
    setActiveSession(session);
    if (session) {
      setSessionLabel(session.label || "");
      setSessionStartDate(toDateInputValue(session.startDate));
      setSessionEndDate(toDateInputValue(session.endDate));
      setAllowInterdisciplinary(session.allowInterdisciplinaryTeams ?? true);
    } else {
      setSessionLabel("");
      setSessionStartDate("");
      setSessionEndDate("");
      setAllowInterdisciplinary(true);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const [settingsRes, sessionsRes, activeSessionRes] = await Promise.all([
        collegeApi.getSettings(),
        collegeApi.getAcademicSessions().catch(() => [] as AcademicSessionDto[]),
        collegeApi.getActiveSession().catch(() => null),
      ]);
      applySettings(settingsRes);
      setSessions(sessionsRes || []);
      applySession(activeSessionRes);
    } catch (err: any) {
      console.error("Settings API error:", err);
      setApiError(err?.message || "Failed to load institutional settings from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const hasGeneralChanges =
    settings !== null &&
    (collegeName.trim() !== (settings.name || "") ||
      affiliatedUniversity.trim() !== (settings.affiliatedUniversity || "") ||
      campusAddress.trim() !== (settings.campusAddress || ""));

  const hasSessionChanges =
    sessionLabel.trim() !== (activeSession?.label || "") ||
    sessionStartDate !== toDateInputValue(activeSession?.startDate) ||
    sessionEndDate !== toDateInputValue(activeSession?.endDate) ||
    allowInterdisciplinary !== (activeSession?.allowInterdisciplinaryTeams ?? true);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    const trimmedName = collegeName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 150) {
      setGeneralError("Official college name must be between 2 and 150 characters.");
      return;
    }

    setSavingGeneral(true);
    try {
      const updated = await collegeApi.updateSettings({
        name: trimmedName,
        affiliatedUniversity: affiliatedUniversity.trim(),
        campusAddress: campusAddress.trim(),
      });
      if (updated) {
        applySettings(updated);
      }
      showToast("Institution identity saved.");
    } catch (err: any) {
      setGeneralError(err?.data?.message || err?.message || "Failed to save institution details.");
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setLogoError(null);
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setLogoError("Unsupported file type. Please upload a PNG, JPEG, or WEBP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Logo file size exceeds the 2 MB limit.");
      return;
    }

    setLogoBusy(true);
    try {
      const updated = await collegeApi.uploadLogo(file);
      if (updated) {
        applySettings(updated);
      }
      showToast("College logo uploaded.");
    } catch (err: any) {
      setLogoError(err?.data?.message || err?.message || "Failed to upload college logo.");
    } finally {
      setLogoBusy(false);
    }
  };

  const handleRemoveLogo = async () => {
    setLogoError(null);
    setLogoBusy(true);
    try {
      const updated = await collegeApi.deleteLogo();
      if (updated) {
        applySettings(updated);
      }
      showToast("College logo removed.");
    } catch (err: any) {
      setLogoError(err?.data?.message || err?.message || "Failed to remove college logo.");
    } finally {
      setLogoBusy(false);
    }
  };

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSessionError(null);

    const trimmedLabel = sessionLabel.trim();
    if (!trimmedLabel || trimmedLabel.length > 40) {
      setSessionError("Academic session label is required (max 40 characters).");
      return;
    }
    if (!sessionStartDate || !sessionEndDate) {
      setSessionError("Both start date and end date are required.");
      return;
    }

    const startIso = `${sessionStartDate}T00:00:00Z`;
    const endIso = `${sessionEndDate}T23:59:59Z`;
    if (new Date(startIso) >= new Date(endIso)) {
      setSessionError("Session start date must be earlier than session end date.");
      return;
    }

    setSavingSession(true);
    try {
      const saved = await collegeApi.configureSession({
        academicYear: trimmedLabel,
        startDate: startIso,
        endDate: endIso,
        allowInterdisciplinaryTeams: allowInterdisciplinary,
        isActive: true,
      });
      applySession(saved);
      const allSessions = await collegeApi.getAcademicSessions().catch(() => []);
      setSessions(allSessions);
      showToast("Academic session configuration saved.");
    } catch (err: any) {
      setSessionError(
        err?.data?.message || err?.message || "Failed to save academic session configuration."
      );
    } finally {
      setSavingSession(false);
    }
  };

  const enrolledSeats = settings?.enrolledStudentCount;
  const maxSeats = settings?.maxStudentSeats;
  const seatsAvailable =
    typeof enrolledSeats === "number" && typeof maxSeats === "number" && maxSeats > 0;
  const seatsPercent = seatsAvailable
    ? Math.min(Math.round((enrolledSeats / maxSeats) * 100), 100)
    : 0;

  const usedStorageGb = settings?.usedStorageGb;
  const storageQuotaGb = settings?.storageQuotaGb;
  const storageAvailable =
    typeof usedStorageGb === "number" && typeof storageQuotaGb === "number" && storageQuotaGb > 0;
  const storagePercent = storageAvailable
    ? Math.min(Math.round((usedStorageGb / storageQuotaGb) * 100), 100)
    : 0;

  return (
    <div className="space-y-5 pb-16 font-sans max-w-5xl mx-auto">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-lg">
          <CheckCircle2 className="h-4 w-4" />
          {toastMessage}
        </div>
      )}

      {apiError && (
        <ApiConnectionBanner onRetry={loadData} message={apiError} isRetrying={loading} />
      )}

      {loading && !settings ? (
        <div className="space-y-4">
          <div className="h-24 rounded-xl border border-slate-200 bg-white animate-pulse" />
          <div className="h-64 rounded-xl border border-slate-200 bg-white animate-pulse" />
        </div>
      ) : (
        settings && (
          <>
            {/* INSTITUTION SUMMARY HEADER */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative h-14 w-14 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                    {settings.crestUrl && !imageError ? (
                      <Image
                        src={settings.crestUrl}
                        alt={`${settings.name} Logo`}
                        width={56}
                        height={56}
                        className="h-full w-full object-contain p-1"
                        onError={() => setImageError(true)}
                        unoptimized
                      />
                    ) : (
                      <Building2 className="h-6 w-6 text-slate-400" strokeWidth={1.75} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base font-bold text-slate-900 truncate">
                      {settings.name}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {settings.affiliatedUniversity || "Affiliated university not configured"} •{" "}
                      <span className="font-mono">{settings.tenantCode}</span>
                    </p>
                  </div>
                </div>

                {settings.licenseTier && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 self-start sm:self-auto shrink-0">
                    {settings.licenseTier} Plan
                  </span>
                )}
              </div>
            </div>

            {/* TABS */}
            <div className="flex border-b border-slate-200 gap-4 text-xs font-medium overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("general")}
                className={`pb-3 px-1 inline-flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === "general"
                    ? "text-emerald-700 font-bold border-b-2 border-emerald-600"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Building2 className="h-4 w-4" />
                <span>General</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("academic")}
                className={`pb-3 px-1 inline-flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === "academic"
                    ? "text-emerald-700 font-bold border-b-2 border-emerald-600"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span>Academic Configuration</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("plan")}
                className={`pb-3 px-1 inline-flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === "plan"
                    ? "text-emerald-700 font-bold border-b-2 border-emerald-600"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>Plan & Usage</span>
              </button>
            </div>

            {/* TAB 1: GENERAL */}
            {activeTab === "general" && (
              <div className="space-y-5">
                <form
                  onSubmit={handleSaveGeneral}
                  className="rounded-xl border border-slate-200 bg-white p-5 space-y-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Institution Identity</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Used on institutional dashboards, project reports, and student records.
                      </p>
                    </div>
                    {hasGeneralChanges && (
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                        Unsaved changes
                      </span>
                    )}
                  </div>

                  {generalError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{generalError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        Official College Name
                      </label>
                      <input
                        type="text"
                        value={collegeName}
                        onChange={(e) => setCollegeName(e.target.value)}
                        required
                        maxLength={150}
                        className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Landmark className="h-3.5 w-3.5 text-slate-400" />
                        Affiliated University
                      </label>
                      <input
                        type="text"
                        value={affiliatedUniversity}
                        onChange={(e) => setAffiliatedUniversity(e.target.value)}
                        placeholder="Enter affiliating university"
                        maxLength={200}
                        className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        Main Campus Address
                      </label>
                      <input
                        type="text"
                        value={campusAddress}
                        onChange={(e) => setCampusAddress(e.target.value)}
                        placeholder="Street address, city, state, and PIN code"
                        maxLength={300}
                        className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-3 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={!hasGeneralChanges || savingGeneral}
                      className="inline-flex items-center gap-2 h-9 px-5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingGeneral ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" />
                          <span>Save Details</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* COLLEGE LOGO UPLOAD */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">College Logo</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload a PNG, JPEG, or WEBP image (up to 2 MB).
                    </p>
                  </div>

                  {logoError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{logoError}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div className="flex items-center gap-4">
                      <div className="relative h-20 w-20 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                        {settings.crestUrl && !imageError ? (
                          <Image
                            src={settings.crestUrl}
                            alt="College Logo Preview"
                            width={80}
                            height={80}
                            className="h-full w-full object-contain p-2"
                            onError={() => setImageError(true)}
                            unoptimized
                          />
                        ) : (
                          <Building2 className="h-8 w-8 text-slate-300" />
                        )}
                      </div>
                      <div className="text-xs space-y-1">
                        <span className="font-semibold text-slate-900 block">
                          {settings.crestUrl ? "Custom college logo active" : "No logo uploaded"}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          Stored securely per tenant and displayed across authorized college views.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        ref={crestFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={logoBusy}
                        onClick={() => crestFileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        {logoBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-700" />
                        ) : (
                          <Upload className="h-3.5 w-3.5 text-emerald-700" />
                        )}
                        <span>{settings.crestUrl ? "Replace Logo" : "Upload Logo"}</span>
                      </button>

                      {settings.crestUrl && (
                        <button
                          type="button"
                          disabled={logoBusy}
                          onClick={handleRemoveLogo}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ACADEMIC CONFIGURATION */}
            {activeTab === "academic" && (
              <div className="space-y-5">
                <form
                  onSubmit={handleSaveSession}
                  className="rounded-xl border border-slate-200 bg-white p-5 space-y-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Active Academic Session</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {activeSession
                          ? `Current active session: ${activeSession.label}`
                          : "No academic session configured yet. Configure one below."}
                      </p>
                    </div>
                    {hasSessionChanges && (
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                        Unsaved changes
                      </span>
                    )}
                  </div>

                  {sessionError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{sessionError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Academic Session Label
                      </label>
                      <input
                        type="text"
                        value={sessionLabel}
                        onChange={(e) => setSessionLabel(e.target.value)}
                        placeholder="e.g. 2026-2027"
                        maxLength={40}
                        required
                        className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Start Date</label>
                      <input
                        type="date"
                        value={sessionStartDate}
                        onChange={(e) => setSessionStartDate(e.target.value)}
                        required
                        className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">End Date</label>
                      <input
                        type="date"
                        value={sessionEndDate}
                        onChange={(e) => setSessionEndDate(e.target.value)}
                        required
                        className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowInterdisciplinary}
                      onChange={(e) => setAllowInterdisciplinary(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                    />
                    <span>Allow interdisciplinary project teams across departments</span>
                  </label>

                  <div className="flex justify-end pt-3 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={!hasSessionChanges || savingSession}
                      className="inline-flex items-center gap-2 h-9 px-5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingSession ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" />
                          <span>Save Academic Session</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {sessions.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">Configured Sessions</h3>
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg text-xs">
                      {sessions.map((s) => (
                        <div key={s.id} className="p-3 flex items-center justify-between gap-3">
                          <div>
                            <span className="font-semibold text-slate-900">{s.label}</span>
                            <span className="block text-[11px] text-slate-500">
                              {toDateInputValue(s.startDate)} to {toDateInputValue(s.endDate)}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              s.isActive
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {s.isActive ? "Active" : "Historical"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PLAN & USAGE (READ-ONLY) */}
            {activeTab === "plan" && (
              <div className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Subscription Plan
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-1">
                      {settings.licenseTier || "Unavailable"}
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">Read-only entitlement</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <Users className="h-4 w-4 text-emerald-800" strokeWidth={1.75} />
                        <span>Active Student Seats</span>
                      </div>
                      <span className="text-xs font-bold font-mono text-slate-900">
                        {seatsAvailable
                          ? `${enrolledSeats} / ${maxSeats} (${seatsPercent}%)`
                          : "Unavailable"}
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          seatsPercent > 90 ? "bg-rose-500" : "bg-emerald-700"
                        }`}
                        style={{ width: `${seatsPercent}%` }}
                      />
                    </div>
                    <div className="text-xs text-slate-500">
                      {seatsAvailable
                        ? `${Math.max(0, maxSeats - enrolledSeats)} seats remaining`
                        : "Seat quota information unavailable"}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <HardDrive className="h-4 w-4 text-emerald-800" strokeWidth={1.75} />
                        <span>Project Storage Usage</span>
                      </div>
                      <span className="text-xs font-bold font-mono text-slate-900">
                        {storageAvailable
                          ? `${usedStorageGb.toFixed(2)} GB / ${storageQuotaGb} GB (${storagePercent}%)`
                          : "Unavailable"}
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          storagePercent > 90 ? "bg-amber-500" : "bg-emerald-700"
                        }`}
                        style={{ width: `${storagePercent}%` }}
                      />
                    </div>
                    <div className="text-xs text-slate-500">
                      {storageAvailable
                        ? `${Math.max(0, storageQuotaGb - usedStorageGb).toFixed(2)} GB remaining`
                        : "Storage quota information unavailable"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
};
