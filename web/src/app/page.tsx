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
  Menu,
} from "lucide-react";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Modal } from "@/design-system/components/Modal";
import { Input } from "@/design-system/components/Input";
import { Select } from "@/design-system/components/Select";
import { RoleType } from "@/mocks/store-types";
import { CollabexLogo } from "@/components/brand/CollabexLogo";

export default function MarketingHomePage() {
  const router = useRouter();

  const [isPilotModalOpen, setIsPilotModalOpen] = useState(false);
  const [pilotSubmitted, setPilotSubmitted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Pilot form state
  const [pilotName, setPilotName] = useState("");
  const [pilotEmail, setPilotEmail] = useState("");
  const [pilotCollege, setPilotCollege] = useState("");
  const [pilotRole, setPilotRole] = useState("Dean / Principal");
  const [pilotIntake, setPilotIntake] = useState("1,000 - 2,500 Students");

  const handleLaunchRole = (_role: RoleType) => {
    router.push("/login");
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
        <div className="max-w-[1440px] h-full mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between">
          {/* Left Brand Mark */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <CollabexLogo variant="dark" size="md" />
          </Link>

          {/* Center Smooth-Scroll Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#9CA3AF]">
            <a href="#workflows" className="hover:text-white transition-colors">
              Workflows
            </a>
            <a href="#portals" className="hover:text-white transition-colors">
              Role Portals
            </a>
            <a href="#nba" className="hover:text-white transition-colors">
              NBA Compliance
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg border border-white/20 hover:border-white/50 text-white bg-transparent hover:bg-white/10 text-sm font-semibold transition-colors"
            >
              Sign In
            </Link>
            <button
              type="button"
              onClick={() => setIsPilotModalOpen(true)}
              className="hidden sm:inline-flex px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Request College Pilot
            </button>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-1.5 rounded-lg border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden bg-[#111827] border-b border-[#1F2937] px-4 py-3 space-y-2 text-xs font-medium text-[#9CA3AF]">
            <a
              href="#workflows"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-1.5 hover:text-white transition-colors"
            >
              Workflows
            </a>
            <a
              href="#portals"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-1.5 hover:text-white transition-colors"
            >
              Role Portals
            </a>
            <a
              href="#nba"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-1.5 hover:text-white transition-colors"
            >
              NBA Compliance
            </a>
            <a
              href="#features"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-1.5 hover:text-white transition-colors"
            >
              Features
            </a>
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsPilotModalOpen(true);
              }}
              className="w-full mt-1 px-3.5 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-semibold text-center cursor-pointer"
            >
              Request College Pilot
            </button>
          </nav>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. 2-COLUMN HERO SECTION                                                  */}
      {/* ========================================================================= */}
      <section className="relative min-h-[calc(100vh-4rem)] flex items-center py-12 lg:py-16 border-b border-[#E2E8F0] overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_rgba(4,120,87,0.08),_transparent_55%),linear-gradient(to_bottom,#ffffff,#f8fafc)]">
        <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Copy & Actions (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Eyebrow Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-primary-tint border border-brand-primary-border text-brand-primary-text text-sm font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-primary" />
                <span>Built for NBA Criterion 2 &amp; 3</span>
              </div>

              {/* Display Headline */}
              <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-[54px] text-[#0F172A] leading-[1.08] tracking-tight">
                The Complete Workspace for College Projects &amp; NBA Compliance
              </h1>

              {/* Subheadline */}
              <p className="text-base sm:text-xl text-[#475569] leading-relaxed max-w-xl">
                Manage Minor &amp; Major teams, automate weekly guide reviews, and export audit-ready CO-PO dossiers.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsPilotModalOpen(true)}
                  className="h-12 px-6 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Request College Pilot</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href="#portals"
                  className="h-12 px-6 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#0F172A] font-semibold text-base shadow-2xs transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4 text-brand-primary" />
                  <span>Explore Role Portals</span>
                </a>
              </div>

              {/* Trust Strip */}
              <div className="pt-4 border-t border-[#E2E8F0] flex flex-wrap items-center gap-y-2 gap-x-4 text-sm font-medium text-[#64748B]">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand-primary" />
                  Zero Public Signup
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-brand-primary" />
                  College SSO Ready
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <FileArchive className="h-3.5 w-3.5 text-brand-primary" />
                  1-Click NBA Audit ZIP
                </span>
              </div>
            </div>

            {/* Right Column: High-Fidelity UI Preview Card (7 cols) */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_20px_60px_-15px_rgba(15,23,42,0.16)] overflow-hidden flex flex-col text-slate-800">
                {/* Mock Window Top Bar */}
                <div className="bg-[#111827] px-3.5 py-2.5 flex items-center justify-between border-b border-slate-800 text-white select-none">
                  <CollabexLogo variant="dark" size="sm" />
                  <div className="flex items-center gap-3 text-slate-400">
                    <Search className="h-3.5 w-3.5" />
                    <Sliders className="h-3.5 w-3.5" />
                    <div className="h-5 w-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-200">
                      JS
                    </div>
                  </div>
                </div>

                {/* Mock Window Body: Mini Sidebar + Timelines Column + Workspace */}
                <div className="flex min-h-[380px] bg-[#F8FAFC]">
                  {/* Mini Left Sidebar */}
                  <div className="w-11 bg-[#111827] border-r border-slate-800 py-3 flex flex-col items-center gap-3 text-slate-400 select-none">
                    <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center text-[9px] text-slate-300 font-bold">
                      D
                    </div>
                    <div className="p-1 rounded bg-brand-primary text-white">
                      <FolderGit2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="p-1 rounded text-slate-400">
                      <Users2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="p-1 rounded text-slate-400">
                      <GraduationCap className="h-3.5 w-3.5" />
                    </div>
                    <div className="p-1 rounded text-slate-400">
                      <FileCheck2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="mt-auto">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 block" />
                    </div>
                  </div>

                  {/* Timelines Roster Column */}
                  <div className="w-48 border-r border-slate-200 bg-white p-2.5 flex flex-col gap-2 shrink-0 select-none">
                    <div className="font-heading font-bold text-xs text-slate-900 tracking-tight">
                      Timelines
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 border border-slate-200 text-[10px] text-slate-500">
                      <Search className="h-2.5 w-2.5" />
                      <span>Search...</span>
                    </div>

                    <div className="space-y-2 overflow-hidden text-[10px]">
                      <div>
                        <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Team 01 • IoT Energy Monitoring
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 p-1 rounded bg-slate-50/70">
                            <div className="h-5 w-5 rounded-full bg-emerald-100 shrink-0 flex items-center justify-center text-[9px] font-semibold text-emerald-800">
                              SM
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-slate-800 truncate leading-tight">Shivansh Mehra (Lead)</div>
                              <div className="text-[9px] text-slate-400">Week 5 Signed • 14 hrs</div>
                            </div>
                            <ChevronRight className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                          </div>
                          <div className="flex items-center gap-1.5 p-1 rounded">
                            <div className="h-5 w-5 rounded-full bg-slate-200 shrink-0 flex items-center justify-center text-[9px] font-semibold text-slate-700">
                              AS
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-slate-800 truncate leading-tight">Aarav Sharma (ML)</div>
                              <div className="text-[9px] text-slate-400">Week 5 Signed • 12 hrs</div>
                            </div>
                            <ChevronRight className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Team 04 • Solar Microgrid
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 p-1 rounded">
                            <div className="h-5 w-5 rounded-full bg-slate-200 shrink-0 flex items-center justify-center text-[9px] font-semibold text-slate-700">
                              DP
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-slate-800 truncate leading-tight">Devansh Patel (Lead)</div>
                              <div className="text-[9px] text-slate-400">Week 5 Signed • 16 hrs</div>
                            </div>
                            <ChevronRight className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                          </div>
                          <div className="flex items-center gap-1.5 p-1 rounded">
                            <div className="h-5 w-5 rounded-full bg-slate-200 shrink-0 flex items-center justify-center text-[9px] font-semibold text-slate-700">
                              MS
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-slate-800 truncate leading-tight">Meera Sen (Hardware)</div>
                              <div className="text-[9px] text-slate-400">Week 5 Signed • 14 hrs</div>
                            </div>
                            <ChevronRight className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                          Team 07 • Ledger
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 p-1 rounded">
                            <div className="h-5 w-5 rounded-full bg-slate-200 shrink-0 flex items-center justify-center text-[9px] font-semibold text-slate-700">
                              NS
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-slate-800 truncate leading-tight">Neha Singhal (Lead)</div>
                              <div className="text-[9px] text-slate-400">Week 5 Signed • 15 hrs</div>
                            </div>
                            <ChevronRight className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main Analytics: Batch Lifecycle Funnel + CO-PO Matrix */}
                  <div className="flex-1 p-3 flex flex-col gap-2.5 min-w-0">
                    {/* Batch Lifecycle Funnel Card */}
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 font-heading">
                          Batch Lifecycle Funnel
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">Progress Tracker</span>
                      </div>

                      {/* Aligned Progressive Funnel Bars */}
                      <div className="space-y-1.5 py-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-xs overflow-hidden">
                            <div className="h-3 bg-brand-primary rounded-xs" style={{ width: "100%" }} />
                          </div>
                          <span className="text-[9px] text-slate-500 tabular-nums shrink-0 w-16 whitespace-nowrap text-right">32 Synopses</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-xs overflow-hidden">
                            <div className="h-3 bg-brand-primary/90 rounded-xs" style={{ width: "88%" }} />
                          </div>
                          <span className="text-[9px] text-slate-500 tabular-nums shrink-0 w-16 whitespace-nowrap text-right">28 Guides</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-xs overflow-hidden">
                            <div className="h-3 bg-brand-primary/80 rounded-xs" style={{ width: "81%" }} />
                          </div>
                          <span className="text-[9px] text-slate-500 tabular-nums shrink-0 w-16 whitespace-nowrap text-right">26 Batched</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-xs overflow-hidden">
                            <div className="h-3 bg-brand-primary/70 rounded-xs" style={{ width: "75%" }} />
                          </div>
                          <span className="text-[9px] text-slate-500 tabular-nums shrink-0 w-16 whitespace-nowrap text-right">24 Signed</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-xs overflow-hidden">
                            <div className="h-3 bg-brand-primary/60 rounded-xs" style={{ width: "75%" }} />
                          </div>
                          <span className="text-[9px] text-slate-500 tabular-nums shrink-0 w-16 whitespace-nowrap text-right">24 Active</span>
                        </div>
                      </div>
                    </div>

                    {/* CO-PO Attainment Matrix Card */}
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 font-heading">
                          CO-PO Attainment Matrix
                        </span>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          Target Met
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <table className="flex-1 text-left text-[10px]">
                          <thead className="text-slate-400 border-b border-slate-100">
                            <tr>
                              <th className="pb-1.5 pr-2 font-medium">Outcome</th>
                              <th className="pb-1.5 pr-2 font-medium">Source</th>
                              <th className="pb-1.5 font-medium text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            <tr>
                              <td className="py-1.5 pr-2 font-medium text-slate-800">PO2: Problem Analysis</td>
                              <td className="py-1.5 pr-2 text-slate-500">Literature Survey</td>
                              <td className="py-1.5 text-right">
                                <span className="inline-flex items-center gap-0.5 whitespace-nowrap text-[9px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded tabular-nums">
                                  <Check className="h-2.5 w-2.5" /> 88.2% Pass
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 pr-2 font-medium text-slate-800">PO3: System Design</td>
                              <td className="py-1.5 pr-2 text-slate-500">Mid-Term Review</td>
                              <td className="py-1.5 text-right">
                                <span className="inline-flex items-center gap-0.5 whitespace-nowrap text-[9px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded tabular-nums">
                                  <Check className="h-2.5 w-2.5" /> 84.6% Pass
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 pr-2 font-medium text-slate-800">PO5: Modern Tools</td>
                              <td className="py-1.5 pr-2 text-slate-500">GitHub &amp; Firmware</td>
                              <td className="py-1.5 text-right">
                                <span className="inline-flex items-center gap-0.5 whitespace-nowrap text-[9px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded tabular-nums">
                                  <Check className="h-2.5 w-2.5" /> 91.0% Pass
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 pr-2 font-medium text-slate-800">PO10: Viva Defense</td>
                              <td className="py-1.5 pr-2 text-slate-500">Examiner Rubric</td>
                              <td className="py-1.5 text-right">
                                <span className="inline-flex items-center gap-0.5 whitespace-nowrap text-[9px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded tabular-nums">
                                  <Check className="h-2.5 w-2.5" /> 86.5% Pass
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Circular Gauge */}
                        <div className="shrink-0 flex flex-col items-center justify-center p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="relative h-14 w-14 flex items-center justify-center">
                            <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                              <path
                                className="text-slate-200"
                                strokeWidth="3.5"
                                stroke="currentColor"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                              <path
                                className="text-brand-primary"
                                strokeDasharray="84, 100"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                            </svg>
                            <span className="absolute text-xs font-bold text-slate-800 tabular-nums">
                              84%
                            </span>
                          </div>
                          <span className="text-[9px] font-semibold text-slate-500 mt-1">Attainment</span>
                        </div>
                      </div>
                    </div>
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
      <section id="workflows" className="py-16 lg:py-20 bg-white border-b border-[#E2E8F0] scroll-mt-20">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 space-y-10">
          <div className="text-center space-y-2.5 max-w-2xl mx-auto">
            <div className="text-xs font-bold text-brand-primary uppercase tracking-wider">
              Autonomous Governance
            </div>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-[#0F172A]">
              The 3-Tier Academic Project Lifecycle
            </h2>
            <p className="text-sm sm:text-base text-[#475569]">
              Structured project approvals, continuous reviews, and evaluation tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-4 hover:border-brand-primary transition-all">
              <div className="h-10 w-10 rounded-xl bg-brand-primary-tint text-brand-primary flex items-center justify-center font-bold text-sm border border-brand-primary-border font-heading">
                01
              </div>
              <div className="space-y-1.5">
                <h3 className="font-heading font-bold text-lg text-[#0F172A]">
                  Team Formation &amp; Synopsis
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">
                  Form 2–4 member teams, map UN SDGs, and submit project synopses.
                </p>
              </div>
              <ul className="text-sm text-[#64748B] space-y-2 pt-3 border-t border-[#E2E8F0]">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-primary shrink-0" /> Max 4 members enforced
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-primary shrink-0" /> Mandatory UN SDG mapping
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-primary shrink-0" /> Roster lock prevents churn
                </li>
              </ul>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-4 hover:border-brand-primary transition-all">
              <div className="h-10 w-10 rounded-xl bg-brand-primary-tint text-brand-primary flex items-center justify-center font-bold text-sm border border-brand-primary-border font-heading">
                02
              </div>
              <div className="space-y-1.5">
                <h3 className="font-heading font-bold text-lg text-[#0F172A]">
                  3-Tier Academic Sign-Off
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">
                  Endorsed by Guides, balanced by Coordinators, and approved by HODs.
                </p>
              </div>
              <ul className="text-sm text-[#64748B] space-y-2 pt-3 border-t border-[#E2E8F0]">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-primary shrink-0" /> Guide technical endorsement
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-primary shrink-0" /> Workload threshold verification
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-primary shrink-0" /> HOD final allotment sign-off
                </li>
              </ul>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-4 hover:border-brand-primary transition-all">
              <div className="h-10 w-10 rounded-xl bg-brand-primary-tint text-brand-primary flex items-center justify-center font-bold text-sm border border-brand-primary-border font-heading">
                03
              </div>
              <div className="space-y-1.5">
                <h3 className="font-heading font-bold text-lg text-[#0F172A]">
                  Friday Logs, Viva &amp; NBA ZIP
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">
                  Signed weekly logbooks, conflict-free viva panels, and 1-click SAR export.
                </p>
              </div>
              <ul className="text-sm text-[#64748B] space-y-2 pt-3 border-t border-[#E2E8F0]">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-primary shrink-0" /> Stamped weekly logbook entries
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-primary shrink-0" /> Conflict-free viva scoring
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-primary shrink-0" /> 3 Best/Avg/Weak ZIP export
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. 6-ROLE CAMPUS PORTALS GRID (#portals)                                  */}
      {/* ========================================================================= */}
      <section id="portals" className="py-16 lg:py-20 bg-[#F8FAFC] border-b border-[#E2E8F0] scroll-mt-20">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 space-y-10">
          <div className="text-center space-y-2.5 max-w-2xl mx-auto">
            <div className="text-xs font-bold text-brand-primary uppercase tracking-wider">
              Exact 6-Role Hierarchy
            </div>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-[#0F172A]">
              Interactive Campus Portals
            </h2>
            <p className="text-sm sm:text-base text-[#475569]">
              Dedicated portals for every academic role with strict access boundaries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. College Admin */}
            <Card className="hover:border-brand-primary hover:shadow-xs transition-all flex flex-col justify-between">
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
            <Card className="hover:border-brand-primary hover:shadow-xs transition-all flex flex-col justify-between">
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
            <Card className="hover:border-brand-primary hover:shadow-xs transition-all flex flex-col justify-between">
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
                  onClick={() => handleLaunchRole("Faculty")}
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                >
                  Launch Batch Ops View
                </Button>
              </CardContent>
            </Card>

            {/* 4. Faculty Guide & Evaluator */}
            <Card className="hover:border-brand-primary hover:shadow-xs transition-all flex flex-col justify-between">
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
            <Card className="hover:border-brand-primary hover:shadow-xs transition-all flex flex-col justify-between">
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
            <Card className="hover:border-brand-primary hover:shadow-xs transition-all flex flex-col justify-between">
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
      <section id="nba" className="py-16 lg:py-20 bg-white border-b border-[#E2E8F0] scroll-mt-20">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-brand-primary-hover to-brand-primary text-white shadow-xl space-y-8">
            <div className="space-y-3 max-w-3xl">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                Accreditation Assurance Engine
              </span>
              <h2 className="font-heading font-bold text-3xl sm:text-4xl text-white leading-tight">
                Engineered for NBA Tier-1 &amp; Tier-2 Criterion 2 &amp; 3 Compliance
              </h2>
              <p className="text-base sm:text-lg text-emerald-100 leading-relaxed">
                Automate continuous assessment logging, CO-to-PO attainment calculations, and audit sample packaging.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 space-y-2">
                <div className="text-base font-bold text-emerald-300 font-heading">
                  Criterion 2.2: Continuous Evaluation
                </div>
                <p className="text-sm text-white/90 leading-relaxed">
                  Time-stamped weekly logbooks with guide sign-offs for documented mentoring evidence.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 space-y-2">
                <div className="text-base font-bold text-emerald-300 font-heading">
                  Criterion 3.3: Direct CO-PO Attainment
                </div>
                <p className="text-sm text-white/90 leading-relaxed">
                  Maps 80% direct rubric scores + 20% exit surveys against institutional 70% targets.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 space-y-2">
                <div className="text-base font-bold text-emerald-300 font-heading">
                  Audit Sample ZIP Packager
                </div>
                <p className="text-sm text-white/90 leading-relaxed">
                  1-click ZIP export of 3 Best, 3 Average, and 3 Weak project dossiers and rubrics.
                </p>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-white/20">
              <div className="text-sm text-emerald-200">
                Built for autonomous universities and affiliated engineering colleges.
              </div>
              <button
                type="button"
                onClick={() => setIsPilotModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-white text-brand-primary hover:bg-brand-primary-tint text-sm font-bold shadow-xs transition-colors cursor-pointer"
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
      <section id="features" className="py-16 lg:py-20 bg-[#F8FAFC] border-b border-[#E2E8F0] scroll-mt-20">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 space-y-10">
          <div className="text-center space-y-2.5 max-w-2xl mx-auto">
            <div className="text-xs font-bold text-brand-primary uppercase tracking-wider">
              Enterprise Grade
            </div>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-[#0F172A]">
              Designed for Campus Security &amp; Scale
            </h2>
            <p className="text-sm sm:text-base text-[#475569]">
              Modern multi-tenant architecture built for universities and engineering colleges.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-brand-primary-tint text-brand-primary flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-heading font-bold text-base text-[#0F172A]">
                PostgreSQL Multi-Tenancy
              </h3>
              <p className="text-sm text-[#64748B] leading-relaxed">
                Strict database isolation per college tenant with zero cross-campus data leakage.
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-brand-primary-tint text-brand-primary flex items-center justify-center">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="font-heading font-bold text-base text-[#0F172A]">
                Institutional SSO Only
              </h3>
              <p className="text-sm text-[#64748B] leading-relaxed">
                Zero public signup. Verified login via university Google Workspace or Microsoft 365.
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-brand-primary-tint text-brand-primary flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="font-heading font-bold text-base text-[#0F172A]">
                Heuristic Guide Matcher
              </h3>
              <p className="text-sm text-[#64748B] leading-relaxed">
                Pairs unallocated students into balanced teams and matches faculty expertise.
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-brand-primary-tint text-brand-primary flex items-center justify-center">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="font-heading font-bold text-base text-[#0F172A]">
                University Marksheet Exports
              </h3>
              <p className="text-sm text-[#64748B] leading-relaxed">
                Consolidated internal marksheets formatted for university exam portal uploads.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. MINIMAL CHARCOAL FOOTER (#111827)                                       */}
      {/* ========================================================================= */}
      <footer className="bg-[#111827] border-t border-[#1F2937] text-white py-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-[#1F2937]">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <CollabexLogo variant="dark" size="md" />
              </div>
              <p className="text-sm text-[#9CA3AF] max-w-md">
                B2B SaaS for engineering colleges to manage capstone projects and NBA compliance.
              </p>
            </div>

            <div className="flex flex-wrap gap-6 text-sm text-[#9CA3AF]">
              <a href="#workflows" className="hover:text-white transition-colors">
                Workflows
              </a>
              <a href="#portals" className="hover:text-white transition-colors">
                Role Portals
              </a>
              <a href="#nba" className="hover:text-white transition-colors">
                NBA Compliance
              </a>
              <a href="#features" className="hover:text-white transition-colors">
                Features
              </a>
              <Link href="/login" className="hover:text-white transition-colors">
                Sign In
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[#6B7280]">
            <div>
              &copy; 2026 Collabex SaaS. Multi-tenant academic project management.
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-primary" />
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
            <div className="h-12 w-12 mx-auto rounded-full bg-brand-primary-tint text-brand-primary flex items-center justify-center">
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

            <div className="p-3 rounded-lg bg-brand-primary-tint border border-brand-primary-border text-brand-primary-text text-[11px] leading-relaxed">
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
