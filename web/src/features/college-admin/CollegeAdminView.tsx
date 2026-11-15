"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users2,
  Building2,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Award,
  Sliders,
  Settings,
  GraduationCap,
  Save,
  ArrowRight,
  FileCheck2,
} from "lucide-react";
import { AppShell } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { SlideOverDrawer } from "@/design-system/components/SlideOverDrawer";
import { Input } from "@/design-system/components/Input";
import { Select } from "@/design-system/components/Select";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { Department } from "@/mocks/store-types";

export interface CollegeAdminViewProps {
  initialTab?: "overview" | "departments" | "settings" | "compliance";
}

export const CollegeAdminView: React.FC<CollegeAdminViewProps> = ({ initialTab = "overview" }) => {
  const router = useRouter();
  const { college, departments, addDepartment, onboardCollege } = useProjectHubStore();

  const [activeTab, setActiveTab] = useState<"overview" | "departments" | "settings" | "compliance">(initialTab);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [inspectingDept, setInspectingDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [hodName, setHodName] = useState("");

  const [ssoDomain, setSsoDomain] = useState(college.domain);
  const [collegeDisplayName, setCollegeDisplayName] = useState(college.name);
  const [collegeLogoUrl, setCollegeLogoUrl] = useState(college.logoUrl || "https://sistec.ac.in/assets/logo.png");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const switchTab = (tab: "overview" | "departments" | "settings" | "compliance") => {
    setActiveTab(tab);
    if (tab === "overview") router.push("/college");
    else if (tab === "departments") router.push("/college/departments");
    else if (tab === "settings") router.push("/college/settings");
    else if (tab === "compliance") router.push("/college/compliance");
  };

  const handleCreateDepartment = () => {
    if (!deptName || !deptCode) return;
    addDepartment(deptName, deptCode);
    setShowAddDrawer(false);
    setDeptName("");
    setDeptCode("");
  };

  const handleSaveSettings = () => {
    onboardCollege({
      name: collegeDisplayName,
      domain: ssoDomain,
      logoUrl: collegeLogoUrl,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const tabLabels: Record<string, string> = {
    overview: "Overview",
    departments: "Departments & HODs",
    settings: "Campus Settings",
    compliance: "Accreditation",
  };

  return (
    <AppShell
      pageTitle="College Executive Console"
      breadcrumb="Institutional Governance"
      activeTab={tabLabels[activeTab] || "Overview"}
    >
      {/* 4 Navigation Sub-Tabs */}
      <div className="flex border-b border-[#E2E8F0] gap-4 text-xs font-semibold select-none overflow-x-auto">
        <button
          type="button"
          onClick={() => switchTab("overview")}
          className={`pb-2.5 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "overview"
              ? "border-b-2 border-[#4F46E5] text-[#4F46E5]"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          1. Executive Overview
        </button>
        <button
          type="button"
          onClick={() => switchTab("departments")}
          className={`pb-2.5 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "departments"
              ? "border-b-2 border-[#4F46E5] text-[#4F46E5]"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          2. Departments &amp; HODs ({departments.length})
        </button>
        <button
          type="button"
          onClick={() => switchTab("settings")}
          className={`pb-2.5 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "settings"
              ? "border-b-2 border-[#4F46E5] text-[#4F46E5]"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          3. Campus Settings &amp; SSO
        </button>
        <button
          type="button"
          onClick={() => switchTab("compliance")}
          className={`pb-2.5 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "compliance"
              ? "border-b-2 border-[#4F46E5] text-[#4F46E5]"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          4. Institutional Accreditation (SAR)
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EXECUTIVE OVERVIEW                                                 */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* 4 Cross-Branch KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-[#64748B]">Total Enrolled Intake</span>
                  <div className="text-xl font-bold text-[#0F172A] tabular-nums">
                    {departments.reduce((acc, d) => acc + d.studentCount, 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-[#64748B]">Across 4 engineering branches</span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Users2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-[#64748B]">Academic Departments</span>
                  <div className="text-xl font-bold text-[#0F172A] tabular-nums">{departments.length}</div>
                  <span className="text-[10px] text-emerald-600 font-medium">All HODs Appointed</span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Building2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-[#64748B]">Guide Utilization</span>
                  <div className="text-xl font-bold text-[#0F172A] tabular-nums">89.2%</div>
                  <span className="text-[10px] text-emerald-600 font-medium">Balanced Workload</span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-[#64748B]">NBA Readiness Score</span>
                  <div className="text-xl font-bold text-emerald-600 flex items-center gap-1.5 tabular-nums">
                    <Award className="h-5 w-5" />
                    <span>91.4%</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-medium">Criterion 2 &amp; 3 Ready</span>
                </div>
                <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Department Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Departmental Performance Summary</CardTitle>
                <CardDescription>
                  Real-time synchronization across campus branch partitions and appointed leadership.
                </CardDescription>
              </div>
              <Button size="sm" variant="secondary" onClick={() => switchTab("departments")}>
                View All Departments &rarr;
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Branch Code</th>
                    <th className="py-2.5 px-4 font-semibold">Department Name</th>
                    <th className="py-2.5 px-4 font-semibold">Appointed HOD</th>
                    <th className="py-2.5 px-4 font-semibold">Intake</th>
                    <th className="py-2.5 px-4 font-semibold">Mentors</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Criterion 3 Attainment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                  {departments.map((dept) => (
                    <tr
                      key={dept.id}
                      onClick={() => setInspectingDept(dept)}
                      className="hover:bg-[#F8FAFC] cursor-pointer"
                    >
                      <td className="py-2.5 px-4 font-mono font-bold text-[#4F46E5]">{dept.code}</td>
                      <td className="py-2.5 px-4 font-semibold">{dept.name}</td>
                      <td className="py-2.5 px-4 text-[#475569]">
                        {dept.code === "CSE" ? "Dr. Ravindra Kumar Sharma" : "Appointed HOD"}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums">{dept.studentCount} students</td>
                      <td className="py-2.5 px-4 font-mono tabular-nums">{dept.facultyCount} faculty</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600 tabular-nums">
                        {dept.code === "CSE" ? "82.6%" : "78.4%"}
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
      {/* TAB 2: DEPARTMENTS & HODS                                                 */}
      {/* ========================================================================= */}
      {activeTab === "departments" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">Academic Branches &amp; Appointed HODs</h2>
              <p className="text-xs text-[#64748B]">
                Configure departmental intakes and appoint leadership for project cycle sign-offs.
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setShowAddDrawer(true)}
            >
              Add Department
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {departments.map((dept) => (
              <Card
                key={dept.id}
                onClick={() => setInspectingDept(dept)}
                className="hover:border-[#4F46E5] hover:shadow-xs transition-all cursor-pointer group"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs bg-[#EEF2FF] text-[#4F46E5] px-2 py-0.5 rounded border border-indigo-100">
                      {dept.code}
                    </span>
                    <Badge variant="success" size="sm" dot>
                      Accredited
                    </Badge>
                  </div>
                  <CardTitle className="pt-2 text-sm truncate group-hover:text-[#4F46E5] transition-colors">
                    {dept.name}
                  </CardTitle>
                  <CardDescription>
                    {dept.code === "CSE" ? "Dr. Ravindra Kumar Sharma (HOD)" : "HOD Appointed"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-2.5 text-xs text-[#475569]">
                  <div className="flex justify-between border-b border-[#E2E8F0] pb-1.5">
                    <span>Student Enrollment:</span>
                    <span className="font-semibold text-[#0F172A] tabular-nums">
                      {dept.studentCount} students
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#E2E8F0] pb-1.5">
                    <span>Faculty Mentors:</span>
                    <span className="font-semibold text-[#0F172A] tabular-nums">
                      {dept.facultyCount} mentors
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-0.5">
                    <span>NBA Criterion 3:</span>
                    <span className="font-semibold text-emerald-600 font-mono tabular-nums">
                      {dept.code === "CSE" ? "82.6% (Met)" : "78.4% (Met)"}
                    </span>
                  </div>
                  <div className="pt-1 text-[11px] text-[#4F46E5] font-semibold flex items-center justify-end">
                    Inspect Branch &rarr;
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CAMPUS SETTINGS & SSO                                              */}
      {/* ========================================================================= */}
      {activeTab === "settings" && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Institutional Identity &amp; Branding</CardTitle>
              <CardDescription>
                Customizes college logos, student portal headings, and generated NBA dossiers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <Input
                label="College Name"
                value={collegeDisplayName}
                onChange={(e) => setCollegeDisplayName(e.target.value)}
              />
              <Input label="Institutional Code" value={college.code} disabled readOnly />
              <Input
                label="College Logo URL"
                value={collegeLogoUrl}
                onChange={(e) => setCollegeLogoUrl(e.target.value)}
                helperText="Rendered on student certificates and NBA Criterion 2 & 3 signed dossiers"
              />
              <Button
                size="sm"
                variant="primary"
                onClick={handleSaveSettings}
                leftIcon={<Save className="h-3.5 w-3.5" />}
              >
                {isSaved ? "Saved Successfully!" : "Save Branding Changes"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SSO Authentication &amp; Domain Isolation</CardTitle>
              <CardDescription>
                Restricts user sign-in strictly to verified institutional Google/Microsoft accounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <Input
                label="Mandatory Institutional Email Domain"
                value={ssoDomain}
                onChange={(e) => setSsoDomain(e.target.value)}
                helperText="Only emails matching @sistec.ac.in are allowed into this tenant"
              />

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Zero Public Signup Enforced</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Guest registration and cross-college accounts are rejected by the API. Users must be
                  pre-enrolled via CSV import or campus directory sync.
                </p>
              </div>

              <div className="flex items-center justify-between text-xs p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <span className="font-medium text-[#0F172A]">Microsoft 365 / Azure AD Sync</span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  Configured
                </span>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: INSTITUTIONAL ACCREDITATION & NBA COMPLIANCE                        */}
      {/* ========================================================================= */}
      {activeTab === "compliance" && (
        <section className="space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">Institutional Accreditation &amp; NBA Readiness</h2>
            <p className="text-xs text-[#64748B]">
              Automated compliance synthesis monitoring NBA Criterion 2 (Student Support &amp; Progression) and Criterion 3 (Course Outcomes).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F172A]">SAR Tier-1 Status</span>
                <Badge variant="success" size="sm" dot>Accredited</Badge>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-bold font-mono text-[#0F172A] tabular-nums">91.4% Overall</div>
                <p className="text-[11px] text-[#64748B]">All 4 engineering branches satisfy the mandatory 80/20 CO-PO threshold.</p>
              </div>
              <div className="pt-2 border-t border-[#E2E8F0] text-[11px] text-[#475569] flex justify-between">
                <span>Next Audit Cycle:</span>
                <span className="font-semibold text-[#0F172A]">November 2026</span>
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F172A]">Signed Criterion 2 &amp; 3 Dossiers</span>
                <Badge variant="info" size="sm">4 Branches</Badge>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-bold font-mono text-emerald-600 tabular-nums">100% Signed</div>
                <p className="text-[11px] text-[#64748B]">All HOD final rubric sheets and 3 Best/Avg/Weak project packages archived.</p>
              </div>
              <div className="pt-2 border-t border-[#E2E8F0] text-[11px] text-[#4F46E5] font-semibold cursor-pointer hover:underline flex justify-end">
                Download College SAR Summary &rarr;
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0F172A]">Multi-Tenant Isolation Audit</span>
                <Badge variant="success" size="sm" dot>Passed</Badge>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-bold font-mono text-[#0F172A] tabular-nums">0 Leaks Detected</div>
                <p className="text-[11px] text-[#64748B]">PostgreSQL 17 row-level tenant security enforces strict CollegeId partition boundary.</p>
              </div>
              <div className="pt-2 border-t border-[#E2E8F0] text-[11px] text-[#64748B] flex justify-between">
                <span>Tenant Hash:</span>
                <span className="font-mono text-[#475569]">0xSISTEC_2026</span>
              </div>
            </Card>
          </div>
        </section>
      )}

      {/* Add Department Slide-Over Drawer */}
      <SlideOverDrawer
        isOpen={showAddDrawer}
        onClose={() => setShowAddDrawer(false)}
        title="Add Academic Department"
        subtitle="Create an academic branch and designate HOD leadership"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setShowAddDrawer(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateDepartment}>
              Create Department
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Department Name"
            placeholder="e.g. Artificial Intelligence & Data Science"
            value={deptName}
            onChange={(e) => setDeptName(e.target.value)}
          />
          <Input
            label="Department Code"
            placeholder="e.g. AIDS or IT"
            value={deptCode}
            onChange={(e) => setDeptCode(e.target.value)}
          />
          <Input
            label="Appoint Initial HOD (Email)"
            placeholder="e.g. hod.aids@sistec.ac.in"
            value={hodName}
            onChange={(e) => setHodName(e.target.value)}
          />
          <Select
            label="Default Project Cycles Offered"
            options={[
              { label: "Minor (Sem 6) + Major (Sem 8)", value: "both" },
              { label: "Major Project Only (Sem 8)", value: "major" },
            ]}
          />
        </div>
      </SlideOverDrawer>

      {/* Inspect Department Slide-Over Drawer */}
      <SlideOverDrawer
        isOpen={!!inspectingDept}
        onClose={() => setInspectingDept(null)}
        title={inspectingDept ? `${inspectingDept.name} (${inspectingDept.code})` : "Department Details"}
        subtitle="Branch-level NBA Criterion 3 attainment, student intake & faculty mentoring load"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-[#64748B] font-mono">Academic Branch Record</span>
            <Button size="sm" variant="secondary" onClick={() => setInspectingDept(null)}>
              Close Inspection
            </Button>
          </div>
        }
      >
        {inspectingDept && (
          <div className="space-y-5 text-xs">
            {/* HOD Leadership Card */}
            <div className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] space-y-2">
              <span className="font-bold text-[#0F172A] block">Appointed Department Leadership</span>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-xs text-[#0F172A]">
                    {inspectingDept.code === "CSE" ? "Dr. Ravindra Kumar Sharma" : "Prof. Department Head"}
                  </div>
                  <div className="text-[11px] text-[#64748B]">Head of Department (HOD)</div>
                </div>
                <Badge variant="role" role="HOD" size="sm" dot>
                  Authorized
                </Badge>
              </div>
            </div>

            {/* Department Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-[#E2E8F0] bg-white space-y-0.5">
                <span className="text-[11px] text-[#64748B]">Enrolled Intake</span>
                <div className="text-lg font-bold font-mono text-[#0F172A] tabular-nums">
                  {inspectingDept.studentCount}
                </div>
                <span className="text-[10px] text-emerald-600">Active in Minor Sem 6</span>
              </div>

              <div className="p-3 rounded-lg border border-[#E2E8F0] bg-white space-y-0.5">
                <span className="text-[11px] text-[#64748B]">Faculty Mentors</span>
                <div className="text-lg font-bold font-mono text-[#0F172A] tabular-nums">
                  {inspectingDept.facultyCount}
                </div>
                <span className="text-[10px] text-[#64748B]">Avg 4 teams / guide</span>
              </div>
            </div>

            {/* NBA Criterion 3 Attainment */}
            <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-800">NBA Criterion 3 Attainment</span>
                <Badge variant="success" size="sm">
                  {inspectingDept.code === "CSE" ? "82.6%" : "78.4%"}
                </Badge>
              </div>
              <p className="text-[11px] text-[#475569] leading-relaxed">
                Calculated directly from guide continuous assessments and viva evaluation scores. Target threshold (&ge; 70%) is met across all course outcomes.
              </p>
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </AppShell>
  );
};
