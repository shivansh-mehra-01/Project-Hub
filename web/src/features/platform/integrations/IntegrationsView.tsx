"use client";

import React, { useState } from "react";
import {
  Boxes,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  Key,
  Shield,
  Zap,
  Radio,
  ExternalLink,
  Plus,
  Search,
  Filter,
  Eye,
  EyeOff,
  Copy,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Modal } from "@/design-system/components/Modal";
import { Input } from "@/design-system/components/Input";
import { Select } from "@/design-system/components/Select";
import { usePlatformData, IntegrationConnectorRecord } from "../data/platformDataStore";
import { showToast } from "@/lib/toast";

export const IntegrationsView: React.FC = () => {
  const { integrations, testIntegration } = usePlatformData();

  // Active Category Tab
  const [activeTab, setActiveTab] = useState<"directory" | "api-clients" | "webhooks" | "logs">("directory");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [testingId, setTestingId] = useState<string | null>(null);

  // API Clients State
  const [apiClients, setApiClients] = useState([
    {
      id: "cli-01",
      name: "SISTec Enterprise SCIM Directory Worker",
      clientId: "scim_client_sistec_8891",
      maskedSecret: "••••••••••••••••••••••••••••••••4a8f",
      scopes: ["users:read", "departments:read", "enrollments:write"],
      rateLimit: 120,
      createdAt: "2024-06-15",
      status: "Active",
    },
    {
      id: "cli-02",
      name: "LNCT ERP Academic Integration Bridge",
      clientId: "erp_client_lnct_1902",
      maskedSecret: "••••••••••••••••••••••••••••••••99b2",
      scopes: ["projects:read", "evaluations:read"],
      rateLimit: 60,
      createdAt: "2024-08-10",
      status: "Active",
    },
  ]);

  // Webhooks State
  const [webhooks] = useState([
    {
      id: "wh-01",
      name: "Razorpay Payment Confirmation Webhook",
      url: "https://api.collabex.in/webhooks/razorpay",
      events: ["payment.captured", "payment.failed", "invoice.paid"],
      retryPolicy: "Exponential Backoff (3 retries)",
      lastStatus: "200 OK",
      lastDelivery: "Today at 14:10:00",
    },
    {
      id: "wh-02",
      name: "DigiLocker Credential Attestation Listener",
      url: "https://api.collabex.in/webhooks/digilocker",
      events: ["credential.verified", "certificate.issued"],
      retryPolicy: "Strict (5 retries)",
      lastStatus: "200 OK",
      lastDelivery: "Yesterday at 18:22:00",
    },
  ]);

  // Integration Logs State
  const [integrationLogs] = useState([
    { id: "evt-901", provider: "Razorpay", event: "payment.captured", time: "2026-11-21 14:10:02", code: 200, duration: "84ms", retries: 0, status: "Success" },
    { id: "evt-902", provider: "AWS SES", event: "email.delivered", time: "2026-11-21 14:05:12", code: 200, duration: "18ms", retries: 0, status: "Success" },
    { id: "evt-903", provider: "Google Workspace", event: "directory.sync", time: "2026-11-21 12:00:00", code: 200, duration: "420ms", retries: 0, status: "Success" },
    { id: "evt-904", provider: "Fast2SMS", event: "sms.otp_dispatched", time: "2026-11-21 10:30:19", code: 200, duration: "110ms", retries: 0, status: "Success" },
  ]);

  useDashboardHeader({
    title: "Platform Integrations",
    breadcrumb: "External Connectors, SAML SSO, Storage & API Gateways",
  });

  const connectedCount = integrations.filter((i) => i.status === "Connected").length;
  const totalCount = integrations.length;

  const handleTestPing = async (id: string, name: string) => {
    setTestingId(id);
    try {
      const res = await testIntegration(id);
      showToast(`${name}: Connection healthy (${res.latency}ms latency).`, "success");
    } finally {
      setTestingId(null);
    }
  };

  const handleRotateSecret = (clientId: string) => {
    showToast(`Secret rotated for client ${clientId}. New token encrypted in KMS.`, "warning");
  };

  const filteredIntegrations = integrations.filter((i) => {
    return categoryFilter === "All" || i.category === categoryFilter;
  });

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. TOP STATS STRIP                                                        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Integrations</span>
          <div className="text-lg font-bold font-mono text-slate-900">{totalCount}</div>
          <span className="text-[10px] text-slate-500">Configured</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Connected &amp; Healthy</span>
          <div className="text-lg font-bold font-mono text-emerald-800">{connectedCount}</div>
          <span className="text-[10px] text-emerald-600 font-medium">100% operational</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Active Webhooks</span>
          <div className="text-lg font-bold font-mono text-slate-900">{webhooks.length}</div>
          <span className="text-[10px] text-slate-500">0 dropped</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">API Clients</span>
          <div className="text-lg font-bold font-mono text-slate-900">{apiClients.length}</div>
          <span className="text-[10px] text-slate-500">Institutional SCIM</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase font-semibold">Average API Latency</span>
          <div className="text-lg font-bold font-mono text-emerald-800">28ms</div>
          <span className="text-[10px] text-slate-500">AWS Mumbai</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CATEGORY SWITCHER                                                      */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 pb-2">
        {[
          { key: "directory", label: "Integration Directory" },
          { key: "api-clients", label: "API Clients & Tokens" },
          { key: "webhooks", label: "Event Webhooks" },
          { key: "logs", label: "Integration Delivery Logs" },
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
      {/* 3. TAB: INTEGRATION DIRECTORY                                             */}
      {/* ========================================================================= */}
      {activeTab === "directory" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing {filteredIntegrations.length} integrated services
            </span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 cursor-pointer focus:outline-hidden"
            >
              <option value="All">All Categories</option>
              <option value="Google Workspace">Google Workspace</option>
              <option value="Microsoft 365">Microsoft 365</option>
              <option value="Email / SMTP">Email / SMTP</option>
              <option value="Payment Gateway">Payment Gateway</option>
              <option value="Cloud Storage">Cloud Storage</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredIntegrations.map((item) => (
              <Card key={item.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 text-sm block">{item.name}</span>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">{item.category}</span>
                  </div>
                  <Badge variant={item.status === "Connected" ? "success" : "neutral"} size="sm" dot>
                    {item.status}
                  </Badge>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{item.details}</p>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Provider:</span>
                    <span className="text-slate-900">{item.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Health Latency:</span>
                    <span className="text-emerald-700 font-bold">{item.healthLatencyMs}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Last Synced:</span>
                    <span className="text-slate-700">{item.lastSyncTimestamp}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-mono text-slate-400">
                    {item.activeScopes.length} Scopes Active
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={testingId === item.id}
                    onClick={() => handleTestPing(item.id, item.name)}
                    leftIcon={<Radio className="h-3.5 w-3.5" />}
                  >
                    {testingId === item.id ? "Testing..." : "Test Connection"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB: API CLIENTS & TOKENS                                              */}
      {/* ========================================================================= */}
      {activeTab === "api-clients" && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">Authorized API Clients &amp; Tokens</CardTitle>
              <CardDescription className="text-xs">
                KMS-encrypted client credentials with automated token rotation and scope governance.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-4">Client Name</th>
                  <th className="py-2.5 px-4">Client ID</th>
                  <th className="py-2.5 px-4">Encrypted Secret</th>
                  <th className="py-2.5 px-4">Authorized Scopes</th>
                  <th className="py-2.5 px-4">Rate Limit</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900">
                {apiClients.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{c.name}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{c.clientId}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{c.maskedSecret}</td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-600">
                      {c.scopes.join(", ")}
                    </td>
                    <td className="py-3 px-4 font-mono">{c.rateLimit} req/min</td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRotateSecret(c.clientId)}
                      >
                        Rotate Secret
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
      {/* 5. TAB: WEBHOOKS                                                          */}
      {/* ========================================================================= */}
      {activeTab === "webhooks" && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm">Configured Event Webhooks</CardTitle>
            <CardDescription className="text-xs">
              HTTP endpoints subscribed to platform events with automated retry delivery policies.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            {webhooks.map((wh) => (
              <div key={wh.id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{wh.name}</span>
                  <Badge variant="success" size="sm" dot>
                    {wh.lastStatus}
                  </Badge>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-800">
                  {wh.url}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-slate-500 text-[11px]">
                  <span>Events: <strong className="text-slate-800">{wh.events.join(", ")}</strong></span>
                  <span>Policy: <strong>{wh.retryPolicy}</strong></span>
                  <span>Last Delivered: <strong>{wh.lastDelivery}</strong></span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB: INTEGRATION LOGS                                                  */}
      {/* ========================================================================= */}
      {activeTab === "logs" && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm">Realtime Integration Event Logs</CardTitle>
            <CardDescription className="text-xs">
              Diagnostic audit trail of external requests, response codes, and roundtrip latency.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-4">Event ID</th>
                  <th className="py-2.5 px-4">Provider</th>
                  <th className="py-2.5 px-4">Event Type</th>
                  <th className="py-2.5 px-4">Timestamp (UTC)</th>
                  <th className="py-2.5 px-4">Latency</th>
                  <th className="py-2.5 px-4 text-right">HTTP Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900">
                {integrationLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{log.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{log.provider}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{log.event}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{log.time}</td>
                    <td className="py-3 px-4 font-mono text-emerald-800">{log.duration}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {log.code} OK
                      </span>
                    </td>
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
