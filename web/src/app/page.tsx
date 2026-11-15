"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  Building2,
  Users2,
  Sliders,
  ShieldCheck,
  FileCheck2,
  Download,
  Sparkles,
  Clock,
  Lock,
  FolderGit2,
  ChevronRight,
  Check,
  ExternalLink,
  Shield,
  Zap,
  X,
  FileArchive,
  BarChart3,
  Kanban,
  Search,
} from "lucide-react";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Modal } from "@/design-system/components/Modal";
import { Input } from "@/design-system/components/Input";
import { Select } from "@/design-system/components/Select";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { RoleType } from "@/mocks/store-types";

export default function MarketingHomePage() {
  const router = useRouter();
  const { switchPersona } = useProjectHubStore();

  const [isPilotModalOpen, setIsPilotModalOpen] = useState(false);
  const [pilotSubmitted, setPilotSubmitted] = useState(false);

  // Pilot form state
  const [pilotName, setPilotName] = useState("");
  const [pilotEmail, setPilotEmail] = useState("");
  const [pilotCollege, setPilotCollege] = useState("");
  const [pilotRole, setPilotRole] = useState("Dean / Principal");
  const [pilotIntake, setPilotIntake] = useState("1,000 - 2,500 Students");

  const handleLaunchRole = (role: RoleType) => {
    switchPersona(role);
    if (role === "SuperAdmin") router.push("/admin");
    else if (role === "CollegeAdmin") router.push("/college");
    else if (role === "HOD") router.push("/hod");
    else if (role === "Faculty") router.push("/faculty");
    else if (role === "TeamLead") router.push("/student");
    else router.push("/student/explore");
  };

  const handlePilotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPilotSubmitted(true);
    setTimeout(() => {
      setPilotSubmitted(false);
      setIsPilotModalOpen(false);
      setPilotName("");
      setPilotEmail("");
      setPilotCollege("");
    }, 2800);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] selection:bg-[#ECFDF5] selection:text-[#065F46]">
      {/* ========================================================================= */}
      {/* 1. TOP CHARCOAL NAVBAR (#111827, 64px)                                     */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 h-16 bg-[#111827] border-b border-[#1F2937] text-white">
        <div className="max-w-[1240px] h-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Left Brand Mark */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-lg bg-[#047857] flex items-center justify-center text-white font-bold text-xs shadow-xs font-heading group-hover:bg-[#065F46] transition-colors">
              PH
            </div>
            <span className="font-heading font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              <span>Project Hub</span>
            </span>
          </Link>

          {/* Center Smooth-Scroll Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-[#9CA3AF]">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#nba" className="hover:text-white transition-colors">
              NBA Compliance
            </a>
            <a href="#workflows" className="hover:text-white transition-colors">
              Workflows
            </a>
            <a href="#portals" className="hover:text-white transition-colors">
              Role Portals
            </a>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-lg border border-white/20 hover:border-white/50 text-white bg-transparent hover:bg-white/10 text-xs font-semibold transition-colors"
            >
              Sign In
            </Link>
            <button
              type="button"
              onClick={() => setIsPilotModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-[#047857] hover:bg-[#065F46] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Request College Pilot
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. 2-COLUMN HERO SECTION                                                  */}
      {/* ========================================================================= */}
      <section className="py-12 lg:py-20 border-b border-[#E2E8F0] overflow-hidden bg-gradient-to-b from-white to-[#F8FAFC]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Copy & Actions (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Eyebrow Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-[#047857]" />
                <span>Built for NBA Criterion 2 &amp; 3</span>
              </div>

              {/* Display Headline */}
              <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-[54px] text-[#0F172A] leading-[1.08] tracking-tight">
                The Complete Workspace for College Projects &amp; NBA Compliance.
              </h1>

              {/* Subheadline */}
              <p className="text-base sm:text-lg text-[#475569] leading-relaxed max-w-xl">
                Manage Minor &amp; Major student teams, automate weekly guide reviews, and export
                audit-ready CO-PO attainment dossiers in 1 click.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsPilotModalOpen(true)}
                  className="h-11 px-6 rounded-xl bg-[#047857] hover:bg-[#065F46] text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Request College Pilot</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href="#portals"
                  className="h-11 px-5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#0F172A] font-semibold text-sm shadow-2xs transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4 text-[#047857]" />
                  <span>Explore Interactive Demo</span>
                </a>
              </div>

              {/* Trust Strip */}
              <div className="pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-medium text-[#64748B]">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#047857]" />
                  Zero Public Signup
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-[#047857]" />
                  College SSO Ready
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <FileArchive className="h-3.5 w-3.5 text-[#047857]" />
                  1-Click NBA Audit ZIP
                </span>
              </div>
            </div>

            {/* Right Column: Interactive UI Preview Card (5 cols) */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-[#CBD5E1] bg-white shadow-xl overflow-hidden flex flex-col sm:flex-row min-h-[420px]">
                {/* Mini Charcoal Sidebar */}
                <div className="w-14 bg-[#111827] border-r border-[#1F2937] p-3 flex sm:flex-col items-center justify-between sm:justify-start gap-4">
                  <div className="h-8 w-8 rounded-lg bg-[#047857] flex items-center justify-center text-white font-bold text-xs font-heading">
                    PH
                  </div>
                  <div className="flex sm:flex-col gap-3 text-[#9CA3AF]">
                    <div className="p-1.5 rounded-md bg-[#047857] text-white">
                      <FolderGit2 className="h-4 w-4" />
                    </div>
                    <div className="p-1.5 rounded-md hover:bg-[#1F2937]">
                      <Users2 className="h-4 w-4" />
                    </div>
                    <div className="p-1.5 rounded-md hover:bg-[#1F2937]">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div className="p-1.5 rounded-md hover:bg-[#1F2937]">
                      <Sliders className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="sm:mt-auto">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 block" />
                  </div>
                </div>

                {/* Main Workspace Preview Content */}
                <div className="flex-1 p-4 space-y-4 bg-[#F8FAFC]">
                  {/* Top Mock Bar */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F172A] font-heading">
                      <span>Timelines &amp; SAR</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Active Sem 6
                      </span>
                    </div>
                  </div>

                  {/* Batch Lifecycle Funnel Card */}
                  <div className="p-3 bg-white rounded-xl border border-[#E2E8F0] space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0F172A] font-heading">Batch Lifecycle Funnel</span>
                      <span className="text-[10px] font-mono text-[#64748B]">96 Students</span>
                    </div>

                    {/* Funnel Progress Bars */}
                    <div className="space-y-1.5 text-[10px]">
                      <div>
                        <div className="flex justify-between text-[#475569] mb-0.5">
                          <span>1. Proposal Submitted</span>
                          <span className="font-mono tabular-nums font-semibold">100% (24 teams)</span>
                        </div>
                        <div className="h-2 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
                          <div className="h-full bg-[#047857] rounded-full w-full" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[#475569] mb-0.5">
                          <span>2. Guide &amp; HOD Approved</span>
                          <span className="font-mono tabular-nums font-semibold">92% (22 teams)</span>
                        </div>
                        <div className="h-2 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
                          <div className="h-full bg-[#065F46] rounded-full w-[92%]" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[#475569] mb-0.5">
                          <span>3. Mid-Term Defense Completed</span>
                          <span className="font-mono tabular-nums font-semibold">88% (21 teams)</span>
                        </div>
                        <div className="h-2 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
                          <div className="h-full bg-[#047857] rounded-full w-[88%]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CO-PO Attainment Matrix Card */}
                  <div className="p-3 bg-white rounded-xl border border-[#E2E8F0] space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0F172A] font-heading">CO-PO Attainment Matrix</span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        Target Met
                      </span>
                    </div>

                    <table className="w-full text-left text-[11px]">
                      <thead className="text-[#64748B] border-b border-[#F1F5F9]">
                        <tr>
                          <th className="pb-1">Outcome</th>
                          <th className="pb-1 text-right">Score</th>
                          <th className="pb-1 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] font-mono tabular-nums">
                        <tr>
                          <td className="py-1 font-sans text-[#0F172A]">PO2: Problem Analysis</td>
                          <td className="py-1 text-right text-emerald-700 font-bold">84.2%</td>
                          <td className="py-1 text-right font-sans">
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                              ✓ Verified
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1 font-sans text-[#0F172A]">PO3: Solution Design</td>
                          <td className="py-1 text-right text-emerald-700 font-bold">81.4%</td>
                          <td className="py-1 text-right font-sans">
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                              ✓ Verified
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1 font-sans text-[#0F172A]">PO5: Modern Tools</td>
                          <td className="py-1 text-right text-emerald-700 font-bold">79.6%</td>
                          <td className="py-1 text-right font-sans">
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                              ✓ Verified
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. 3-TIER APPROVAL & EXECUTION WORKFLOW (#workflows)                      */}
      {/* ========================================================================= */}
      <section id="workflows" className="py-16 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="text-xs font-bold text-[#047857] uppercase tracking-wider">
              Autonomous Governance
            </div>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#0F172A]">
              The 3-Tier Academic Project Lifecycle
            </h2>
            <p className="text-xs sm:text-sm text-[#475569]">
              Every project proposal, continuous review, and defense mark follows a structured academic audit trail.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-4 hover:border-[#047857] transition-all">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-[#047857] flex items-center justify-center font-bold text-sm border border-emerald-100 font-heading">
                01
              </div>
              <div className="space-y-1.5">
                <h3 className="font-heading font-bold text-base text-[#0F172A]">
                  Team Formation &amp; Synopsis
                </h3>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Students form 2–4 member teams, select a Team Lead, link primary UN Sustainable Development
                  Goals (SDGs), and submit project synopses.
                </p>
              </div>
              <ul className="text-xs text-[#64748B] space-y-1.5 pt-2 border-t border-[#E2E8F0]">
                <li className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#047857]" /> Max 4 members enforced
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#047857]" /> Mandatory UN SDG mapping
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#047857]" /> Roster lock prevents churn
                </li>
              </ul>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-4 hover:border-[#047857] transition-all">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-[#047857] flex items-center justify-center font-bold text-sm border border-emerald-100 font-heading">
                02
              </div>
              <div className="space-y-1.5">
                <h3 className="font-heading font-bold text-base text-[#0F172A]">
                  3-Tier Academic Sign-Off
                </h3>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Proposals are endorsed by the designated Guide, consolidated by the Project Coordinator
                  with workload validation, and signed by Department HOD.
                </p>
              </div>
              <ul className="text-xs text-[#64748B] space-y-1.5 pt-2 border-t border-[#E2E8F0]">
                <li className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#047857]" /> Guide technical endorsement
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#047857]" /> Workload threshold verification
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#047857]" /> HOD final allotment sign-off
                </li>
              </ul>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-4 hover:border-[#047857] transition-all">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-[#047857] flex items-center justify-center font-bold text-sm border border-emerald-100 font-heading">
                03
              </div>
              <div className="space-y-1.5">
                <h3 className="font-heading font-bold text-base text-[#0F172A]">
                  Friday Logs, Viva &amp; NBA ZIP
                </h3>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Bi-weekly engineering logbooks signed by mentors, 3-faculty viva panels with conflict-of-interest
                  exclusion, and 1-click SAR dossier packaging.
                </p>
              </div>
              <ul className="text-xs text-[#64748B] space-y-1.5 pt-2 border-t border-[#E2E8F0]">
                <li className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#047857]" /> Stamped weekly logbook entries
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#047857]" /> Conflict-free viva scoring
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#047857]" /> 3 Best/Avg/Weak ZIP export
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. 6-ROLE CAMPUS PORTALS GRID (#portals)                                  */}
      {/* ========================================================================= */}
      <section id="portals" className="py-16 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="text-xs font-bold text-[#047857] uppercase tracking-wider">
              Exact 6-Role Hierarchy
            </div>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#0F172A]">
              Interactive Campus Portals &amp; Live Previews
            </h2>
            <p className="text-xs sm:text-sm text-[#475569]">
              Test any stakeholder experience instantly. Every role is completely isolated with dedicated
              authority bounds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. College Admin */}
            <Card className="hover:border-[#047857] hover:shadow-xs transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="role" role="CollegeAdmin" size="sm" dot />
                  <span className="text-[10px] text-[#64748B] font-mono">/college</span>
                </div>
                <CardTitle className="pt-2 text-base font-heading">College Admin</CardTitle>
                <CardDescription>
                  Dean / Principal / IT Head console: provision academic branches, appoint Department HODs,
                  set institutional branding, and inspect multi-tenant isolation.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full justify-between"
                  onClick={() => handleLaunchRole("CollegeAdmin")}
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                >
                  Launch College Admin View
                </Button>
              </CardContent>
            </Card>

            {/* 2. HOD */}
            <Card className="hover:border-[#047857] hover:shadow-xs transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="role" role="HOD" size="sm" dot />
                  <span className="text-[10px] text-[#64748B] font-mono">/hod</span>
                </div>
                <CardTitle className="pt-2 text-base font-heading">Department HOD</CardTitle>
                <CardDescription>
                  Department executive: toggles Project Coordinator privileges on faculty, signs off
                  allotments, approves post-lock grade adjustments, and exports signed SAR dossiers.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  size="sm"
                  variant="primary"
                  className="w-full justify-between"
                  onClick={() => handleLaunchRole("HOD")}
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                >
                  Launch HOD Workspace
                </Button>
              </CardContent>
            </Card>

            {/* 3. Project Coordinator */}
            <Card className="hover:border-[#047857] hover:shadow-xs transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Coordinator (Faculty)
                  </span>
                  <span className="text-[10px] text-[#64748B] font-mono">/coordinator</span>
                </div>
                <CardTitle className="pt-2 text-base font-heading">Project Coordinator</CardTitle>
                <CardDescription>
                  Batch operations authority: drag-and-drop CSV student onboarding, heuristic guide-orphan
                  matcher, 3-faculty viva panel scheduler with conflict detection.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full justify-between"
                  onClick={() => {
                    switchPersona("Faculty");
                    router.push("/coordinator");
                  }}
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                >
                  Launch Batch Ops View
                </Button>
              </CardContent>
            </Card>

            {/* 4. Faculty Guide & Evaluator */}
            <Card className="hover:border-[#047857] hover:shadow-xs transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="role" role="Faculty" size="sm" dot />
                  <span className="text-[10px] text-[#64748B] font-mono">/faculty</span>
                </div>
                <CardTitle className="pt-2 text-base font-heading">Faculty Guide &amp; Evaluator</CardTitle>
                <CardDescription>
                  Base instructor console: weekly Friday check-in verification, team sprint inspection drawer,
                  and live rubric viva grading panel with auto-calculated CO scores.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full justify-between"
                  onClick={() => handleLaunchRole("Faculty")}
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                >
                  Launch Faculty View
                </Button>
              </CardContent>
            </Card>

            {/* 5. Team Lead */}
            <Card className="hover:border-[#047857] hover:shadow-xs transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="role" role="TeamLead" size="sm" dot />
                  <span className="text-[10px] text-[#64748B] font-mono">/student</span>
                </div>
                <CardTitle className="pt-2 text-base font-heading">Student Team Lead</CardTitle>
                <CardDescription>
                  Contextual project lead: invite student teammates via USN, lock team roster, submit proposal
                  to Guide, and connect GitHub &amp; Jira issue tracking endpoints.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  size="sm"
                  variant="primary"
                  className="w-full justify-between"
                  onClick={() => handleLaunchRole("TeamLead")}
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                >
                  Launch Team Lead View
                </Button>
              </CardContent>
            </Card>

            {/* 6. Student */}
            <Card className="hover:border-[#047857] hover:shadow-xs transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="role" role="Student" size="sm" dot />
                  <span className="text-[10px] text-[#64748B] font-mono">/student/explore</span>
                </div>
                <CardTitle className="pt-2 text-base font-heading">Student Learner</CardTitle>
                <CardDescription>
                  4 permanent learner tabs: Kanban Sprint Workspace, Faculty Problem Bank &amp; Peer Matching,
                  verified academic portfolio with QR certificate, and profile settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full justify-between"
                  onClick={() => handleLaunchRole("Student")}
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                >
                  Launch Student View
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. NBA CRITERION 2 & 3 COMPLIANCE BANNER (#nba)                           */}
      {/* ========================================================================= */}
      <section id="nba" className="py-16 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#064E3B] to-[#047857] text-white shadow-xl space-y-8">
            <div className="space-y-3 max-w-3xl">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                Accreditation Assurance Engine
              </span>
              <h2 className="font-heading font-bold text-2xl sm:text-4xl text-white leading-tight">
                Engineered for NBA Tier-1 &amp; Tier-2 Criterion 2 &amp; 3 Compliance
              </h2>
              <p className="text-sm sm:text-base text-emerald-100 leading-relaxed">
                Eliminate manual paperwork. Project Hub automates continuous assessment logging, CO-to-PO/PSO
                direct attainment calculations, and official sample packaging.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 space-y-2">
                <div className="text-xs font-bold text-emerald-300 font-heading">
                  Criterion 2.2: Continuous Evaluation
                </div>
                <p className="text-xs text-white/90 leading-relaxed">
                  Time-stamped Friday student logbooks with guide verification signatures provide continuous
                  documented evidence of student mentoring.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 space-y-2">
                <div className="text-xs font-bold text-emerald-300 font-heading">
                  Criterion 3.3: Direct CO-PO Attainment
                </div>
                <p className="text-xs text-white/90 leading-relaxed">
                  Automatic calculation mapping 80% direct continuous rubric evaluations + 20% indirect exit surveys
                  against institutional 70% threshold targets.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 space-y-2">
                <div className="text-xs font-bold text-emerald-300 font-heading">
                  Audit Sample ZIP Packager
                </div>
                <p className="text-xs text-white/90 leading-relaxed">
                  Instant synthesis and ZIP download of 3 Best + 3 Average + 3 Weak project reports, codebases,
                  and signed evaluation rubrics.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-white/20">
              <div className="text-xs text-emerald-200">
                Applicable for autonomous universities, Tier-1 institutions, and Tier-2 affiliated colleges.
              </div>
              <button
                type="button"
                onClick={() => setIsPilotModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-white text-[#047857] hover:bg-emerald-50 text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Schedule an Institutional Consultation
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. PLATFORM FEATURES GRID (#features)                                     */}
      {/* ========================================================================= */}
      <section id="features" className="py-16 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="text-xs font-bold text-[#047857] uppercase tracking-wider">
              Enterprise Grade
            </div>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-[#0F172A]">
              Designed for Campus Security &amp; Scale
            </h2>
            <p className="text-xs sm:text-sm text-[#475569]">
              Built with modern SaaS boundaries that university deans, HODs, and IT directors trust.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="p-5 space-y-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-[#047857] flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-heading font-bold text-sm text-[#0F172A]">
                PostgreSQL Multi-Tenancy
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Complete database partition isolation per college tenant via immutable CollegeId. Zero cross-campus
                user mixing or data leakage.
              </p>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-[#047857] flex items-center justify-center">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="font-heading font-bold text-sm text-[#0F172A]">
                Institutional SSO Only
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Zero public self-signup. Users authenticate strictly through verified university Google Workspace
                or Microsoft 365 Azure AD credentials.
              </p>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-[#047857] flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="font-heading font-bold text-sm text-[#0F172A]">
                Heuristic Guide Matcher
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Automated pairing algorithm groups orphan students into balanced teams and matches project domains
                with faculty research expertise.
              </p>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-[#047857] flex items-center justify-center">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="font-heading font-bold text-sm text-[#0F172A]">
                University Marksheet Exports
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Consolidated internal evaluations formatted strictly for university examination portal uploads
                (e.g. RGPV, VTU, Anna University format).
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. MINIMAL CHARCOAL FOOTER (#111827)                                       */}
      {/* ========================================================================= */}
      <footer className="bg-[#111827] border-t border-[#1F2937] text-white py-12">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-[#1F2937]">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#047857] flex items-center justify-center text-white font-bold text-xs font-heading">
                  PH
                </div>
                <span className="font-heading font-bold text-base text-white">Project Hub</span>
              </div>
              <p className="text-xs text-[#9CA3AF] max-w-sm">
                Purpose-built B2B SaaS for engineering colleges to manage Minor &amp; Major capstone projects
                and automate NBA Criterion 2 &amp; 3 compliance.
              </p>
            </div>

            <div className="flex flex-wrap gap-6 text-xs text-[#9CA3AF]">
              <a href="#features" className="hover:text-white transition-colors">
                Features
              </a>
              <a href="#nba" className="hover:text-white transition-colors">
                NBA Criterion 2 &amp; 3
              </a>
              <a href="#workflows" className="hover:text-white transition-colors">
                Lifecycle Workflows
              </a>
              <a href="#portals" className="hover:text-white transition-colors">
                Campus Portals
              </a>
              <Link href="/login" className="hover:text-white transition-colors">
                Sign In
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6B7280]">
            <div>
              &copy; 2026 Project Hub SaaS. Multi-tenant academic project management.
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#047857]" />
              <span>Academic Minor &amp; Major Projects Only</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* PILOT REQUEST MODAL                                                       */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isPilotModalOpen}
        onClose={() => setIsPilotModalOpen(false)}
        title="Request College Pilot Evaluation (90 Days)"
        description="Provision an isolated multi-tenant partition for your engineering institution."
        maxWidth="md"
      >
        {pilotSubmitted ? (
          <div className="p-6 text-center space-y-3">
            <div className="h-12 w-12 mx-auto rounded-full bg-emerald-50 text-[#047857] flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-heading font-bold text-base text-[#0F172A]">
                Pilot Request Received!
              </h4>
              <p className="text-xs text-[#475569] leading-relaxed">
                Our academic engineering team will provision your institution&apos;s isolated PostgreSQL schema
                partition and email activation instructions to <strong>{pilotEmail}</strong> within 24 hours.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setIsPilotModalOpen(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handlePilotSubmit} className="space-y-4">
            <Input
              label="Your Full Name"
              placeholder="e.g. Dr. Rajesh Verma"
              value={pilotName}
              onChange={(e) => setPilotName(e.target.value)}
              required
            />

            <Input
              label="Institutional Work Email"
              type="email"
              placeholder="e.g. dean.academics@college.ac.in"
              value={pilotEmail}
              onChange={(e) => setPilotEmail(e.target.value)}
              helperText="Must match your official college domain (@college.ac.in / @college.edu)"
              required
            />

            <Input
              label="Engineering College / University Name"
              placeholder="e.g. Sagar Institute of Science & Technology"
              value={pilotCollege}
              onChange={(e) => setPilotCollege(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Your Academic Role"
                value={pilotRole}
                onChange={(e) => setPilotRole(e.target.value)}
                options={[
                  { label: "Dean / Principal", value: "Dean / Principal" },
                  { label: "Head of Department (HOD)", value: "HOD" },
                  { label: "Project Coordinator", value: "Coordinator" },
                  { label: "NBA / IQAC Director", value: "NBA Director" },
                ]}
              />

              <Select
                label="Annual Student Intake"
                value={pilotIntake}
                onChange={(e) => setPilotIntake(e.target.value)}
                options={[
                  { label: "500 - 1,000 Students", value: "500 - 1,000" },
                  { label: "1,000 - 2,500 Students", value: "1,000 - 2,500" },
                  { label: "2,500+ Students", value: "2,500+" },
                ]}
              />
            </div>

            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed">
              Pilot includes full NBA Criterion 2 &amp; 3 dossier exports, student CSV onboarding, and SSO domain verification for one complete semester cycle.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
              <Button
                size="sm"
                variant="secondary"
                type="button"
                onClick={() => setIsPilotModalOpen(false)}
              >
                Cancel
              </Button>
              <Button size="sm" variant="primary" type="submit">
                Submit Pilot Application
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
