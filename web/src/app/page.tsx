"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  Database,
  Layers,
  ShieldCheck,
  Server,
  Zap,
  ExternalLink,
  Users,
  Award,
  FileCode2,
  BookOpen,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { getSystemHealth } from "@/lib/api/client";

export default function Home() {
  const { data: health, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["system-health"],
    queryFn: getSystemHealth,
    retry: 1,
  });

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* 1. Desktop Fixed Navigation Sidebar (240px) */}
      <aside className="hidden lg:flex w-[240px] flex-col border-r border-[#E2E8F0] bg-white fixed inset-y-0 z-30">
        <div className="h-16 flex items-center px-6 border-b border-[#E2E8F0] gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#4F46E5] flex items-center justify-center text-white font-bold text-sm shadow-sm">
            PH
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-[#0F172A] tracking-tight">Project Hub</span>
            <span className="text-[11px] font-medium text-[#475569] uppercase tracking-wider">Enterprise B2B</span>
          </div>
        </div>

        {/* Tenant Context Badge */}
        <div className="px-4 py-3 mx-3 my-3 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Active Tenant</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              Isolated
            </span>
          </div>
          <span className="text-xs font-semibold text-[#0F172A] truncate">Apex Institute of Tech</span>
          <span className="font-mono text-[11px] text-[#475569] tabular-nums">ID: 4f46e5-001</span>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1">
          <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
            Core Platform
          </div>
          <a
            href="#overview"
            className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-[#4F46E5] bg-[#EEF2FF] rounded-md transition-colors"
          >
            <Activity className="h-4 w-4" />
            <span>System Health & Ops</span>
          </a>
          <a
            href="#architecture"
            className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-[#475569] hover:bg-[#F1F5F9] rounded-md transition-colors"
          >
            <Layers className="h-4 w-4" />
            <span>Architecture Blueprint</span>
          </a>
          <a
            href="#roles"
            className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-[#475569] hover:bg-[#F1F5F9] rounded-md transition-colors"
          >
            <Users className="h-4 w-4" />
            <span>6-Role Hierarchy</span>
          </a>
          <a
            href="#nba"
            className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-[#475569] hover:bg-[#F1F5F9] rounded-md transition-colors"
          >
            <Award className="h-4 w-4" />
            <span>NBA Criterion 2 & 3</span>
          </a>
        </nav>

        {/* API Specification Links */}
        <div className="p-4 border-t border-[#E2E8F0] space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Developer APIs</div>
          <a
            href="http://localhost:5000/scalar/v1"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-2.5 py-1.5 text-xs font-medium text-[#475569] hover:text-[#4F46E5] hover:bg-[#F8FAFC] rounded border border-[#E2E8F0] transition-colors"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5" />
              Scalar Docs
            </span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="http://localhost:5000/openapi/v1.json"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-2.5 py-1.5 text-xs font-medium text-[#475569] hover:text-[#4F46E5] hover:bg-[#F8FAFC] rounded border border-[#E2E8F0] transition-colors"
          >
            <span className="flex items-center gap-2">
              <FileCode2 className="h-3.5 w-3.5" />
              OpenAPI JSON
            </span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </aside>

      {/* 2. Main Content Container (offset by 240px on desktop) */}
      <div className="flex-1 lg:pl-[240px] flex flex-col min-w-0">
        {/* Top Header (64px) */}
        <header className="h-16 border-b border-[#E2E8F0] bg-white sticky top-0 z-20 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[#0F172A]">Platform Foundation</span>
            <span className="text-[#CBD5E1]">/</span>
            <span className="text-xs font-medium text-[#475569]">Phase 0: Architecture & Infrastructure</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#EEF2FF] text-[#4F46E5] border border-indigo-100">
              .NET 10 LTS + Next.js 16
            </span>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC] transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-[#4F46E5]" : ""}`} />
              <span>Refresh Check</span>
            </button>
          </div>
        </header>

        {/* Content Body (max-width 1200px) */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1200px] w-full mx-auto space-y-8">
          {/* Hero Section */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                System Initialized & Operational
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[#0F172A] tracking-tight">
              Project Hub Foundation
            </h1>
            <p className="text-sm text-[#475569] max-w-3xl leading-relaxed">
              Multi-tenant B2B SaaS platform engineered for engineering institutions to orchestrate
              Minor and Major projects, automate guide-student evaluations, and generate audit-proof
              evidence for NBA Criterion 2 &amp; 3 accreditation.
            </p>
          </section>

          {/* Live System Health Card */}
          <section id="overview" className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2.5">
                <Server className="h-5 w-5 text-[#4F46E5]" />
                <h2 className="text-sm font-semibold text-[#0F172A]">Live Backend Infrastructure Status</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#475569]">Backend Endpoint:</span>
                <code className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-[#E2E8F0] text-[#0F172A]">
                  http://localhost:5000/api/health
                </code>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* API Status */}
              <div className="p-4 rounded-md border border-[#E2E8F0] bg-white flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#475569]">Core API Engine</span>
                  <Zap className="h-4 w-4 text-[#4F46E5]" />
                </div>
                <div>
                  <div className="text-lg font-bold text-[#0F172A] flex items-center gap-1.5">
                    {isLoading ? (
                      <span className="text-xs font-normal text-[#94A3B8]">Probing...</span>
                    ) : isError ? (
                      <span className="text-amber-600 text-sm font-semibold">Standby / Unreachable</span>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>{health?.status}</span>
                      </>
                    )}
                  </div>
                  <span className="text-[11px] text-[#475569]">
                    {health ? `${health.environment} • v${health.version}` : ".NET 10 LTS Clean Architecture"}
                  </span>
                </div>
              </div>

              {/* Database Status */}
              <div className="p-4 rounded-md border border-[#E2E8F0] bg-white flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#475569]">Database Layer</span>
                  <Database className="h-4 w-4 text-[#4F46E5]" />
                </div>
                <div>
                  <div className="text-lg font-bold text-[#0F172A]">
                    {isLoading ? (
                      <span className="text-xs font-normal text-[#94A3B8]">Checking...</span>
                    ) : (
                      <span>{health?.database.status ?? "Configured"}</span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#475569]">
                    {health?.database.provider ?? "PostgreSQL 17 • EF Core 10"}
                  </span>
                </div>
              </div>

              {/* Cache Layer */}
              <div className="p-4 rounded-md border border-[#E2E8F0] bg-white flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#475569]">Hybrid Caching</span>
                  <Activity className="h-4 w-4 text-[#4F46E5]" />
                </div>
                <div>
                  <div className="text-lg font-bold text-[#0F172A]">
                    <span>{health?.redis.status ?? "Configured"}</span>
                  </div>
                  <span className="text-[11px] text-[#475569]">
                    {health?.redis.engine ?? "Redis 7 Alpine"}
                  </span>
                </div>
              </div>

              {/* Multi-Tenant Filter */}
              <div className="p-4 rounded-md border border-[#E2E8F0] bg-white flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#475569]">Tenant Isolation</span>
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-lg font-bold text-[#0F172A] flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Global Query Filter</span>
                  </div>
                  <span className="text-[11px] text-[#475569]">
                    Strict CollegeId partition on all queries
                  </span>
                </div>
              </div>
            </div>

            {/* Live Timestamp & Latency Footer */}
            <div className="px-6 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between text-xs text-[#475569]">
              <div className="flex items-center gap-2">
                <span>Verified Timestamp:</span>
                <span className="font-mono tabular-nums text-[#0F172A]">
                  {health?.timestampUtc ? new Date(health.timestampUtc).toUTCString() : "Pending local start..."}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-emerald-700 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Tenant Fallback: Pre-auth headers only • JWT Enforced
                </span>
              </div>
            </div>
          </section>

          {/* Architecture Pillars Grid */}
          <section id="architecture" className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1 */}
            <div className="p-6 rounded-lg border border-[#E2E8F0] bg-white shadow-sm space-y-3">
              <div className="h-9 w-9 rounded-md bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#0F172A]">Zero Cross-Tenant Leakage</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Every tenant is partitioned by an immutable <code className="font-mono text-[#0F172A]">CollegeId</code>.
                Entity Framework Core 10 applies automatic global query filters. No guest accounts or cross-college mixing.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-lg border border-[#E2E8F0] bg-white shadow-sm space-y-3">
              <div className="h-9 w-9 rounded-md bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5]">
                <Award className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#0F172A]">NBA Criterion 2 &amp; 3 Automation</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Direct mapping of rubric criteria to Program Outcomes (POs/PSOs) and Bloom&apos;s Taxonomy.
                Automated Course Outcome (CO) attainment matrices with signed PDF dossier exports.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-lg border border-[#E2E8F0] bg-white shadow-sm space-y-3">
              <div className="h-9 w-9 rounded-md bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5]">
                <FileCode2 className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#0F172A]">Type-Safe API Contracts</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Native .NET 10 OpenAPI 3.0 specification paired with <code className="font-mono text-[#0F172A]">Orval</code>.
                Auto-generates typed TypeScript models and React Query hooks directly into the frontend.
              </p>
            </div>
          </section>

          {/* 6-Role Hierarchy Table */}
          <section id="roles" className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-semibold text-[#0F172A]">Exact 6-Role Enterprise Hierarchy</h3>
              <p className="text-xs text-[#475569]">Strict role-based access control with contextual student leadership badges</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-medium">
                  <tr>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Scope</th>
                    <th className="py-3 px-4">Key Responsibilities</th>
                    <th className="py-3 px-4">Security Boundary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
                  <tr>
                    <td className="py-3 px-4 font-semibold text-[#4F46E5]">SuperAdmin</td>
                    <td className="py-3 px-4 text-[#475569]">Platform Startup Team</td>
                    <td className="py-3 px-4">Provisions college tenants, pilots, and global NBA templates</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-red-600 font-semibold">Strict ZERO access to marks</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-[#0F172A]">CollegeAdmin</td>
                    <td className="py-3 px-4 text-[#475569]">Principal / Dean / IT Head</td>
                    <td className="py-3 px-4">Creates branches, appoints HODs, sets SSO domain &amp; logo</td>
                    <td className="py-3 px-4 text-[#475569]">College tenant scope</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-[#0F172A]">HOD</td>
                    <td className="py-3 px-4 text-[#475569]">Department Executive</td>
                    <td className="py-3 px-4">Toggles coordinator authority, signs allotments &amp; NBA reports</td>
                    <td className="py-3 px-4 text-[#475569]">Department tenant scope</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-[#0F172A]">Faculty</td>
                    <td className="py-3 px-4 text-[#475569]">Base Instructor</td>
                    <td className="py-3 px-4">Guides teams, grades panels as Evaluator; gains Batch Ops when Coordinator</td>
                    <td className="py-3 px-4 text-[#475569]">Assigned teams &amp; panels</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-[#0F172A]">Student</td>
                    <td className="py-3 px-4 text-[#475569]">Base Learner</td>
                    <td className="py-3 px-4">4 tabs: Workspace, Explore, Portfolio, Profile</td>
                    <td className="py-3 px-4 text-[#475569]">Own enrollment &amp; team</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-[#059669]">TeamLead</td>
                    <td className="py-3 px-4 text-[#475569]">Contextual Badge (Student)</td>
                    <td className="py-3 px-4">Unlocks team invites, roster lock, proposal submit, repo links</td>
                    <td className="py-3 px-4 text-[#475569]">Own active project team</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Quick Start Guidance */}
          <section className="p-6 rounded-lg border border-[#E2E8F0] bg-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-[#0F172A]">Ready to connect your local environment?</h4>
              <p className="text-xs text-[#475569]">
                Start Docker (<code className="font-mono text-[#0F172A]">docker compose up -d</code>) and launch the .NET 10 API (<code className="font-mono text-[#0F172A]">dotnet run --project backend/src/ProjectHub.Api</code>).
              </p>
            </div>
            <a
              href="http://localhost:5000/scalar/v1"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-[#4F46E5] text-white hover:bg-indigo-700 transition-colors shrink-0 shadow-sm"
            >
              <span>Explore Interactive Scalar UI</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </section>
        </main>
      </div>
    </div>
  );
}
