"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  UserPlus,
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Mail,
  Clock,
  Laptop,
  Check,
  Ban,
  KeyRound,
  RotateCcw,
  X,
  AlertCircle,
  AlertTriangle,
  Info,
  SlidersHorizontal,
  FileText,
  CheckSquare,
  XCircle,
  Key,
  Calendar,
  History,
  Layers,
  Sparkles,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import {
  usePlatformData,
  PlatformAdminUserRecord,
  SecurityApprovalRequestRecord,
  PrivilegedPermissionCategory,
  STANDARD_PERMISSIONS_DEF,
} from "../data/platformDataStore";
import { showToast } from "@/lib/toast";

export const PlatformUsersView: React.FC = () => {
  const {
    adminUsers,
    securityApprovals,
    inviteAdminUser,
    updateAdminUser,
    revokeAdminUser,
    revokeAdminSessions,
    initiateMfaRecovery,
    toggleAdminPermission,
    requestSecurityApproval,
    reviewSecurityApproval,
  } = usePlatformData();

  useDashboardHeader({
    title: "Users & Access",
    breadcrumb: "Management / Platform Administrators & Access",
  });

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Drawer & Modals
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<"overview" | "permissions" | "audit">("overview");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showApprovalQueueModal, setShowApprovalQueueModal] = useState(false);
  const [adminToRevoke, setAdminToRevoke] = useState<PlatformAdminUserRecord | null>(null);

  // Permission Request Modal
  const [requestingPerm, setRequestingPerm] = useState<{
    adminId: string;
    permKey: string;
    permLabel: string;
    category: PrivilegedPermissionCategory;
  } | null>(null);
  const [permissionJustification, setPermissionJustification] = useState("");

  // Reviewing Admin Identity (Simulated logged-in viewer: Dev Startup Admin ADM-001 by default)
  const [currentReviewerId, setCurrentReviewerId] = useState<string>("usr-adm-01");
  const [reviewNotes, setReviewNotes] = useState("");

  // Invite Admin Form
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  // Current selected admin object synced from store
  const selectedAdmin = useMemo(() => {
    if (!selectedAdminId) return null;
    return adminUsers.find((u) => u.id === selectedAdminId) || null;
  }, [adminUsers, selectedAdminId]);

  // Derived Metrics
  const totalAdminsCount = adminUsers.length;
  const activeAdminsCount = adminUsers.filter((u) => u.status === "Active").length;
  const suspendedAdminsCount = adminUsers.filter((u) => u.status === "Suspended").length;
  const pendingInvitesCount = adminUsers.filter((u) => u.status === "Pending Invitation").length;

  // MFA Compliance calculation: show actual security exceptions instead of misleading static percentages
  const mfaEnforcedCount = adminUsers.filter((u) => u.mfaStatus === "Enforced & Active").length;
  const mfaGraceCount = adminUsers.filter((u) => u.mfaStatus === "Grace Period").length;
  const mfaPendingCount = adminUsers.filter((u) => u.mfaStatus === "Pending Setup").length;

  // Pending Security Approvals
  const pendingApprovals = useMemo(() => {
    return securityApprovals.filter((req) => req.status === "Pending Dual Approval");
  }, [securityApprovals]);

  // Filtered Administrator Table
  const filteredAdmins = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return adminUsers.filter((u) => {
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.adminId.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "All" || u.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [adminUsers, searchQuery, statusFilter]);

  // Handle Invite Form Submission
  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      showToast("Please provide both full name and official email.", "error");
      return;
    }
    inviteAdminUser(inviteEmail.trim(), inviteName.trim());
    setShowInviteModal(false);
    setInviteName("");
    setInviteEmail("");
  };

  // Handle Revoke / Reactivate Confirmation
  const handleConfirmRevoke = () => {
    if (!adminToRevoke) return;
    revokeAdminUser(adminToRevoke.id);
    setAdminToRevoke(null);
  };

  // Handle Request Permission Dual-Approval Submission
  const handleSubmitPermissionRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestingPerm) return;
    if (!permissionJustification.trim()) {
      showToast("A verifiable business justification is mandatory for privileged access.", "error");
      return;
    }
    requestSecurityApproval(requestingPerm.adminId, requestingPerm.permKey, permissionJustification.trim());
    setRequestingPerm(null);
    setPermissionJustification("");
  };

  // Handle Dual-Approval Review
  const handleReviewDecision = (requestId: string, decision: "Approved" | "Rejected") => {
    reviewSecurityApproval(requestId, decision, currentReviewerId, reviewNotes.trim() || undefined);
    setReviewNotes("");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ======================================================================= */}
      {/* 1. MODULE HEADER & PAM ACTION BAR                                       */}
      {/* ======================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Users &amp; Access</h1>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded border border-slate-200">
              PAM Architecture
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Privileged Access Management (PAM) for platform Super Administrators, phishing-resistant FIDO2 enforcement, and dual-authorization governance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingApprovals.length > 0 && (
            <button
              onClick={() => setShowApprovalQueueModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg shadow-2xs transition-colors shrink-0"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>Security Approvals</span>
              <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-200 text-amber-900 rounded-full font-mono">
                {pendingApprovals.length}
              </span>
            </button>
          )}

          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Invite Super Admin
          </button>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 2. INSTITUTIONAL TENANT BOUNDARY REMINDER                               */}
      {/* ======================================================================= */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
          <div className="text-slate-700 leading-relaxed">
            <strong className="text-blue-900 font-semibold">Platform Governance Scope:</strong> This directory manages root <strong>Platform Super Administrators</strong> with multi-tenant authority. Institutional College Administrators (Principals, Deans &amp; HODs) are strictly administered directly within their respective college profiles in the <span className="font-semibold text-blue-900">Colleges</span> module.
          </div>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded font-mono shrink-0 hidden sm:inline-block">
          Root Authority Only
        </span>
      </div>

      {/* ======================================================================= */}
      {/* 3. DUAL-AUTHORIZATION QUEUE ALERT BANNER (IF PENDING)                   */}
      {/* ======================================================================= */}
      {pendingApprovals.length > 0 && (
        <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <div className="font-bold text-amber-900">
                {pendingApprovals.length} Security Approval Request{pendingApprovals.length > 1 ? "s" : ""} Pending Review
              </div>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Privileged operation requested by <span className="font-semibold">{pendingApprovals[0].requesterName}</span> ({pendingApprovals[0].permissionLabel}). Dual-authorization is required before platform privileges can be elevated.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowApprovalQueueModal(true)}
            className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-2xs transition-colors self-start sm:self-auto shrink-0"
          >
            Review Authorization Queue
          </button>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 4. FOUR CORE SUMMARY METRIC CARDS                                       */}
      {/* ======================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Super Admins */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Total Super Admins</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{totalAdminsCount}</div>
          <span className="text-[11px] text-slate-500 block">Root administrative directory</span>
        </div>

        {/* Metric 2: Active Accounts */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Active Accounts</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono">{activeAdminsCount}</div>
          <span className="text-[11px] text-slate-600 block">
            {suspendedAdminsCount > 0
              ? `${suspendedAdminsCount} suspended • ${pendingInvitesCount} pending invite`
              : pendingInvitesCount > 0
              ? `${pendingInvitesCount} pending invitation activation`
              : "100% operational credentials"}
          </span>
        </div>

        {/* Metric 3: MFA Compliance (Real security exceptions displayed) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">MFA Compliance</span>
            <ShieldCheck className={`w-4 h-4 ${mfaGraceCount > 0 || mfaPendingCount > 0 ? "text-amber-500" : "text-emerald-600"}`} />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono flex items-baseline gap-1.5">
            <span>{mfaEnforcedCount}/{totalAdminsCount}</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">
              Enforced
            </span>
          </div>
          <div className="text-[11px] font-medium flex items-center gap-1.5">
            {mfaGraceCount > 0 || mfaPendingCount > 0 ? (
              <span className="text-amber-700 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                {mfaGraceCount > 0 && `${mfaGraceCount} Grace Period`}
                {mfaGraceCount > 0 && mfaPendingCount > 0 && " • "}
                {mfaPendingCount > 0 && `${mfaPendingCount} Pending Setup`}
              </span>
            ) : (
              <span className="text-emerald-700 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                All Accounts FIDO2 Enforced
              </span>
            )}
          </div>
        </div>

        {/* Metric 4: Pending Security Approvals (replaces generic privileged safeguards) */}
        <div
          onClick={() => setShowApprovalQueueModal(true)}
          className={`bg-white border rounded-xl p-4 shadow-2xs space-y-1 cursor-pointer transition-colors ${
            pendingApprovals.length > 0 ? "border-amber-300 hover:bg-amber-50/40" : "border-slate-200 hover:bg-slate-50/50"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Pending Security Approvals</span>
            <Clock className={`w-4 h-4 ${pendingApprovals.length > 0 ? "text-amber-600" : "text-slate-400"}`} />
          </div>
          <div className={`text-2xl font-bold font-mono ${pendingApprovals.length > 0 ? "text-amber-700" : "text-slate-700"}`}>
            {pendingApprovals.length}
          </div>
          <span className="text-[11px] text-slate-500 block">
            {pendingApprovals.length > 0 ? "Requires dual authorization" : "Dual-authorization queue clear"}
          </span>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 5. SEARCH & STATUS FILTERS                                              */}
      {/* ======================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search super admin name, email, or ID..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            {["All", "Active", "Suspended", "Pending Invitation"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  statusFilter === st
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 6. PLATFORM SUPER ADMINISTRATOR DIRECTORY TABLE                         */}
      {/* ======================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Administrator Name &amp; Email</th>
                <th className="py-3 px-4">Admin ID</th>
                <th className="py-3 px-4">Platform Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">MFA Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 text-xs">
                    No platform super administrators match your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => {
                  const isCurrentReviewer = admin.id === currentReviewerId;

                  return (
                    <tr key={admin.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. Name & Email */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span>{admin.name}</span>
                              {isCurrentReviewer && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded">
                                  Current Session
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">{admin.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Admin ID */}
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        {admin.adminId}
                      </td>

                      {/* 3. Platform Role (Single Super Admin architecture) */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded border border-emerald-200/80">
                          Super Admin
                        </span>
                      </td>

                      {/* 4. Account Status */}
                      <td className="py-3 px-4">
                        {admin.status === "Active" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Active
                          </span>
                        ) : admin.status === "Suspended" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded">
                            <Ban className="w-3 h-3 text-rose-600" />
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending Invitation
                          </span>
                        )}
                      </td>

                      {/* 5. MFA Status (Hardware FIDO2 telemetry) */}
                      <td className="py-3 px-4">
                        {admin.mfaStatus === "Enforced & Active" ? (
                          <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-800 font-medium">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>FIDO2 Enforced</span>
                          </div>
                        ) : admin.mfaStatus === "Grace Period" ? (
                          <div className="inline-flex items-center gap-1.5 text-[11px] text-amber-800 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Grace Period</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Pending Setup</span>
                          </div>
                        )}
                      </td>

                      {/* 6. Last Login */}
                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                        {admin.lastLogin}
                      </td>

                      {/* 7. Manage Action (Single action per row, opens details drawer) */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAdminId(admin.id);
                            setDrawerTab("overview");
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                          <span>Manage</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 7. ADMINISTRATOR DETAILS DRAWER (MANAGEMENT & PAM DETAILS)               */}
      {/* ======================================================================= */}
      {selectedAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in-50 duration-150">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
            {/* Drawer Top Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/60">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700 px-2 py-0.5 bg-slate-200/80 rounded">
                      {selectedAdmin.adminId}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded border border-emerald-200">
                      Super Admin
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        selectedAdmin.status === "Active"
                          ? "bg-emerald-100 text-emerald-800"
                          : selectedAdmin.status === "Suspended"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {selectedAdmin.status}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-slate-900 mt-2">{selectedAdmin.name}</h2>
                  <p className="text-xs text-slate-500 font-mono">{selectedAdmin.email}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedAdminId(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Navigation Tabs */}
              <div className="flex items-center gap-2 mt-5 border-b border-slate-200 -mb-5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setDrawerTab("overview")}
                  className={`pb-2 px-1 border-b-2 transition-all ${
                    drawerTab === "overview"
                      ? "border-emerald-600 text-emerald-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Account &amp; Security
                </button>

                <button
                  type="button"
                  onClick={() => setDrawerTab("permissions")}
                  className={`pb-2 px-1 border-b-2 transition-all flex items-center gap-1.5 ${
                    drawerTab === "permissions"
                      ? "border-emerald-600 text-emerald-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>Privileged Access &amp; Permissions</span>
                  <span className="px-1.5 py-0.2 text-[10px] font-bold bg-slate-100 text-slate-700 rounded-full font-mono">
                    {selectedAdmin.permissions.filter((p) => p.granted).length}/9
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDrawerTab("audit")}
                  className={`pb-2 px-1 border-b-2 transition-all flex items-center gap-1.5 ${
                    drawerTab === "audit"
                      ? "border-emerald-600 text-emerald-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>Security Activity Log</span>
                  <span className="px-1.5 py-0.2 text-[10px] font-bold bg-slate-100 text-slate-700 rounded-full font-mono">
                    {selectedAdmin.securityActivity?.length || 0}
                  </span>
                </button>
              </div>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* TAB 1: OVERVIEW & AUTHENTICATION SECURITY */}
              {drawerTab === "overview" && (
                <div className="space-y-5">
                  {/* Account Information Card */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500">
                      Account Information
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block">Admin ID:</span>
                        <span className="font-mono font-semibold text-slate-900">{selectedAdmin.adminId}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Platform Role:</span>
                        <span className="font-semibold text-slate-900">Super Admin (Root Privilege)</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Provisioned Date:</span>
                        <span className="font-mono text-slate-800">{selectedAdmin.createdAt || "2025-06-01"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Account Status:</span>
                        <span className="font-semibold text-slate-800">{selectedAdmin.status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Authentication & Hardware MFA Card */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-xs font-bold text-slate-900">Authentication &amp; Hardware MFA</h3>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded font-mono">
                        FIDO2 / WebAuthn
                      </span>
                    </div>

                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-emerald-950 space-y-1">
                      <div className="font-semibold flex items-center justify-between">
                        <span>Hardware Key Registered:</span>
                        <span className="font-mono text-xs font-bold">{selectedAdmin.mfaDetails?.keyModel || "YubiKey 5C NFC"}</span>
                      </div>
                      <div className="text-[11px] text-emerald-800 flex justify-between">
                        <span>Key Identifier:</span>
                        <span className="font-mono">{selectedAdmin.mfaDetails?.keyId || "YK-982103"}</span>
                      </div>
                      <div className="text-[11px] text-emerald-800 flex justify-between">
                        <span>Enrolment Timestamp:</span>
                        <span className="font-mono">{selectedAdmin.mfaDetails?.enrolledAt || "2025-06-02"}</span>
                      </div>
                      <div className="text-[11px] text-emerald-800 flex justify-between">
                        <span>Break-Glass Backup Codes:</span>
                        <span className="font-mono font-bold">{selectedAdmin.mfaDetails?.backupCodesRemaining ?? 5} remaining</span>
                      </div>
                    </div>

                    {/* Phishing-resistant Policy Notice */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <Lock className="w-3.5 h-3.5 text-slate-600" />
                        <span>Phishing-Resistant MFA Guardrail</span>
                      </div>
                      <p className="leading-relaxed">
                        Colabex enforces hardware FIDO2 tokens (WebAuthn). In accordance with SaaS PAM security controls, legacy SMS and Email OTP authentication are disabled as substitutes for Super Admin access.
                      </p>
                    </div>
                  </div>

                  {/* Session Telemetry Card */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500">
                      Session &amp; Telemetry
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Active Concurrent Sessions:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {selectedAdmin.activeSessionsCount ?? 1} Session{selectedAdmin.activeSessionsCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Last Successful Authentication:</span>
                        <span className="font-mono text-slate-900">{selectedAdmin.lastAuthTimestamp || selectedAdmin.lastLogin}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Origin IP Address:</span>
                        <span className="font-mono text-slate-900">{selectedAdmin.ipAddress}</span>
                      </div>
                    </div>
                  </div>

                  {/* Account Actions / Danger Zone */}
                  <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl space-y-3">
                    <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                      Privileged Account Actions
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => revokeAdminSessions(selectedAdmin.id)}
                        className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        Revoke All Sessions
                      </button>

                      <button
                        type="button"
                        onClick={() => initiateMfaRecovery(selectedAdmin.id)}
                        className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                        Start MFA Recovery
                      </button>

                      <button
                        type="button"
                        onClick={() => setAdminToRevoke(selectedAdmin)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 text-white ${
                          selectedAdmin.status === "Active"
                            ? "bg-rose-600 hover:bg-rose-700"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        {selectedAdmin.status === "Active" ? (
                          <>
                            <Ban className="w-3.5 h-3.5" />
                            Suspend Access
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Reactivate Access
                          </>
                        )}
                      </button>
                    </div>

                    {activeAdminsCount <= 1 && selectedAdmin.status === "Active" && (
                      <p className="text-[11px] text-rose-700 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                        Sole Active Admin Guard: Account cannot be suspended because at least one active Super Admin must exist.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: PRIVILEGED ACCESS & PERMISSIONS */}
              {drawerTab === "permissions" && (
                <div className="space-y-6">
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-slate-700 space-y-1">
                    <span className="font-semibold text-blue-900 block">Single Role PAM Architecture:</span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      All platform root users hold the <strong>Super Admin</strong> role. Granular access is governed by 9 audited privileged permissions across three functional domains. High-impact operations require verifiable business justification and secondary dual-authorization.
                    </p>
                  </div>

                  {/* The 3 Categories */}
                  {(
                    [
                      "Platform Configuration",
                      "Billing & Commercial Operations",
                      "College Tenant Operations",
                    ] as PrivilegedPermissionCategory[]
                  ).map((category) => {
                    const categoryPermissions = selectedAdmin.permissions.filter(
                      (p) => p.category === category
                    );

                    return (
                      <div key={category} className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-slate-500" />
                            {category}
                          </h4>
                          <span className="text-[11px] font-mono text-slate-500 font-semibold">
                            {categoryPermissions.filter((p) => p.granted).length} / {categoryPermissions.length} Granted
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {categoryPermissions.map((perm) => (
                            <div
                              key={perm.key}
                              className={`p-3.5 rounded-xl border transition-all space-y-2 ${
                                perm.granted
                                  ? "bg-white border-slate-200 shadow-2xs"
                                  : "bg-slate-50/80 border-slate-200 text-slate-500"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 text-xs">
                                      {perm.label}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                        perm.granted
                                          ? "bg-emerald-100 text-emerald-800"
                                          : "bg-slate-200 text-slate-600"
                                      }`}
                                    >
                                      {perm.granted ? "Granted" : "Not Granted"}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                                    {perm.description}
                                  </p>
                                </div>

                                <div className="shrink-0 flex items-center gap-1.5">
                                  {perm.granted ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleAdminPermission(
                                          selectedAdmin.id,
                                          perm.key,
                                          false,
                                          "Administrative privilege revocation",
                                          "Dev Startup Admin (ADM-001)"
                                        )
                                      }
                                      className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors"
                                    >
                                      Revoke
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRequestingPerm({
                                          adminId: selectedAdmin.id,
                                          permKey: perm.key,
                                          permLabel: perm.label,
                                          category: perm.category,
                                        });
                                      }}
                                      className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors flex items-center gap-1"
                                    >
                                      <Clock className="w-3 h-3" />
                                      Request Dual-Approval
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Auditable Record Details */}
                              {perm.granted && (
                                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-600 font-mono">
                                  <div>
                                    <span className="text-slate-400">Granted By: </span>
                                    <span className="text-slate-800 font-medium">{perm.grantedBy || "Root Provisioner"}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Granted Date: </span>
                                    <span className="text-slate-800">{perm.grantedDate || "2025-06-05"}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Approval Record: </span>
                                    <span className="text-emerald-700 font-semibold">{perm.approvalRecord || "REQ-SEC-101"}</span>
                                  </div>
                                  <div className="col-span-1 sm:col-span-2">
                                    <span className="text-slate-400">Justification: </span>
                                    <span className="text-slate-700 font-sans">{perm.reason || "Operational duty assignment"}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 3: AUDIT TRAIL & SECURITY ACTIVITY */}
              {drawerTab === "audit" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      Security &amp; PAM Audit Trail
                    </h3>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Immutable Log
                    </span>
                  </div>

                  {(!selectedAdmin.securityActivity || selectedAdmin.securityActivity.length === 0) ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      No security events recorded yet for this administrator.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedAdmin.securityActivity.map((act) => (
                        <div
                          key={act.id}
                          className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 text-xs shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {act.status === "Success" ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ) : act.status === "Warning" ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              )}
                              {act.event}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {act.timestamp}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                            <span>Origin IP: {act.ipAddress}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded font-bold text-[9px] uppercase ${
                                act.status === "Success"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : act.status === "Warning"
                                  ? "bg-amber-50 text-amber-800"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {act.status}
                            </span>
                          </div>

                          {act.details && (
                            <p className="text-[11px] text-slate-600 pt-0.5 border-t border-slate-100 leading-relaxed">
                              {act.details}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Bottom Bar */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono text-[11px]">
                Target: {selectedAdmin.adminId} • {selectedAdmin.name}
              </span>
              <button
                type="button"
                onClick={() => setSelectedAdminId(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 8. MODAL: DUAL AUTHORIZATION APPROVAL QUEUE                             */}
      {/* ======================================================================= */}
      {showApprovalQueueModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Dual-Authorization Security Queue
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review pending privileged access requests. PAM policy strictly forbids self-approval.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowApprovalQueueModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reviewer Simulation Selector */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Reviewing As:</span>
                <select
                  value={currentReviewerId}
                  onChange={(e) => setCurrentReviewerId(e.target.value)}
                  className="text-xs font-medium bg-white border border-slate-300 rounded-md px-2 py-1 focus:ring-emerald-500"
                >
                  {adminUsers
                    .filter((u) => u.status === "Active")
                    .map((adm) => (
                      <option key={adm.id} value={adm.id}>
                        {adm.name} ({adm.adminId})
                      </option>
                    ))}
                </select>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Four-Eyes Principle
              </span>
            </div>

            {/* Pending Requests List */}
            {pendingApprovals.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="text-sm font-bold text-slate-800">Authorization Queue Clear</div>
                <p className="text-xs text-slate-500">
                  There are no pending dual-authorization requests awaiting review.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApprovals.map((req) => {
                  const isSelfRequest = req.requesterId === currentReviewerId;

                  return (
                    <div
                      key={req.id}
                      className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {req.requestId}
                            </span>
                            <span className="text-xs font-bold text-slate-900">
                              {req.permissionLabel}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {req.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            Requested by <strong className="text-slate-900">{req.requesterName}</strong> ({req.requesterEmail})
                          </p>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          {req.requestedAt}
                        </span>
                      </div>

                      {/* Stated Justification */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                        <span className="font-semibold text-slate-700 block">Stated Business Justification:</span>
                        <p className="text-slate-600 italic leading-relaxed">
                          "{req.reason}"
                        </p>
                      </div>

                      {/* Self Approval Prevention Guard */}
                      {isSelfRequest && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>
                            <strong>Self-Approval Forbidden:</strong> You submitted this request. Platform PAM rules mandate that a different active Super Admin must authorize it.
                          </span>
                        </div>
                      )}

                      {/* Decision Controls */}
                      {!isSelfRequest && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <input
                            type="text"
                            placeholder="Optional reviewer notes / audit comments..."
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            className="w-full text-xs border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-emerald-500"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleReviewDecision(req.id, "Rejected")}
                              className="px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                            >
                              Reject Request
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReviewDecision(req.id, "Approved")}
                              className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve Privileged Access
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowApprovalQueueModal(false)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 9. MODAL: SUBMIT PRIVILEGED PERMISSION REQUEST                           */}
      {/* ======================================================================= */}
      {requestingPerm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Request Privileged Access
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dual-Authorization Workflow
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRequestingPerm(null)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Requested Permission:</span>
                <span className="font-bold text-slate-900">{requestingPerm.permLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Domain Category:</span>
                <span className="font-medium text-slate-800">{requestingPerm.category}</span>
              </div>
            </div>

            <form onSubmit={handleSubmitPermissionRequest} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Business Justification <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail the operational necessity, maintenance ticket reference, or reason for this privileged capability..."
                  value={permissionJustification}
                  onChange={(e) => setPermissionJustification(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 leading-relaxed space-y-1">
                <span className="font-semibold block">Dual-Authorization Notice:</span>
                This request will be routed to the platform security queue. Another active Super Admin must review and approve this request before privileges are elevated.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRequestingPerm(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 10. MODAL: INVITE SUPER ADMIN                                           */}
      {/* ======================================================================= */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  Invite Platform Super Admin
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enterprise Privileged Access Provisioning
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priyanshu Sharma"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Administrator Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="priyanshu.admin@collabex.in"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Status and Expiry Metadata */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Initial Invitation Status:</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded font-mono">
                    Pending Invitation
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Activation Token Expiry:</span>
                  <span className="font-mono font-semibold text-slate-800 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    24 Hours (Automatic Invalidation)
                  </span>
                </div>
              </div>

              {/* Secure Token & Mandatory FIDO2 Notice */}
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs text-emerald-950 space-y-1.5 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <Key className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Secure Cryptographic Activation &amp; FIDO2 Enrolment</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  A cryptographically signed, one-time activation token will be delivered to the official administrator inbox.
                </p>
                <p className="text-[11px] text-emerald-800 font-medium">
                  <strong>Mandatory Hardware Enrolment:</strong> Upon initial token verification, the administrator MUST register a hardware security key (FIDO2 / WebAuthn, e.g. YubiKey). SMS and email OTP are prohibited as authentication substitutes.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors"
                >
                  Dispatch Activation Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 11. MODAL: REVOKE / ACTIVATE CONFIRMATION                                */}
      {/* ======================================================================= */}
      {adminToRevoke && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-3 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              {adminToRevoke.status === "Active" ? "Suspend Super Admin Access?" : "Reactivate Super Admin Access?"}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {adminToRevoke.status === "Active"
                ? `Suspending access for ${adminToRevoke.name} (${adminToRevoke.adminId}) will immediately invalidate all active web sessions, revoke API keys, and block further platform administrative access.`
                : `Reactivating access for ${adminToRevoke.name} (${adminToRevoke.adminId}) will restore their Super Admin privileges on the platform.`}
            </p>

            {adminToRevoke.status === "Active" && activeAdminsCount <= 1 ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>PAM Safeguard: Cannot suspend the sole active Super Admin account.</span>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdminToRevoke(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={adminToRevoke.status === "Active" && activeAdminsCount <= 1}
                onClick={handleConfirmRevoke}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  adminToRevoke.status === "Active"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                Confirm {adminToRevoke.status === "Active" ? "Suspension" : "Reactivation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
