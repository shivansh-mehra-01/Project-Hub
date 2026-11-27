"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  UserPlus,
  Search,
  Shield,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Laptop,
  Ban,
  RotateCcw,
  X,
  AlertCircle,
  AlertTriangle,
  Info,
  Check,
  Mail,
  Lock,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { usePlatformData, PlatformAdminUserRecord } from "../data/platformDataStore";
import { showToast } from "@/lib/toast";

export const PlatformAdministratorsView: React.FC = () => {
  const { adminUsers, inviteAdminUser, updateAdminUser, revokeAdminSessions } = usePlatformData();

  useDashboardHeader({
    title: "Platform Administrators",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"Super Admin" | "Support Operator">("Support Operator");
  const [inviteError, setInviteError] = useState("");

  // Session Revoke Modal State
  const [adminToRevokeSessions, setAdminToRevokeSessions] = useState<PlatformAdminUserRecord | null>(null);

  // Status Toggle Modal State
  const [adminToToggleStatus, setAdminToToggleStatus] = useState<PlatformAdminUserRecord | null>(null);

  // Derived Metrics
  const totalCount = adminUsers.length;
  const activeCount = adminUsers.filter((u) => u.status === "Active").length;
  const supportOpsCount = adminUsers.filter((u) => u.platformRole === "Support Operator").length;
  const mfaActiveCount = adminUsers.filter((u) => u.mfaStatus.includes("Active")).length;

  const filteredAdmins = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return adminUsers.filter((u) => {
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.adminId && u.adminId.toLowerCase().includes(q));

      const matchesRole = roleFilter === "All" || u.platformRole === roleFilter;
      const matchesStatus = statusFilter === "All" || u.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [adminUsers, searchQuery, roleFilter, statusFilter]);

  const handleOpenInvite = () => {
    setInviteName("");
    setInviteEmail("");
    setInviteRole("Support Operator");
    setInviteError("");
    setShowInviteModal(true);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = inviteName.trim();
    const email = inviteEmail.trim().toLowerCase();

    if (!name || !email) {
      setInviteError("Name and official email are required.");
      return;
    }

    if (!email.includes("@")) {
      setInviteError("Please provide a valid institutional email address.");
      return;
    }

    try {
      await inviteAdminUser(email, name, inviteRole);
      setShowInviteModal(false);
    } catch (err: any) {
      setInviteError(err?.message || "Failed to send invitation.");
    }
  };

  const handleConfirmRevokeSessions = async () => {
    if (!adminToRevokeSessions) return;
    try {
      await revokeAdminSessions(adminToRevokeSessions.id);
      setAdminToRevokeSessions(null);
    } catch (err: any) {
      showToast(err?.message || "Failed to revoke sessions.", "error");
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!adminToToggleStatus) return;
    const targetStatus = adminToToggleStatus.status === "Active" ? "Suspended" : "Active";
    try {
      await updateAdminUser(adminToToggleStatus.id, { status: targetStatus });
      setAdminToToggleStatus(null);
    } catch (err: any) {
      showToast(err?.message || "Failed to update operator status.", "error");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ======================================================================= */}
      {/* 1. HEADER                                                               */}
      {/* ======================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Platform Administrators</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage platform operator accounts, assigned operational responsibilities, and privileged session security.
          </p>
        </div>

        <button
          onClick={handleOpenInvite}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Invite Platform Operator
        </button>
      </div>

      {/* Security Scope Banner */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 text-xs text-slate-700">
        <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-900">Predefined Role-Based Access Governance</p>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Platform operators manage Colabex ecosystem operations. Super Admins have unrestricted platform governance and onboarding authority. Support Operators are scoped strictly to support desk tickets and service health monitoring without tenant configuration privileges.
          </p>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 2. SUMMARY METRICS                                                      */}
      {/* ======================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            Total Operators
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-slate-900">{totalCount}</span>
            <span className="text-xs text-slate-400">Directory</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            Active Accounts
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-600">{activeCount}</span>
            <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
              Operational
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            Support Operators
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-blue-600">{supportOpsCount}</span>
            <span className="text-xs text-slate-400">Scoped Access</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            MFA Enforced
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-slate-900">{mfaActiveCount}</span>
            <span className="text-xs text-slate-500">of {totalCount} enrolled</span>
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 3. FILTERS & SEARCH                                                     */}
      {/* ======================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
            >
              <option value="All">All Roles</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Support Operator">Support Operator</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="Pending Invitation">Pending Invitation</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search operator name, email, or ID..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 4. OPERATORS DIRECTORY TABLE                                            */}
      {/* ======================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Operator Name</th>
                <th className="py-3 px-4">Predefined Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">MFA Security</th>
                <th className="py-3 px-4">Last Active</th>
                <th className="py-3 px-4">Active Sessions</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700 text-xs">No operators found</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      No platform administrator account matches your search criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                          {u.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>{u.email}</span>
                          {u.adminId && (
                            <>
                              <span className="text-slate-300">&bull;</span>
                              <span>{u.adminId}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded border ${
                          u.platformRole === "Super Admin"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {u.platformRole}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {u.status === "Active" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Active
                        </span>
                      ) : u.status === "Suspended" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                          <Ban className="w-3 h-3 text-rose-600" />
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pending Invite
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {u.mfaStatus.includes("Active") ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Enforced
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Pending Setup
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {u.lastLogin ? u.lastLogin.split(" ")[0] : "Never"}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs text-slate-700 font-semibold">
                        {u.activeSessionsCount || 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Revoke Sessions */}
                        <button
                          onClick={() => setAdminToRevokeSessions(u)}
                          disabled={!u.activeSessionsCount || u.activeSessionsCount === 0}
                          className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title="Revoke active sessions"
                        >
                          Revoke Sessions
                        </button>

                        {/* Suspend / Reactivate */}
                        <button
                          onClick={() => setAdminToToggleStatus(u)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                            u.status === "Active"
                              ? "text-slate-600 hover:text-rose-700 hover:bg-rose-50 border-slate-200 hover:border-rose-200"
                              : "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                          }`}
                          title={u.status === "Active" ? "Suspend operator" : "Reactivate operator"}
                        >
                          {u.status === "Active" ? "Suspend" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 5. INVITE OPERATOR MODAL                                                */}
      {/* ======================================================================= */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Invite Platform Operator</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g., Rajesh Sharma"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Official Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g., rajesh@collabex.in"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-500 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Predefined Operational Role <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setInviteRole("Support Operator")}
                    className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                      inviteRole === "Support Operator"
                        ? "border-emerald-500 bg-emerald-50/50 text-emerald-950 font-semibold"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="text-xs font-bold">Support Operator</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Tickets &amp; health monitoring</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteRole("Super Admin")}
                    className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                      inviteRole === "Super Admin"
                        ? "border-emerald-500 bg-emerald-50/50 text-emerald-950 font-semibold"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="text-xs font-bold">Super Admin</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Full platform operations</div>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-relaxed">
                  The recipient will receive an encrypted invitation link with 24-hr activation expiry. Multi-factor authentication (MFA) setup is mandatory on first login.
                </span>
              </div>

              {inviteError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{inviteError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 6. REVOKE SESSIONS CONFIRMATION MODAL                                    */}
      {/* ======================================================================= */}
      {adminToRevokeSessions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Revoke All Active Sessions?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  This will immediately terminate all active sessions for{" "}
                  <strong className="text-slate-900">{adminToRevokeSessions.name}</strong> ({adminToRevokeSessions.email}). The operator will be logged out on all devices.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdminToRevokeSessions(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevokeSessions}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Revoke All Sessions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 7. TOGGLE OPERATOR STATUS MODAL                                         */}
      {/* ======================================================================= */}
      {adminToToggleStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {adminToToggleStatus.status === "Active" ? "Suspend Operator Access?" : "Reactivate Operator Access?"}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {adminToToggleStatus.status === "Active"
                    ? `Are you sure you want to suspend access for ${adminToToggleStatus.name}? Their active sessions will be terminated and console login blocked.`
                    : `Restore platform operations access for ${adminToToggleStatus.name}?`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdminToToggleStatus(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleStatus}
                className={`px-3 py-1.5 text-xs font-semibold text-white rounded-lg shadow-xs transition-colors cursor-pointer ${
                  adminToToggleStatus.status === "Active"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {adminToToggleStatus.status === "Active" ? "Suspend Operator" : "Reactivate Operator"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
