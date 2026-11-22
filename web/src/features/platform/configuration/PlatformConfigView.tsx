"use client";

import React, { useState } from "react";
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  Shield,
  Layers,
  Flag,
  Settings,
  HardDrive,
  Workflow,
  History,
  Save,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { Select } from "@/design-system/components/Select";
import { Textarea } from "@/design-system/components/Textarea";
import { usePlatformData } from "../data/platformDataStore";
import { showToast } from "@/lib/toast";

export const PlatformConfigView: React.FC = () => {
  const { modules, featureFlags, toggleModule, toggleFeatureFlag } = usePlatformData();

  // Active Category Tab
  const [activeTab, setActiveTab] = useState<
    "general" | "modules" | "feature-flags" | "limits" | "workflows" | "maintenance" | "history"
  >("general");

  // General Settings State
  const [platformName, setPlatformName] = useState("Colabex");
  const [supportEmail, setSupportEmail] = useState("support@collabex.in");
  const [supportPhone, setSupportPhone] = useState("+91 755 427 4200");
  const [timezone, setTimezone] = useState("Asia/Kolkata (IST)");
  const [currency, setCurrency] = useState("INR (₹)");
  const [dateFormat, setDateFormat] = useState("DD-MM-YYYY");

  // Maintenance Banner State
  const [isMaintenanceScheduled, setIsMaintenanceScheduled] = useState(true);
  const [maintenanceStart, setMaintenanceStart] = useState("2026-11-29 02:00 IST");
  const [maintenanceDuration, setMaintenanceDuration] = useState("30 minutes");
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    "Automated PostgreSQL 17 engine minor maintenance window. The API may experience momentary blips."
  );

  useDashboardHeader({
    title: "Platform Configuration",
    breadcrumb: "Global Feature Flags, Module Registry & Operating Limits",
  });

  const handleSaveGeneralConfig = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("General platform configuration saved successfully.", "success");
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION SWITCHER                                                 */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 pb-2">
        {[
          { key: "general", label: "General Configuration" },
          { key: "modules", label: "Module Management" },
          { key: "feature-flags", label: "Feature Flags" },
          { key: "limits", label: "Global Limits & Policies" },
          { key: "workflows", label: "Workflow Automation" },
          { key: "maintenance", label: "Maintenance Configuration" },
          { key: "history", label: "Configuration History" },
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
      {/* 2. TAB: GENERAL CONFIGURATION                                             */}
      {/* ========================================================================= */}
      {activeTab === "general" && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm">Platform Identification &amp; Defaults</CardTitle>
            <CardDescription className="text-xs">
              System-wide branding, support contact endpoints, and regional localization.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={handleSaveGeneralConfig} className="space-y-4 max-w-2xl text-xs">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Platform Brand Name"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  required
                />
                <Input
                  label="Official Website URL"
                  value="https://collabex.in"
                  disabled
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Central Support Email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  required
                />
                <Input
                  label="Central Support Phone"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Select
                  label="Default Timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  options={[
                    { label: "Asia/Kolkata (IST, UTC+5:30)", value: "Asia/Kolkata (IST)" },
                    { label: "UTC (Coordinated Universal Time)", value: "UTC" },
                  ]}
                />
                <Select
                  label="Platform Base Currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  options={[
                    { label: "INR (₹) — Indian Rupee", value: "INR (₹)" },
                    { label: "USD ($) — US Dollar", value: "USD ($)" },
                  ]}
                />
                <Select
                  label="Standard Date Format"
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  options={[
                    { label: "DD-MM-YYYY (e.g. 21-11-2026)", value: "DD-MM-YYYY" },
                    { label: "YYYY-MM-DD (ISO 8601)", value: "YYYY-MM-DD" },
                  ]}
                />
              </div>

              <div className="pt-2">
                <Button size="sm" variant="primary" type="submit" leftIcon={<Save className="h-3.5 w-3.5" />}>
                  Save Platform Defaults
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 3. TAB: MODULE MANAGEMENT                                                 */}
      {/* ========================================================================= */}
      {activeTab === "modules" && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm">Platform Module Directory</CardTitle>
            <CardDescription className="text-xs">
              Enable or disable core functional engines globally across all institutional tenants.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {modules.map((m) => (
              <div
                key={m.key}
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors flex items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{m.name}</span>
                    <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                      {m.version}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">
                      {m.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{m.description}</p>
                  {m.dependencies.length > 0 && (
                    <span className="text-[10px] font-mono text-slate-400">
                      Requires: {m.dependencies.join(", ")}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={m.isEnabled ? "success" : "neutral"} size="sm" dot>
                    {m.isEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <Button
                    size="sm"
                    variant={m.isEnabled ? "secondary" : "primary"}
                    onClick={() => toggleModule(m.key)}
                  >
                    {m.isEnabled ? "Disable Module" : "Enable Module"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB: FEATURE FLAGS                                                     */}
      {/* ========================================================================= */}
      {activeTab === "feature-flags" && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm">Dynamic Feature Flags &amp; Canary Rollouts</CardTitle>
            <CardDescription className="text-xs">
              Instant toggles and percentage-based progressive rollouts without code deployments.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {featureFlags.map((ff) => (
              <div
                key={ff.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{ff.name}</span>
                    <span className="font-mono text-[10px] bg-brand-primary-tint text-brand-primary px-1.5 py-0.2 rounded border border-brand-primary-border font-semibold">
                      {ff.key}
                    </span>
                    <Badge variant={ff.isEnabled ? "success" : "neutral"} size="sm">
                      {ff.rolloutPercentage}% Rollout
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">{ff.description}</p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                    <span>Scope: {ff.targetInstitutions}</span>
                    <span>Env: {ff.environment}</span>
                    <span>Updated: {ff.lastUpdated}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant={ff.isEnabled ? "secondary" : "primary"}
                    onClick={() => toggleFeatureFlag(ff.id)}
                  >
                    {ff.isEnabled ? "Disable Flag" : "Enable Flag"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => showToast(`Rollback initiated for flag ${ff.key}.`, "warning")}
                  >
                    Rollback
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 5. TAB: GLOBAL LIMITS & POLICIES                                          */}
      {/* ========================================================================= */}
      {activeTab === "limits" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <Card>
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="text-xs">Storage &amp; File Upload Policies</CardTitle>
              <CardDescription className="text-[11px]">Enforced at Edge CloudFront &amp; API Gateway</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-600">Max Capstone Artifact File Size:</span>
                <span className="font-mono font-bold text-slate-900">100 MB per file</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-600">Allowed Dissertation Formats:</span>
                <span className="font-mono font-bold text-slate-900">PDF, ZIP, PPTX</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-600">Cryptographic Checksum Standard:</span>
                <span className="font-mono text-brand-primary font-bold">SHA-256 Mandatory</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="text-xs">API Rate Limits &amp; Session Timeouts</CardTitle>
              <CardDescription className="text-[11px]">DDoS mitigation and authentication safety</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-600">REST API Rate Limit:</span>
                <span className="font-mono font-bold text-slate-900">120 requests / min / IP</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-600">Administrative Inactivity Timeout:</span>
                <span className="font-mono font-bold text-slate-900">60 Minutes</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-600">Background Worker Max Execution:</span>
                <span className="font-mono font-bold text-slate-900">300 Seconds (5 min)</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB: MAINTENANCE CONFIGURATION                                         */}
      {/* ========================================================================= */}
      {activeTab === "maintenance" && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm">Platform Scheduled Maintenance Configuration</CardTitle>
            <CardDescription className="text-xs">
              Broadcast advance maintenance banners and trigger graceful read-only fallback mode.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs max-w-xl">
            <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={isMaintenanceScheduled}
                onChange={(e) => setIsMaintenanceScheduled(e.target.checked)}
                className="rounded text-brand-primary accent-brand-primary h-4 w-4"
              />
              <span className="font-semibold text-slate-900">Enable In-App Maintenance Notification Banner</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Maintenance Start Time"
                value={maintenanceStart}
                onChange={(e) => setMaintenanceStart(e.target.value)}
              />
              <Input
                label="Expected Duration"
                value={maintenanceDuration}
                onChange={(e) => setMaintenanceDuration(e.target.value)}
              />
            </div>

            <Textarea
              label="Public Maintenance Notification Message"
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              rows={3}
            />

            <Button
              size="sm"
              variant="primary"
              onClick={() => showToast("Maintenance configuration propagated.", "success")}
            >
              Update Maintenance Schedule
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 7. TAB: CONFIGURATION HISTORY                                             */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm">Platform Configuration Audit History</CardTitle>
            <CardDescription className="text-xs">
              Immutable record of all configuration toggles, policy alterations, and maintenance notices.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-4">Timestamp (UTC)</th>
                  <th className="py-2.5 px-4">Configuration Key</th>
                  <th className="py-2.5 px-4">Previous Value</th>
                  <th className="py-2.5 px-4">New Value</th>
                  <th className="py-2.5 px-4">Updated By</th>
                  <th className="py-2.5 px-4 text-right">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900">
                {[
                  { time: "2026-11-20 18:30:00", key: "ff_aicte_relative_rubrics", prev: "0% Rollout", next: "25% Pilot Rollout", user: "admin@collabex.in", reason: "Piloting with autonomous institutes" },
                  { time: "2026-11-15 11:20:00", key: "global_upload_limit_mb", prev: "50 MB", next: "100 MB", user: "admin@collabex.in", reason: "Increased for multimedia project demos" },
                  { time: "2026-11-01 09:00:00", key: "ff_guide_matcher_v2", prev: "50%", next: "100% Active", user: "admin@collabex.in", reason: "Production release after validation" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{row.time}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{row.key}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{row.prev}</td>
                    <td className="py-3 px-4 font-mono text-emerald-800 font-bold">{row.next}</td>
                    <td className="py-3 px-4 text-slate-700">{row.user}</td>
                    <td className="py-3 px-4 text-slate-500 text-right">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
