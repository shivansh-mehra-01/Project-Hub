"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { AppShell } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { SlideOverDrawer } from "@/design-system/components/SlideOverDrawer";
import { Input } from "@/design-system/components/Input";
import { Select } from "@/design-system/components/Select";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";

export const CollegeAdminView: React.FC = () => {
  const { college, departments, addDepartment, onboardCollege } = useProjectHubStore();

  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [hodName, setHodName] = useState("");

  const [ssoDomain, setSsoDomain] = useState(college.domain);
  const [collegeDisplayName, setCollegeDisplayName] = useState(college.name);
  const [collegeLogoUrl, setCollegeLogoUrl] = useState(college.logoUrl || "https://sistec.ac.in/assets/logo.png");
  const [isSaved, setIsSaved] = useState(false);

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

  return (
    <AppShell pageTitle="College Executive Console" breadcrumb="Institutional Governance">
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

      {/* Departments & Appointed HODs Grid */}
      <section id="departments" className="space-y-3">
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
            <Card key={dept.id} className="hover:border-[#CBD5E1] transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs bg-[#EEF2FF] text-[#4F46E5] px-2 py-0.5 rounded border border-indigo-100">
                    {dept.code}
                  </span>
                  <Badge variant="success" size="sm" dot>
                    Accredited
                  </Badge>
                </div>
                <CardTitle className="pt-2 text-sm truncate">{dept.name}</CardTitle>
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
                <div className="flex justify-between">
                  <span>NBA Criterion 3 Attainment:</span>
                  <span className="font-semibold text-emerald-600 font-mono tabular-nums">
                    {dept.code === "CSE" ? "82.6% (Met)" : "78.4% (Met)"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Campus Settings & SSO Security Rules */}
      <section id="settings" className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            helperText="The appointed professor gains HOD sign-off authority"
          />
        </div>
      </SlideOverDrawer>
    </AppShell>
  );
};

