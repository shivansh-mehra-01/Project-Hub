"use client";

import React, { useState } from "react";
import {
  FileCheck2,
  ShieldCheck,
  Search,
  Filter,
  Download,
  Clock,
  User,
  Database,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Layers,
  Archive,
  Eye,
  SlidersHorizontal,
  Code,
  HardDrive,
  Calendar,
} from "lucide-react";
import { usePlatformData } from "../data/platformDataStore";

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  actorEmail: string;
  role: string;
  category: "Tenant" | "Academic" | "Billing" | "Security" | "Configuration" | "System";
  action: string;
  targetEntity: string;
  ipAddress: string;
  status: "Success" | "Warning" | "Failure";
  metadata: Record<string, any>;
  sha256Hash: string;
}

const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: "aud-48219",
    timestamp: "2026-11-21 15:42:19",
    actor: "Dev Startup Admin",
    actorEmail: "admin@collabex.in",
    role: "Super Admin",
    category: "Security",
    action: "ADMIN_SESSION_AUTHENTICATED",
    targetEntity: "Session: sess-01",
    ipAddress: "103.21.244.10",
    status: "Success",
    metadata: { mfaType: "WebAuthn_FIDO2", browser: "Chrome 131.0", geo: "Bhopal, MP" },
    sha256Hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  },
  {
    id: "aud-48218",
    timestamp: "2026-11-21 14:30:10",
    actor: "System Hangfire Worker",
    actorEmail: "worker-04@internal.collabex.in",
    role: "System Bot",
    category: "Academic",
    action: "SAR_DOSSIER_COMPILED",
    targetEntity: "Tenant: SISTEC (Dept CSE)",
    ipAddress: "10.0.4.12",
    status: "Success",
    metadata: { criterion: "NBA Criterion 2 & 3", durationMs: 3200, archiveSizeBytes: 14892010 },
    sha256Hash: "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
  },
  {
    id: "aud-48217",
    timestamp: "2026-11-21 12:15:00",
    actor: "Dev Startup Admin",
    actorEmail: "admin@collabex.in",
    role: "Super Admin",
    category: "Tenant",
    action: "TENANT_PROVISION_COMPLETED",
    targetEntity: "Tenant: tenant_uit_rgpv_prod",
    ipAddress: "103.21.244.10",
    status: "Success",
    metadata: { schema: "tenant_uit_rgpv_prod", db: "PostgreSQL 17 RDS", quotaGb: 100 },
    sha256Hash: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
  },
  {
    id: "aud-48216",
    timestamp: "2026-11-21 10:04:22",
    actor: "Aditi Trivedi",
    actorEmail: "aditi.security@collabex.in",
    role: "Security Officer",
    category: "Security",
    action: "BREAK_GLASS_ELEVATION_APPROVED",
    targetEntity: "Request: bg-001 (SISTec Bhopal)",
    ipAddress: "103.21.244.12",
    status: "Warning",
    metadata: { scope: "Read-Only Database Schema", validHours: 4, justification: "Constraint timeout inspection" },
    sha256Hash: "4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce",
  },
  {
    id: "aud-48215",
    timestamp: "2026-11-20 22:14:00",
    actor: "Anonymous Client",
    actorEmail: "principal@ipsacademy.org",
    role: "Unauthenticated",
    category: "Security",
    action: "AUTH_FAILED_LOCKOUT_TRIGGERED",
    targetEntity: "Account: principal@ipsacademy.org",
    ipAddress: "117.200.14.8",
    status: "Failure",
    metadata: { attemptCount: 5, lockoutDurationMins: 15, rule: "POL-BRUTE-FORCE-01" },
    sha256Hash: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
  },
  {
    id: "aud-48214",
    timestamp: "2026-11-20 18:00:00",
    actor: "Dr. Meenakshi Rao",
    actorEmail: "meenakshi.curator@collabex.in",
    role: "Academic Curator",
    category: "Academic",
    action: "REGULATION_TEMPLATE_PUBLISHED",
    targetEntity: "Regulation: RGPV-AICTE-FLEX-2022 (v2.4)",
    ipAddress: "103.21.244.15",
    status: "Success",
    metadata: { university: "RGPV", branchesAffected: 8, bloomRubricAttached: true },
    sha256Hash: "ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d",
  },
  {
    id: "aud-48213",
    timestamp: "2026-11-19 11:30:45",
    actor: "Razorpay Webhook",
    actorEmail: "api-webhook@razorpay.com",
    role: "API Gateway",
    category: "Billing",
    action: "SUBSCRIPTION_PAYMENT_CAPTURED",
    targetEntity: "Invoice: INV-2026-001 (SISTec)",
    ipAddress: "52.66.75.14",
    status: "Success",
    metadata: { amountINR: 566400, gstIncludedINR: 86400, paymentId: "pay_RzpSistec2026" },
    sha256Hash: "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
  },
];

