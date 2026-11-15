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
} from "lucide-react";
import { AppShell } from "@/design-system/patterns/AppShell";
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

export interface SuperAdminViewProps {
  initialTab?: "tenants" | "templates" | "subscriptions" | "health";
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({ initialTab = "tenants" }) => {
  const router = useRouter();
  const { college, onboardCollege } = useProjectHubStore();

  const [activeTab, setActiveTab] = useState<"tenants" | "templates" | "subscriptions" | "health">(initialTab);

  const [collegesList, setCollegesList] = useState([
    {
      id: "col-sistec-01",
      name: "Sagar Institute of Science & Technology (SISTec)",
      code: "SISTEC",
      domain: "sistec.ac.in",
      plan: "Enterprise",
      status: "Active",
      students: 1420,
      departments: 4,
    },
    {
      id: "col-bmsce-02",
      name: "B.M.S. College of Engineering",
      code: "BMSCE",
      domain: "bmsce.ac.in",
      plan: "Pilot",
      status: "Active",
      students: 2100,
      departments: 6,
    },
    {
      id: "col-rvce-03",
      name: "R.V. College of Engineering",
      code: "RVCE",
      domain: "rvce.edu.in",
      plan: "Enterprise",
      status: "Active",
      students: 2800,
      departments: 8,
    },
  ]);

  const [pilotRequests, setPilotRequests] = useState([
    {
      id: "req-01",
      collegeName: "Dayananda Sagar College of Engineering",
      code: "DSCE",
      deanEmail: "dean.academics@dsce.edu.in",
      requestedAt: "2 hours ago",
      intake: "1,800 students",
    },
    {
      id: "req-02",
      collegeName: "MIT Academy of Engineering, Pune",
      code: "MITAOE",
      deanEmail: "principal@mitaoe.ac.in",
      requestedAt: "Yesterday",
      intake: "1,200 students",
    },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [managingCollege, setManagingCollege] = useState<(typeof collegesList)[0] | null>(null);
  const [reviewingPilot, setReviewingPilot] = useState<(typeof pilotRequests)[0] | null>(null);
  const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
  const [tenantSaved, setTenantSaved] = useState(false);

  // Custom template state
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [newTemplateCode, setNewTemplateCode] = useState("PO3");
  const [newTemplateDesc, setNewTemplateDesc] = useState("");

  const [rubricPresets, setRubricPresets] = useState([
    {
      title: "Engineering Problem Analysis (PO2)",
      desc: "Literature review depth, research formulation, IEEE paper benchmarking.",
    },
    {
      title: "Design/Development of Solutions (PO3)",
      desc: "Architecture diagrams, component modularity, hardware/cloud interface schemas.",
    },
    {
      title: "Modern Tool Usage (PO5)",
      desc: "Version control (Git), automated CI testing, profiling, cloud runtime.",
    },
    {
      title: "Individual and Team Work (PO9)",
      desc: "Peer ratings, weekly task accountability, task completion percentage.",
    },
  ]);

  // Form states for adding college
  const [newCollegeName, setNewCollegeName] = useState("");
  const [newCollegeCode, setNewCollegeCode] = useState("");
  const [newCollegeDomain, setNewCollegeDomain] = useState("");
  const [newCollegePlan, setNewCollegePlan] = useState<"Pilot" | "Standard" | "Enterprise">("Pilot");

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const switchTab = (tab: "tenants" | "templates" | "subscriptions" | "health") => {
    setActiveTab(tab);
    if (tab === "tenants") router.push("/admin");
    else if (tab === "templates") router.push("/admin/templates");
    else if (tab === "subscriptions") router.push("/admin/subscriptions");
    else if (tab === "health") router.push("/admin/health");
  };

  const handleAddCollege = () => {
    if (!newCollegeName || !newCollegeCode || !newCollegeDomain) return;
    const newCollege = {
      id: `col-${Date.now()}`,
      name: newCollegeName,
      code: newCollegeCode.toUpperCase(),
      domain: newCollegeDomain,
      plan: newCollegePlan,
      status: "Active",
      students: 800,
      departments: 3,
    };
    setCollegesList([newCollege, ...collegesList]);
    setShowAddModal(false);
    setNewCollegeName("");
    setNewCollegeCode("");
    setNewCollegeDomain("");
  };

  const handleApprovePilot = (reqId: string) => {
    const req = pilotRequests.find((r) => r.id === reqId);
    if (!req) return;
    const provisionedCollege = {
      id: `col-pilot-${Date.now()}`,
      name: req.collegeName,
      code: req.code,
      domain: req.deanEmail.split("@")[1] || "college.ac.in",
      plan: "Pilot" as const,
      status: "Active",
      students: parseInt(req.intake.replace(/[^0-9]/g, "")) || 1000,
      departments: 4,
    };
    setCollegesList([provisionedCollege, ...collegesList]);
    setPilotRequests(pilotRequests.filter((r) => r.id !== reqId));
    setReviewingPilot(null);
  };

  const handleAddTemplate = () => {
    if (!newTemplateTitle || !newTemplateDesc) return;
    setRubricPresets([
      ...rubricPresets,
      {
        title: `${newTemplateTitle} (${newTemplateCode})`,
        desc: newTemplateDesc,
      },
    ]);
    setShowAddTemplateModal(false);
    setNewTemplateTitle("");
    setNewTemplateDesc("");
  };

  const tabLabels: Record<string, string> = {
    tenants: "Tenants",
    templates: "Master Templates",
    subscriptions: "Subscriptions",
    health: "Health & Telemetry",
  };

  const getTenantTelemetry = (code: string) => {
    switch (code.toUpperCase()) {
      case "SISTEC":
        return { usedGb: "14.8", totalGb: "50.0", pct: 29.6, connections: 18 };
      case "BMSCE":
        return { usedGb: "31.4", totalGb: "50.0", pct: 62.8, connections: 42 };
      case "RVCE":
        return { usedGb: "4.2", totalGb: "25.0", pct: 16.8, connections: 6 };
      default:
        return { usedGb: "5.1", totalGb: "25.0", pct: 20.4, connections: 12 };
    }
  };

  return (
    <AppShell
      pageTitle="Super Admin Console"
      breadcrumb="Platform & Tenant Governance"
      activeTab={tabLabels[activeTab] || "Tenants"}
    >

      {/* ========================================================================= */}
      {/* TAB 1: TENANTS & PARTITIONS                                               */}
      {/* ========================================================================= */}
      {activeTab === "tenants" && (
        <div className="space-y-6">
          {/* Top Telemetry KPI Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-[#64748B]">Active College Tenants</span>
                  <div className="text-xl font-bold text-[#0F172A] tabular-nums">{collegesList.length}</div>
                  <span className="text-[10px] text-emerald-600 font-medium">+2 this month</span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Building2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-[#64748B]">Enrolled Students</span>
                  <div className="text-xl font-bold text-[#0F172A] tabular-nums">
                    {collegesList.reduce((acc, c) => acc + c.students, 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-[#64748B]">Across all partitioned DBs</span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Activity className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-[#64748B]">Pending Pilot Requests</span>
                  <div className="text-xl font-bold text-amber-700 tabular-nums">{pilotRequests.length}</div>
                  <span className="text-[10px] text-amber-600 font-medium">Requires approval</span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-[#64748B]">Platform Health</span>
                  <div className="text-xl font-bold text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>99.98%</span>
                  </div>
                  <span className="text-[10px] text-[#64748B]">PostgreSQL 17 • Redis 7</span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Zap className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colleges & Tenants Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
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
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-medium">
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
                <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                  {collegesList.map((col) => (
                    <tr key={col.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 font-semibold flex items-center gap-2">
                        <div className="h-7 w-7 rounded-md bg-brand-primary-tint text-brand-primary border border-brand-primary-border flex items-center justify-center font-bold text-xs font-mono">
                          {col.code.charAt(0)}
                        </div>
                        <span>{col.name}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-[#475569]">{col.code}</td>
                      <td className="py-3 px-4 font-mono text-[#64748B]">@{col.domain}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                            col.plan === "Enterprise"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {col.plan}
                        </span>
                      </td>
                      <td className="py-3 px-4 tabular-nums">
                        {col.students.toLocaleString()} students • {col.departments} branches
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="success" size="sm" dot>
                          Operational
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setManagingCollege(col);
                            setTenantSaved(false);
                          }}
                          className="text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
                        >
                          Manage Tenant
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MASTER TEMPLATES (NBA & SDGS)                                      */}
      {/* ========================================================================= */}
      {activeTab === "templates" && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>NBA Criterion 2 &amp; 3 Master Rubric Presets</CardTitle>
                <CardDescription>
                  Standardized PO/PSO outcome matrices provisioned to all college tenants.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setShowAddTemplateModal(true)}
              >
                Add Preset
              </Button>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {rubricPresets.map((p, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border border-[#E2E8F0] bg-white flex items-start justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-[#0F172A]">{p.title}</div>
                    <div className="text-[11px] text-[#475569]">{p.desc}</div>
                  </div>
                  <Badge variant="neutral" size="sm">
                    Global
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>UN Sustainable Development Goals (SDG) Catalog</CardTitle>
              <CardDescription>
                Mandatory UN SDG mapping framework attached to academic project proposals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { num: 3, name: "Good Health and Well-Being" },
                { num: 7, name: "Affordable and Clean Energy" },
                { num: 9, name: "Industry, Innovation and Infrastructure" },
                { num: 11, name: "Sustainable Cities and Communities" },
                { num: 13, name: "Climate Action" },
              ].map((sdg) => (
                <div
                  key={sdg.num}
                  className="flex items-center justify-between p-2 rounded-md bg-[#F8FAFC] border border-[#E2E8F0]"
                >
                  <Badge variant="sdg" sdgNumber={sdg.num}>
                    {sdg.name}
                  </Badge>
                  <span className="text-[10px] text-[#64748B] font-mono">Template ID: SDG-{sdg.num}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SUBSCRIPTIONS & PILOTS                                             */}
      {/* ========================================================================= */}
      {activeTab === "subscriptions" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Incoming Pilot Requests Queue</CardTitle>
              <CardDescription>
                Institutional pilot requests awaiting Super Admin license provisioning.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pilotRequests.length > 0 ? (
                pilotRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#0F172A]">{req.collegeName}</span>
                        <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-[#CBD5E1]">
                          {req.code}
                        </span>
                        <span className="text-[10px] text-[#94A3B8]">• {req.requestedAt}</span>
                      </div>
                      <div className="text-xs text-[#475569]">
                        Dean Contact: <span className="font-mono text-[#0F172A]">{req.deanEmail}</span> •
                        Target Capacity: {req.intake}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleApprovePilot(req.id)}
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

          {/* Subscription Tiers Table */}
          <Card>
            <CardHeader>
              <CardTitle>License Plan Entitlements &amp; SLAs</CardTitle>
              <CardDescription>
                Features unlocked across Pilot, Standard, and Enterprise tiers.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Tier Plan</th>
                    <th className="py-2.5 px-4 font-semibold">Student Intake Limit</th>
                    <th className="py-2.5 px-4 font-semibold">NBA Audit Export</th>
                    <th className="py-2.5 px-4 font-semibold">SSO Domain Sync</th>
                    <th className="py-2.5 px-4 text-right font-semibold">SLA Guarantee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                  <tr className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-4 font-bold text-blue-700">Pilot (90 Days)</td>
                    <td className="py-2.5 px-4 font-mono">Up to 1,000</td>
                    <td className="py-2.5 px-4">Standard PDF/CSV</td>
                    <td className="py-2.5 px-4 text-amber-700 font-medium">Domain match only</td>
                    <td className="py-2.5 px-4 text-right font-mono">99.5%</td>
                  </tr>
                  <tr className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-4 font-bold text-emerald-700">Standard Annual</td>
                    <td className="py-2.5 px-4 font-mono">Up to 2,500</td>
                    <td className="py-2.5 px-4">Full SAR Criterion 2 &amp; 3</td>
                    <td className="py-2.5 px-4 text-emerald-700 font-medium">Google &amp; Azure AD</td>
                    <td className="py-2.5 px-4 text-right font-mono">99.9%</td>
                  </tr>
                  <tr className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-4 font-bold text-purple-700">Enterprise Multi-Campus</td>
                    <td className="py-2.5 px-4 font-mono">Unlimited</td>
                    <td className="py-2.5 px-4">Digital Signatures + ZIP Packager</td>
                    <td className="py-2.5 px-4 text-purple-700 font-medium">Automated SCIM Directory</td>
                    <td className="py-2.5 px-4 text-right font-mono">99.98%</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PLATFORM HEALTH & TELEMETRY                                        */}
      {/* ========================================================================= */}
      {activeTab === "health" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 space-y-1">
              <span className="text-[11px] text-[#64748B]">PostgreSQL 17 Isolation</span>
              <div className="text-lg font-bold text-[#0F172A] flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Row-Level Security Active</span>
              </div>
              <p className="text-[10px] text-[#64748B]">0 cross-tenant leaks detected</p>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-[11px] text-[#64748B]">Redis 7 State Broker</span>
              <div className="text-lg font-bold text-[#0F172A] flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-blue-600" />
                <span>Cluster Healthy</span>
              </div>
              <p className="text-[10px] text-[#64748B]">2.1ms average cache latency</p>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-[11px] text-[#64748B]">Edge API Gateway</span>
              <div className="text-lg font-bold text-[#0F172A] flex items-center gap-1.5">
                <Server className="h-4 w-4 text-purple-600" />
                <span>18ms Latency</span>
              </div>
              <p className="text-[10px] text-[#64748B]">AWS ap-south-1 (Mumbai)</p>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-[11px] text-[#64748B]">Global Platform Uptime</span>
              <div className="text-lg font-bold text-emerald-600 font-mono">
                99.98% SLA
              </div>
              <p className="text-[10px] text-emerald-700">Zero downtime in past 90 days</p>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Database Partition Telemetry &amp; Quotas</CardTitle>
              <CardDescription>
                PostgreSQL schema partitions assigned to each verified CollegeId.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Tenant Partition</th>
                    <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Schema Identifier</th>
                    <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Allocated Storage</th>
                    <th className="py-2.5 px-4 font-semibold text-[11px] uppercase tracking-[0.06em]">Active Connections</th>
                    <th className="py-2.5 px-4 text-right font-semibold text-[11px] uppercase tracking-[0.06em]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                  {collegesList.map((col) => {
                    const telem = getTenantTelemetry(col.code);
                    return (
                      <tr key={col.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-4 font-sans font-semibold text-[#0F172A]">{col.name}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-semibold text-brand-primary bg-brand-primary-tint px-2 py-0.5 rounded border border-brand-primary-border">
                            tenant_{col.code.toLowerCase()}_prod
                          </span>
                        </td>
                        <td className="py-3 px-4 w-48">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-mono tabular-nums text-[#0F172A]">
                              <span>{telem.usedGb} GB / {telem.totalGb} GB</span>
                              <span className="text-[10px] text-[#64748B]">{telem.pct}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-primary rounded-full transition-all"
                                style={{ width: `${telem.pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-xs text-[#0F172A]">
                          {telem.connections} <span className="text-[#64748B] font-sans text-[11px]">conn</span>
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
        </div>
      )}

      {/* Onboard College Modal */}
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
            <Button variant="primary" size="sm" onClick={handleAddCollege}>
              Provision Tenant
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5">
          <Input
            label="College Official Name"
            placeholder="e.g. Sagar Institute of Science and Technology"
            value={newCollegeName}
            onChange={(e) => setNewCollegeName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Institutional Code"
              placeholder="e.g. SISTEC"
              value={newCollegeCode}
              onChange={(e) => setNewCollegeCode(e.target.value)}
            />
            <Input
              label="SSO Email Domain"
              placeholder="e.g. sistec.ac.in"
              value={newCollegeDomain}
              onChange={(e) => setNewCollegeDomain(e.target.value)}
            />
          </div>
          <Select
            label="Subscription License Plan"
            value={newCollegePlan}
            onChange={(e) =>
              setNewCollegePlan(e.target.value as "Pilot" | "Standard" | "Enterprise")
            }
            options={[
              { label: "Pilot (90 Days - Up to 1,000 Students)", value: "Pilot" },
              { label: "Standard (Annual - Up to 2,500 Students)", value: "Standard" },
              { label: "Enterprise (Multi-Campus Unlimited)", value: "Enterprise" },
            ]}
          />
        </div>
      </Modal>

      {/* Manage Tenant Slide-Over Drawer */}
      <SlideOverDrawer
        isOpen={!!managingCollege}
        onClose={() => setManagingCollege(null)}
        title={managingCollege?.name}
        subtitle={`Tenant Partition Code: ${managingCollege?.code}`}
        badge={
          managingCollege && (
            <Badge variant="success" size="sm" dot>
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
                onClick={() => {
                  setTenantSaved(true);
                  setTimeout(() => setManagingCollege(null), 1200);
                }}
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
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Tenant partition configuration updated successfully.</span>
              </div>
            )}

            {/* DB Partition Health */}
            <div className="space-y-2">
              <span className="font-bold text-[#0F172A] block">Database Partition Health</span>
              <div className="p-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] space-y-2 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Schema:</span>
                  <span className="font-bold text-[#0F172A]">tenant_{managingCollege.code.toLowerCase()}_prod</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Storage Quota:</span>
                  <span className="text-[#0F172A]">14.8 GB / 50.0 GB (30%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">RLS Status:</span>
                  <span className="text-emerald-700 font-bold">Enforced (CollegeId)</span>
                </div>
              </div>
            </div>

            {/* Subscription Tier Selector */}
            <div className="space-y-2">
              <span className="font-bold text-[#0F172A] block">Subscription &amp; License Plan</span>
              <Select
                label="License Tier"
                value={managingCollege.plan}
                options={[
                  { label: "Pilot License (90-Day Evaluation)", value: "Pilot" },
                  { label: "Standard License (Annual Academic)", value: "Standard" },
                  { label: "Enterprise (Multi-Campus & NBA Assurance)", value: "Enterprise" },
                ]}
              />
            </div>

            {/* Maintenance Mode Toggle */}
            <div className="p-3 rounded-lg border border-[#E2E8F0] bg-white flex items-center justify-between">
              <div>
                <span className="font-bold text-[#0F172A] block">Maintenance Mode</span>
                <span className="text-[11px] text-[#64748B]">Temporarily block student portal access for maintenance</span>
              </div>
              <input type="checkbox" className="h-4 w-4 rounded text-brand-primary focus:ring-brand-primary accent-brand-primary" />
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {/* Review Pilot Request Modal */}
      <Modal
        isOpen={!!reviewingPilot}
        onClose={() => setReviewingPilot(null)}
        title="Institutional Pilot Application"
        description="Review engineering university details and accreditations before provisioning tenant DB."
        maxWidth="lg"
      >
        {reviewingPilot && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Institution Name:</span>
                <span className="font-bold text-[#0F172A]">{reviewingPilot.collegeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Assigned Code:</span>
                <span className="font-mono font-bold text-brand-primary">{reviewingPilot.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Dean / Principal Email:</span>
                <span className="font-mono text-[#0F172A]">{reviewingPilot.deanEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Estimated Student Intake:</span>
                <span className="font-bold text-[#0F172A]">{reviewingPilot.intake}</span>
              </div>
            </div>

            <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-lg text-[#065F46] text-[11px] leading-relaxed">
              Approval triggers automatic PostgreSQL 17 tenant partition generation and dispatches an onboarding invitation to the dean&apos;s email.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
              <Button size="sm" variant="ghost" onClick={() => setReviewingPilot(null)}>
                Decline Request
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleApprovePilot(reviewingPilot.id)}
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              >
                Approve 90-Day Pilot
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Custom Template Modal */}
      <Modal
        isOpen={showAddTemplateModal}
        onClose={() => setShowAddTemplateModal(false)}
        title="Add Master NBA Rubric Preset"
        description="Creates a standardized evaluation criterion distributed to all college tenant catalogs."
        maxWidth="md"
      >
        <div className="space-y-3.5">
          <Input
            label="Criterion Name"
            placeholder="e.g. Sustainable Development Engineering"
            value={newTemplateTitle}
            onChange={(e) => setNewTemplateTitle(e.target.value)}
          />

          <Select
            label="Target Program Outcome (PO / PSO)"
            value={newTemplateCode}
            onChange={(e) => setNewTemplateCode(e.target.value)}
            options={[
              { label: "PO1: Engineering Knowledge", value: "PO1" },
              { label: "PO2: Problem Analysis", value: "PO2" },
              { label: "PO3: Design/Development of Solutions", value: "PO3" },
              { label: "PO4: Complex Investigations", value: "PO4" },
              { label: "PO5: Modern Tool Usage", value: "PO5" },
              { label: "PO7: Environment and Sustainability", value: "PO7" },
              { label: "PO9: Individual and Team Work", value: "PO9" },
              { label: "PO10: Communication", value: "PO10" },
              { label: "PSO1: Domain Core Specialization", value: "PSO1" },
              { label: "PSO2: Professional Readiness", value: "PSO2" },
            ]}
          />

          <Textarea
            label="Scoring Guideline & Description"
            placeholder="Describe what evaluators should measure to award maximum marks..."
            value={newTemplateDesc}
            onChange={(e) => setNewTemplateDesc(e.target.value)}
            rows={3}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
            <Button size="sm" variant="secondary" onClick={() => setShowAddTemplateModal(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={handleAddTemplate}>
              Publish Global Preset
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
};
