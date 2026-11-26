"use client";

import React, { useState } from "react";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Upload,
  RefreshCw,
  ShieldAlert,
  Building2,
  FileText,
  CreditCard,
  FileSpreadsheet,
  LogOut,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Modal } from "@/design-system/components/Modal";
import { SlideOverDrawer } from "@/design-system/components/SlideOverDrawer";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { showToast } from "@/lib/toast";

// =============================================================================
// 1. LOGOUT CONFIRMATION DIALOG
// =============================================================================
interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (signOutAllSessions: boolean) => void;
  isSuperAdmin?: boolean;
}

export const LogoutConfirmationModal: React.FC<LogoutModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSuperAdmin = false,
}) => {
  const [revokeAllSessions, setRevokeAllSessions] = useState(false);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSuperAdmin ? "Sign Out of Collabex Platform Console" : "Log out of Collabex?"}
      description={
        isSuperAdmin
          ? "Confirm termination of your active administrative session."
          : "Are you sure you want to end your current session?"
      }
      maxWidth="sm"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onConfirm(revokeAllSessions)}
            leftIcon={<LogOut className="h-3.5 w-3.5" />}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200"
          >
            {isSuperAdmin && revokeAllSessions ? "Sign Out All" : "Log Out"}
          </Button>
          <Button variant="primary" size="sm" onClick={onClose} autoFocus>
            Cancel
          </Button>
        </div>
      }
    >
      {isSuperAdmin ? (
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              You are signed in as <strong>Platform Super Admin</strong> with elevated privileges across all tenant schemas. Any uncommitted configuration changes will be lost.
            </p>
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={revokeAllSessions}
              onChange={(e) => setRevokeAllSessions(e.target.checked)}
              className="rounded text-brand-primary focus:ring-0 accent-brand-primary h-4 w-4 mt-0.5 cursor-pointer"
            />
            <div className="space-y-0.5 text-xs">
              <span className="font-semibold text-slate-900 block">Sign out from all active sessions</span>
              <span className="text-[11px] text-slate-500 block leading-tight">
                Revokes JWT tokens across all desktop browsers, mobile devices and active sessions immediately.
              </span>
            </div>
          </label>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 flex items-start gap-2.5 text-xs">
          <LogOut className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            You will be returned to the sign-in screen. Please ensure any unsaved changes are saved before continuing.
          </p>
        </div>
      )}
    </Modal>
  );
};

// =============================================================================
// 2. PENDING ACTIONS DRAWER
// =============================================================================
interface PendingActionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

export const PendingActionsDrawer: React.FC<PendingActionsDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const pendingItems = [
    {
      id: "pa-1",
      category: "Onboarding Requests",
      title: "Acropolis Institute of Technology and Research",
      subtitle: "Awaiting Super Admin review & tenant schema provisioning",
      time: "2 hours ago",
      badge: "Verification Required",
      badgeVariant: "warning" as const,
      path: "/platform/institutions?tab=requests",
    },
    {
      id: "pa-2",
      category: "Billing Actions",
      title: "IPS Academy License Invoice Overdue",
      subtitle: "COLAB-2026-045 (₹2,40,000) past due date; grace period active",
      time: "1 day ago",
      badge: "Payment Action",
      badgeVariant: "danger" as const,
      path: "/platform/business/subscriptions",
    },
    {
      id: "pa-3",
      category: "Security Alerts",
      title: "Elevated Login Failures from Unrecognized Subnet",
      subtitle: "Principal account @ipsacademy.org triggered 15-minute rate limit",
      time: "Yesterday",
      badge: "Security Review",
      badgeVariant: "neutral" as const,
      path: "/platform/security",
    },
  ];

  return (
    <SlideOverDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Platform Pending Actions Queue"
      subtitle="Administrative tasks requiring Super Admin review, endorsement or action"
      badge={
        <Badge variant="warning" size="sm" dot>
          {pendingItems.length} Pending
        </Badge>
      }
    >
      <div className="space-y-3 text-xs">
        {pendingItems.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              onClose();
              onNavigate(item.path);
            }}
            className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-brand-primary hover:shadow-xs transition-all cursor-pointer space-y-1.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                {item.category}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{item.time}</span>
            </div>
            <div className="font-semibold text-slate-900 text-xs group-hover:text-brand-primary transition-colors flex items-center justify-between">
              <span>{item.title}</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-brand-primary transition-transform group-hover:translate-x-0.5 shrink-0" />
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">{item.subtitle}</p>
            <div className="pt-1">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                {item.badge}
              </span>
            </div>
          </div>
        ))}
      </div>
    </SlideOverDrawer>
  );
};

// =============================================================================
// 3. IMPORT MANAGER MODAL
// =============================================================================
interface ImportManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType?: string;
}

