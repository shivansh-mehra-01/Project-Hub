"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Ban,
  X,
  Eye,
  Check,
  AlertTriangle,
  RotateCcw,
  MapPin,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Calendar,
  AlertCircle,
  ShieldAlert,
  User,
  ArrowRight,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import {
  usePlatformData,
  CollegeTenantRecord,
  OnboardingRequestRecord,
} from "../data/platformDataStore";
import { showToast } from "@/lib/toast";

export type UnifiedCollegeStatus =
  | "All"
  | "Pending Review"
  | "Under Review"
  | "Approved"
  | "Provisioning"
  | "Active"
  | "Rejected"
  | "Suspended";

export interface UnifiedCollegeItem {
  id: string;
  collegeId?: string;
  applicationId?: string;
  name: string;
  shortName: string;
  code: string;
  university: string;
  location: {
    city: string;
    state: string;
    address?: string;
  };
  registrationDate: string;
  lastActivity: string;
  status: UnifiedCollegeStatus;
  domain?: string;
  primaryAdmin: {
    name: string;
    email: string;
    phone?: string;
    designation?: string;
  };
  totalStudents?: number;
  totalFaculty?: number;
  rejectionReason?: string;
  rejectionExplanation?: string;
}

export const CollegesView: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const {
    colleges,
    onboardingRequests,
    updateCollege,
    approveApplication,
    rejectApplication,
    suspendCollege,
    reactivateCollege,
  } = usePlatformData();

  useDashboardHeader({
    title: "Colleges",
  });

  const rawStatus = searchParams.get("status");
  const initialStatus: UnifiedCollegeStatus =
    rawStatus === "Pending Review" ||
    rawStatus === "Under Review" ||
    rawStatus === "Approved" ||
    rawStatus === "Provisioning" ||
    rawStatus === "Active" ||
    rawStatus === "Rejected" ||
    rawStatus === "Suspended"
      ? (rawStatus as UnifiedCollegeStatus)
      : rawStatus === "Pending"
      ? "Pending Review"
      : "All";

  const [statusFilter, setStatusFilter] = useState<UnifiedCollegeStatus>(initialStatus);
  const [searchTerm, setSearchTerm] = useState("");

  const handleStatusFilterChange = (status: UnifiedCollegeStatus) => {
    setStatusFilter(status);
    const params = new URLSearchParams(window.location.search);
    if (status === "All") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    const query = params.toString();
    router.replace(`/platform/colleges${query ? `?${query}` : ""}`);
  };

  // Modal states
  const [collegeToApprove, setCollegeToApprove] = useState<UnifiedCollegeItem | null>(null);
  const [collegeToReject, setCollegeToReject] = useState<UnifiedCollegeItem | null>(null);
  const [rejectReason, setRejectReason] = useState("Incomplete documentation");
  const [rejectExplanation, setRejectExplanation] = useState("");

  const [collegeToSuspend, setCollegeToSuspend] = useState<UnifiedCollegeItem | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  const [collegeToReactivate, setCollegeToReactivate] = useState<UnifiedCollegeItem | null>(null);
  const [reactivateReason, setReactivateReason] = useState("");

  // Unified Data Consolidation
  const unifiedColleges = useMemo(() => {
    const list: UnifiedCollegeItem[] = [];
    const processedCodes = new Set<string>();

    // 1. Process active/registered colleges
    for (const c of colleges) {
      const normCode = c.code.toUpperCase();
      processedCodes.add(normCode);

      const matchingReq = onboardingRequests.find(
        (r) =>
          (r.collegeCode && r.collegeCode.toUpperCase() === normCode) ||
          r.institutionName.toLowerCase() === c.name.toLowerCase()
      );

      let status: UnifiedCollegeStatus = "Active";
      if (c.status === "Suspended") {
        status = "Suspended";
      } else if (c.status === "Pending Verification") {
        status = "Provisioning";
      } else if (c.status === "Active") {
        status = "Active";
      } else {
        status = "Approved";
      }

      list.push({
        id: c.id,
        collegeId: c.id,
        applicationId: matchingReq?.id,
        name: c.name,
        shortName: c.shortName,
        code: c.code,
        university: c.university || "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
        location: {
          city: c.city,
          state: c.state,
          address: c.address,
        },
        registrationDate: matchingReq?.submissionDate || c.registrationDate || "2026-08-15",
        lastActivity: (c as any).lastActivity || "2 hours ago",
        status,
        domain: c.domain,
        primaryAdmin: {
          name: c.principalName,
          email: c.principalEmail,
          phone: c.contactPhone,
          designation: c.principalDesignation || "Principal",
        },
        totalStudents: c.totalStudents,
        totalFaculty: c.totalFaculty,
      });
    }

    // 2. Process onboarding applications not in colleges table
    for (const req of onboardingRequests) {
      const normCode = (req.collegeCode || req.shortName || "").toUpperCase();
      if (normCode && processedCodes.has(normCode)) {
        continue;
      }
      if (list.some((item) => item.name.toLowerCase() === req.institutionName.toLowerCase())) {
        continue;
      }

      let status: UnifiedCollegeStatus = "Pending Review";
      if (req.reviewStatus === "Approved") {
        status = "Approved";
      } else if (req.reviewStatus === "Rejected") {
        status = "Rejected";
      } else if (req.reviewStatus === "Under Review") {
        status = "Under Review";
      } else {
        status = "Pending Review";
      }

      list.push({
        id: req.id,
        applicationId: req.id,
        name: req.institutionName,
        shortName: req.shortName || req.collegeCode,
        code: req.collegeCode || req.shortName || "APP",
        university: req.university || "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
        location: {
          city: req.city,
          state: req.state,
          address: req.address,
        },
        registrationDate: req.submissionDate || "2026-11-01",
        lastActivity: "Awaiting review",
        status,
        domain: req.domain || (req.officialEmail ? req.officialEmail.split("@")[1] : undefined),
        primaryAdmin: {
          name: req.applicantName,
          email: req.officialEmail,
          phone: req.phone,
          designation: req.applicantDesignation || "Applicant Head",
        },
        rejectionReason: req.rejectionReason,
        rejectionExplanation: req.rejectionExplanation,
      });
    }

    return list;
  }, [colleges, onboardingRequests]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: unifiedColleges.length,
      pendingReview: unifiedColleges.filter((c) => c.status === "Pending Review").length,
      underReview: unifiedColleges.filter((c) => c.status === "Under Review").length,
      approved: unifiedColleges.filter((c) => c.status === "Approved").length,
      provisioning: unifiedColleges.filter((c) => c.status === "Provisioning").length,
      active: unifiedColleges.filter((c) => c.status === "Active").length,
      rejected: unifiedColleges.filter((c) => c.status === "Rejected").length,
      suspended: unifiedColleges.filter((c) => c.status === "Suspended").length,
    };
  }, [unifiedColleges]);

  // Filtered records
  const filteredColleges = useMemo(() => {
    return unifiedColleges.filter((c) => {
      if (statusFilter !== "All" && c.status !== statusFilter) {
        return false;
      }

      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;

      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.location.city.toLowerCase().includes(q) ||
        c.location.state.toLowerCase().includes(q) ||
        c.university.toLowerCase().includes(q) ||
        c.primaryAdmin.name.toLowerCase().includes(q) ||
        c.primaryAdmin.email.toLowerCase().includes(q)
      );
    });
  }, [unifiedColleges, statusFilter, searchTerm]);

  // Action Handlers
  const handleApproveConfirm = async () => {
    if (!collegeToApprove) return;
    const reqId = collegeToApprove.applicationId || collegeToApprove.id;
    await approveApplication(reqId);
    setCollegeToApprove(null);
  };

  const handleRejectConfirm = () => {
    if (!collegeToReject) return;
    const reqId = collegeToReject.applicationId || collegeToReject.id;
    rejectApplication(reqId, rejectReason, rejectExplanation);
    setCollegeToReject(null);
    setRejectReason("Incomplete documentation");
    setRejectExplanation("");
  };

  const handleConfirmSuspend = () => {
    if (!collegeToSuspend) return;
    const collegeId = collegeToSuspend.collegeId || collegeToSuspend.id;
    suspendCollege(collegeId, suspendReason.trim() || "Administrative suspension by Super Admin");
    setCollegeToSuspend(null);
    setSuspendReason("");
  };

  const handleConfirmReactivate = () => {
    if (!collegeToReactivate) return;
    const collegeId = collegeToReactivate.collegeId || collegeToReactivate.id;
    reactivateCollege(collegeId, reactivateReason.trim() || "Reactivated by Super Admin");
    setCollegeToReactivate(null);
    setReactivateReason("");
  };

  // Status Badge Helper
  const renderStatusBadge = (status: UnifiedCollegeStatus) => {
    switch (status) {
      case "Active":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        );
      case "Pending Review":
      case "Under Review":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-2.5 h-2.5 text-amber-600" />
            {status}
          </span>
        );
      case "Provisioning":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-800 border border-blue-200">
            <RotateCcw className="w-2.5 h-2.5 text-blue-600 animate-spin" />
            Provisioning
          </span>
        );
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-2.5 h-2.5 text-blue-600" />
            Approved
          </span>
        );
      case "Suspended":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-800 border border-rose-200">
            <Ban className="w-2.5 h-2.5 text-rose-600" />
            Suspended
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            <X className="w-2.5 h-2.5 text-slate-500" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Colleges</h1>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
              RGPV Ecosystem
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Directory of affiliated institutions, onboarding review queue, and college lifecycle governance.
          </p>
        </div>

        <Link
          href="/platform/colleges/new"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Onboard College
        </Link>
      </div>

      {/* Toolbar: Search & 8 Status Filter Tabs */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by college name, code, city, or administrator..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900 focus:border-slate-900 bg-white"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 8 Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { key: "All", label: "All Colleges", count: counts.all },
            { key: "Pending Review", label: "Pending Review", count: counts.pendingReview },
            { key: "Under Review", label: "Under Review", count: counts.underReview },
            { key: "Approved", label: "Approved", count: counts.approved },
            { key: "Provisioning", label: "Provisioning", count: counts.provisioning },
            { key: "Active", label: "Active", count: counts.active },
            { key: "Rejected", label: "Rejected", count: counts.rejected },
            { key: "Suspended", label: "Suspended", count: counts.suspended },
          ].map((f) => {
            const isActive = statusFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => handleStatusFilterChange(f.key as UnifiedCollegeStatus)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white font-semibold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`px-1 py-0.2 text-[10px] font-mono rounded font-bold ${
                    isActive ? "bg-slate-800 text-slate-200" : "bg-white text-slate-500"
                  }`}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Colleges Table (Strict 8 Columns) */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold tracking-wider">
              <tr>
                <th className="py-2.5 px-3.5">College Name &amp; Code</th>
                <th className="py-2.5 px-3">Affiliation</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Primary Administrator</th>
                <th className="py-2.5 px-3">Reg. Date</th>
                <th className="py-2.5 px-3">Last Activity</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredColleges.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No colleges found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      No institution matches the selected filter or search query.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredColleges.map((col) => (
                  <tr key={col.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* 1. College Name & Code */}
                    <td className="py-3 px-3.5 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">{col.name}</div>
                      <div className="text-[10px] font-mono font-bold text-slate-500 mt-0.5">
                        {col.code}
                      </div>
                    </td>

                    {/* 2. Affiliation */}
                    <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                      <span className="font-medium text-slate-800">RGPV</span>
                      <span className="text-[10px] text-slate-400 block font-mono">Bhopal, MP</span>
                    </td>

                    {/* 3. Location */}
                    <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{col.location.city}, {col.location.state}</span>
                      </div>
                    </td>

                    {/* 4. Status */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {renderStatusBadge(col.status)}
                    </td>

                    {/* 5. Primary Administrator */}
                    <td className="py-3 px-3 max-w-xs">
                      <div className="font-medium text-slate-900 truncate">{col.primaryAdmin.name}</div>
                      <div className="text-[10px] font-mono text-slate-500 truncate">
                        {col.primaryAdmin.email}
                      </div>
                    </td>

                    {/* 6. Reg. Date */}
                    <td className="py-3 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                      {col.registrationDate}
                    </td>

                    {/* 7. Last Activity */}
                    <td className="py-3 px-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {col.lastActivity}
                    </td>

                    {/* 8. Actions */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* PENDING / UNDER REVIEW APPLICATIONS */}
                        {(col.status === "Pending Review" || col.status === "Under Review") && (
                          <>
                            <Link
                              href={`/platform/colleges/applications/${col.applicationId || col.id}`}
                              className="px-2.5 py-1 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded transition-colors"
                            >
                              Review
                            </Link>
                            <button
                              type="button"
                              onClick={() => setCollegeToApprove(col)}
                              className="px-2 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded cursor-pointer"
                              title="Approve Application"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCollegeToReject(col)}
                              className="px-2 py-1 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded cursor-pointer"
                              title="Reject Application"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        )}

                        {/* APPROVED / PROVISIONING / ACTIVE COLLEGES */}
                        {(col.status === "Active" || col.status === "Approved" || col.status === "Provisioning") && (
                          <>
                            <Link
                              href={`/platform/colleges/${col.collegeId || col.id}`}
                              className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-200 transition-colors"
                            >
                              View Details
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setCollegeToSuspend(col);
                                setSuspendReason("");
                              }}
                              className="px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded cursor-pointer"
                              title="Suspend College"
                            >
                              <Ban className="w-3 h-3" />
                            </button>
                          </>
                        )}

                        {/* SUSPENDED COLLEGES */}
                        {col.status === "Suspended" && (
                          <>
                            <Link
                              href={`/platform/colleges/${col.collegeId || col.id}`}
                              className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-200 transition-colors"
                            >
                              View Details
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setCollegeToReactivate(col);
                                setReactivateReason("");
                              }}
                              className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded cursor-pointer"
                              title="Reactivate College"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          </>
                        )}

                        {/* REJECTED */}
                        {col.status === "Rejected" && (
                          <Link
                            href={`/platform/colleges/applications/${col.applicationId || col.id}`}
                            className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200"
                          >
                            View Decision
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SUSPEND MODAL WITH MANDATORY REASON */}
      {collegeToSuspend && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3.5 border border-slate-200 animate-in fade-in-50 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Suspend College Access</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Suspend platform access for <strong>{collegeToSuspend.name}</strong> ({collegeToSuspend.code}). Student and faculty logins will be paused while all academic data remains preserved.
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmSuspend();
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Suspension Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="State the administrative reason for suspending this institution (e.g. affiliation lapsed, compliance review)..."
                  className="w-full text-xs border border-slate-300 rounded p-2 focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCollegeToSuspend(null)}
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

      {/* REACTIVATE MODAL WITH MANDATORY REASON */}
      {collegeToReactivate && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3.5 border border-slate-200 animate-in fade-in-50 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Reactivate College Access</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Restore platform access and resume active project operations for <strong>{collegeToReactivate.name}</strong>.
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmReactivate();
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Reactivation Note <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={reactivateReason}
                  onChange={(e) => setReactivateReason(e.target.value)}
                  placeholder="Document the resolution or authority allowing reactivation..."
                  className="w-full text-xs border border-slate-300 rounded p-2 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCollegeToReactivate(null)}
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

      {/* APPROVE APPLICATION MODAL */}
      {collegeToApprove && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3.5 border border-slate-200 animate-in fade-in-50 duration-150">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Approve College Onboarding</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Confirm approval for <strong>{collegeToApprove.name}</strong>. This initiates multi-tenant schema provisioning and dispatches administrator activation credentials.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
              <div><span className="text-slate-500">College:</span> <strong className="text-slate-900">{collegeToApprove.name}</strong></div>
              <div><span className="text-slate-500">Code:</span> <span className="font-mono">{collegeToApprove.code}</span></div>
              <div><span className="text-slate-500">Affiliation:</span> {collegeToApprove.university}</div>
              <div><span className="text-slate-500">Admin Email:</span> <span className="font-mono">{collegeToApprove.primaryAdmin.email}</span></div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setCollegeToApprove(null)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-800 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveConfirm}
                className="px-4 py-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors cursor-pointer"
              >
                Approve &amp; Provision Tenant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT APPLICATION MODAL */}
      {collegeToReject && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 space-y-3.5 border border-slate-200 animate-in fade-in-50 duration-150">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Reject College Application</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Decline onboarding application for {collegeToReject.name}.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded text-xs text-slate-800"
                >
                  <option value="Incomplete documentation">Incomplete regulatory documentation</option>
                  <option value="Invalid university affiliation">Invalid or expired RGPV affiliation certificate</option>
                  <option value="Unverified applicant authority">Unauthorized applicant signatory / unverified authority</option>
                  <option value="Duplicate application">Duplicate institutional application</option>
                  <option value="Other">Other / Custom reason</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Explanatory Remarks
                </label>
                <textarea
                  rows={2}
                  value={rejectExplanation}
                  onChange={(e) => setRejectExplanation(e.target.value)}
                  placeholder="Provide specific notes regarding the reason for rejection..."
                  className="w-full p-2 bg-white border border-slate-300 rounded text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setCollegeToReject(null)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-800 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="px-4 py-1.5 font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
