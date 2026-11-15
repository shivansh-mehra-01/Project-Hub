"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { AppShell } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Modal } from "@/design-system/components/Modal";
import { Input } from "@/design-system/components/Input";
import { Select } from "@/design-system/components/Select";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";

export const SuperAdminView: React.FC = () => {
  const { college, onboardCollege } = useProjectHubStore();

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
  const [newCollegeName, setNewCollegeName] = useState("");
  const [newCollegeCode, setNewCollegeCode] = useState("");
  const [newCollegeDomain, setNewCollegeDomain] = useState("");
  const [newCollegePlan, setNewCollegePlan] = useState<"Pilot" | "Standard" | "Enterprise">("Pilot");

  const handleAddCollege = () => {
    if (!newCollegeName || !newCollegeCode || !newCollegeDomain) return;

    const newCol = {
      id: `col-${Date.now()}`,
      name: newCollegeName,
      code: newCollegeCode.toUpperCase(),
      domain: newCollegeDomain.toLowerCase(),
      plan: newCollegePlan,
      status: "Active",
      students: 500,
      departments: 3,
    };

    setCollegesList([newCol, ...collegesList]);
    onboardCollege({
      name: newCollegeName,
      code: newCollegeCode.toUpperCase(),
      domain: newCollegeDomain.toLowerCase(),
    });

    setShowAddModal(false);
    setNewCollegeName("");
    setNewCollegeCode("");
    setNewCollegeDomain("");
  };

  const handleApprovePilot = (reqId: string) => {
    const req = pilotRequests.find((r) => r.id === reqId);
    if (!req) return;

    setCollegesList([
      {
        id: `col-${Date.now()}`,
        name: req.collegeName,
        code: req.code,
        domain: req.deanEmail.split("@")[1] || "college.ac.in",
        plan: "Pilot",
        status: "Active",
        students: 600,
        departments: 3,
      },
      ...collegesList,
    ]);

    setPilotRequests(pilotRequests.filter((r) => r.id !== reqId));
  };

  return (
    <AppShell pageTitle="Super Admin Console" breadcrumb="Platform & Tenant Governance">
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
                    <div className="h-7 w-7 rounded-md bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center font-bold text-xs">
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
                      className="text-xs font-semibold text-[#4F46E5] hover:underline cursor-pointer"
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

      {/* Pilot Queue Section */}
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
                  <Button size="sm" variant="secondary">
                    Review Details
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-[#64748B]">
              All pilot requests have been reviewed and provisioned.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Global Master Templates (NBA Criterion 2 & 3 & UN SDGs) */}
      <section id="templates" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>NBA Criterion 2 &amp; 3 Master Rubric Presets</CardTitle>
            <CardDescription>
              Standardized PO/PSO outcome matrices provisioned to all college tenants.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {[
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
            ].map((p, i) => (
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
    </AppShell>
  );
};

