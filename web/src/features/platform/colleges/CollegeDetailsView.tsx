"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Building2,
  UserCheck,
  ArrowLeft,
  CheckCircle2,
  X,
  Ban,
  ShieldCheck,
  History,
  UserPlus,
  RotateCcw,
  Send,
  AlertCircle,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { usePlatformData } from "../data/platformDataStore";
import { platformApi } from "@/lib/api/platformApi";
import { CollegeTenantDto, PlatformAuditLogDto } from "@/lib/api/types";
import { showToast } from "@/lib/toast";

export interface CollegeDetailsViewProps {
  id?: string;
}

function formatUtcTimestamp(iso?: string | null): string {
  if (!iso) return "Never signed in";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatLocation(city?: string | null, state?: string | null, country?: string | null): string {
  const parts = [city, state, country].filter((p) => Boolean(p && p.trim()));
  return parts.length > 0 ? parts.join(", ") : "Not configured";
}

function parseAuditDetails(log: PlatformAuditLogDto): { details: string; result: string } {
  try {
    const parsed = JSON.parse(log.metadataJson || "{}");
    return {
      details: parsed.details || log.targetEntity || log.action,
      result: parsed.result || "Success",
    };
  } catch {
    return {
      details: log.targetEntity || log.action,
      result: "Success",
    };
  }
}

export const CollegeDetailsView: React.FC<CollegeDetailsViewProps> = ({ id: propId }) => {
  const params = useParams();
  const id = propId || (params?.id as string);

  const {
    colleges,
    suspendCollege,
    reactivateCollege,
    resendAdminInvitation,
    replacePrimaryAdmin,
  } = usePlatformData();

  useDashboardHeader({
    title: "College Details",
  });

  const storeCollege = useMemo(
    () => colleges.find((c) => c.id === id || c.code.toLowerCase() === id?.toLowerCase()),
    [colleges, id]
  );

  const [liveTenant, setLiveTenant] = useState<CollegeTenantDto | null>(null);
  const [tenantLogs, setTenantLogs] = useState<PlatformAuditLogDto[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"overview" | "administration" | "activity">("overview");

  // Action busy & modal states
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [reactivateReason, setReactivateReason] = useState("");
  const [showReplaceAdminModal, setShowReplaceAdminModal] = useState(false);
  const [replaceForm, setReplaceForm] = useState({ name: "", email: "", reason: "" });

  const resolvedTenantId = liveTenant?.id || id;

  const loadTenantDetails = useCallback(async () => {
    if (!id) return;
    setIsLoadingDetails(true);
    setDetailsError(null);
    try {
      const dto = await platformApi.getTenant(id);
      setLiveTenant(dto);
    } catch (err: any) {
      setLiveTenant(null);
      setDetailsError(err?.message || "College tenant not found.");
    } finally {
      setIsLoadingDetails(false);
    }
  }, [id]);

  const loadTenantLogs = useCallback(async (tenantUuid: string) => {
    setIsLoadingLogs(true);
    try {
      const logs = await platformApi.getTenantAuditLogs(tenantUuid, 100);
      setTenantLogs(Array.isArray(logs) ? logs : []);
    } catch {
      setTenantLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    loadTenantDetails();
  }, [loadTenantDetails]);

  useEffect(() => {
    if (resolvedTenantId && /^[0-9a-f-]{36}$/i.test(resolvedTenantId)) {
      loadTenantLogs(resolvedTenantId);
    } else {
      setIsLoadingLogs(false);
    }
  }, [resolvedTenantId, loadTenantLogs]);

  // Unified view model preferring authoritative live API data
  const view = liveTenant
    ? {
        id: liveTenant.id,
        name: liveTenant.name,
        collegeType: liveTenant.collegeType || "Not configured",
        university: liveTenant.affiliatingUniversity || "Not configured",
        location: formatLocation(liveTenant.city, liveTenant.state, liveTenant.country),
        isActive: liveTenant.isActive,
        registrationDate: liveTenant.createdAtUtc ? liveTenant.createdAtUtc.split("T")[0] : "—",
        studentCount: liveTenant.studentCount ?? 0,
        facultyCount: liveTenant.facultyCount ?? 0,
        activeProjectsCount: liveTenant.activeProjectsCount ?? 0,
        departmentCount: liveTenant.departmentCount ?? 0,
        enforceStrictSso: liveTenant.enforceStrictSso,
        principalName: liveTenant.principalName || "Not assigned",
        principalEmail: liveTenant.principalEmail || "Not configured",
        principalIsActive: liveTenant.principalIsActive,
        principalIsActivated: liveTenant.principalIsActivated,
        principalIsEmailVerified: liveTenant.principalIsEmailVerified,
        principalHasPendingInvitation: liveTenant.principalHasPendingInvitation,
        principalLastLoginAtUtc: liveTenant.principalLastLoginAtUtc,
      }
    : storeCollege
    ? {
        id: storeCollege.id,
        name: storeCollege.name,
        collegeType: storeCollege.collegeType || "Not configured",
        university: storeCollege.university || "Not configured",
        location: formatLocation(storeCollege.city, storeCollege.state, storeCollege.country),
        isActive: storeCollege.status === "Active",
        registrationDate: storeCollege.registrationDate || "—",
        studentCount: storeCollege.totalStudents ?? 0,
        facultyCount: storeCollege.totalFaculty ?? 0,
        activeProjectsCount: storeCollege.activeProjectsCount ?? 0,
        departmentCount: storeCollege.departmentsCount ?? 0,
        enforceStrictSso: storeCollege.strictSsoEnforced,
        principalName: storeCollege.principalName || "Not assigned",
        principalEmail: storeCollege.principalEmail || "Not configured",
        principalIsActive: storeCollege.principalIsActive,
        principalIsActivated: storeCollege.principalIsActivated,
        principalIsEmailVerified: storeCollege.principalIsEmailVerified,
        principalHasPendingInvitation: storeCollege.principalHasPendingInvitation,
        principalLastLoginAtUtc: storeCollege.principalLastLoginAtUtc,
      }
    : null;

  if (isLoadingDetails && !view) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center text-xs text-slate-500">
        Loading college details...
      </div>
    );
  }

  if (!view) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
          <Building2 className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">College Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          {detailsError || `The requested college tenant (${id}) could not be located.`}
        </p>
        <Link
          href="/platform/colleges"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Colleges
        </Link>
      </div>
    );
  }

  const refreshAll = async () => {
    await loadTenantDetails();
    await loadTenantLogs(view.id);
  };

  const handleConfirmSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionBusy(true);
    try {
      await suspendCollege(view.id, suspendReason.trim() || "Administrative suspension by Super Admin");
      setShowSuspendModal(false);
      setSuspendReason("");
      await refreshAll();
    } catch (err: any) {
      showToast(err?.message || "Failed to suspend college.", "error");
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleConfirmReactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionBusy(true);
    try {
      await reactivateCollege(view.id, reactivateReason.trim() || "Reactivated by Super Admin");
      setShowReactivateModal(false);
      setReactivateReason("");
      await refreshAll();
    } catch (err: any) {
      showToast(err?.message || "Failed to reactivate college.", "error");
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleResendInvite = async () => {
    if (!view.principalEmail || view.principalEmail === "Not configured") {
      showToast("No primary administrator email configured for this college.", "warning");
      return;
    }
    setIsActionBusy(true);
    try {
      await resendAdminInvitation(view.id);
      await refreshAll();
    } catch (err: any) {
      showToast(err?.message || "Failed to resend invitation.", "error");
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleReplaceAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceForm.name.trim() || !replaceForm.email.trim()) {
      showToast("Administrator full name and official email are required.", "warning");
      return;
    }
    if (!replaceForm.reason.trim()) {
      showToast("Please provide a reason for replacing the administrator.", "warning");
      return;
    }
    setIsActionBusy(true);
    try {
      await replacePrimaryAdmin(view.id, {
        fullName: replaceForm.name.trim(),
        email: replaceForm.email.trim().toLowerCase(),
        designation: "",
        phone: "",
        reason: replaceForm.reason.trim(),
      });
      setShowReplaceAdminModal(false);
      setReplaceForm({ name: "", email: "", reason: "" });
      await refreshAll();
    } catch (err: any) {
      showToast(err?.message || "Failed to replace administrator.", "error");
    } finally {
      setIsActionBusy(false);
    }
  };

  const adminAccountStatusLabel =
    view.principalEmail === "Not configured"
      ? "Not assigned"
      : view.principalIsActive === false
      ? "Suspended"
      : view.principalIsActivated === true
      ? "Active"
      : "Pending Activation";

  const invitationStatusLabel =
    view.principalEmail === "Not configured"
      ? "Not issued"
      : view.principalIsActivated === true
      ? "Accepted"
      : view.principalHasPendingInvitation === true
      ? "Invitation Pending"
      : "Expired / Not Sent";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <Link
          href="/platform/colleges"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Colleges
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{view.name}</h1>
            <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
              <span>{view.location}</span>
              <span>&bull;</span>
              <span>{view.university}</span>
              <span>&bull;</span>
              <span className="font-mono">Registered: {view.registrationDate}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border ${
                view.isActive
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              {view.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
              {view.isActive ? "Active" : "Suspended"}
            </span>

            {view.isActive ? (
              <button
                type="button"
                disabled={isActionBusy}
                onClick={() => {
                  setSuspendReason("");
                  setShowSuspendModal(true);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
              >
                Suspend College
              </button>
            ) : (
              <button
                type="button"
                disabled={isActionBusy}
                onClick={() => {
                  setReactivateReason("");
                  setShowReactivateModal(true);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 cursor-pointer"
              >
                Reactivate College
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3 AUTHORITATIVE TABS */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          {[
            { id: "overview", label: "Overview", icon: Building2 },
            { id: "administration", label: "Administration", icon: UserCheck },
            { id: "activity", label: "Activity & History", icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                  isActive
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* Real Database Counts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] text-slate-500 block">Enrolled Students</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block font-mono">
                {view.studentCount.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] text-slate-500 block">Faculty &amp; HODs</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block font-mono">
                {view.facultyCount.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] text-slate-500 block">Active Project Teams</span>
              <span className="text-xl font-bold text-emerald-700 mt-1 block font-mono">
                {view.activeProjectsCount.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] text-slate-500 block">Academic Departments</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block font-mono">
                {view.departmentCount.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* College Overview Metadata */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
              College Overview
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">College Name</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">{view.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">College Type</span>
                <span className="text-slate-800 mt-0.5 block">{view.collegeType}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Affiliated University</span>
                <span className="text-slate-800 mt-0.5 block">{view.university}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Location</span>
                <span className="text-slate-800 mt-0.5 block">{view.location}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Tenant Status</span>
                <span className="text-slate-800 mt-0.5 block font-semibold">
                  {view.isActive ? "Active" : "Suspended"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Registration Date</span>
                <span className="font-mono text-slate-800 mt-0.5 block">{view.registrationDate}</span>
              </div>
            </div>
          </div>

          {/* Tenant Identity & Isolation */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Tenant Identity &amp; Isolation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Tenant UUID</span>
                <span className="font-mono font-semibold text-slate-900 mt-0.5 block break-all">{view.id}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Isolation Architecture</span>
                <span className="text-slate-800 mt-0.5 block">
                  Shared PostgreSQL with Tenant UUID Partitioning (RLS &amp; Query Filters)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ADMINISTRATION */}
      {activeTab === "administration" && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Primary College Administrator</h3>
              <p className="text-xs text-slate-500">
                Institutional administrator with CollegeAdmin authority for this tenant.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isActionBusy || view.principalEmail === "Not configured"}
                onClick={handleResendInvite}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3 h-3" />
                Resend Admin Invitation
              </button>

              <button
                type="button"
                disabled={isActionBusy}
                onClick={() => {
                  setReplaceForm({ name: "", email: "", reason: "" });
                  setShowReplaceAdminModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg disabled:opacity-50 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Replace Administrator
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs pt-1">
            <div>
              <span className="text-slate-500 block text-[11px]">Administrator Name</span>
              <span className="font-semibold text-slate-900 mt-0.5 block">{view.principalName}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Official Email</span>
              <span className="font-mono text-slate-800 mt-0.5 block">{view.principalEmail}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Colabex Role</span>
              <span className="text-slate-800 mt-0.5 block font-medium">CollegeAdmin</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Account Status</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded border mt-1 ${
                  adminAccountStatusLabel === "Active"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : adminAccountStatusLabel === "Suspended"
                    ? "bg-rose-50 text-rose-800 border-rose-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                {adminAccountStatusLabel}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Invitation &amp; Email Verification</span>
              <span className="text-slate-800 mt-1 block">
                {invitationStatusLabel}
                {view.principalIsEmailVerified !== null && view.principalIsEmailVerified !== undefined
                  ? ` • ${view.principalIsEmailVerified ? "Email Verified" : "Email Unverified"}`
                  : ""}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Last Platform Login</span>
              <span className="font-mono text-slate-800 mt-1 block">
                {formatUtcTimestamp(view.principalLastLoginAtUtc)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ACTIVITY & HISTORY */}
      {activeTab === "activity" && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Institutional Audit Log
          </h3>

          {isLoadingLogs ? (
            <p className="text-xs text-slate-400 py-6 text-center">Loading audit events...</p>
          ) : tenantLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 space-y-1">
              <AlertCircle className="w-5 h-5 mx-auto text-slate-300" />
              <p>No audit events recorded for this tenant yet.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tenantLogs.map((log) => {
                const parsed = parseAuditDetails(log);
                return (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-start justify-between text-xs gap-2"
                  >
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-900 block">{log.action}</span>
                      <p className="text-slate-600 text-[11px]">{parsed.details}</p>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        Actor: {log.actorEmail || "System"}
                      </span>
                    </div>
                    <div className="sm:text-right shrink-0">
                      <span className="font-mono text-slate-500 text-[11px] block">
                        {formatUtcTimestamp(log.occurredAtUtc)}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block mt-1">
                        {parsed.result}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUSPEND MODAL */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3.5 border border-slate-200">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Suspend College Access</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Suspending {view.name} revokes active user sessions and blocks sign-in while preserving all tenant records.
                </p>
              </div>
            </div>
            <form onSubmit={handleConfirmSuspend} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Suspension Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="State the administrative reason..."
                  className="w-full text-xs border border-slate-300 rounded p-2"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSuspendModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionBusy}
                  className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded disabled:opacity-50 cursor-pointer"
                >
                  {isActionBusy ? "Suspending..." : "Confirm Suspension"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REACTIVATE MODAL */}
      {showReactivateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3.5 border border-slate-200">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Reactivate College Access</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Restore platform access for {view.name}.
                </p>
              </div>
            </div>
            <form onSubmit={handleConfirmReactivate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Reactivation Note <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={reactivateReason}
                  onChange={(e) => setReactivateReason(e.target.value)}
                  placeholder="Document resolution note..."
                  className="w-full text-xs border border-slate-300 rounded p-2"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReactivateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionBusy}
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded disabled:opacity-50 cursor-pointer"
                >
                  {isActionBusy ? "Reactivating..." : "Confirm Reactivation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REPLACE ADMINISTRATOR MODAL */}
      {showReplaceAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Replace College Administrator</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Deactivates previous CollegeAdmin accounts for {view.name} and sends an activation link to the new administrator.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReplaceAdminModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleReplaceAdminSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  New Administrator Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={replaceForm.name}
                  onChange={(e) => setReplaceForm({ ...replaceForm, name: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="w-full text-xs border border-slate-300 rounded p-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Official Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={replaceForm.email}
                  onChange={(e) => setReplaceForm({ ...replaceForm, email: e.target.value })}
                  placeholder="principal@college.edu.in"
                  className="w-full text-xs border border-slate-300 rounded p-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Reason for Replacement <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={replaceForm.reason}
                  onChange={(e) => setReplaceForm({ ...replaceForm, reason: e.target.value })}
                  placeholder="Tenure transfer or administrative reassignment..."
                  className="w-full text-xs border border-slate-300 rounded p-2"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReplaceAdminModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isActionBusy}
                  className="px-4 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded disabled:opacity-50 cursor-pointer"
                >
                  {isActionBusy ? "Updating..." : "Replace & Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