export const ImportManagerModal: React.FC<ImportManagerModalProps> = ({
  isOpen,
  onClose,
  entityType = "Institutions",
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccess, setImportSuccess] = useState<boolean | null>(null);

  const handleSimulateImport = () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setImportSuccess(true);
      showToast(`Import completed: 18 valid records processed from ${selectedFile.name}.`, "success");
    }, 1500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Batch CSV Import: ${entityType}`}
      description="Upload standardized CSV file with automatic schema validation and dry-run preview."
      maxWidth="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              showToast("Sample template CSV downloaded.", "info");
            }}
            leftIcon={<Download className="h-3.5 w-3.5" />}
          >
            Download CSV Template
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!selectedFile || isProcessing}
              onClick={handleSimulateImport}
            >
              {isProcessing ? "Validating & Importing..." : "Validate & Import"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Dropzone */}
        <div className="p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/70 transition-colors text-center cursor-pointer relative">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setSelectedFile(file);
                setImportSuccess(null);
              }
            }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <div className="space-y-2 flex flex-col items-center">
            <div className="h-10 w-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center">
              <Upload className="h-5 w-5" />
            </div>
            {selectedFile ? (
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-900 block">{selectedFile.name}</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {(selectedFile.size / 1024).toFixed(1)} KB • Ready for validation
                </span>
              </div>
            ) : (
              <div className="space-y-0.5">
                <span className="font-semibold text-slate-800 block">Click or drag CSV file here</span>
                <span className="text-[11px] text-slate-500 block">Supports UTF-8 CSV with header row up to 10MB</span>
              </div>
            )}
          </div>
        </div>

        {importSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Validation &amp; Ingestion Successful</span>
            </div>
            <p className="text-[11px] text-emerald-800">
              18 records validated with zero schema violations. All records synchronized to master catalog.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

// =============================================================================
// 4. EXPORT MANAGER MODAL
// =============================================================================
interface ExportManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetName?: string;
}

export const ExportManagerModal: React.FC<ExportManagerModalProps> = ({
  isOpen,
  onClose,
  datasetName = "Platform Analytics",
}) => {
  const [format, setFormat] = useState<"CSV" | "XLSX" | "PDF">("CSV");
  const [includeAudit, setIncludeAudit] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      showToast(`Export generated: ${datasetName}.${format.toLowerCase()}`, "success");
      onClose();
    }, 1200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Export Dataset: ${datasetName}`}
      description="Generate encrypted export files with customizable timeframes and formats."
      maxWidth="sm"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={isExporting}
            onClick={handleExport}
            leftIcon={<Download className="h-3.5 w-3.5" />}
          >
            {isExporting ? "Generating..." : `Export ${format}`}
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5 text-xs">
        <div className="space-y-1.5">
          <span className="font-semibold text-slate-800 block">Export Format</span>
          <div className="grid grid-cols-3 gap-2">
            {(["CSV", "XLSX", "PDF"] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormat(fmt)}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-medium ${
                  format === fmt
                    ? "border-brand-primary bg-brand-primary-tint text-brand-primary font-bold shadow-2xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
          <input
            type="checkbox"
            checked={includeAudit}
            onChange={(e) => setIncludeAudit(e.target.checked)}
            className="rounded text-brand-primary focus:ring-0 accent-brand-primary h-3.5 w-3.5"
          />
          <span className="text-slate-800 font-medium">Include cryptographic SHA-256 integrity seal</span>
        </label>
      </div>
    </Modal>
  );
};

// =============================================================================
// 5. OPERATION DETAILS DRAWER
// =============================================================================
interface OperationDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  operationId?: string;
  operationName?: string;
}

export const OperationDetailsDrawer: React.FC<OperationDetailsDrawerProps> = ({
  isOpen,
  onClose,
  operationId = "op-prov-9021",
  operationName = "Tenant PostgreSQL Partition Generation",
}) => {
  return (
    <SlideOverDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={operationName}
      subtitle={`Operation ID: ${operationId}`}
      badge={
        <Badge variant="success" size="sm" dot>
          Completed
        </Badge>
      }
    >
      <div className="space-y-4 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Execution Stage:</span>
            <span className="font-bold text-slate-900">4 of 4 (Finalized)</span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-brand-primary w-full rounded-full" />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Started: Today at 14:10:00 UTC</span>
            <span>Duration: 3.2s</span>
          </div>
        </div>

        <div className="space-y-2">
          <span className="font-bold text-slate-900 block">Execution Stages</span>
          <div className="space-y-2">
            {[
              { stage: "1. Validate Institutional Code & SSO Domain", status: "Done", time: "120ms" },
              { stage: "2. Generate PostgreSQL 17 Schema Partition", status: "Done", time: "1,400ms" },
              { stage: "3. Provision S3 Vault Storage Prefix", status: "Done", time: "680ms" },
              { stage: "4. Dispatch 24-hr Principal Activation OTP", status: "Done", time: "990ms" },
            ].map((st, i) => (
              <div key={i} className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="font-medium text-slate-800">{st.stage}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">{st.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SlideOverDrawer>
  );
};
