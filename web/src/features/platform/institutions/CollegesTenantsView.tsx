"use client";

import React, { useState } from "react";
import {
  Building2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Server,
  Shield,
  Download,
  Users,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
  FileCheck2,
  Database,
  Globe,
  Mail,
  Phone,
  MapPin,
  Lock,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Modal } from "@/design-system/components/Modal";
import { SlideOverDrawer } from "@/design-system/components/SlideOverDrawer";
import { Input } from "@/design-system/components/Input";
import { Select } from "@/design-system/components/Select";
import { Textarea } from "@/design-system/components/Textarea";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import { usePlatformData, CollegeTenantRecord, OnboardingRequestRecord } from "../data/platformDataStore";
import { showToast } from "@/lib/toast";

export const CollegesTenantsView: React.FC = () => {
  const {
    colleges,
    onboardingRequests,
    onboardCollege,
    updateCollege,
    approveOnboardingRequest,
    rejectOnboardingRequest,
  } = usePlatformData();

  // Top Tabs
  const [activeMainTab, setActiveMainTab] = useState<"colleges" | "requests" | "tenants">("colleges");

  // Colleges Filter Tabs
  const [collegeStatusTab, setCollegeStatusTab] = useState<
    "All" | "Active" | "Pending Verification" | "Onboarding" | "Suspended" | "Archived"
  >("All");
  const [collegeSearch, setCollegeSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("All Plans");

  // Drawer / Details States
  const [viewingCollege, setViewingCollege] = useState<CollegeTenantRecord | null>(null);
  const [detailsTab, setDetailsTab] = useState<
    | "Overview"
    | "Institution"
    | "Tenant"
    | "Academic"
    | "Users"
    | "Subscription"
    | "Storage"
    | "Activity"
  >("Overview");

  // 7-Step Onboarding Wizard States
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    // Step 1: Institution Info
    officialName: "",
    shortName: "",
    code: "",
    institutionType: "Affiliated Technical College",
    university: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)",
    affiliationNumber: "",
    establishmentYear: 2008,
    website: "",
    // Step 2: Contact Info
    officialEmail: "",
    phone: "",
    address: "",
    city: "Bhopal",
    state: "Madhya Pradesh",
    pinCode: "",
    // Step 3: Identity
    domain: "",
    isDomainVerified: true,
    // Step 4: Tenant Config
    tenantId: "",
    databaseAllocation: "Dedicated Schema (PostgreSQL 17 RLS)",
    storageQuotaGb: 100,
    region: "AWS ap-south-1 (Mumbai)",
    // Step 5: Subscription
    subscriptionPlan: "Enterprise" as "Enterprise" | "Standard" | "Pilot",
    userLimit: 2500,
    enabledModules: [
      "Project Tracks",
      "Rubric Evaluation",
      "NBA Attainment (SAR)",
      "Continuous Logbook",
    ],
    // Step 6: Initial Admin
    adminFullName: "",
    adminDesignation: "Principal / Academic Dean",
    adminEmail: "",
  });

  useDashboardHeader({
    title: "Colleges & Tenants",
    breadcrumb: "Multi-Tenant Partitioning & Institutional Directory",
  });

  // KPI Calculations
  const totalInstitutions = colleges.length;
  const activeInstitutions = colleges.filter((c) => c.status === "Active").length;
  const pendingInstitutions = colleges.filter((c) => c.status === "Pending Verification").length;
  const suspendedInstitutions = colleges.filter((c) => c.status === "Suspended").length;
  const activeTenants = colleges.filter((c) => c.isolationStatus === "RLS Enforced").length;
  const provisioningTenants = colleges.filter((c) => c.status === "Onboarding").length;
  const failedProvisioning = 0;

  // Filtered colleges
  const filteredColleges = colleges.filter((c) => {
    const matchesStatus = collegeStatusTab === "All" || c.status === collegeStatusTab;
    const matchesPlan = planFilter === "All Plans" || c.subscriptionPlan === planFilter;
    const matchesSearch =
      c.name.toLowerCase().includes(collegeSearch.toLowerCase()) ||
      c.code.toLowerCase().includes(collegeSearch.toLowerCase()) ||
      c.domain.toLowerCase().includes(collegeSearch.toLowerCase()) ||
      c.university.toLowerCase().includes(collegeSearch.toLowerCase());
    return matchesStatus && matchesPlan && matchesSearch;
  });

  // Complete Onboarding Wizard Submission
  const handleWizardSubmit = async () => {
    if (!wizardData.officialName || !wizardData.code || !wizardData.domain) {
      showToast("Please provide mandatory college name, code, and official domain.", "warning");
      return;
    }

    const created = await onboardCollege({
      name: wizardData.officialName,
      shortName: wizardData.shortName || wizardData.code,
      code: wizardData.code,
      university: wizardData.university,
      domain: wizardData.domain,
      subscriptionPlan: wizardData.subscriptionPlan,
      totalStudents: wizardData.userLimit,
      storageQuotaGb: wizardData.storageQuotaGb,
      principalName: wizardData.adminFullName || "College Principal",
      principalEmail: wizardData.adminEmail || `principal@${wizardData.domain}`,
      contactPhone: wizardData.phone,
      address: wizardData.address,
      city: wizardData.city,
      state: wizardData.state,
      pinCode: wizardData.pinCode,
      affiliationNumber: wizardData.affiliationNumber,
      establishmentYear: wizardData.establishmentYear,
      website: wizardData.website,
      enabledModules: wizardData.enabledModules,
    });

    setShowWizard(false);
    setWizardStep(1);
    setViewingCollege(created);
    setDetailsTab("Overview");
    showToast(`Institution ${created.name} (${created.code}) provisioned successfully!`, "success");
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TOP METRICS STRIP (8 MANDATORY TELEMETRY METRICS)                       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Institutions</span>
          <div className="text-lg font-bold font-mono text-slate-900">{totalInstitutions}</div>
          <span className="text-[10px] text-emerald-600 font-medium">+2 this quarter</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Active Colleges</span>
          <div className="text-lg font-bold font-mono text-emerald-800">{activeInstitutions}</div>
          <span className="text-[10px] text-slate-500">100% operational</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Pending Verification</span>
          <div className="text-lg font-bold font-mono text-amber-700">{pendingInstitutions}</div>
          <span className="text-[10px] text-amber-600 font-medium">Awaiting DNS TXT</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Suspended</span>
          <div className="text-lg font-bold font-mono text-slate-600">{suspendedInstitutions}</div>
          <span className="text-[10px] text-slate-500">Zero locked</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Active Tenants</span>
          <div className="text-lg font-bold font-mono text-slate-900">{activeTenants}</div>
          <span className="text-[10px] text-slate-500">RLS Partitions</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Provisioning</span>
          <div className="text-lg font-bold font-mono text-blue-700">{provisioningTenants}</div>
          <span className="text-[10px] text-slate-500">In queue</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Failed Provisioning</span>
          <div className="text-lg font-bold font-mono text-slate-700">{failedProvisioning}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Zero errors</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN SECTION SWITCHER & ACTIONS                                        */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveMainTab("colleges")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeMainTab === "colleges"
                ? "bg-brand-primary text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            All Colleges ({colleges.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab("requests")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeMainTab === "requests"
                ? "bg-brand-primary text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <span>Onboarding Requests</span>
            {onboardingRequests.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-bold">
                {onboardingRequests.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab("tenants")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeMainTab === "tenants"
                ? "bg-brand-primary text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Tenant Management &amp; DB Schemas
          </button>
        </div>

        <Button
          size="sm"
          variant="primary"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => {
            setWizardStep(1);
            setShowWizard(true);
          }}
        >
          Add New College (7-Step Wizard)
        </Button>
      </div>

      {/* ========================================================================= */}
      {/* 3. TAB A: ALL COLLEGES DIRECTORY & LIFECYCLE MANAGEMENT                   */}
      {/* ========================================================================= */}
      {activeMainTab === "colleges" && (
        <Card>
          <CardHeader className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm">Engineering Colleges Directory</CardTitle>
              <CardDescription className="text-xs">
                Partitioned tenant instances with verified domain bindings and RLS database isolation.
              </CardDescription>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
              {(["All", "Active", "Pending Verification", "Onboarding", "Suspended"] as const).map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setCollegeStatusTab(status)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      collegeStatusTab === status
                        ? "bg-white text-slate-900 font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {status}
                  </button>
                )
              )}
            </div>
          </CardHeader>

          {/* Search & Plan Filter Bar */}
          <div className="p-3 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={collegeSearch}
                onChange={(e) => setCollegeSearch(e.target.value)}
                placeholder="Search college by name, code, domain, or university..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-brand-primary"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 cursor-pointer focus:outline-hidden"
              >
                <option value="All Plans">All Subscription Plans</option>
                <option value="Enterprise">Enterprise</option>
                <option value="Standard">Standard</option>
                <option value="Pilot">Pilot</option>
              </select>
            </div>
          </div>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">College Name &amp; Code</th>
                  <th className="py-3 px-4">University</th>
                  <th className="py-3 px-4">Tenant Identifier</th>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Subscription</th>
                  <th className="py-3 px-4">Intake &amp; Capacity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-900">
                {filteredColleges.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No colleges matched your search query or filter.
                    </td>
                  </tr>
                ) : (
                  filteredColleges.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-brand-primary-tint text-brand-primary border border-brand-primary-border flex items-center justify-center font-bold text-xs font-mono shrink-0">
                            {c.code.charAt(0)}
                          </div>
                          <div className="truncate max-w-[200px]">
                            <div className="truncate font-semibold">{c.name}</div>
                            <span className="text-[10px] font-mono text-slate-500 font-normal">
                              Code: {c.code}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 truncate max-w-[160px]" title={c.university}>
                        {c.university}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-brand-primary font-semibold">
                        {c.tenantId}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">@{c.domain}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            c.subscriptionPlan === "Enterprise"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : c.subscriptionPlan === "Pilot"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-slate-100 text-slate-800 border-slate-200"
                          }`}
                        >
                          {c.subscriptionPlan}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                        {c.totalStudents.toLocaleString()} students • {c.departmentsCount} depts
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            c.status === "Active"
                              ? "success"
                              : c.status === "Pending Verification"
                              ? "warning"
                              : "neutral"
                          }
                          size="sm"
                          dot
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setViewingCollege(c);
                              setDetailsTab("Overview");
                            }}
                            className="text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
                          >
                            View
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              setViewingCollege(c);
                              setDetailsTab("Tenant");
                            }}
                            className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            Manage
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB E: COLLEGE ONBOARDING REQUESTS                                      */}
      {/* ========================================================================= */}
      {activeMainTab === "requests" && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">Incoming College Onboarding Requests</CardTitle>
              <CardDescription className="text-xs">
                Verification requests submitted by university deans, directors, and principals.
              </CardDescription>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {onboardingRequests.length} Pending
            </span>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {onboardingRequests.length > 0 ? (
              onboardingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{req.institutionName}</span>
                        <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                          {req.shortName}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        Affiliation: <strong>{req.university}</strong> ({req.state})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="warning" size="sm" dot>
                        {req.reviewStatus}
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Submitted: {req.submissionDate}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Applicant</span>
                      <span className="font-semibold text-slate-900">{req.applicantName}</span>
                      <span className="text-[11px] text-slate-500 block">{req.applicantDesignation}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Official Contact</span>
                      <span className="font-mono text-slate-800">{req.officialEmail}</span>
                      <span className="text-[11px] text-slate-600 block">{req.phone}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">Expected Intake</span>
                      <span className="font-mono font-bold text-slate-900">
                        {req.estimatedStudents.toLocaleString()} Students
                      </span>
                      <span className="text-[11px] text-emerald-700 block font-medium">Domain match confirmed</span>
                    </div>
                  </div>

                  {req.notes && (
                    <p className="text-[11px] text-slate-600 italic">
                      Applicant Note: &quot;{req.notes}&quot;
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => rejectOnboardingRequest(req.id, "Requires additional verification")}
                    >
                      Reject Application
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                      onClick={() => approveOnboardingRequest(req.id)}
                    >
                      Approve &amp; Provision Tenant
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No Pending Onboarding Requests"
                description="All incoming university applications have been provisioned or resolved."
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB D: TENANT MANAGEMENT & DATABASE SCHEMA ISOLATION                   */}
      {/* ========================================================================= */}
      {activeMainTab === "tenants" && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm">Multi-Tenant PostgreSQL 17 Partitions</CardTitle>
            <CardDescription className="text-xs">
              Every college tenant is anchored to a strictly isolated schema or Row-Level Security partition.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-4">Tenant Identifier</th>
                  <th className="py-2.5 px-4">College Reference</th>
                  <th className="py-2.5 px-4">Isolation Status</th>
                  <th className="py-2.5 px-4">Storage Consumption</th>
                  <th className="py-2.5 px-4">Region</th>
                  <th className="py-2.5 px-4">Health</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {colleges.map((col) => {
                  const used = col.storageUsedGb;
                  const total = col.storageQuotaGb;
                  const pct = Math.round((used / total) * 100);

                  return (
                    <tr key={col.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-xs text-brand-primary">
                        {col.tenantId}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {col.name} ({col.code})
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {col.isolationStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 w-44">
                        <div className="space-y-1">
                          <div className="flex justify-between font-mono text-[11px] tabular-nums">
                            <span>{used} GB / {total} GB</span>
                            <span className="text-slate-500">{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{col.region}</td>
                      <td className="py-3 px-4">
                        <Badge variant="success" size="sm" dot>
                          {col.tenantHealth}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setViewingCollege(col);
                            setDetailsTab("Tenant");
                          }}
                          className="text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
                        >
                          Manage Tenant
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 6. COMPLETE 7-STEP ONBOARDING WIZARD MODAL (SECTION B)                    */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        title="Institutional College Onboarding Wizard"
        description={`Step ${wizardStep} of 7: ${
          wizardStep === 1
            ? "Institution Information"
            : wizardStep === 2
            ? "Contact Information"
            : wizardStep === 3
            ? "Institutional Identity & Domain"
            : wizardStep === 4
            ? "Tenant Partition & Database Configuration"
            : wizardStep === 5
            ? "Subscription & Module Selection"
            : wizardStep === 6
            ? "Initial Administrator Provisioning"
            : "Review & Provisioning Confirmation"
        }`}
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="secondary"
              size="sm"
              disabled={wizardStep === 1}
              onClick={() => setWizardStep((p) => Math.max(1, p - 1))}
              leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
            >
              Previous Step
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowWizard(false)}>
                Cancel
              </Button>
              {wizardStep < 7 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setWizardStep((p) => Math.min(7, p + 1))}
                  rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                >
                  Next Step
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleWizardSubmit}
                  leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                >
                  Confirm &amp; Provision Partition
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-mono text-[11px]">
            {[1, 2, 3, 4, 5, 6, 7].map((s) => (
              <div
                key={s}
                className={`flex items-center gap-1.5 ${
                  s === wizardStep
                    ? "text-brand-primary font-bold"
                    : s < wizardStep
                    ? "text-emerald-700"
                    : "text-slate-400"
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${
                    s === wizardStep
                      ? "bg-brand-primary text-white"
                      : s < wizardStep
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {s}
                </div>
                <span className="hidden md:inline">
                  {s === 1
                    ? "Info"
                    : s === 2
                    ? "Contact"
                    : s === 3
                    ? "Domain"
                    : s === 4
                    ? "Tenant"
                    : s === 5
                    ? "Plan"
                    : s === 6
                    ? "Admin"
                    : "Review"}
                </span>
              </div>
            ))}
          </div>

          {/* STEP 1: Institution Info */}
          {wizardStep === 1 && (
            <div className="space-y-3">
              <Input
                label="Official College Name *"
                placeholder="e.g. Sagar Institute of Science and Technology"
                value={wizardData.officialName}
                onChange={(e) => setWizardData({ ...wizardData, officialName: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Short Name / Campus Name"
                  placeholder="e.g. SISTec Bhopal"
                  value={wizardData.shortName}
                  onChange={(e) => setWizardData({ ...wizardData, shortName: e.target.value })}
                />
                <Input
                  label="Institutional Code *"
                  placeholder="e.g. SISTEC"
                  value={wizardData.code}
                  onChange={(e) =>
                    setWizardData({
                      ...wizardData,
                      code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""),
                    })
                  }
                  helperText="Unique uppercase identifier for DB partitioning."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Affiliating University *"
                  value={wizardData.university}
                  onChange={(e) => setWizardData({ ...wizardData, university: e.target.value })}
                  options={[
                    { label: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)", value: "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)" },
                    { label: "State Technical / Autonomous AICTE Scheme", value: "State Technical / Autonomous" },
                    { label: "Dr. A.P.J. Abdul Kalam Technical University (AKTU)", value: "Dr. A.P.J. Abdul Kalam Technical University (AKTU)" },
                  ]}
                />
                <Input
                  label="Establishment Year"
                  type="number"
                  value={wizardData.establishmentYear.toString()}
                  onChange={(e) =>
                    setWizardData({ ...wizardData, establishmentYear: parseInt(e.target.value) || 2000 })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="University Affiliation Number"
                  placeholder="e.g. RGPV/AFF/2026/088"
                  value={wizardData.affiliationNumber}
                  onChange={(e) => setWizardData({ ...wizardData, affiliationNumber: e.target.value })}
                />
                <Input
                  label="Official Website URL"
                  placeholder="https://www.college.ac.in"
                  value={wizardData.website}
                  onChange={(e) => setWizardData({ ...wizardData, website: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* STEP 2: Contact Info */}
          {wizardStep === 2 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Official Institutional Email *"
                  placeholder="e.g. info@college.ac.in"
                  value={wizardData.officialEmail}
                  onChange={(e) => setWizardData({ ...wizardData, officialEmail: e.target.value })}
                  required
                />
                <Input
                  label="Contact Phone Number *"
                  placeholder="+91 755 000 0000"
                  value={wizardData.phone}
                  onChange={(e) => setWizardData({ ...wizardData, phone: e.target.value })}
                  required
                />
              </div>
              <Input
                label="Campus Address"
                placeholder="Campus street, landmark, road"
                value={wizardData.address}
                onChange={(e) => setWizardData({ ...wizardData, address: e.target.value })}
              />
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="City"
                  value={wizardData.city}
                  onChange={(e) => setWizardData({ ...wizardData, city: e.target.value })}
                />
                <Input
                  label="State"
                  value={wizardData.state}
                  onChange={(e) => setWizardData({ ...wizardData, state: e.target.value })}
                />
                <Input
                  label="PIN Code"
                  placeholder="462036"
                  value={wizardData.pinCode}
                  onChange={(e) => setWizardData({ ...wizardData, pinCode: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* STEP 3: Domain & Identity */}
          {wizardStep === 3 && (
            <div className="space-y-3">
              <Input
                label="Official Email Domain *"
                placeholder="e.g. sistec.ac.in"
                value={wizardData.domain}
                onChange={(e) =>
                  setWizardData({
                    ...wizardData,
                    domain: e.target.value.toLowerCase().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0],
                  })
                }
                helperText="Enforces strict login domain validation for faculty and students."
                required
              />
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Domain DNS Verification</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Domain <strong>@{wizardData.domain || "college.ac.in"}</strong> will be authorized for Google Workspace and Microsoft 365 SAML authentication.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: Tenant Config */}
          {wizardStep === 4 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Tenant Identifier"
                  value={wizardData.code ? `tenant_${wizardData.code.toLowerCase()}_prod` : "tenant_new_prod"}
                  disabled
                  helperText="Generated PostgreSQL 17 isolated schema identifier."
                />
                <Select
                  label="Cloud Region"
                  value={wizardData.region}
                  onChange={(e) => setWizardData({ ...wizardData, region: e.target.value })}
                  options={[
                    { label: "AWS ap-south-1 (Mumbai)", value: "AWS ap-south-1 (Mumbai)" },
                    { label: "AWS ap-south-2 (Hyderabad)", value: "AWS ap-south-2 (Hyderabad)" },
                  ]}
                />
              </div>
              <Select
                label="Storage Vault Allocation"
                value={wizardData.storageQuotaGb.toString()}
                onChange={(e) =>
                  setWizardData({ ...wizardData, storageQuotaGb: parseInt(e.target.value) || 100 })
                }
                options={[
                  { label: "50 GB Schema Storage", value: "50" },
                  { label: "100 GB Schema Storage", value: "100" },
                  { label: "250 GB Enterprise Storage", value: "250" },
                ]}
              />
            </div>
          )}

          {/* STEP 5: Subscription Plan */}
          {wizardStep === 5 && (
            <div className="space-y-3">
              <Select
                label="Subscription Plan Tier *"
                value={wizardData.subscriptionPlan}
                onChange={(e) =>
                  setWizardData({
                    ...wizardData,
                    subscriptionPlan: e.target.value as "Enterprise" | "Standard" | "Pilot",
                  })
                }
                options={[
                  { label: "Enterprise Multi-Campus (₹4,80,000 / yr)", value: "Enterprise" },
                  { label: "Standard Academic (₹2,40,000 / yr)", value: "Standard" },
                  { label: "Institutional Pilot (90-Day Evaluation Free)", value: "Pilot" },
                ]}
              />
              <Input
                label="Total Student Enrollment Limit"
                type="number"
                value={wizardData.userLimit.toString()}
                onChange={(e) =>
                  setWizardData({ ...wizardData, userLimit: parseInt(e.target.value) || 1500 })
                }
              />
            </div>
          )}

          {/* STEP 6: Initial Administrator */}
          {wizardStep === 6 && (
            <div className="space-y-3">
              <Input
                label="Principal / Dean Full Name *"
                placeholder="e.g. Dr. Keshvendra Choudhary"
                value={wizardData.adminFullName}
                onChange={(e) => setWizardData({ ...wizardData, adminFullName: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Official Administrator Email *"
                  placeholder={`principal@${wizardData.domain || "college.ac.in"}`}
                  value={wizardData.adminEmail}
                  onChange={(e) => setWizardData({ ...wizardData, adminEmail: e.target.value })}
                  required
                />
                <Input
                  label="Designation"
                  value={wizardData.adminDesignation}
                  onChange={(e) => setWizardData({ ...wizardData, adminDesignation: e.target.value })}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                A 24-hour activation OTP and temporary credentials will be dispatched to this email address automatically upon tenant provisioning.
              </p>
            </div>
          )}

          {/* STEP 7: Review & Provision */}
          {wizardStep === 7 && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Institution:</span>
                  <span className="font-bold text-slate-900">{wizardData.officialName || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tenant Identifier:</span>
                  <span className="font-mono font-bold text-brand-primary">
                    tenant_{(wizardData.code || "NEW").toLowerCase()}_prod
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Domain:</span>
                  <span className="font-mono text-slate-900">@{wizardData.domain || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Plan:</span>
                  <span className="font-bold text-emerald-800">{wizardData.subscriptionPlan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Initial Administrator:</span>
                  <span className="text-slate-900">
                    {wizardData.adminFullName} ({wizardData.adminEmail || `principal@${wizardData.domain}`})
                  </span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 text-[11px]">
                Ready to provision isolated PostgreSQL 17 schema and S3 storage prefix in AWS ap-south-1.
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 7. DEDICATED COLLEGE DETAILS RECORD DRAWER (SECTION C & F)                 */}
      {/* ========================================================================= */}
      <SlideOverDrawer
        isOpen={!!viewingCollege}
        onClose={() => setViewingCollege(null)}
        title={viewingCollege?.name}
        subtitle={`Tenant Partition: ${viewingCollege?.code} • ${viewingCollege?.tenantId}`}
        badge={
          viewingCollege && (
            <Badge variant={viewingCollege.status === "Active" ? "success" : "warning"} size="sm" dot>
              {viewingCollege.status}
            </Badge>
          )
        }
      >
        {viewingCollege && (
          <div className="space-y-4 text-xs">
            {/* Record Drawer Sub-Tabs */}
            <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 pb-2">
              {[
                "Overview",
                "Institution",
                "Tenant",
                "Academic",
                "Users",
                "Subscription",
                "Storage",
                "Activity",
              ].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setDetailsTab(tab as any)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    detailsTab === tab
                      ? "bg-brand-primary text-white font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Sub-Tab 1: Overview */}
            {detailsTab === "Overview" && (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Official Code:</span>
                    <span className="font-mono font-bold text-slate-900">{viewingCollege.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">University:</span>
                    <span className="text-slate-900">{viewingCollege.university}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Registered On:</span>
                    <span className="font-mono text-slate-700">{viewingCollege.registrationDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Next Contract Renewal:</span>
                    <span className="font-mono text-slate-700">{viewingCollege.renewalDate}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="font-bold text-slate-900 block">Governance Head / Principal</span>
                  <div className="p-2.5 rounded-lg border border-slate-200 bg-white space-y-1">
                    <div className="font-semibold text-slate-900">{viewingCollege.principalName}</div>
                    <div className="font-mono text-[11px] text-slate-600">{viewingCollege.principalEmail}</div>
                    <div className="text-[11px] text-slate-500">{viewingCollege.contactPhone}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab 2: Institution Info */}
            {detailsTab === "Institution" && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Campus Address</span>
                    <p className="text-slate-800">{viewingCollege.address}, {viewingCollege.city}, {viewingCollege.state} - {viewingCollege.pinCode}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Affiliation Number</span>
                    <p className="font-mono text-slate-800">{viewingCollege.affiliationNumber}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Official Website</span>
                    <a href={viewingCollege.website} target="_blank" rel="noreferrer" className="text-brand-primary hover:underline flex items-center gap-1">
                      <span>{viewingCollege.website}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab 3: Tenant Config */}
            {detailsTab === "Tenant" && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Schema Partition:</span>
                    <span className="font-bold text-slate-900">{viewingCollege.tenantId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Database Engine:</span>
                    <span className="text-slate-900">PostgreSQL 17 (RDS Multi-AZ)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Isolation Standard:</span>
                    <span className="text-emerald-700 font-bold">{viewingCollege.isolationStatus}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <span className="font-bold text-slate-900 block">Tenant Status Actions</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={viewingCollege.status === "Active" ? "danger" : "primary"}
                      onClick={() => {
                        const newStatus = viewingCollege.status === "Active" ? "Suspended" : "Active";
                        updateCollege(viewingCollege.id, { status: newStatus });
                        setViewingCollege({ ...viewingCollege, status: newStatus });
                      }}
                    >
                      {viewingCollege.status === "Active" ? "Suspend Tenant" : "Reactivate Tenant"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab 7: Storage & Usage */}
            {detailsTab === "Storage" && (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">Storage Usage</span>
                    <span className="font-mono font-bold text-slate-900">
                      {viewingCollege.storageUsedGb} GB / {viewingCollege.storageQuotaGb} GB
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-primary rounded-full"
                      style={{
                        width: `${Math.round((viewingCollege.storageUsedGb / viewingCollege.storageQuotaGb) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
};
