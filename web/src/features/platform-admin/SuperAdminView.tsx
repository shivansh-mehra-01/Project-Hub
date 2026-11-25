"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Activity,
  Layers,
  Sparkles,
  ExternalLink,
  Zap,
  Server,
  Shield,
  Sliders,
  Search,
  Filter,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  AlertTriangle,
  RotateCcw,
  FileCheck2,
  Users2,
  Calendar,
  Lock,
  ArrowRight,
  ShieldAlert,
  BarChart3,
  Globe,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Modal } from "@/design-system/components/Modal";
import { SlideOverDrawer } from "@/design-system/components/SlideOverDrawer";
import { Input } from "@/design-system/components/Input";
import { Select } from "@/design-system/components/Select";
import { Textarea } from "@/design-system/components/Textarea";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { TenantCollege, PilotRequest, PlatformAuditLog } from "@/mocks/store-types";
import { showToast } from "@/lib/toast";

export interface SuperAdminViewProps {
  initialTab?: "tenants" | "subscriptions" | "health" | "audit";
}

// All 12 Standard NBA Program Outcomes (POs) with 0-3 Attainment Criteria
interface ProgramOutcomeItem {
  code: string;
  title: string;
  blooms: string;
  desc: string;
  levels: {
    l0: string;
    l1: string;
    l2: string;
    l3: string;
  };
}

const defaultProgramOutcomes: ProgramOutcomeItem[] = [
  {
    code: "PO1",
    title: "Engineering Knowledge",
    blooms: "L3_Apply",
    desc: "Apply knowledge of mathematics, science, engineering fundamentals, and computer science specialization.",
    levels: {
      l0: "Inability to apply fundamental computational concepts to the engineering problem.",
      l1: "Applies basic mathematical and algorithmic models with extensive mentor guidance.",
      l2: "Accurately applies foundational engineering theory and data structures to project architecture.",
      l3: "Demonstrates advanced mastery; mathematically models problem constraints with optimization proofs.",
    },
  },
  {
    code: "PO2",
    title: "Problem Analysis",
    blooms: "L4_Analyze",
    desc: "Identify, formulate, review research literature, and analyze complex engineering problems reaching substantiated conclusions.",
    levels: {
      l0: "Vague problem formulation without literature survey or verified engineering constraints.",
      l1: "Basic literature review citing standard textbooks with partial problem bounds.",
      l2: "Thorough survey of IEEE/ACM conference literature; clearly formulated mathematical bounds.",
      l3: "Rigorous empirical formulation bench-marking state-of-the-art algorithms with formal ablation.",
    },
  },
  {
    code: "PO3",
    title: "Design/Development of Solutions",
    blooms: "L5_Evaluate",
    desc: "Design solutions for complex engineering problems and design system components or processes that meet specified needs.",
    levels: {
      l0: "Trivial architectural design lacking component modularity and failure handling.",
      l1: "Standard monolithic architecture with basic CRUD interfaces and partial security controls.",
      l2: "High-cohesion, low-coupling microservice or layered architecture with documented schema diagrams.",
      l3: "Production-grade fault-tolerant distributed system with automated fallback and sub-50ms latency.",
    },
  },
  {
    code: "PO4",
    title: "Conduct Investigations of Complex Problems",
    blooms: "L4_Analyze",
    desc: "Use research-based knowledge and research methods including design of experiments, analysis and synthesis of information.",
    levels: {
      l0: "No systematic experimental methodology or quantitative telemetry collected.",
      l1: "Preliminary benchmark runs on localized synthetic datasets with basic line charts.",
      l2: "Standard scientific experimental protocol with controlled variables and statistical error bars.",
      l3: "Comprehensive multi-factor ANOVA validation on live testbeds with rigorous variance analysis.",
    },
  },
  {
    code: "PO5",
    title: "Modern Tool Usage",
    blooms: "L3_Apply",
    desc: "Create, select, and apply appropriate techniques, resources, and modern IT tools including prediction and modeling.",
    levels: {
      l0: "Relies on manual scripts without version control, containerization, or automated linting.",
      l1: "Uses Git repository with sporadic commits; manual deployment to cloud environments.",
      l2: "Standard CI/CD pipeline (GitHub Actions), Docker containerization, and automated test runners.",
      l3: "Full GitOps workflow with automated security vulnerability scanning, Terraform IaC, and distributed tracing.",
    },
  },
  {
    code: "PO6",
    title: "The Engineer and Society",
    blooms: "L3_Apply",
    desc: "Apply reasoning informed by contextual knowledge to assess societal, health, safety, legal and cultural issues.",
    levels: {
      l0: "No consideration of societal impact, regulatory compliance, or public health.",
      l1: "Surface-level recognition of societal relevance in the project introductory chapter.",
      l2: "Concrete risk mitigation addressing end-user safety, accessibility, and local community needs.",
      l3: "Validated deployment impacting societal stakeholders with measurable public benefit metrics.",
    },
  },
  {
    code: "PO7",
    title: "Environment and Sustainability",
    blooms: "L2_Understand",
    desc: "Understand the impact of the professional engineering solutions in societal and environmental contexts.",
    levels: {
      l0: "Solution relies on energy-wasteful compute loops without energy efficiency analysis.",
      l1: "Mentions UN Sustainable Development Goals (SDGs) as an abstract appendix item.",
      l2: "Directly maps architectural components to explicit UN SDG targets with carbon footprint estimation.",
      l3: "Green software engineering principles applied; provable reductions in watt-hours and cloud compute waste.",
    },
  },
  {
    code: "PO8",
    title: "Ethics",
    blooms: "L3_Apply",
    desc: "Apply ethical principles and commit to professional ethics and responsibilities and norms of the engineering practice.",
    levels: {
      l0: "Uncited code duplication (>30% plagiarism) or unauthorized data scraping.",
      l1: "Standard plagiarism clearance (<15%) with superficial open-source license attribution.",
      l2: "Strict data privacy compliance (GDPR/DPDP Act), signed user consent, and MIT/Apache license compliance.",
      l3: "Exemplary ethical rigor; bias mitigation in ML models, transparent AI disclosures, and signed ethical oaths.",
    },
  },
  {
    code: "PO9",
    title: "Individual and Team Work",
    blooms: "L3_Apply",
    desc: "Function effectively as an individual, and as a member or leader in diverse teams, and in multidisciplinary settings.",
    levels: {
      l0: "Extreme work imbalance; single author commits 90%+ code with severe team conflict.",
      l1: "Uneven task distribution with occasional missing deliverables and delayed guide reviews.",
      l2: "Equitable task allocations tracked via Kanban boards; weekly synchronous standups with documented logs.",
      l3: "Exemplary collaborative velocity; cross-functional peer reviews, mentorship of junior peers, zero backlog spills.",
    },
  },
  {
    code: "PO10",
    title: "Communication",
    blooms: "L3_Apply",
    desc: "Communicate effectively on complex engineering activities with the engineering community and with society.",
    levels: {
      l0: "Unstructured defense presentation; inability to articulate architecture or answer examiner queries.",
      l1: "Standard slide deck with generic diagrams; satisfactory presentation within time limit.",
      l2: "Crisp technical presentation, IEEE formatted final report, and confident defense of design tradeoffs.",
      l3: "Publishable IEEE/Springer manuscript prepared; articulate defense handling challenging external viva queries.",
    },
  },
  {
    code: "PO11",
    title: "Project Management and Finance",
    blooms: "L3_Apply",
    desc: "Demonstrate knowledge and understanding of the engineering and management principles and apply these to manage projects.",
    levels: {
      l0: "No sprint schedule, cost model, or milestone tracking; major deadlines missed.",
      l1: "Basic Gantt chart created at project start with reactive sprint adjustments.",
      l2: "Rigorous Agile sprint cadence, velocity tracking, cloud budget forecasting, and risk contingency plans.",
      l3: "Professional commercialization roadmap with return-on-investment (ROI) analysis and burn-rate modeling.",
    },
  },
  {
    code: "PO12",
    title: "Life-long Learning",
    blooms: "L2_Understand",
    desc: "Recognize the need for, and have the preparation and ability to engage in independent and life-long learning.",
    levels: {
      l0: "Refuses to adapt when chosen frameworks become obsolete or face library deprecations.",
      l1: "Learns required API documentation when instructed directly by the faculty guide.",
      l2: "Independently masters unfamiliar modern frameworks, cloud SDKs, or hardware protocols.",
      l3: "Synthesizes bleeding-edge preprints (arXiv/NeurIPS) and contributes upstream patches to open-source repos.",
    },
  },
];