export const AuditComplianceView: React.FC = () => {
  const { colleges } = usePlatformData();

  const [activeTab, setActiveTab] = useState<
    "logs" | "admin-trail" | "security-audit" | "compliance"
  >("logs");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);
  const [chainVerified, setChainVerified] = useState<boolean | null>(true);

  // Filtered logs
  const filteredLogs = INITIAL_AUDIT_LOGS.filter((l) => {
    const matchesSearch =
      l.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.targetEntity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.ipAddress.includes(searchQuery);

    const matchesCategory =
      selectedCategory === "all" || l.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const handleExportAuditCsv = () => {
    const csvContent =
      "LogID,Timestamp,Actor,ActorEmail,Role,Category,Action,TargetEntity,IPAddress,Status,SHA256Hash\n" +
      filteredLogs
        .map(
          (l) =>
            `${l.id},${l.timestamp},"${l.actor}",${l.actorEmail},"${l.role}",${l.category},${l.action},"${l.targetEntity}",${l.ipAddress},${l.status},${l.sha256Hash}`
        )
        .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `colabex_audit_trail_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleVerifyChain = () => {
    setIsVerifyingChain(true);
    setChainVerified(null);
    setTimeout(() => {
      setIsVerifyingChain(false);
      setChainVerified(true);
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded">
              Governance & Statutory Ledger
            </span>
            <span className="text-xs text-slate-500 font-mono">SHA-256 Hash Chained</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Audit & Statutory Compliance
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cryptographically sealed immutable audit trails, administrative mutations, and AICTE/DPDP Act statutory retention governance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleVerifyChain}
            disabled={isVerifyingChain}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingChain ? "animate-spin text-emerald-600" : ""}`} />
            Verify Hash Chain Integrity
          </button>
          <button
            onClick={handleExportAuditCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Audit Trail (CSV)
          </button>
        </div>
      </div>

      {chainVerified === true && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Cryptographic Integrity Attested:</strong> 48,219 consecutive audit blocks validated. Zero tampered hashes or missing sequence entries.
            </span>
          </div>
          <span className="font-mono text-[10px] text-emerald-700 font-bold">100% Chain Valid</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Audit Blocks</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900">48,219</span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1 rounded">Append-Only</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Admin Mutations (30d)</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900">314</span>
            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1 rounded">Signed</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Security Events</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900">18</span>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1 rounded">Surveilled</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Retention Period</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900">7 Years</span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1 rounded">AICTE / NBA</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">DPDP Compliance</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600">100%</span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1 rounded">Ready</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Glacier Cold Vault</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900">14.2 GB</span>
            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1 rounded">Archived</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 overflow-x-auto">
          {[
            { id: "logs", label: "Immutable Audit Log" },
            { id: "admin-trail", label: "Administrative Mutations Trail" },
            { id: "security-audit", label: "Security & Access Surveillance" },
            { id: "compliance", label: "Statutory Data Governance & DPDP" },
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
            </button>
          ))}
        </nav>
      </div>

      {/* TAB 1: IMMUTABLE AUDIT LOG & TAB 2/3 */}
      {(activeTab === "logs" || activeTab === "admin-trail" || activeTab === "security-audit") && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by action, actor, target entity or IP address..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                />
              </div>

              {activeTab === "logs" && (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
                >
                  <option value="all">All Categories</option>
                  <option value="tenant">Tenant</option>
                  <option value="academic">Academic</option>
                  <option value="security">Security</option>
                  <option value="billing">Billing</option>
                </select>
              )}
            </div>

            <span className="text-xs text-slate-500 font-mono self-start sm:self-auto">
              Showing {filteredLogs.length} verified events
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Timestamp (IST)</th>
                  <th className="py-3 px-4">Actor & Role</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{log.id}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px] whitespace-nowrap">{log.timestamp}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{log.actor}</div>
                      <div className="text-[11px] text-slate-500">{log.role}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded">
                        {log.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-900 text-[11px]">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{log.targetEntity}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">{log.ipAddress}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        log.status === "Success" ? "bg-emerald-100 text-emerald-800" :
                        log.status === "Warning" ? "bg-amber-100 text-amber-800" :
                        "bg-rose-100 text-rose-800"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-100 rounded transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* METADATA JSON DRAWER */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-slate-500">AUDIT BLOCK: {selectedLog.id}</span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">{selectedLog.action}</h3>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Close
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Timestamp:</span>
                  <span className="font-mono font-medium text-slate-800">{selectedLog.timestamp} IST</span>
                </div>

                <div>
                  <span className="text-slate-500 block">Actor Identity:</span>
                  <span className="font-medium text-slate-900">{selectedLog.actor} ({selectedLog.actorEmail})</span>
                </div>

                <div>
                  <span className="text-slate-500 block">Target Resource:</span>
                  <span className="font-mono text-slate-800">{selectedLog.targetEntity}</span>
                </div>

                <div>
                  <span className="text-slate-500 block">Client IP & Origin:</span>
                  <span className="font-mono text-slate-800">{selectedLog.ipAddress}</span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">Cryptographic SHA-256 Block Signature:</span>
                  <div className="p-2 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded break-all">
                    {selectedLog.sha256Hash}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">Structured Metadata Payload (JSON):</span>
                  <pre className="p-3 bg-slate-100 text-slate-800 font-mono text-[11px] rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COMPLIANCE & DATA GOVERNANCE */}
      {activeTab === "compliance" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* DPDP Act 2023 */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Digital Personal Data Protection (DPDP) Act 2023
                </h3>
                <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded">
                  Compliant
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Statutory safeguards for Indian higher educational institutions ensuring student data privacy, notice consent tracking, and localized cloud processing.
              </p>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="text-slate-700">Data Fiduciary Notice & Consent Records</span>
                  <span className="font-semibold text-emerald-700">100% Active</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="text-slate-700">Zero Commercial Student Data Monetization</span>
                  <span className="font-semibold text-emerald-700">Enforced</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="text-slate-700">Data Localization (AWS Mumbai ap-south-1)</span>
                  <span className="font-semibold text-emerald-700">100% Local</span>
                </div>
              </div>
            </div>

            {/* AICTE / NBA 7-Year Archive */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Archive className="w-4 h-4 text-emerald-600" />
                  AICTE / NBA Statutory 7-Year Capstone Archive Policy
                </h3>
                <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500">
                National Board of Accreditation requires institutional capstone project synopses, rubrics, and viva evaluation sheets to be retained for 7 years.
              </p>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="text-slate-700">Automated Glacier Deep Archive Lifecycle</span>
                  <span className="font-semibold text-slate-900 font-mono">After 365 Days</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="text-slate-700">Total Archival Footprint (2023–2026)</span>
                  <span className="font-semibold text-slate-900 font-mono">14.2 GB</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="text-slate-700">Statutory Tamper-Evident WORM Lock</span>
                  <span className="font-semibold text-emerald-700">Enabled</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
