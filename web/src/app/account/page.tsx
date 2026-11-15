"use client";

import React, { useState } from "react";
import {
  User,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Mail,
  Building2,
  Award,
  Key,
  FileSignature,
  Bell,
  Save,
  Upload,
  Check,
} from "lucide-react";
import { AppShell } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Input } from "@/design-system/components/Input";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { formatRoleLabel } from "@/design-system/components/CommandPalette";

export default function AccountPage() {
  const { currentPersona, college, departments } = useProjectHubStore();

  const [isDigitalSealActive, setIsDigitalSealActive] = useState(true);
  const [sealSavedToast, setSealSavedToast] = useState(false);
  const [notificationEmailDigest, setNotificationEmailDigest] = useState(true);
  const [notificationSmsAlerts, setNotificationSmsAlerts] = useState(false);
  const [notificationDefenseReminders, setNotificationDefenseReminders] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Derive department details
  const dept = departments.find((d) => d.id === currentPersona.departmentId) || departments[0];

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleToggleSeal = () => {
    setIsDigitalSealActive(!isDigitalSealActive);
    setSealSavedToast(true);
    setTimeout(() => setSealSavedToast(false), 2500);
  };

  return (
    <AppShell
      pageTitle="Account &amp; Institutional Credentials"
      breadcrumb="User Profile &amp; Security Settings"
      activeTab="Account"
    >
      {/* Toast Notification */}
      {(saveSuccess || sealSavedToast) && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-[#111827] px-4 py-2.5 text-xs font-medium text-white shadow-xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 stroke-[1.75]" />
          <span>
            {saveSuccess
              ? "Account preferences and notification settings saved."
              : isDigitalSealActive
              ? "Official digital approval signature activated for dossier sign-off."
              : "Digital signature deactivated."}
          </span>
        </div>
      )}

      <div className="space-y-6">
        {/* Profile Identity Hero Banner */}
        <div className="p-6 rounded-xl border border-[#E2E8F0] bg-white shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-brand-primary-tint border border-brand-primary-border text-brand-primary flex items-center justify-center font-bold text-xl font-mono">
              {currentPersona.name
                .replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.|Er\.)\s+/i, "")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-heading text-[#0F172A]">
                  {currentPersona.name}
                </h2>
                <Badge variant="success" size="sm" dot>
                  Institutional Verified
                </Badge>
              </div>
              <div className="text-xs text-[#64748B]">
                {formatRoleLabel(currentPersona.role)} • {dept.name} ({dept.code})
              </div>
              <div className="font-mono text-xs text-[#475569] tabular-nums">
                {college.name} • Sagar Campus
              </div>
            </div>
          </div>

          <Badge variant="role" role={currentPersona.role} size="md">
            {formatRoleLabel(currentPersona.role)}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Institutional Identity Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Institutional Enrollment &amp; Leadership Identity</CardTitle>
                <Badge variant="neutral" size="sm" dot>
                  Registry Locked
                </Badge>
              </div>
              <CardDescription>
                Academic credentials and department appointments verified against university HR &amp; registrar database.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <Input
                label="Full Name (with Academic Honorific)"
                value={currentPersona.name}
                disabled
                readOnly
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Employee / Staff ID"
                  value={
                    currentPersona.role === "SuperAdmin"
                      ? "PLT-ADMIN-001"
                      : currentPersona.role === "CollegeAdmin"
                      ? "ADM-PRIN-0176"
                      : currentPersona.role === "HOD"
                      ? "FAC-CSE-HOD"
                      : "FAC-CSE-028"
                  }
                  disabled
                  readOnly
                />
                <Input
                  label="Academic Rank"
                  value={
                    currentPersona.role === "SuperAdmin"
                      ? "Platform Engineer"
                      : currentPersona.role === "CollegeAdmin"
                      ? "Principal / Dean"
                      : currentPersona.role === "HOD"
                      ? "Professor & HOD"
                      : currentPersona.isProjectCoordinator
                      ? "Associate Professor (Coordinator)"
                      : "Associate Professor"
                  }
                  disabled
                  readOnly
                />
              </div>

              <Input
                label="Authorized Campus Email"
                value={
                  currentPersona.email ||
                  `${currentPersona.name
                    .toLowerCase()
                    .replace(/^(dr\.|prof\.|mr\.|ms\.)\s*/, "")
                    .replace(/[^a-z]/g, "")}@sistec.ac.in`
                }
                disabled
                readOnly
              />

              <Input
                label="Institutional Campus"
                value={`${college.name} (${college.code}) — Bhopal, MP`}
                disabled
                readOnly
              />
            </CardContent>
          </Card>

          {/* Card 2: Official Digital Approval Signature Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Official Digital Approval Signature</CardTitle>
                <Badge variant={isDigitalSealActive ? "success" : "neutral"} size="sm" dot>
                  {isDigitalSealActive ? "Active on Dossiers" : "Inactive"}
                </Badge>
              </div>
              <CardDescription>
                Cryptographic signature stamp embedded on NBA Criterion 2 &amp; 3 rubrics, viva marksheets, and student completion certificates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Signature Stamp Preview */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col items-center justify-center text-center space-y-2">
                <div className="h-10 w-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800">
                  <FileSignature className="h-5 w-5 stroke-[1.75]" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-emerald-950 font-mono uppercase tracking-wider">
                    Official Digital Attestation
                  </div>
                  <div className="text-xs font-semibold text-emerald-900">
                    {currentPersona.name}
                  </div>
                  <div className="text-[10px] text-emerald-800 font-mono">
                    {formatRoleLabel(currentPersona.role)} • {college.code}
                  </div>
                  <div className="text-[9px] text-emerald-700 font-mono pt-1">
                    SHA-256: 7f83b165...4b92c81a • Timestamp Verified
                  </div>
                </div>
              </div>

              {/* Signature Toggle Control */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[#0F172A]">Automatic Dossier Stamp</span>
                  <p className="text-[11px] text-[#64748B]">
                    Stamp digital seal automatically when signing off reviews or rubric marks.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSeal}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    isDigitalSealActive ? "bg-brand-primary" : "bg-[#CBD5E1]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isDigitalSealActive ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => {
                  setSealSavedToast(true);
                  setTimeout(() => setSealSavedToast(false), 2500);
                }}
                leftIcon={<Upload className="h-3.5 w-3.5 stroke-[1.75]" />}
              >
                Upload Revised Digital Signature Stamp (.png / .svg)
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Card 3: Security & Session Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Institutional SSO &amp; Notification Preferences</CardTitle>
              <Badge variant="success" size="sm" dot>
                SSO Connected
              </Badge>
            </div>
            <CardDescription>
              Manage connected campus Identity Provider (Google Workspace / Microsoft 365) and automated alert channels.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSavePreferences} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Campus SSO Authentication</span>
                    <Badge variant="success" size="sm">Active</Badge>
                  </div>
                  <p className="text-xs text-slate-600">
                    Connected to <span className="font-semibold text-slate-900">Google Workspace (@sistec.ac.in)</span>. Two-factor authentication enforced via campus directory policy.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Session Security</span>
                    <span className="font-mono text-xs text-emerald-700 font-bold">256-bit TLS</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Last active: Just now • IP: 103.21.244.10 (Bhopal Campus Network)
                  </p>
                </div>
              </div>

              {/* Notification Checkboxes */}
              <div className="space-y-3 pt-2 border-t border-[#E2E8F0]">
                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Notification Dispatch Channels
                </h4>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationEmailDigest}
                    onChange={(e) => setNotificationEmailDigest(e.target.checked)}
                    className="mt-0.5 rounded text-brand-primary accent-brand-primary"
                  />
                  <div>
                    <span className="text-xs font-semibold text-[#0F172A]">
                      Daily Mentorship &amp; Queue Digest Email
                    </span>
                    <p className="text-[11px] text-[#64748B]">
                      Receive a consolidated summary every morning of unreviewed Friday logs and pending proposals.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationDefenseReminders}
                    onChange={(e) => setNotificationDefenseReminders(e.target.checked)}
                    className="mt-0.5 rounded text-brand-primary accent-brand-primary"
                  />
                  <div>
                    <span className="text-xs font-semibold text-[#0F172A]">
                      Viva Defense Panel Schedule Alerts
                    </span>
                    <p className="text-[11px] text-[#64748B]">
                      Receive instant reminders 1 hour prior to scheduled student presentation panels.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSmsAlerts}
                    onChange={(e) => setNotificationSmsAlerts(e.target.checked)}
                    className="mt-0.5 rounded text-brand-primary accent-brand-primary"
                  />
                  <div>
                    <span className="text-xs font-semibold text-[#0F172A]">
                      High-Priority SMS Security Alerts
                    </span>
                    <p className="text-[11px] text-[#64748B]">
                      Urgent notifications for emergency cycle extensions or portal maintenance notices.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  leftIcon={<Save className="h-3.5 w-3.5 stroke-[2]" />}
                >
                  Save Account Preferences
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
