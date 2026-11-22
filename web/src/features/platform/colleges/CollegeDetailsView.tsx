"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  MapPin,
  UserCheck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ExternalLink,
  Download,
  Eye,
  X,
  Check,
  Ban,
  ShieldCheck,
  Database,
  RefreshCw,
  AlertTriangle,
  Info,
  Calendar,
  Phone,
  Mail,
  Globe,
  HardDrive,
  Users,
  KeyRound,
  History,
  Shield,
  Lock,
  UserPlus,
  RotateCcw,
  Sliders,
  Send,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { usePlatformData, CollegeTenantRecord } from "../data/platformDataStore";
import { showToast } from "@/lib/toast";

export interface CollegeDetailsViewProps {
  id?: string;
}

export const CollegeDetailsView: React.FC<CollegeDetailsViewProps> = ({ id: propId }) => {
  const params = useParams();
  const router = useRouter();
  const id = propId || (params?.id as string);

  const {
    colleges,
    updateCollege,
    suspendCollege,
    reactivateCollege,
    resendAdminInvitation,
    replacePrimaryAdmin,
  } = usePlatformData();

  useDashboardHeader({
    title: "College Profile",
    breadcrumb: "Colleges / College Profile",
  });

  const college = useMemo(() => {
    return colleges.find((c) => c.id === id || c.code.toLowerCase() === id?.toLowerCase());
  }, [colleges, id]);

  const [activeTab, setActiveTab] = useState<"overview" | "administration" | "configuration" | "activity">("overview");

  // Modals
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");

  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [reactivateReason, setReactivateReason] = useState("");

  const [showReplaceAdminModal, setShowReplaceAdminModal] = useState(false);
  const [replaceForm, setReplaceForm] = useState({
    name: "",
    email: "",
    designation: "Principal / Institutional Head",
    phone: "",
    reason: "",
    confirm: false,
  });

  if (!college) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
          <Building2 className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">College Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          The requested college tenant ({id}) could not be located in the platform registry.
        </p>
        <Link
          href="/platform/colleges"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Colleges
        </Link>
      </div>
    );
  }

  // Handle Suspend College
  const handleConfirmSuspend = (e: React.FormEvent) => {
    e.preventDefault();
    suspendCollege(college.id, suspendReason.trim() || "Administrative suspension by Super Admin");
    setShowSuspendModal(false);
    setSuspendReason("");
  };

  // Handle Reactivate College
  const handleConfirmReactivate = (e: React.FormEvent) => {
    e.preventDefault();
    reactivateCollege(college.id, reactivateReason.trim() || "Reactivated by Super Admin");
    setShowReactivateModal(false);
    setReactivateReason("");
  };

  // Handle Resend Admin Invitation
  const handleResendInvite = () => {
    resendAdminInvitation(college.id);
  };

  // Handle Replace Admin Submit
  const handleReplaceAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceForm.name.trim() || !replaceForm.email.trim()) {
      showToast("Administrator full name and official email are required.", "warning");
      return;
    }
    if (!replaceForm.reason.trim()) {
      showToast("Please provide a reason / justification for administrator replacement.", "warning");
      return;
    }

    replacePrimaryAdmin(college.id, {
      fullName: replaceForm.name.trim(),
      email: replaceForm.email.trim(),
      designation: replaceForm.designation,
      phone: replaceForm.phone.trim() || college.contactPhone,
      reason: replaceForm.reason.trim(),
    });

    setShowReplaceAdminModal(false);
    setReplaceForm({
      name: "",
      email: "",
      designation: "Principal / Institutional Head",
      phone: "",
      reason: "",
      confirm: false,
    });
  };

  const activeProjectsCount = Math.round(college.totalStudents / 3.8);
  const maxSeats = (college as any).maxStudentSeats || college.totalStudents + 500;
  const activeSeats = college.totalStudents || 0;
  const seatUtilization = Math.round((activeSeats / maxSeats) * 100);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center justify-between gap-4 mb-2">
          <Link
            href="/platform/colleges"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Colleges
          </Link>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
            <Link href="/platform/colleges" className="hover:text-slate-800">
              Colleges
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-bold">{college.code}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{college.name}</h1>
              <span className="px-2 py-0.5 text-xs font-mono font-bold bg-slate-100 text-slate-700 rounded border border-slate-200">
                {college.code}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span>{college.city}, {college.state}</span>
              <span>&bull;</span>
              <span>{college.university}</span>
              <span>&bull;</span>
              <span className="font-mono">Registered: {college.registrationDate}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg ${
                college.status === "Active"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {college.status === "Active" ? <Check className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
              {college.status}
            </span>

            {college.status === "Active" ? (
              <button
                type="button"
                onClick={() => {
                  setSuspendReason("");
                  setShowSuspendModal(true);
                }}
                className="px-3 py-1 text-xs font-semibold rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                Suspend College
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setReactivateReason("");
                  setShowReactivateModal(true);
                }}
                className="px-3 py-1 text-xs font-semibold rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
              >
                Reactivate College
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 STRUCTURED TABS */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          {[
            { id: "overview", label: "Overview", icon: Building2 },
            { id: "administration", label: "Administration", icon: UserCheck },
            { id: "configuration", label: "Platform Configuration", icon: Sliders },
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
        <div className="space-y-5 animate-in fade-in-50 duration-150">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] text-slate-500 block">Enrolled Students</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block font-mono">
                {college.totalStudents.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] text-slate-500 block">Faculty Guides</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block font-mono">
                {college.totalFaculty}
              </span>
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] text-slate-500 block">Active Project Teams</span>
              <span className="text-xl font-bold text-emerald-700 mt-1 block font-mono">
                {activeProjectsCount}
              </span>
            </div>
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[11px] text-slate-500 block">Academic Departments</span>
              <span className="text-xl font-bold text-slate-900 mt-1 block font-mono">
                {college.departmentsCount}
              </span>
            </div>
          </div>

          {/* Institutional Metadata Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
              College Metadata
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">College Name</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">{college.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">College Code</span>
                <span className="font-mono font-bold text-slate-800 mt-0.5 block">{college.code}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Affiliated University</span>
                <span className="font-medium text-slate-800 mt-0.5 block">{college.university}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Campus Location</span>
                <span className="text-slate-800 mt-0.5 block">{college.city}, {college.state}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Official Contact Phone</span>
                <span className="font-mono text-slate-800 mt-0.5 block">{college.contactPhone || "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Web Portal</span>
                <a
                  href={college.website}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 mt-0.5"
                >
                  {college.website}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Provisioning Details Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
              Tenant &amp; Infrastructure Isolation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Tenant Identifier</span>
                <span className="font-mono font-bold text-slate-800 mt-0.5 block">{college.tenantId}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Database Schema Name</span>
                <span className="font-mono text-slate-800 mt-0.5 block">tenant_{college.code.toLowerCase()}_prod</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Provisioning Status</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  Active Partition
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Provisioned Date</span>
                <span className="font-mono text-slate-800 mt-0.5 block">{college.registrationDate}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Isolation Level</span>
                <span className="text-slate-800 mt-0.5 block">Dedicated Schema (Zero Cross-Tenant Leakage)</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Domain Restriction</span>
                <span className="font-mono text-slate-800 mt-0.5 block">@{college.domain}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ADMINISTRATION */}
      {activeTab === "administration" && (
        <div className="space-y-5 animate-in fade-in-50 duration-150">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Primary College Administrator</h3>
                <p className="text-xs text-slate-500">
                  Institutional administrator holding authority over this college tenant.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResendInvite}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  Resend Admin Invitation
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReplaceForm({
                      name: "",
                      email: "",
                      designation: college.principalDesignation || "Principal / Institutional Head",
                      phone: "",
                      reason: "",
                      confirm: false,
                    });
                    setShowReplaceAdminModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Replace Administrator
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs pt-1">
              <div>
                <span className="text-slate-500 block text-[11px]">Administrator Name</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">{college.principalName}</span>
                <span className="text-[11px] text-slate-500">{college.principalDesignation || "Principal"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Official Email</span>
                <span className="font-mono text-slate-800 mt-0.5 block">{college.principalEmail}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Official Phone</span>
                <span className="font-mono text-slate-800 mt-0.5 block">{college.contactPhone || "+91 755 000 000"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Account Status</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 mt-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Active Administrator
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Invitation Status</span>
                <span className="font-medium text-slate-800 mt-0.5 block">Accepted &bull; Active Token</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Last Platform Login</span>
                <span className="font-mono text-slate-800 mt-0.5 block">{college.lastAdminLogin || "Today at 09:42 AM IST"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PLATFORM CONFIGURATION (Quotas & Feature Flags Only — No Billing/Invoices!) */}
      {activeTab === "configuration" && (
        <div className="space-y-5 animate-in fade-in-50 duration-150">
          {/* Licensing & Capacity Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
              Licensed Capacity &amp; Academic Scope
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">License Tier</span>
                <span className="font-bold text-slate-900 mt-0.5 block">Standard Academic (B.Tech)</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">License Status</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-800 border border-emerald-200 mt-0.5">
                  <Check className="w-3 h-3" />
                  Active License
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">License Validity / Expiry</span>
                <span className="font-mono font-bold text-slate-800 mt-0.5 block">{college.renewalDate || "2027-06-30"}</span>
              </div>
            </div>

            {/* Seat Progress Bar */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex justify-between text-xs text-slate-700">
                <span>Student Capacity Utilization:</span>
                <span className="font-mono font-semibold">
                  {activeSeats.toLocaleString("en-IN")} / {maxSeats.toLocaleString("en-IN")} seats ({seatUtilization}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-slate-900 h-2.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, seatUtilization)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Licensed student accounts permitted to register and submit academic project artifacts for this institution.
              </p>
            </div>
          </div>

          {/* Enabled Feature Flags */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
              Platform Feature Flags Enabled for this Tenant
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { name: "Team Formation & Approval Workflows", desc: "Student team self-formation with faculty supervisor sign-off", enabled: true },
                { name: "Multi-Branch Project Reviews", desc: "Internal evaluations and rubric-based Viva grading for B.Tech branches", enabled: true },
                { name: "File Vault Cloud Storage", desc: "Encrypted project synopses, SRS, and code attachments", enabled: true },
                { name: "Industry Mentorship Integration", desc: "External co-supervisor review access for capstone projects", enabled: true },
              ].map((feat) => (
                <div key={feat.name} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-900 block">{feat.name}</span>
                    <span className="text-[11px] text-slate-500 leading-snug">{feat.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ACTIVITY & HISTORY */}
      {activeTab === "activity" && (
        <div className="space-y-5 animate-in fade-in-50 duration-150">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Chronological Institutional Audit Log
            </h3>

            <div className="space-y-3">
              {(college.provisioningHistory && college.provisioningHistory.length > 0
                ? college.provisioningHistory
                : [
                    { stage: "Initial Onboarding", timestamp: `${college.registrationDate} 10:00:00`, status: "Completed" as const, details: "Institutional tenant created and active on RGPV ecosystem." },
                  ]
              ).map((event, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start justify-between text-xs gap-3">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-900 block">{event.stage}</span>
                    <p className="text-slate-600 text-[11px]">{event.details}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-slate-500 text-[11px] block">{event.timestamp}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 inline-block mt-0.5">
                      {event.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUSPEND COLLEGE MODAL */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3.5 border border-slate-200 animate-in fade-in-50 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Suspend College Access</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Suspending {college.name} will pause student, faculty, and administrator logins. All student project data and documents remain safely preserved.
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
                  placeholder="State the administrative reason for suspending this institution..."
                  className="w-full text-xs border border-slate-300 rounded p-2 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSuspendModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors cursor-pointer"
                >
                  Confirm Suspension
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REACTIVATE COLLEGE MODAL */}
      {showReactivateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3.5 border border-slate-200 animate-in fade-in-50 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Reactivate College Access</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reactivate platform access for {college.name}. Faculty and student project activities will resume immediately.
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
                  placeholder="Document resolution note for reactivation..."
                  className="w-full text-xs border border-slate-300 rounded p-2 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReactivateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors cursor-pointer"
                >
                  Confirm Reactivation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REPLACE ADMINISTRATOR MODAL */}
      {showReplaceAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 space-y-4 border border-slate-200 animate-in fade-in-50 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Replace College Administrator</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Transfer tenant administrative authority for {college.name} to a newly appointed official.
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
                  placeholder="e.g. Dr. Rajesh Kumar Sharma"
                  value={replaceForm.name}
                  onChange={(e) => setReplaceForm({ ...replaceForm, name: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded p-2 focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Official Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="principal@college.ac.in"
                    value={replaceForm.email}
                    onChange={(e) => setReplaceForm({ ...replaceForm, email: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded p-2 focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98260 00000"
                    value={replaceForm.phone}
                    onChange={(e) => setReplaceForm({ ...replaceForm, phone: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded p-2 focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>
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
                  placeholder="Institutional resolution, tenure transfer, or administrative reassignment..."
                  className="w-full text-xs border border-slate-300 rounded p-2 focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReplaceAdminModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded transition-colors cursor-pointer"
                >
                  Replace &amp; Issue Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