// All 17 UN Sustainable Development Goals
const allUnSdgs = [
  { num: 1, name: "No Poverty", color: "bg-red-600" },
  { num: 2, name: "Zero Hunger", color: "bg-amber-600" },
  { num: 3, name: "Good Health and Well-Being", color: "bg-emerald-600" },
  { num: 4, name: "Quality Education", color: "bg-rose-700" },
  { num: 5, name: "Gender Equality", color: "bg-orange-600" },
  { num: 6, name: "Clean Water and Sanitation", color: "bg-cyan-600" },
  { num: 7, name: "Affordable and Clean Energy", color: "bg-yellow-500" },
  { num: 8, name: "Decent Work and Economic Growth", color: "bg-red-800" },
  { num: 9, name: "Industry, Innovation and Infrastructure", color: "bg-orange-500" },
  { num: 10, name: "Reduced Inequalities", color: "bg-pink-600" },
  { num: 11, name: "Sustainable Cities and Communities", color: "bg-amber-500" },
  { num: 12, name: "Responsible Consumption and Production", color: "bg-yellow-600" },
  { num: 13, name: "Climate Action", color: "bg-emerald-700" },
  { num: 14, name: "Life Below Water", color: "bg-blue-600" },
  { num: 15, name: "Life on Land", color: "bg-lime-600" },
  { num: 16, name: "Peace, Justice and Strong Institutions", color: "bg-blue-800" },
  { num: 17, name: "Partnerships for the Goals", color: "bg-indigo-900" },
];

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({ initialTab = "tenants" }) => {
  const router = useRouter();
  const {
    tenants,
    pilotRequests,
    auditLogs,
    onboardTenant,
    provisionTenantAdmin,
    updateTenant,
    approvePilot,
    addAuditLog,
  } = useProjectHubStore();

  const [activeTab, setActiveTab] = useState<"tenants" | "subscriptions" | "health" | "audit">(initialTab || "tenants");

  // Tab 1: Tenants Filter & Search States
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantPlanFilter, setTenantPlanFilter] = useState<"All" | "Enterprise" | "Standard" | "Pilot">("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [managingCollege, setManagingCollege] = useState<TenantCollege | null>(null);
  const [tenantSaved, setTenantSaved] = useState(false);

  // Form states for onboarding new college
  const [newCollegeName, setNewCollegeName] = useState("");
  const [newCollegeCode, setNewCollegeCode] = useState("");
  const [newCollegeDomain, setNewCollegeDomain] = useState("");
  const [newCollegePrincipalName, setNewCollegePrincipalName] = useState("");
  const [newCollegeUniversity, setNewCollegeUniversity] = useState<"RGPV" | "Autonomous / Custom">("RGPV");
  const [newCollegePrincipalEmail, setNewCollegePrincipalEmail] = useState("");
  const [isPrincipalEmailCustomized, setIsPrincipalEmailCustomized] = useState(false);
  const [newCollegePlan, setNewCollegePlan] = useState<"Pilot" | "Standard" | "Enterprise">("Standard");
  const [newCollegeQuota, setNewCollegeQuota] = useState("50");
  const [newCollegeStudents, setNewCollegeStudents] = useState("1500");
  const [onboardSuccessBanner, setOnboardSuccessBanner] = useState<{ name: string; email: string } | null>(null);
  const [isProvisioningAdmin, setIsProvisioningAdmin] = useState(false);

  const sanitizeDomain = (raw: string) => {
    return raw
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .replace(/@/g, "")
      .replace(/\/.*$/, "");
  };

  // Tab 3: Subscriptions States
  const [reviewingPilot, setReviewingPilot] = useState<PilotRequest | null>(null);
  const [extendingCollege, setExtendingCollege] = useState<TenantCollege | null>(null);
  const [newExtendedPlan, setNewExtendedPlan] = useState<"Enterprise" | "Standard" | "Pilot">("Enterprise");
  const [extensionDays, setExtensionDays] = useState("365");

  // Tab 5: Audit Log States
  const [auditSearch, setAuditSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("All");
  const [auditStatusFilter, setAuditStatusFilter] = useState("All");

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const switchTab = (tab: "tenants" | "subscriptions" | "health" | "audit") => {
    setActiveTab(tab);
    if (tab === "tenants") router.push("/admin");
    else if (tab === "subscriptions") router.push("/admin/subscriptions");
    else if (tab === "health") router.push("/admin/health");
    else if (tab === "audit") router.push("/admin/audit");
  };

  // Handlers
  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollegeName || !newCollegeCode || !newCollegeDomain) return;

    const cleanCode = newCollegeCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    const cleanDomain = sanitizeDomain(newCollegeDomain);
    const principalEmail = newCollegePrincipalEmail.trim() || `principal@${cleanDomain}`;
    const principalName = newCollegePrincipalName.trim() || "College Principal";

    const res = await onboardTenant({
      name: newCollegeName.trim(),
      code: cleanCode,
      domain: cleanDomain,
      plan: newCollegePlan,
      status: "Active",
      students: parseInt(newCollegeStudents) || 1500,
      departments: 4,
      storageQuotaGb: parseInt(newCollegeQuota) || 50,
      storageUsedGb: 0.1,
      strictSsoEnforced: true,
      renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      allocatedSeats: parseInt(newCollegeStudents) || 2000,
      principalEmail,
      principalName,
      affiliatingUniversity: newCollegeUniversity,
      adminEmails: [principalEmail],
    });

    const finalAdminEmail = res?.adminEmail || principalEmail;

    showToast(
      `Tenant provisioned! Initial Principal login: ${finalAdminEmail} (activation OTP sent to institutional inbox; use Forgot Password OTP on /login to set password).`,
      "success"
    );

    setOnboardSuccessBanner({
      name: newCollegeName,
      email: finalAdminEmail,
    });

    setShowAddModal(false);
    setNewCollegeName("");
    setNewCollegeCode("");
    setNewCollegeDomain("");
    setNewCollegePrincipalName("");
    setNewCollegeUniversity("RGPV");
    setNewCollegePrincipalEmail("");
    setIsPrincipalEmailCustomized(false);
  };

  const handleSaveTenantConfig = () => {
    if (!managingCollege) return;
    updateTenant(managingCollege.id, {
      plan: managingCollege.plan,
      status: managingCollege.status,
      storageQuotaGb: managingCollege.storageQuotaGb,
      strictSsoEnforced: managingCollege.strictSsoEnforced,
    });
    setTenantSaved(true);
    setTimeout(() => {
      setTenantSaved(false);
      setManagingCollege(null);
    }, 1000);
  };

  const handleApprovePilotSubmit = (reqId: string) => {
    approvePilot(reqId);
    setReviewingPilot(null);
  };

  const handleExtendPlanSubmit = () => {
    if (!extendingCollege) return;
    const currentRenewal = new Date(extendingCollege.renewalDate || Date.now());
    const newDate = new Date(currentRenewal.getTime() + parseInt(extensionDays) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    updateTenant(extendingCollege.id, {
      plan: newExtendedPlan,
      renewalDate: newDate,
    });
    setExtendingCollege(null);
  };

  const handleExportAuditCsv = () => {
    const headers = ["Timestamp", "Actor", "Action", "Target Tenant", "IP / Region", "Status", "Details"];
    const rows = auditLogs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.actor}"`,
      `"${l.action}"`,
      `"${l.targetTenant}"`,
      `"${l.ipRegion}"`,
      `"${l.status}"`,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `collabex_platform_audit_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered lists
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
      t.code.toLowerCase().includes(tenantSearch.toLowerCase()) ||
      t.domain.toLowerCase().includes(tenantSearch.toLowerCase());
    const matchesPlan = tenantPlanFilter === "All" || t.plan === tenantPlanFilter;
    return matchesSearch && matchesPlan;
  });

  const filteredAuditLogs = auditLogs.filter((l) => {
    const matchesSearch =
      l.actor.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.targetTenant.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
      l.ipRegion.toLowerCase().includes(auditSearch.toLowerCase());
    const matchesAction = auditActionFilter === "All" || l.action === auditActionFilter;
    const matchesStatus = auditStatusFilter === "All" || l.status === auditStatusFilter;
    return matchesSearch && matchesAction && matchesStatus;
  });

  const tabLabels: Record<string, string> = {
    tenants: "Tenants",
    subscriptions: "Subscriptions",
    health: "Health & Telemetry",
    audit: "Audit Logs",
  };

  const breadcrumbs: Record<string, string> = {
    tenants: "Tenants & Partitions",
    subscriptions: "Active Billing & Pilot Requests",
    health: "PostgreSQL & Worker Telemetry",
    audit: "Platform Governance & Audit Log",
  };

  useDashboardHeader({
    title: "Super Admin Console",
    breadcrumb: breadcrumbs[activeTab] || "Platform & Tenant Governance",
  });

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* TAB 1: TENANTS & PARTITIONS                                               */}
      {/* ========================================================================= */}
      {activeTab === "tenants" && (
        <div className="space-y-6">
          {/* Prominent Onboarded Tenant Confirmation Banner */}
          {onboardSuccessBanner && (
            <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950 flex items-start justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-emerald-950 text-sm">
                    Tenant partition provisioned for {onboardSuccessBanner.name}!
                  </div>
                  <p className="text-emerald-800 leading-relaxed">
                    Initial Principal login: <strong className="font-mono text-emerald-950 px-1.5 py-0.5 rounded bg-emerald-100 border border-emerald-300">{onboardSuccessBanner.email}</strong> (use <strong>Forgot Password OTP</strong> on <code className="font-mono text-[11px] bg-emerald-100 px-1 py-0.5 rounded text-emerald-900">/login</code> to set password).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOnboardSuccessBanner(null)}
                className="text-xs text-emerald-700 hover:text-emerald-950 font-semibold px-2 py-1 rounded hover:bg-emerald-100 transition-colors cursor-pointer shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Top Telemetry KPI Bar with Unified Crisp Icon Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-slate-500">Active College Tenants</span>
                  <div className="text-xl font-bold text-slate-900 tabular-nums font-mono">{tenants.length}</div>
                  <span className="text-[10px] text-emerald-600 font-medium">+2 this quarter</span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5" strokeWidth={1.75} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-slate-500">Enrolled Students</span>
                  <div className="text-xl font-bold text-slate-900 tabular-nums font-mono">
                    {tenants.reduce((acc, c) => acc + c.students, 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500">Across all partitioned DBs</span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Activity className="h-5 w-5" strokeWidth={1.75} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-slate-500">Pending Pilot Requests</span>
                  <div className="text-xl font-bold text-amber-700 tabular-nums font-mono">{pilotRequests.length}</div>
                  <span className="text-[10px] text-amber-600 font-medium">Requires approval</span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5" strokeWidth={1.75} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-slate-500">Platform Health</span>
                  <div className="text-xl font-bold text-emerald-700 flex items-center gap-1.5 font-mono">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>99.98%</span>
                  </div>
                  <span className="text-[10px] text-slate-500">PostgreSQL 17 • Redis 7</span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Zap className="h-5 w-5" strokeWidth={1.75} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colleges & Tenants Section with Search & License Filter Bar */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <CardTitle>College Tenants</CardTitle>
                <CardDescription>
                  Each institutional tenant maintains strict database isolation via verified CollegeId.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="primary"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setShowAddModal(true)}
              >
                Onboard New College
              </Button>
            </CardHeader>

            {/* Filter and Search Bar */}
            <div className="p-4 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  placeholder="Search tenants by name, code, domain..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-brand-primary"
                />
              </div>

              {/* License Tier Filter Pills */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-200/60 rounded-lg text-xs">
                {(["All", "Enterprise", "Standard", "Pilot"] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setTenantPlanFilter(tier)}
                    className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-all cursor-pointer ${
                      tenantPlanFilter === tier
                        ? "bg-white text-slate-900 shadow-2xs font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tier}
                    {tier === "All" && ` (${tenants.length})`}
                  </button>
                ))}
              </div>
            </div>

            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">College Name</th>
                    <th className="py-3 px-4">Tenant Code</th>
                    <th className="py-3 px-4">SSO Domain</th>
                    <th className="py-3 px-4">License Plan</th>
                    <th className="py-3 px-4">Active Intake</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-900">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No college tenants matched your query or filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((col) => (
                      <tr key={col.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-brand-primary-tint text-brand-primary border border-brand-primary-border flex items-center justify-center font-bold text-xs font-mono">
                            {col.code.charAt(0)}
                          </div>
                          <div className="truncate max-w-[220px]">
                            <div className="truncate">{col.name}</div>
                            {col.affiliatingUniversity && (
                              <div className="text-[10px] text-slate-400 font-normal font-sans">
                                {col.affiliatingUniversity}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-slate-600">{col.code}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">@{col.domain}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              col.plan === "Enterprise"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : col.plan === "Pilot"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-slate-100 text-slate-800 border-slate-200"
                            }`}
                          >
                            {col.plan}
                          </span>
                        </td>
                        <td className="py-3 px-4 tabular-nums">
                          {col.students.toLocaleString()} students • {col.departments} branches
                        </td>
                        <td className="py-3 px-4">
                          {col.status === "Active" ? (
                            <Badge variant="success" size="sm" dot>
                              Operational
                            </Badge>
                          ) : (
                            <Badge variant="danger" size="sm" dot>
                              Suspended
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setManagingCollege(col);
                              setTenantSaved(false);
                            }}
                            className="text-xs font-semibold text-brand-primary hover:text-brand-primary-hover hover:underline cursor-pointer"
                          >
                            Manage Tenant
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}


      {/* ========================================================================= */}
      {/* TAB 3: SUBSCRIPTIONS & PILOT PROVISIONING                                  */}
      {/* ========================================================================= */}
      {activeTab === "subscriptions" && (
        <div className="space-y-6">
          
          {/* Incoming Pilot Requests Queue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <CardTitle>Incoming Pilot Requests Queue</CardTitle>
                <CardDescription>
                  Institutional pilot requests awaiting Super Admin license provisioning.
                </CardDescription>
              </div>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                {pilotRequests.length} Pending
              </span>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {pilotRequests.length > 0 ? (
                pilotRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{req.collegeName}</span>
                        <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-300 font-semibold">
                          {req.code}
                        </span>
                        <span className="text-[10px] text-slate-400">• {req.requestedAt}</span>
                      </div>
                      <div className="text-xs text-slate-600">
                        Dean: <span className="font-semibold text-slate-800">{req.deanName}</span> (<span className="font-mono">{req.deanEmail}</span>) • Intake: <span className="font-bold text-slate-800">{req.intake}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleApprovePilotSubmit(req.id)}
                        leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                      >
                        Approve 90-Day Pilot
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setReviewingPilot(req)}
                      >
                        Review Details
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No Pending Pilot Requests"
                  description="All incoming university pilot applications have been provisioned or resolved."
                />
              )}
            </CardContent>
          </Card>

          {/* Active Subscriptions & Seat Utilization Table */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle>Active Subscriptions &amp; Seat Utilization</CardTitle>
              <CardDescription>
                Live monitoring of onboarded university license contracts, seat quotas, and renewals.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">College Tenant</th>
                    <th className="py-3 px-4">License Tier</th>
                    <th className="py-3 px-4">Seat Utilization</th>
                    <th className="py-3 px-4">Contract Renewal Date</th>
                    <th className="py-3 px-4">SLA Level</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-900">
                  {tenants.map((col) => {
                    const allocated = col.allocatedSeats || 2500;
                    const used = col.students;
                    const pct = Math.min(100, Math.round((used / allocated) * 100));

                    return (
                      <tr key={col.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {col.name} ({col.code})
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              col.plan === "Enterprise"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : col.plan === "Pilot"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-slate-100 text-slate-800 border-slate-200"
                            }`}
                          >
                            {col.plan}
                          </span>
                        </td>
                        <td className="py-3 px-4 w-52">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between font-mono text-[11px] tabular-nums">
                              <span>
                                {used.toLocaleString()} / {allocated.toLocaleString()}
                              </span>
                              <span className="text-slate-500">{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  pct > 85 ? "bg-amber-600" : "bg-brand-primary"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {col.renewalDate || "2027-06-30"}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                          {col.plan === "Enterprise" ? "99.98% SLA" : "99.5% Standard"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setExtendingCollege(col);
                              setNewExtendedPlan(col.plan);
                            }}
                            className="text-xs font-semibold text-brand-primary hover:text-brand-primary-hover hover:underline cursor-pointer"
                          >
                            Change Plan / Extend
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* SLA Table */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle>License Plan Entitlements &amp; SLAs</CardTitle>
              <CardDescription>
                Tier-by-tier features unlocked across Pilot, Standard, and Enterprise.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Tier Plan</th>
                    <th className="py-2.5 px-4">Student Intake Limit</th>
                    <th className="py-2.5 px-4">NBA Audit Export</th>
                    <th className="py-2.5 px-4">SSO Domain Sync</th>
                    <th className="py-2.5 px-4 text-right">SLA Guarantee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-amber-700">Pilot (90 Days)</td>
                    <td className="py-2.5 px-4 font-mono">Up to 1,000</td>
                    <td className="py-2.5 px-4">Standard PDF/CSV</td>
                    <td className="py-2.5 px-4 text-amber-700 font-medium">Domain match only</td>
                    <td className="py-2.5 px-4 text-right font-mono">99.5%</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-slate-700">Standard Annual</td>
                    <td className="py-2.5 px-4 font-mono">Up to 2,500</td>
                    <td className="py-2.5 px-4">Full SAR Criterion 2 &amp; 3</td>
                    <td className="py-2.5 px-4 text-emerald-700 font-medium">Google &amp; Azure AD</td>
                    <td className="py-2.5 px-4 text-right font-mono">99.9%</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-emerald-700">Enterprise Multi-Campus</td>
                    <td className="py-2.5 px-4 font-mono">Unlimited</td>
                    <td className="py-2.5 px-4">Digital Signatures + ZIP Packager</td>
                    <td className="py-2.5 px-4 text-emerald-700 font-medium">Automated SCIM Directory</td>
                    <td className="py-2.5 px-4 text-right font-mono">99.98%</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PLATFORM HEALTH & WORKER QUEUE                                     */}
      {/* ========================================================================= */}
      {activeTab === "health" && (
        <div className="space-y-6">
          {/* Unified Height 4-Card Telemetry Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 block">PostgreSQL 17 Isolation</span>
              <div className="text-base font-bold text-slate-900 flex items-center gap-1.5 truncate">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="truncate">RLS Isolation: Active</span>
              </div>
              <p className="text-[10px] text-slate-500">0 cross-tenant leaks detected</p>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 block">Redis 7 State Broker</span>
              <div className="text-base font-bold text-slate-900 flex items-center gap-1.5 truncate">
                <Zap className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="truncate">Cluster Healthy</span>
              </div>
              <p className="text-[10px] text-slate-500">2.1ms average cache latency</p>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 block">Edge API Gateway</span>
              <div className="text-base font-bold text-slate-900 flex items-center gap-1.5 truncate">
                <Server className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="truncate">18ms Latency</span>
              </div>
              <p className="text-[10px] text-slate-500">AWS ap-south-1 (Mumbai)</p>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 block">Global Platform Uptime</span>
              <div className="text-base font-bold text-emerald-700 font-mono truncate">
                99.98% SLA
              </div>
              <p className="text-[10px] text-emerald-700">Zero downtime past 90 days</p>
            </Card>
          </div>

          {/* Database Partition Telemetry & Quotas */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle>Database Partition Telemetry &amp; Quotas</CardTitle>
              <CardDescription>
                PostgreSQL schema partitions assigned to each verified CollegeId.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Tenant Partition</th>
                    <th className="py-2.5 px-4">Schema Identifier</th>
                    <th className="py-2.5 px-4">Allocated Storage</th>
                    <th className="py-2.5 px-4">Active Connections</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-900">
                  {tenants.map((col) => {
                    const total = col.storageQuotaGb || 50;
                    const used = col.storageUsedGb || (col.code === "SISTEC" ? 14.8 : col.code === "BMSCE" ? 31.4 : 4.2);
                    const pct = Math.round((used / total) * 100);

                    return (
                      <tr key={col.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{col.name}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-semibold text-brand-primary bg-brand-primary-tint px-2 py-0.5 rounded border border-brand-primary-border">
                            tenant_{col.code.toLowerCase()}_prod
                          </span>
                        </td>
                        <td className="py-3 px-4 w-48">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-900">
                              <span>{used} GB / {total} GB</span>
                              <span className="text-[10px] text-slate-500">{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-primary rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-900">
                          {col.code === "BMSCE" ? 42 : col.code === "SISTEC" ? 18 : 8}{" "}
                          <span className="text-slate-500 font-sans text-[11px]">conn</span>
                        </td>
                        <td className="py-3 px-4 text-right font-sans">
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Isolated &amp; Healthy
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Background Workers & NBA Dossier Queue Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle>Background Workers &amp; NBA Dossier Queue</CardTitle>
                  <CardDescription>
                    Hangfire scheduler &amp; Redis worker queue processing async report generation and cryptographic ZIP compilation.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>8 / 8 Workers Active</span>
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Metric Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    NBA ZIP Exports Today
                  </span>
                  <div className="text-lg font-bold font-mono text-slate-900">14</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    Failed Jobs
                  </span>
                  <div className="text-lg font-bold font-mono text-emerald-700">0</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    Avg Dossier Build Time
                  </span>
                  <div className="text-lg font-bold font-mono text-slate-900">3.4s</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    Redis Cache Hit Ratio
                  </span>
                  <div className="text-lg font-bold font-mono text-emerald-700">98.4%</div>
                </div>
              </div>

              {/* Recent Automated Queue Table */}
              <div className="rounded-xl border border-slate-200 overflow-x-auto">
                <div className="p-2.5 bg-slate-50 text-[11px] font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                  Recent Async Worker Jobs
                </div>
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-3">Job ID</th>
                      <th className="py-2 px-3">Job Type</th>
                      <th className="py-2 px-3">Target Tenant</th>
                      <th className="py-2 px-3">Execution Time</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 font-mono text-[11px]">job-zip-2041</td>
                      <td className="py-2 px-3 font-medium">NBA Criterion 2 &amp; 3 ZIP Packager</td>
                      <td className="py-2 px-3 font-mono">SISTEC (Dept CSE)</td>
                      <td className="py-2 px-3 font-mono tabular-nums">3.2s</td>
                      <td className="py-2 px-3 text-right">
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          COMPLETED
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 font-mono text-[11px]">job-rls-scan-09</td>
                      <td className="py-2 px-3 font-medium">Nightly RLS Partition Leak Scan</td>
                      <td className="py-2 px-3 font-mono">Global Cluster</td>
                      <td className="py-2 px-3 font-mono tabular-nums">1.4s</td>
                      <td className="py-2 px-3 text-right">
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          COMPLETED
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 font-mono text-[11px]">job-log-enforce-88</td>
                      <td className="py-2 px-3 font-medium">Friday Logbook Deadline Sweeper</td>
                      <td className="py-2 px-3 font-mono">BMSCE</td>
                      <td className="py-2 px-3 font-mono tabular-nums">0.8s</td>
                      <td className="py-2 px-3 text-right">
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          COMPLETED
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: AUDIT LOGS (IMMUTABLE GOVERNANCE TRAIL)                             */}
      {/* ========================================================================= */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <CardTitle>Platform Governance &amp; Audit Log</CardTitle>
                <CardDescription>
                  Immutable cryptographic audit trail recording tenant lifecycle, license operations, and security events.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Download className="h-3.5 w-3.5" />}
                onClick={handleExportAuditCsv}
              >
                Export Audit CSV
              </Button>
            </CardHeader>

            {/* Filter Bar */}
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search by actor, action, tenant, details..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:border-brand-primary"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 cursor-pointer focus:outline-hidden"
                >
                  <option value="All">All Actions</option>
                  <option value="TENANT_PROVISIONED">TENANT_PROVISIONED</option>
                  <option value="PILOT_APPROVED">PILOT_APPROVED</option>
                  <option value="TENANT_CONFIG_UPDATED">TENANT_CONFIG_UPDATED</option>
                  <option value="LICENSE_UPGRADE">LICENSE_UPGRADE</option>
                  <option value="SSO_VERIFIED">SSO_VERIFIED</option>
                  <option value="DB_SNAPSHOT_CREATED">DB_SNAPSHOT_CREATED</option>
                </select>

                <select
                  value={auditStatusFilter}
                  onChange={(e) => setAuditStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 cursor-pointer focus:outline-hidden"
                >
                  <option value="All">All Statuses</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>
            </div>

            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Timestamp (UTC)</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target Tenant</th>
                    <th className="py-3 px-4">IP / Region</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-900 font-sans">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No audit log entries matched your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] font-medium text-slate-800 truncate max-w-[180px]">
                          {log.actor}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 truncate max-w-[180px]">
                          {log.targetTenant}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {log.ipRegion}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 font-bold font-mono text-[10px] px-1.5 py-0.2 rounded border ${
                              log.status === "SUCCESS"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-red-50 text-red-800 border-red-200"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                log.status === "SUCCESS" ? "bg-emerald-600" : "bg-red-600"
                              }`}
                            />
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px] max-w-[280px] truncate" title={log.details}>
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS & DRAWERS                                                          */}
      {/* ========================================================================= */}

      {/* 1. Onboard College Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Onboard New Engineering College Tenant"
        description="Provision a new isolated database partition with custom SSO domain and NBA configuration."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleOnboardSubmit}>
              Provision Tenant Partition
            </Button>
          </div>
        }
      >
        <form onSubmit={handleOnboardSubmit} className="space-y-3.5">
          <Input
            label="College Official Name"
            placeholder="e.g. National Institute of Technology Karnataka"
            value={newCollegeName}
            onChange={(e) => setNewCollegeName(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Institutional Code"
              placeholder="e.g. NITK"
              value={newCollegeCode}
              onChange={(e) => setNewCollegeCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
              helperText="Auto-uppercased unique identifier for database RLS partitioning."
              required
            />
            <Input
              label="SSO Email Domain"
              placeholder="e.g. nitk.edu.in"
              value={newCollegeDomain}
              onChange={(e) => {
                const domain = sanitizeDomain(e.target.value);
                setNewCollegeDomain(domain);
                if (!isPrincipalEmailCustomized) {
                  setNewCollegePrincipalEmail(domain ? `principal@${domain}` : "");
                }
              }}
              helperText="Institutional email domain. Automatically strips http://, www., and @."
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Principal / Dean Full Name"
              placeholder="e.g. Dr. Keshvendra Choudhary"
              value={newCollegePrincipalName}
              onChange={(e) => setNewCollegePrincipalName(e.target.value)}
              helperText="Academic head provisioned with initial CollegeAdmin governance role."
              required
            />
            <Select
              label="Affiliating University Catalog"
              value={newCollegeUniversity}
              onChange={(e) =>
                setNewCollegeUniversity(e.target.value as "RGPV" | "Autonomous / Custom")
              }
              options={[
                { label: "RGPV (Rajiv Gandhi Proudyogiki Vishwavidyalaya) — State Technical Syllabus", value: "RGPV" },
                { label: "Autonomous / Custom University Catalog — Flexible AICTE CBCS Scheme", value: "Autonomous / Custom" },
              ]}
              helperText="Links institutional project tracks, CBCS evaluation rubrics, and syllabus offerings."
            />
          </div>
          <Input
            label="Principal / Admin Login Email"
            placeholder="e.g. principal@nitk.edu.in"
            value={newCollegePrincipalEmail}
            onChange={(e) => {
              setNewCollegePrincipalEmail(e.target.value);
              setIsPrincipalEmailCustomized(true);
            }}
            helperText="Auto-fills from SSO domain. An activation link is automatically dispatched to this institutional inbox upon provisioning."
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Subscription License Plan"
              value={newCollegePlan}
              onChange={(e) =>
                setNewCollegePlan(e.target.value as "Pilot" | "Standard" | "Enterprise")
              }
              options={[
                { label: "Standard (Annual Academic)", value: "Standard" },
                { label: "Enterprise (Multi-Campus & SCIM)", value: "Enterprise" },
                { label: "Pilot (90-Day Evaluation)", value: "Pilot" },
              ]}
            />
            <Select
              label="Storage Partition Quota"
              value={newCollegeQuota}
              onChange={(e) => setNewCollegeQuota(e.target.value)}
              options={[
                { label: "25 GB Storage Quota", value: "25" },
                { label: "50 GB Storage Quota", value: "50" },
                { label: "100 GB Storage Quota", value: "100" },
                { label: "250 GB Storage Quota", value: "250" },
              ]}
            />
          </div>
          <Input
            label="Initial Student Enrollment Capacity"
            type="number"
            value={newCollegeStudents}
            onChange={(e) => setNewCollegeStudents(e.target.value)}
            placeholder="1500"
          />
        </form>
      </Modal>

      {/* 2. Manage Tenant Slide-Over Drawer */}
      <SlideOverDrawer
        isOpen={!!managingCollege}
        onClose={() => setManagingCollege(null)}
        title={managingCollege?.name}
        subtitle={`Tenant Partition Code: ${managingCollege?.code}`}
        badge={
          managingCollege && (
            <Badge
              variant={managingCollege.status === "Active" ? "success" : "danger"}
              size="sm"
              dot
            >
              {managingCollege.status}
            </Badge>
          )
        }
        footer={
          managingCollege && (
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" size="sm" onClick={() => setManagingCollege(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveTenantConfig}
              >
                {tenantSaved ? "Configuration Saved!" : "Save Partition Config"}
              </Button>
            </div>
          )
        }
      >
        {managingCollege && (
          <div className="space-y-5 text-xs">
            {tenantSaved && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Tenant partition configuration updated &amp; audit log recorded.</span>
              </div>
            )}

            {/* College Administrator (Principal) Credentials */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-900 block text-xs">College Administrator (Principal)</span>
                  <span className="text-[11px] text-slate-500">Governance credentials for institutional onboarding</span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isProvisioningAdmin}
                  onClick={async () => {
                    setIsProvisioningAdmin(true);
                    try {
                      const email = await provisionTenantAdmin(managingCollege.id);
                      setManagingCollege({
                        ...managingCollege,
                        principalEmail: email,
                        adminEmails: managingCollege.adminEmails?.includes(email)
                          ? managingCollege.adminEmails
                          : [email, ...(managingCollege.adminEmails || [])],
                      });
                      showToast(
                        `Principal account provisioned! Login: ${email} (use Forgot Password OTP on /login to set password).`,
                        "success"
                      );
                    } catch (err) {
                      console.error("Failed to provision admin:", err);
                      showToast("Failed to provision principal account.", "error");
                    } finally {
                      setIsProvisioningAdmin(false);
                    }
                  }}
                  className="text-xs shrink-0"
                >
                  {isProvisioningAdmin ? "Provisioning..." : "Create / Reset Principal Account"}
                </Button>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs flex items-center justify-between">
                <span className="text-slate-800 font-medium truncate max-w-[220px]">
                  {managingCollege.principalEmail || managingCollege.adminEmails?.[0] || `principal@${managingCollege.domain}`}
                </span>
                <Badge variant="success" size="sm" dot>
                  Active CollegeAdmin
                </Badge>
              </div>

              {managingCollege.adminEmails && managingCollege.adminEmails.length > 1 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Additional Campus Admins:</span>
                  <div className="flex flex-wrap gap-1">
                    {managingCollege.adminEmails.slice(1).map((em) => (
                      <span key={em} className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                        {em}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* DB Partition Health */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 block">Database Partition Health</span>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Schema:</span>
                  <span className="font-bold text-slate-900">tenant_{managingCollege.code.toLowerCase()}_prod</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Affiliating Catalog:</span>
                  <span className="font-bold text-slate-900">{managingCollege.affiliatingUniversity || "RGPV"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Storage Quota:</span>
                  <span className="text-slate-900">{managingCollege.storageQuotaGb || 50} GB Partition</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">RLS Status:</span>
                  <span className="text-emerald-700 font-bold">Enforced (CollegeId)</span>
                </div>
              </div>
            </div>

            {/* Storage Quota Selector */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 block">Allocated Storage Quota</span>
              <Select
                label="Storage Allocation"
                value={(managingCollege.storageQuotaGb || 50).toString()}
                onChange={(e) =>
                  setManagingCollege({
                    ...managingCollege,
                    storageQuotaGb: parseInt(e.target.value) || 50,
                  })
                }
                options={[
                  { label: "25 GB Schema Quota", value: "25" },
                  { label: "50 GB Schema Quota", value: "50" },
                  { label: "100 GB Schema Quota", value: "100" },
                  { label: "250 GB Schema Quota", value: "250" },
                ]}
              />
            </div>

            {/* Subscription Tier Selector */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 block">Subscription &amp; License Plan</span>
              <Select
                label="License Tier"
                value={managingCollege.plan}
                onChange={(e) =>
                  setManagingCollege({
                    ...managingCollege,
                    plan: e.target.value as "Pilot" | "Standard" | "Enterprise",
                  })
                }
                options={[
                  { label: "Pilot License (90-Day Evaluation)", value: "Pilot" },
                  { label: "Standard License (Annual Academic)", value: "Standard" },
                  { label: "Enterprise (Multi-Campus & NBA Assurance)", value: "Enterprise" },
                ]}
              />
            </div>

            {/* Strict SSO Enforcement */}
            <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Strict SSO Enforcement</span>
                <span className="text-[11px] text-slate-500">Require Google/Microsoft institutional email login</span>
              </div>
              <input
                type="checkbox"
                checked={managingCollege.strictSsoEnforced ?? true}
                onChange={(e) =>
                  setManagingCollege({
                    ...managingCollege,
                    strictSsoEnforced: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded text-brand-primary focus:ring-brand-primary accent-brand-primary cursor-pointer"
              />
            </div>

            {/* Lifecycle Status Toggle */}
            <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Tenant Status</span>
                <span className="text-[11px] text-slate-500">
                  {managingCollege.status === "Active" ? "Operational partition" : "Suspended (Read-Only)"}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setManagingCollege({
                    ...managingCollege,
                    status: managingCollege.status === "Active" ? "Suspended" : "Active",
                  })
                }
                className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer border ${
                  managingCollege.status === "Active"
                    ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                {managingCollege.status === "Active" ? "Suspend Tenant" : "Reactivate Tenant"}
              </button>
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {/* 3. Review Pilot Request Modal */}
      <Modal
        isOpen={!!reviewingPilot}
        onClose={() => setReviewingPilot(null)}
        title="Institutional Pilot Application"
        description="Review engineering university details and accreditations before provisioning tenant DB."
        maxWidth="lg"
      >
        {reviewingPilot && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Institution Name:</span>
                <span className="font-bold text-slate-900">{reviewingPilot.collegeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Code:</span>
                <span className="font-mono font-bold text-brand-primary">{reviewingPilot.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">AISHE / AICTE Code:</span>
                <span className="font-mono font-bold text-slate-900">{reviewingPilot.aisheCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dean / Principal:</span>
                <span className="text-slate-900 font-semibold">{reviewingPilot.deanName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Official Campus Email:</span>
                <span className="font-mono text-slate-900">{reviewingPilot.deanEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Student Intake:</span>
                <span className="font-bold text-slate-900">{reviewingPilot.intake}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Requested Academic Cycle:</span>
                <span className="font-mono text-slate-900">{reviewingPilot.requestedCycle}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] leading-relaxed">
              Approval triggers automatic PostgreSQL 17 tenant partition generation, creates an isolated schema, and logs the event to the platform audit log.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button size="sm" variant="ghost" onClick={() => setReviewingPilot(null)}>
                Decline Request
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleApprovePilotSubmit(reviewingPilot.id)}
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              >
                Approve 90-Day Pilot
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 4. Change Plan / Extend Subscription Modal */}
      <Modal
        isOpen={!!extendingCollege}
        onClose={() => setExtendingCollege(null)}
        title={`Subscription Management — ${extendingCollege?.name}`}
        description="Upgrade license tier or extend annual contract duration."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setExtendingCollege(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleExtendPlanSubmit}>
              Confirm Contract Update
            </Button>
          </div>
        }
      >
        {extendingCollege && (
          <div className="space-y-3.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span>Current Plan:</span>
                <span className="font-bold text-slate-900">{extendingCollege.plan}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Renewal Date:</span>
                <span className="font-mono font-bold text-slate-900">{extendingCollege.renewalDate || "2027-06-30"}</span>
              </div>
              <div className="flex justify-between">
                <span>Enrolled Students:</span>
                <span className="font-mono text-slate-900">{extendingCollege.students.toLocaleString()} seats</span>
              </div>
            </div>

            <Select
              label="Target Subscription Plan"
              value={newExtendedPlan}
              onChange={(e) =>
                setNewExtendedPlan(e.target.value as "Enterprise" | "Standard" | "Pilot")
              }
              options={[
                { label: "Enterprise (Multi-Campus Unlimited & SCIM)", value: "Enterprise" },
                { label: "Standard (Annual Academic - 2,500 Seats)", value: "Standard" },
                { label: "Pilot (90-Day Trial)", value: "Pilot" },
              ]}
            />

            <Select
              label="Contract Extension Period"
              value={extensionDays}
              onChange={(e) => setExtensionDays(e.target.value)}
              options={[
                { label: "+1 Year (365 Days Extension)", value: "365" },
                { label: "+6 Months (180 Days Extension)", value: "180" },
                { label: "+90 Days Pilot Extension", value: "90" },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
