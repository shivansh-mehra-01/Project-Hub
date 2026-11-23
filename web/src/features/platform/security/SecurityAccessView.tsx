"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Key,
  Users,
  Smartphone,
  AlertTriangle,
  Clock,
  Globe,
  Laptop,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Ban,
  FileCheck2,
  Eye,
  AlertCircle,
  Cpu,
  Database,
  ArrowRight,
  Download,
} from "lucide-react";
import { usePlatformData, ActiveSessionRecord, SecurityIncidentRecord, EmergencyAccessRequestRecord } from "../data/platformDataStore";

export const SecurityAccessView: React.FC = () => {
  const { activeSessions, terminateSession, securityIncidents, colleges } = usePlatformData();

  const [activeTab, setActiveTab] = useState<
    "overview" | "sessions" | "policies" | "incidents" | "break-glass" | "isolation"
  >("overview");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncidentRecord | null>(null);
  const [showBreakGlassModal, setShowBreakGlassModal] = useState(false);
  const [breakGlassInstitution, setBreakGlassInstitution] = useState(colleges[0]?.name || "SISTec Bhopal");
  const [breakGlassScope, setBreakGlassScope] = useState<"Read-Only Database Schema" | "Storage Bucket Inspection" | "Audit Trail Extraction">("Read-Only Database Schema");
  const [breakGlassJustification, setBreakGlassJustification] = useState("");
  const [breakGlassSuccessMsg, setBreakGlassSuccessMsg] = useState(false);

  // Policies state
  const [policies, setPolicies] = useState({
    minPasswordLength: 12,
    requireSpecialChars: true,
    requireNumbers: true,
    sessionTimeoutMinutes: 30,
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 15,
    enforceMfaAllAdmins: true,
    enforceMfaTenants: true,
    restrictConsoleIp: false,
    allowedCidr: "103.21.244.0/24",
  });
  const [policySaved, setPolicySaved] = useState(false);

  // Break glass requests list
  const [emergencyRequests, setEmergencyRequests] = useState<EmergencyAccessRequestRecord[]>([
    {
      id: "bg-001",
      requesterName: "Dev Startup Admin",
      requesterEmail: "admin@collabex.in",
      targetInstitution: "SISTec Bhopal",
      requestedScope: "Read-Only Database Schema",
      justification: "Diagnosing transient foreign key constraint timeout on project batch sync.",
      status: "Approved",
      approvedBy: "Aditi Trivedi (Security Officer)",
      validUntil: "2026-11-21 18:00:00",
    },
    {
      id: "bg-002",
      requesterName: "Rohit Saxena",
      requesterEmail: "rohit.support@collabex.in",
      targetInstitution: "LNCT Bhopal",
      requestedScope: "Storage Bucket Inspection",
      justification: "Verifying encrypted SAR artifact dossier integrity after S3 upload glitch.",
      status: "Expired",
      approvedBy: "Dev Startup Admin",
      validUntil: "2026-11-20 12:00:00",
    },
  ]);

  // Isolation verification state
  const [isVerifyingIsolation, setIsVerifyingIsolation] = useState(false);
  const [isolationResult, setIsolationResult] = useState<{
    checkedSchemas: number;
    crossTenantLeakDetected: boolean;
    rlsPoliciesActive: number;
    lastVerified: string;
  }>({
    checkedSchemas: colleges.length,
    crossTenantLeakDetected: false,
    rlsPoliciesActive: 38,
    lastVerified: "2026-11-21 02:00:00 IST (Automated Cron Job)",
  });

  const handleCreateBreakGlass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!breakGlassJustification.trim()) return;

    const newReq: EmergencyAccessRequestRecord = {
      id: `bg-${Date.now().toString().slice(-4)}`,
      requesterName: "Dev Startup Admin",
      requesterEmail: "admin@collabex.in",
      targetInstitution: breakGlassInstitution,
      requestedScope: breakGlassScope,
      justification: breakGlassJustification,
      status: "Approved",
      approvedBy: "Self-Authorized (Emergency Super Admin Override)",
      validUntil: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19),
    };

    setEmergencyRequests((prev) => [newReq, ...prev]);
    setShowBreakGlassModal(false);
    setBreakGlassJustification("");
    setBreakGlassSuccessMsg(true);
    setTimeout(() => setBreakGlassSuccessMsg(false), 4000);
  };

  const handleRevokeBreakGlass = (id: string) => {
    setEmergencyRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Revoked" } : r))
    );
  };

  const runIsolationAudit = () => {
    setIsVerifyingIsolation(true);
    setTimeout(() => {
      setIsVerifyingIsolation(false);
      setIsolationResult({
        checkedSchemas: colleges.length,
        crossTenantLeakDetected: false,
        rlsPoliciesActive: colleges.length * 6 + 14,
        lastVerified: new Date().toLocaleTimeString("en-IN", { hour12: false }) + " IST (Manual Security Audit)",
      });
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded">
              Governance & Protection
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500 font-mono">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              AES-256-GCM / TLS 1.3
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Security & Access Governance
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Authentication policies, multi-factor enforcement, active sessions surveillance, and PostgreSQL 17 tenant isolation monitoring.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowBreakGlassModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Request Break-Glass Elevation
          </button>
          <button
            onClick={runIsolationAudit}
            disabled={isVerifyingIsolation}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingIsolation ? "animate-spin text-emerald-600" : ""}`} />
            Verify RLS Isolation
          </button>
        </div>
      </div>

      {breakGlassSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Break-glass elevation approved. Audit session token active for 4 hours. All queries are logged to the immutable ledger.
        </div>
      )}

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Active Sessions</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900">{activeSessions.length}</span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1 rounded">Live</span>
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">MFA Compliance</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600">100%</span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1 rounded">Enforced</span>
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Failed Logins (24h)</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900">7</span>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1 rounded">Locked</span>
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Privileged Admins</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900">4</span>
            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1 rounded">FIDO2</span>
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Security Incidents</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900">{securityIncidents.length}</span>
            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1 rounded">0 Critical</span>
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">RLS Isolation</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600">100%</span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1 rounded">No Leaks</span>
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Break-Glass</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900">
              {emergencyRequests.filter((r) => r.status === "Approved").length}
            </span>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1 rounded">Active</span>
          </div>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Cert Expiry</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900">284d</span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1 rounded">Auto-Renew</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 overflow-x-auto">
          {[
            { id: "overview", label: "Security Dashboard", count: undefined },
            { id: "sessions", label: "Active Sessions", count: activeSessions.length },
            { id: "policies", label: "Authentication & Policies", count: undefined },
            { id: "incidents", label: "Security Threat Log", count: securityIncidents.length },
            { id: "break-glass", label: "Emergency Break-Glass", count: emergencyRequests.filter((r) => r.status === "Approved").length },
            { id: "isolation", label: "Tenant Isolation (RLS)", count: undefined },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? "border-emerald-600 text-emerald-600 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === tab.id ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* System Security Posture */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Enterprise Security Posture & Standards Compliance
                </h3>
                <span className="text-xs text-slate-500 font-mono">Status: Hardened</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Data At Rest Encryption</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">Active</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    PostgreSQL 17 storage volumes and AWS S3 Capstone artifact vaults encrypted using AES-256-GCM with customer-managed AWS KMS keys.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Data In Transit Encryption</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">TLS 1.3</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Mandatory HSTS with 31536000 preload header. Insecure HTTP automatically redirected; weak cipher suites disabled at ALB level.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Tenant Isolation Architecture</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">RLS Enforced</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    PostgreSQL Row-Level Security policies bound to session variables prevent cross-tenant queries even under SQL injection vulnerabilities.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Statutory DPDP Act 2023 Readiness</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">Compliant</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Zero student PII monetization; consent logs recorded; right to data portability and automated erasure workflows available.
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Last automated security penetration vulnerability scan: <strong>Nov 18, 2026</strong></span>
                <span className="text-emerald-700 font-medium">0 High/Critical CVEs detected</span>
              </div>
            </div>

            {/* Privileged Access Overview */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Privileged Access Distribution
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <p className="text-xs font-medium text-slate-800">Super Admin (Platform Root)</p>
                    <p className="text-[11px] text-slate-500">Full tenant & security authority</p>
                  </div>
                  <span className="text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    2 Accounts
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <p className="text-xs font-medium text-slate-800">Security Officer</p>
                    <p className="text-[11px] text-slate-500">Audit logs & break-glass oversight</p>
                  </div>
                  <span className="text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    1 Account
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <p className="text-xs font-medium text-slate-800">Support Engineers</p>
                    <p className="text-[11px] text-slate-500">Read-only diagnostic access</p>
                  </div>
                  <span className="text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    1 Account
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <p className="font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Dual-Custody Principle
                </p>
                <p className="mt-0.5 text-[11px]">
                  Emergency break-glass queries into institutional student databases require secondary confirmation by the Security Officer.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Active Sessions strip */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Current Administrative Sessions</h3>
                <p className="text-xs text-slate-500">Active tokens currently holding valid platform console claims</p>
              </div>
              <button
                onClick={() => setActiveTab("sessions")}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
              >
                Manage All Sessions <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Administrator</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Device & Browser</th>
                    <th className="py-2.5 px-3">IP Address</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Last Active</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeSessions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900 block">{s.accountName}</span>
                        <span className="text-[11px] text-slate-500">{s.accountEmail}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                          {s.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{s.device} &bull; {s.browser}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{s.ipAddress}</td>
                      <td className="py-2.5 px-3 text-slate-600">{s.location}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{s.lastActiveTime}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => terminateSession(s.id)}
                          className="px-2 py-1 text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE SESSIONS */}
      {activeTab === "sessions" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Active Administrative Sessions</h2>
              <p className="text-xs text-slate-500">Live authenticated tokens with active refresh tokens in Redis cluster</p>
            </div>
            <button
              onClick={() => {
                const current = activeSessions[0];
                if (current) {
                  activeSessions.forEach((s) => {
                    if (s.id !== current.id) terminateSession(s.id);
                  });
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors self-start sm:self-auto"
            >
              <Ban className="w-3.5 h-3.5" />
              Terminate All Other Sessions
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Session ID</th>
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-4">Platform Role</th>
                  <th className="py-3 px-4">Device & Client</th>
                  <th className="py-3 px-4">IP Address & Geolocation</th>
                  <th className="py-3 px-4">Login Time</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeSessions.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {s.id}
                      {idx === 0 && (
                        <span className="ml-1.5 px-1.5 py-0.2 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded">
                          Current
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{s.accountName}</div>
                      <div className="text-[11px] text-slate-500">{s.accountEmail}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                        {s.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Laptop className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.device}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{s.browser}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-800">{s.ipAddress}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Globe className="w-3 h-3 text-slate-400" />
                        {s.location}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">{s.loginTime}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">{s.lastActiveTime}</td>
                    <td className="py-3 px-4 text-right">
                      {idx === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">This Device</span>
                      ) : (
                        <button
                          onClick={() => terminateSession(s.id)}
                          className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
                        >
                          Revoke Session
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUTHENTICATION & POLICIES */}
      {activeTab === "policies" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-sm font-semibold text-slate-900">Platform-Wide Security Policies</h2>
            <p className="text-xs text-slate-500">Configure global password complexity, session expiry, and IP access constraints</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Password & Session Policies */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Credential Requirements</h3>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Minimum Password Length: <span className="font-bold text-slate-900">{policies.minPasswordLength} chars</span>
                </label>
                <input
                  type="range"
                  min="8"
                  max="24"
                  value={policies.minPasswordLength}
                  onChange={(e) => setPolicies({ ...policies, minPasswordLength: Number(e.target.value) })}
                  className="w-full accent-emerald-600"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policies.requireSpecialChars}
                    onChange={(e) => setPolicies({ ...policies, requireSpecialChars: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Require at least one special character (!@#$%^&*)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policies.requireNumbers}
                    onChange={(e) => setPolicies({ ...policies, requireNumbers: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Require at least one numeric digit (0-9)</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Idle Session Inactivity Timeout
                </label>
                <select
                  value={policies.sessionTimeoutMinutes}
                  onChange={(e) => setPolicies({ ...policies, sessionTimeoutMinutes: Number(e.target.value) })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes (Recommended)</option>
                  <option value={60}>60 Minutes</option>
                  <option value={120}>2 Hours</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Account Lockout Threshold (Failed Attempts)
                </label>
                <select
                  value={policies.maxFailedAttempts}
                  onChange={(e) => setPolicies({ ...policies, maxFailedAttempts: Number(e.target.value) })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value={3}>3 Failed Attempts</option>
                  <option value={5}>5 Failed Attempts (Recommended)</option>
                  <option value={10}>10 Failed Attempts</option>
                </select>
              </div>
            </div>

            {/* MFA & Network Restrictions */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Multi-Factor & Network Access</h3>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <label className="flex items-start gap-2.5 text-xs text-slate-800 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policies.enforceMfaAllAdmins}
                    onChange={(e) => setPolicies({ ...policies, enforceMfaAllAdmins: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                  />
                  <div>
                    <span>Enforce Hardware / TOTP MFA for all Super Admins</span>
                    <p className="text-[11px] text-slate-500 font-normal">Super Admins cannot sign in without WebAuthn FIDO2 security keys or authenticator apps.</p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-slate-800 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policies.enforceMfaTenants}
                    onChange={(e) => setPolicies({ ...policies, enforceMfaTenants: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                  />
                  <div>
                    <span>Enforce MFA for Institutional Principals & College Admins</span>
                    <p className="text-[11px] text-slate-500 font-normal">Mandatory two-factor authentication on institutional domain sign-ins.</p>
                  </div>
                </label>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policies.restrictConsoleIp}
                    onChange={(e) => setPolicies({ ...policies, restrictConsoleIp: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Restrict Console Access to Specified CIDR / IP Range</span>
                </label>

                {policies.restrictConsoleIp && (
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={policies.allowedCidr}
                      onChange={(e) => setPolicies({ ...policies, allowedCidr: e.target.value })}
                      className="w-full text-xs font-mono border border-slate-300 rounded-lg p-2"
                      placeholder="e.g. 103.21.244.0/24, 157.34.0.0/16"
                    />
                    <p className="text-[10px] text-slate-500">Comma-separated IPv4 CIDR blocks authorized for /platform routes.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            {policySaved ? (
              <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Policies updated and applied to auth cluster.
              </span>
            ) : (
              <span className="text-xs text-slate-400">Changes take effect immediately on next token validation.</span>
            )}

            <button
              onClick={() => {
                setPolicySaved(true);
                setTimeout(() => setPolicySaved(false), 3000);
              }}
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors"
            >
              Save Security Policies
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: THREAT LOG & INCIDENTS */}
      {activeTab === "incidents" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Security Threat & Audit Incidents</h2>
                <p className="text-xs text-slate-500">Automated honeypot triggers, suspicious geolocation hops, and credential rate limits</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                  Status: All Mitigated
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Incident ID</th>
                    <th className="py-3 px-4">Threat Type</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Target Account / Tenant</th>
                    <th className="py-3 px-4">Detected Timestamp</th>
                    <th className="py-3 px-4">Mitigation Status</th>
                    <th className="py-3 px-4">Investigator</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {securityIncidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{inc.id}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{inc.incidentType}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          inc.severity === "Critical" ? "bg-rose-100 text-rose-800" :
                          inc.severity === "High" ? "bg-amber-100 text-amber-800" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium">{inc.affectedAccount}</div>
                        <div className="text-[11px] text-slate-500">{inc.institution}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">{inc.detectedAt}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {inc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{inc.investigator}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedIncident(inc)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-100 rounded transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selectedIncident && (
            <div className="p-4 bg-slate-900 text-white rounded-xl shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-emerald-400">Incident Diagnostic: {selectedIncident.id}</span>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>
              <p className="text-xs text-slate-300 font-mono">{selectedIncident.details}</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: EMERGENCY BREAK-GLASS */}
      {activeTab === "break-glass" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Emergency Break-Glass Governance</h2>
                <p className="text-xs text-slate-500">Scoped, time-bound elevated access records for tenant incident diagnosis</p>
              </div>
              <button
                onClick={() => setShowBreakGlassModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Request Emergency Access
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Request ID</th>
                    <th className="py-3 px-4">Requester</th>
                    <th className="py-3 px-4">Target Institution</th>
                    <th className="py-3 px-4">Elevated Scope</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Approver</th>
                    <th className="py-3 px-4">Valid Until</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {emergencyRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{req.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{req.requesterName}</div>
                        <div className="text-[11px] text-slate-500">{req.requesterEmail}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{req.targetInstitution}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded border border-slate-200">
                          {req.requestedScope}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          req.status === "Approved" ? "bg-emerald-100 text-emerald-800" :
                          req.status === "Pending Approval" ? "bg-amber-100 text-amber-800" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{req.approvedBy || "—"}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{req.validUntil}</td>
                      <td className="py-3 px-4 text-right">
                        {req.status === "Approved" && (
                          <button
                            onClick={() => handleRevokeBreakGlass(req.id)}
                            className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors"
                          >
                            Revoke Now
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: TENANT ISOLATION MONITORING */}
      {activeTab === "isolation" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  PostgreSQL 17 Row-Level Security (RLS) & Schema Barrier Verification
                </h2>
                <p className="text-xs text-slate-500">
                  Automated query scanners ensure no student or faculty query can traverse beyond their dedicated tenant partition
                </p>
              </div>

              <button
                onClick={runIsolationAudit}
                disabled={isVerifyingIsolation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingIsolation ? "animate-spin" : ""}`} />
                {isVerifyingIsolation ? "Auditing Isolation Boundaries..." : "Run Cross-Tenant Leakage Sweep"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                <span className="text-xs font-medium text-emerald-800">RLS Partitions Verified</span>
                <p className="text-2xl font-bold text-emerald-900 mt-1">{isolationResult.checkedSchemas} Schemas</p>
                <p className="text-[11px] text-emerald-700 mt-1">100% of institutional tenants validated</p>
              </div>

              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                <span className="text-xs font-medium text-emerald-800">Active RLS Database Policies</span>
                <p className="text-2xl font-bold text-emerald-900 mt-1">{isolationResult.rlsPoliciesActive} Policies</p>
                <p className="text-[11px] text-emerald-700 mt-1">Enforced across projects, teams & rubrics</p>
              </div>

              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                <span className="text-xs font-medium text-emerald-800">Cross-Tenant Leakage Status</span>
                <p className="text-2xl font-bold text-emerald-900 mt-1">Zero Leaks</p>
                <p className="text-[11px] text-emerald-700 mt-1">Clean boundary verification test</p>
              </div>
            </div>

            <div className="p-4 bg-slate-900 text-slate-200 rounded-lg font-mono text-xs space-y-2">
              <div className="text-emerald-400 font-bold flex items-center justify-between">
                <span>// PostgreSQL 17 RLS Policy Enforcement Verification Snippet</span>
                <span className="text-[10px] text-slate-400">{isolationResult.lastVerified}</span>
              </div>
              <p className="text-slate-400">
                ALTER TABLE capstone_projects ENABLE ROW LEVEL SECURITY;<br />
                CREATE POLICY tenant_isolation_policy ON capstone_projects<br />
                &nbsp;&nbsp;FOR ALL<br />
                &nbsp;&nbsp;USING (tenant_id = current_setting(&apos;app.current_tenant_id&apos;)::uuid);
              </p>
              <div className="pt-2 text-emerald-300 text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified: Query planner rejects queries with missing or mismatched tenant context token.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BREAK-GLASS MODAL */}
      {showBreakGlassModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-rose-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Emergency Break-Glass Access Request
              </div>
              <button
                onClick={() => setShowBreakGlassModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-medium"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateBreakGlass} className="space-y-4">
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-800">
                <p className="font-semibold">Statutory Audit Warning</p>
                <p className="mt-0.5 text-[11px]">
                  Emergency elevation bypasses tenant isolation safeguards for diagnostic repair. Every SQL query and S3 artifact downloaded during this session is cryptographically signed and archived.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Target College / Institution</label>
                <select
                  value={breakGlassInstitution}
                  onChange={(e) => setBreakGlassInstitution(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                >
                  {colleges.map((c) => (
                    <option key={c.id} value={c.name}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Requested Elevation Scope</label>
                <select
                  value={breakGlassScope}
                  onChange={(e) => setBreakGlassScope(e.target.value as any)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value="Read-Only Database Schema">Read-Only Database Schema Inspection (No write)</option>
                  <option value="Storage Bucket Inspection">Storage Bucket Inspection (S3 Capstone Vault)</option>
                  <option value="Audit Trail Extraction">Audit Trail Extraction</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Technical Justification <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={breakGlassJustification}
                  onChange={(e) => setBreakGlassJustification(e.target.value)}
                  placeholder="Detail the active support incident or database condition necessitating elevation..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBreakGlassModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs transition-colors"
                >
                  Authorize & Generate Session Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
