"use client";

import React, { useState } from "react";
import {
  HeartPulse,
  Server,
  Zap,
  HardDrive,
  Database,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  RefreshCw,
  Download,
  Shield,
  Layers,
  Cpu,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { usePlatformData, ServiceHealthRecord, BackgroundJobRecord } from "../data/platformDataStore";
import { showToast } from "@/lib/toast";

export const SystemHealthView: React.FC = () => {
  const { services, backgroundJobs, retryBackgroundJob, colleges } = usePlatformData();

  // Active Category Tab
  const [activeTab, setActiveTab] = useState<
    "overview" | "services" | "api" | "database" | "storage" | "jobs" | "backups" | "incidents"
  >("overview");

  useDashboardHeader({
    title: "System Health & Telemetry",
    breadcrumb: "PostgreSQL 17, Redis 7, S3 Vault & Hangfire Worker Telemetry",
  });

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TOP TELEMETRY METRICS STRIP                                            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Platform Uptime</span>
          <div className="text-lg font-bold font-mono text-emerald-800">99.98%</div>
          <span className="text-[10px] text-emerald-600 font-medium">90d SLA met</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">API Latency P95</span>
          <div className="text-lg font-bold font-mono text-slate-900">24ms</div>
          <span className="text-[10px] text-slate-500">P99: 48ms</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Error Rate</span>
          <div className="text-lg font-bold font-mono text-emerald-800">0.02%</div>
          <span className="text-[10px] text-slate-500">Sub-threshold</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Active Incidents</span>
          <div className="text-lg font-bold font-mono text-emerald-800">0</div>
          <span className="text-[10px] text-emerald-600 font-medium">All clear</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">DB Pool Load</span>
          <div className="text-lg font-bold font-mono text-slate-900">22%</div>
          <span className="text-[10px] text-slate-500">PostgreSQL 17</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Redis Cache Latency</span>
          <div className="text-lg font-bold font-mono text-emerald-800">1.1ms</div>
          <span className="text-[10px] text-slate-500">99.1% Hit ratio</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Hangfire Workers</span>
          <div className="text-lg font-bold font-mono text-slate-900">8 / 8</div>
          <span className="text-[10px] text-slate-500">0 queued backlogs</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Automated Backup</span>
          <div className="text-lg font-bold font-mono text-emerald-800">Verified</div>
          <span className="text-[10px] text-slate-500">04:00 UTC Today</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CATEGORY SWITCHER                                                      */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 pb-2">
        {[
          { key: "overview", label: "Health Overview" },
          { key: "services", label: "Service Monitoring" },
          { key: "api", label: "API Latency & Telemetry" },
          { key: "database", label: "Database Instances & Pools" },
          { key: "storage", label: "Storage Consumed" },
          { key: "jobs", label: "Hangfire Background Jobs" },
          { key: "backups", label: "Backup & Disaster Recovery" },
          { key: "incidents", label: "Incidents & Post-Mortems" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === tab.key
                ? "bg-brand-primary text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 3. TAB: SERVICES MONITORING                                               */}
      {/* ========================================================================= */}
      {(activeTab === "overview" || activeTab === "services") && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm">Platform Core Service Infrastructure</CardTitle>
            <CardDescription className="text-xs">
              Live status, ping latency, and 90-day SLA guarantees for all core components.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-4">Service Component</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Instance / Endpoint</th>
                  <th className="py-2.5 px-4">Ping Latency</th>
                  <th className="py-2.5 px-4">90-Day Uptime</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900">
                {services.map((s) => (
                  <tr key={s.serviceName} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{s.serviceName}</td>
                    <td className="py-3 px-4 text-slate-600">{s.category}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{s.endpointOrInstance}</td>
                    <td className="py-3 px-4 font-mono text-emerald-800 font-bold">{s.latencyMs}ms</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{s.uptime90d}%</td>
                    <td className="py-3 px-4 text-right">
                      <Badge variant="success" size="sm" dot>
                        {s.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB: DATABASE MONITORING & CONNECTION POOLS                            */}
      {/* ========================================================================= */}
      {activeTab === "database" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">PostgreSQL Engine</span>
              <div className="text-lg font-bold font-mono text-slate-900">PostgreSQL 17.2</div>
              <span className="text-[10px] text-emerald-700 font-medium">Multi-AZ RDS Primary (Mumbai)</span>
            </Card>
            <Card className="p-4 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Connection Pool Limit</span>
              <div className="text-lg font-bold font-mono text-slate-900">42 / 200 Conn</div>
              <span className="text-[10px] text-slate-500">21% capacity utilized</span>
            </Card>
            <Card className="p-4 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Replication Lag</span>
              <div className="text-lg font-bold font-mono text-emerald-800">0.08s</div>
              <span className="text-[10px] text-emerald-600 font-medium">Synchronous streaming healthy</span>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm">Tenant Schema Partition Health</CardTitle>
              <CardDescription className="text-xs">
                Active connection load and schema size mapped per college.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-4">College</th>
                    <th className="py-2.5 px-4">Schema Name</th>
                    <th className="py-2.5 px-4">Active Connections</th>
                    <th className="py-2.5 px-4">Storage Used</th>
                    <th className="py-2.5 px-4 text-right">RLS Isolation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-900">
                  {colleges.map((col) => (
                    <tr key={col.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-900">{col.name}</td>
                      <td className="py-3 px-4 font-mono font-bold text-brand-primary">{col.tenantId}</td>
                      <td className="py-3 px-4 font-mono">{col.code === "LNCT" ? 18 : col.code === "SISTEC" ? 14 : 6} conn</td>
                      <td className="py-3 px-4 font-mono">{col.storageUsedGb} GB</td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          RLS ENFORCED
                        </span>
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
      {/* 5. TAB: HANGFIRE BACKGROUND TASKS                                         */}
      {/* ========================================================================= */}
      {activeTab === "jobs" && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">Hangfire Background Task Queues</CardTitle>
              <CardDescription className="text-xs">
                Asynchronous SAR dossier ZIP exports, Friday logbook sweeps &amp; automated snapshots.
              </CardDescription>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              8 Workers Active
            </span>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-4">Job ID</th>
                  <th className="py-2.5 px-4">Task Name</th>
                  <th className="py-2.5 px-4">Target Tenant</th>
                  <th className="py-2.5 px-4">Duration</th>
                  <th className="py-2.5 px-4">Started At</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900">
                {backgroundJobs.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{j.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{j.jobName}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{j.targetTenant}</td>
                    <td className="py-3 px-4 font-mono">{(j.executionDurationMs / 1000).toFixed(2)}s</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{j.startedAt}</td>
                    <td className="py-3 px-4">
                      <Badge variant="success" size="sm" dot>
                        {j.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => retryBackgroundJob(j.id)}
                        className="text-xs"
                      >
                        Re-run
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB: BACKUPS & DISASTER RECOVERY                                       */}
      {/* ========================================================================= */}
      {activeTab === "backups" && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm">Automated Backups &amp; Disaster Recovery Testing</CardTitle>
            <CardDescription className="text-xs">
              Continuous RDS WAL archiving with automated 35-day point-in-time recovery (PITR).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Disaster Recovery RPO &amp; RTO Target</span>
                <p className="text-[11px] text-emerald-800">
                  Recovery Point Objective (RPO): &lt; 5 minutes • Recovery Time Objective (RTO): &lt; 15 minutes.
                  Last automated cross-region recovery test completed successfully on Nov 15, 2026.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
              <span className="font-bold text-slate-900 block">Recent Verified Snapshots</span>
              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex justify-between p-2 rounded bg-slate-50">
                  <span>rds:collabex-prod-snap-20261121</span>
                  <span className="text-emerald-700 font-bold">Verified at 04:00 UTC (12.4 GB)</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-50">
                  <span>rds:collabex-prod-snap-20261120</span>
                  <span className="text-emerald-700 font-bold">Verified at 04:00 UTC (12.1 GB)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
