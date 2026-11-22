"use client";

import React, { useState } from "react";
import {
  Settings,
  Moon,
  Sun,
  Monitor,
  Globe,
  Bell,
  Lock,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  SlidersHorizontal,
  Shield,
  Layers,
  Save,
  Trash2,
} from "lucide-react";

export const PlatformSettingsView: React.FC = () => {
  // Appearance & Display
  const [theme, setTheme] = useState<"system" | "light" | "dark">("light");
  const [density, setDensity] = useState<"comfortable" | "compact">("compact");
  const [tablePageSize, setTablePageSize] = useState<number>(25);

  // Localization
  const [currency, setCurrency] = useState("INR");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [academicYearFormat, setAcademicYearFormat] = useState("2026–2027");

  // Notifications
  const [notifications, setNotifications] = useState({
    criticalOutages: true,
    provisioningFailures: true,
    securityIncidents: true,
    billingRenewals: true,
    dailyDigest: false,
  });

  // Maintenance & System
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isFlushingCache, setIsFlushingCache] = useState(false);
  const [cacheFlushedMsg, setCacheFlushedMsg] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  const handleFlushCache = () => {
    setIsFlushingCache(true);
    setTimeout(() => {
      setIsFlushingCache(false);
      setCacheFlushedMsg(true);
      setTimeout(() => setCacheFlushedMsg(false), 3500);
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded">
              Console Preferences
            </span>
            <span className="text-xs text-slate-500 font-mono">Platform Admin Controls</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Platform Settings & Preferences
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure console appearance, localization standards for Indian universities, notification channels, and operational caches.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Save className="w-3.5 h-3.5" />
          Save Preferences
        </button>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Platform console preferences saved successfully.
        </div>
      )}

      {cacheFlushedMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Redis 7 cache cluster purged successfully. Query state re-indexed.
        </div>
      )}

      {/* SECTION 1: APPEARANCE & DISPLAY */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Monitor className="w-4 h-4 text-emerald-600" />
          Console Appearance & Table Display
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-2">Color Theme</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "light", label: "Clean Light", icon: Sun },
                { id: "dark", label: "Charcoal Dark", icon: Moon },
                { id: "system", label: "System Sync", icon: Monitor },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id as any)}
                    className={`p-2.5 border rounded-lg flex flex-col items-center gap-1.5 transition-colors ${
                      theme === t.id
                        ? "border-emerald-600 bg-emerald-50/50 text-emerald-800 font-semibold ring-1 ring-emerald-600"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px]">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-2">Density & Table Records</label>
            <div className="space-y-3">
              <div>
                <span className="text-slate-500 block mb-1">Default Rows Per Page:</span>
                <select
                  value={tablePageSize}
                  onChange={(e) => setTablePageSize(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                >
                  <option value={10}>10 records per page</option>
                  <option value={25}>25 records per page (Recommended)</option>
                  <option value={50}>50 records per page</option>
                  <option value={100}>100 records per page (High density)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: LOCALIZATION & REGIONAL STANDARDS */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Globe className="w-4 h-4 text-emerald-600" />
          Localization & Indian Higher Education Standards
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Base Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 bg-white"
            >
              <option value="INR">INR (₹ Indian Rupee)</option>
              <option value="USD">USD ($ US Dollar)</option>
            </select>
            <p className="text-[10px] text-slate-500 mt-1">Used for institutional subscriptions and GST invoices.</p>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 bg-white"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+05:30)</option>
              <option value="UTC">UTC (Universal Coordinated)</option>
            </select>
            <p className="text-[10px] text-slate-500 mt-1">Official time for Friday logbook deadlines.</p>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Date Format</label>
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 bg-white"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
            </select>
            <p className="text-[10px] text-slate-500 mt-1">Displayed on academic marksheets and reports.</p>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Current Academic Cycle</label>
            <select
              value={academicYearFormat}
              onChange={(e) => setAcademicYearFormat(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 bg-white"
            >
              <option value="2026–2027">AY 2026–2027 (Active)</option>
              <option value="2025–2026">AY 2025–2026</option>
            </select>
            <p className="text-[10px] text-slate-500 mt-1">Default filter across all platform dashboards.</p>
          </div>
        </div>
      </div>

      {/* SECTION 3: NOTIFICATIONS & ALERTS */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Bell className="w-4 h-4 text-emerald-600" />
          Platform Notification Subscriptions
        </h3>

        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
            <div>
              <span className="font-semibold text-slate-900 block">Critical System Outages & Service Degradation</span>
              <span className="text-[11px] text-slate-500">Instant in-app alert banner and SMS dispatch to on-call administrators</span>
            </div>
            <input
              type="checkbox"
              checked={notifications.criticalOutages}
              onChange={(e) => setNotifications({ ...notifications, criticalOutages: e.target.checked })}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
            <div>
              <span className="font-semibold text-slate-900 block">Tenant Provisioning & Database Errors</span>
              <span className="text-[11px] text-slate-500">Alerts when automated schema creation or S3 bucket allocation encounters an error</span>
            </div>
            <input
              type="checkbox"
              checked={notifications.provisioningFailures}
              onChange={(e) => setNotifications({ ...notifications, provisioningFailures: e.target.checked })}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
            <div>
              <span className="font-semibold text-slate-900 block">Security Incidents & Rate-Limit Lockouts</span>
              <span className="text-[11px] text-slate-500">Notifies when multiple failed logins trigger automated institutional IP lockouts</span>
            </div>
            <input
              type="checkbox"
              checked={notifications.securityIncidents}
              onChange={(e) => setNotifications({ ...notifications, securityIncidents: e.target.checked })}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
            <div>
              <span className="font-semibold text-slate-900 block">Institutional Subscription Renewals (15-Day Warning)</span>
              <span className="text-[11px] text-slate-500">Weekly digest of engineering colleges due for annual license renewal</span>
            </div>
            <input
              type="checkbox"
              checked={notifications.billingRenewals}
              onChange={(e) => setNotifications({ ...notifications, billingRenewals: e.target.checked })}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
            />
          </label>
        </div>
      </div>

      {/* SECTION 4: OPERATIONAL CACHES & MAINTENANCE */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Database className="w-4 h-4 text-emerald-600" />
          Operational Maintenance & Caches
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <span className="font-semibold text-slate-900 block">Purge Redis Query & Session Cache</span>
            <p className="text-[11px] text-slate-500">
              Clears transient Redis 7 cached query result sets across all colleges without terminating active JWT sessions.
            </p>
            <button
              onClick={handleFlushCache}
              disabled={isFlushingCache}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-md transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFlushingCache ? "animate-spin text-emerald-600" : ""}`} />
              {isFlushingCache ? "Purging Redis Clusters..." : "Flush Redis Query Cache"}
            </button>
          </div>

          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg space-y-2">
            <span className="font-semibold text-rose-900 block">Platform Maintenance Mode</span>
            <p className="text-[11px] text-rose-700">
              When enabled, non-super-admin users see a scheduled maintenance window banner. API responds in read-only mode.
            </p>
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
              />
              <span className="text-xs font-bold text-rose-900">
                {maintenanceMode ? "Maintenance Mode Active (Platform Read-Only)" : "Disabled (Normal Operations)"}
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
