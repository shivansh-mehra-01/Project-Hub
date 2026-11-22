"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  MapPin,
  UserCheck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ExternalLink,
  Download,
  Eye,
  X,
  Check,
  ShieldCheck,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  FileWarning,
  Shield,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import {
  usePlatformData,
  ApplicationDocument,
  ApplicationStatus,
  ChecklistAuditDetail,
  ChecklistKey,
} from "../data/platformDataStore";
import { showToast } from "@/lib/toast";

const REJECTION_REASONS = [
  "Incomplete regulatory documentation (AICTE/UGC)",
  "Invalid or expired university affiliation certificate",
  "Unauthorized applicant signatory / unverified institutional email",
  "Duplicate institutional application",
  "Non-eligible institutional classification",
  "Other / Custom reason",
];

interface ChecklistMetadataItem {
  key: ChecklistKey;
  title: string;
  shortDescription: string;
}

const CHECKLIST_ITEMS: ChecklistMetadataItem[] = [
  {
    key: "institutionIdentity",
    title: "1. Institution Identity Verification",
    shortDescription:
      "Cross-referenced institutional identity and college code against official RGPV directory.",
  },
  {
    key: "universityAffiliation",
    title: "2. RGPV Affiliation Verification",
    shortDescription:
      "Confirmed valid annual affiliation notification and active B.Tech ordinance status with RGPV Bhopal.",
  },
  {
    key: "applicantAuthorization",
    title: "3. Applicant Authorization",
    shortDescription:
      "Validated that the applicant holds institutional administrative authority (Principal / Director).",
  },
  {
    key: "supportingDocuments",
    title: "4. Supporting Document Review",
    shortDescription:
      "Inspected and certified all submitted compliance certificates, affiliation letters, and authorization documents.",
  },
];

export interface ApplicationDetailsViewProps {
  id?: string;
}

export const ApplicationDetailsView: React.FC<ApplicationDetailsViewProps> = ({ id: propId }) => {
  const params = useParams();
  const router = useRouter();
  const id = propId || (params?.id as string);

  const {
    onboardingRequests,
    colleges,
    approveApplication,
    rejectApplication,
    updateApplicationChecklistItem,
    updateApplicationDocumentStatus,
  } = usePlatformData();

  useDashboardHeader({
    title: "Application Details",
    breadcrumb: "Dashboard / Colleges / Applications / Application Details",
  });

  const request = useMemo(() => {
    return onboardingRequests.find((r) => r.id === id || r.applicationId === id);
  }, [onboardingRequests, id]);

  // Dialog & Review states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<ApplicationDocument | null>(null);
  const [docZoom, setDocZoom] = useState<number>(100);

  // Correction Request in Document Panel
  const [showDocCorrectionForm, setShowDocCorrectionForm] = useState(false);
  const [docCorrectionRemarks, setDocCorrectionRemarks] = useState("");

  // Checklist Item Audit Modal
  const [checklistModalItem, setChecklistModalItem] = useState<{
    key: ChecklistKey;
    action: "verify" | "correction";
    title: string;
  } | null>(null);
  const [checklistNotesInput, setChecklistNotesInput] = useState("");

  // Rejection Form
  const [rejectionReason, setRejectionReason] = useState(REJECTION_REASONS[0]);
  const [rejectionExplanation, setRejectionExplanation] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Checklist state helper
  const checklist = useMemo(() => {
    return (
      request?.checklist || {
        institutionIdentity: false,
        universityAffiliation: false,
        applicantAuthorization: false,
        supportingDocuments: false,
      }
    );
  }, [request]);

  const checklistDetails = useMemo(() => {
    return checklist.details || {};
  }, [checklist]);

  // Calculate Verification Metrics
  const completedChecksCount = useMemo(() => {
    let count = 0;
    if (checklist.institutionIdentity) count++;
    if (checklist.universityAffiliation) count++;
    if (checklist.applicantAuthorization) count++;
    if (checklist.supportingDocuments) count++;
    return count;
  }, [checklist]);

  const totalMandatoryChecks = 4;

  // Document Metrics
  const documents = useMemo(() => request?.documents || [], [request]);
  const verifiedDocsCount = useMemo(
    () => documents.filter((d) => d.status === "Verified").length,
    [documents]
  );
  const pendingDocsCount = useMemo(
    () => documents.filter((d) => d.status === "Pending Review").length,
    [documents]
  );
  const correctionDocsCount = useMemo(
    () => documents.filter((d) => d.status === "Needs Correction").length,
    [documents]
  );

  // Approval Readiness Logic
  const isApprovalReady = useMemo(() => {
    if (!request || request.reviewStatus !== "Under Review") return false;
    const allChecksCompleted = completedChecksCount === totalMandatoryChecks;
    const allDocsVerified = documents.length > 0 && verifiedDocsCount === documents.length;
    const hasCorrectionRequests = correctionDocsCount > 0;
    return allChecksCompleted && allDocsVerified && !hasCorrectionRequests;
  }, [request, completedChecksCount, totalMandatoryChecks, documents, verifiedDocsCount, correctionDocsCount]);

  // Outstanding Requirements Explanations
  const outstandingRequirements = useMemo(() => {
    const list: string[] = [];
    if (!checklist.institutionIdentity) {
      list.push("Institution Identity Verification against AICTE portal is pending.");
    }
    if (!checklist.universityAffiliation) {
      list.push("RGPV Affiliation order validation against university gazette is pending.");
    }
    if (!checklist.applicantAuthorization) {
      list.push("Applicant signatory authority authorization is pending confirmation.");
    }
    if (!checklist.supportingDocuments) {
      list.push("Supporting document review checklist sign-off is pending.");
    }
    if (pendingDocsCount > 0) {
      list.push(`${pendingDocsCount} supporting document${pendingDocsCount > 1 ? "s" : ""} awaiting review.`);
    }
    if (correctionDocsCount > 0) {
      list.push(`${correctionDocsCount} document${correctionDocsCount > 1 ? "s have" : " has"} outstanding correction requests flagged.`);
    }
    return list;
  }, [checklist, pendingDocsCount, correctionDocsCount]);

  // Handlers
  const handleOpenChecklistModal = (
    key: ChecklistKey,
    action: "verify" | "correction",
    title: string
  ) => {
    const existingNotes = checklistDetails[key]?.notes || "";
    setChecklistNotesInput(existingNotes);
    setChecklistModalItem({ key, action, title });
  };

  const handleSaveChecklistAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !checklistModalItem) return;

    const status = checklistModalItem.action === "verify" ? "Verified" : "Needs Correction";
    updateApplicationChecklistItem(request.id, checklistModalItem.key, status, checklistNotesInput);
    setChecklistModalItem(null);
    setChecklistNotesInput("");
  };

  const handleResetChecklistItem = (key: ChecklistKey) => {
    if (!request) return;
    updateApplicationChecklistItem(request.id, key, "Pending", "Reset to pending by Super Admin.");
  };

  const handleDocumentVerify = (doc: ApplicationDocument) => {
    if (!request) return;
    updateApplicationDocumentStatus(request.id, doc.id, "Verified");
    setSelectedDoc({ ...doc, status: "Verified" });
    setShowDocCorrectionForm(false);
  };

  const handleDocumentRequestCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !selectedDoc) return;
    updateApplicationDocumentStatus(request.id, selectedDoc.id, "Needs Correction", docCorrectionRemarks);
    setSelectedDoc({ ...selectedDoc, status: "Needs Correction", correctionRemarks: docCorrectionRemarks });
    setShowDocCorrectionForm(false);
    setDocCorrectionRemarks("");
  };

  const handleDocumentResetPending = (doc: ApplicationDocument) => {
    if (!request) return;
    updateApplicationDocumentStatus(request.id, doc.id, "Pending Review");
    setSelectedDoc({ ...doc, status: "Pending Review", correctionRemarks: undefined });
    setShowDocCorrectionForm(false);
  };

  const handleApproveConfirm = async () => {
    if (!request || !isApprovalReady) return;
    setIsProcessing(true);
    setShowApproveModal(false);
    await approveApplication(request.id);
    setIsProcessing(false);
    showToast(`Application for ${request.institutionName} approved successfully.`, "success");
  };

  const handleRejectConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !rejectionReason) return;
    rejectApplication(request.id, rejectionReason, rejectionExplanation);
    setShowRejectModal(false);
    setRejectionExplanation("");
    showToast(`Application for ${request.institutionName} marked as Rejected.`, "info");
  };

  // Corresponding College Record (if approved)
  const correspondingCollege = useMemo(() => {
    if (!request) return null;
    return colleges.find(
      (c) =>
        c.code.toUpperCase() === request.collegeCode?.toUpperCase() ||
        c.name.toLowerCase() === request.institutionName.toLowerCase()
    );
  }, [colleges, request]);

  if (!request) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
          <FileText className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Application Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          The requested onboarding application ({id}) could not be located in the platform registry.
        </p>
        <Link
          href="/platform/colleges"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Colleges
        </Link>
      </div>
    );
  }

  const renderStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case "Under Review":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Under Review
          </span>
        );
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Approved
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            <X className="w-3.5 h-3.5 text-slate-500" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-[1140px] mx-auto px-4 sm:px-6 space-y-6 pb-28">
      {/* ======================================================================= */}
      {/* 1. BREADCRUMB & BACK NAVIGATION                                         */}
      {/* ======================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Breadcrumb: Dashboard > Colleges > Application Details */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium flex-wrap">
          <Link href="/platform/dashboard" className="hover:text-slate-900 transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <Link href="/platform/colleges" className="hover:text-slate-900 transition-colors">
            Colleges
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="font-semibold text-slate-900">Application Details</span>
        </nav>

        {/* Back to Colleges Link */}
        <Link
          href="/platform/colleges"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Colleges
        </Link>
      </div>

      {/* ======================================================================= */}
      {/* 2. COMPACT PAGE HEADER                                                  */}
      {/* ======================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {request.institutionName}
            </h1>
            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              {request.applicationId}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>
              Submission Date: <strong className="text-slate-800 font-mono">{request.submissionDate}</strong>
            </span>
            <span>&bull;</span>
            <span>
              Status: <strong className="text-slate-800">{request.reviewStatus}</strong>
            </span>
          </div>
        </div>

        <div className="self-start sm:self-auto shrink-0">
          {renderStatusBadge(request.reviewStatus)}
        </div>
      </div>

      {/* Rejection Decision Banner if already rejected */}
      {request.reviewStatus === "Rejected" && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <X className="w-4 h-4 text-rose-600" />
              Rejection Decision Record
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              Decided: {request.decisionDate || "2026-11-08"} &bull; By {request.decisionBy || "Super Admin"}
            </span>
          </div>
          <div className="space-y-1 text-slate-700">
            <div>
              <span className="text-slate-500 font-medium">Primary Reason:</span>{" "}
              <strong className="text-slate-900">{request.rejectionReason}</strong>
            </div>
            {request.rejectionExplanation && (
              <div>
                <span className="text-slate-500 font-medium">Explanation:</span>{" "}
                <span className="text-slate-600">{request.rejectionExplanation}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* SECTION 1: INSTITUTION INFORMATION                                      */}
      {/* ======================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">
            Section 1: Institution Information
          </h2>
        </div>

        {/* Two-Column Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px] font-medium">Official Institution Name</span>
            <span className="font-semibold text-slate-900 mt-0.5 block">{request.institutionName}</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] font-medium">College Code / Institutional ID</span>
            <span className="font-mono font-bold text-slate-800 mt-0.5 block">
              {request.collegeCode || request.shortName}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] font-medium">Institution Type</span>
            <span className="font-medium text-slate-800 mt-0.5 block">
              {request.collegeType || "Affiliated Engineering College"}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] font-medium">Affiliation University</span>
            <span className="font-medium text-slate-800 mt-0.5 block">
              Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] font-medium">Official Website</span>
            {request.website ? (
              <a
                href={request.website}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 mt-0.5"
              >
                {request.website}
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="text-slate-400 mt-0.5 block">Not provided</span>
            )}
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] font-medium">Official Institutional Email</span>
            <span className="font-mono text-slate-800 mt-0.5 block">{request.officialEmail}</span>
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* SECTION 2: INSTITUTION LOCATION                                         */}
      {/* ======================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">
            Section 2: Institution Location
          </h2>
        </div>

        {/* Compact Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
          <div className="md:col-span-2">
            <span className="text-slate-500 block text-[11px] font-medium">Address</span>
            <span className="text-slate-800 mt-0.5 block font-medium">
              {request.address || `${request.city || "Bhopal"}, ${request.state}`}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] font-medium">City</span>
            <span className="font-medium text-slate-800 mt-0.5 block">{request.city || "Bhopal"}</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] font-medium">District</span>
            <span className="font-medium text-slate-800 mt-0.5 block">{request.city || "Bhopal"}</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] font-medium">State</span>
            <span className="font-medium text-slate-800 mt-0.5 block">{request.state || "Madhya Pradesh"}</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] font-medium">PIN Code</span>
            <span className="font-mono text-slate-800 mt-0.5 block">{request.pinCode || "462001"}</span>
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* SECTION 3: APPLICANT INFORMATION                                        */}
      {/* ======================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">
            Section 3: Applicant Information
          </h2>
        </div>

        {/* Two-Column Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px] font-medium">Full Name</span>
            <span className="font-semibold text-slate-900 mt-0.5 block">{request.applicantName}</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] font-medium">Designation</span>
            <span className="font-medium text-slate-800 mt-0.5 block">{request.applicantDesignation}</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] font-medium">Official Email</span>
            <span className="font-mono text-slate-800 mt-0.5 block">{request.officialEmail}</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] font-medium">Contact Number</span>
            <span className="font-mono text-slate-800 mt-0.5 block">{request.phone}</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[11px] font-medium">Submission Date</span>
            <span className="font-mono text-slate-800 mt-0.5 block">{request.submissionDate}</span>
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* SECTION 4: SUPPORTING DOCUMENTS                                         */}
      {/* ======================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              Section 4: Supporting Documents
            </h2>
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            {verifiedDocsCount} of {documents.length} Verified
          </span>
        </div>

        {/* Documents Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Document Name</th>
                <th className="py-2.5 px-3">Upload Date</th>
                <th className="py-2.5 px-3">Verification Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!request.documents || request.documents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 text-xs italic">
                    No compliance documents attached to this application.
                  </td>
                </tr>
              ) : (
                request.documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-900 block">{doc.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{doc.fileName}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {doc.uploadedAt}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {doc.status === "Verified" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <Check className="w-3 h-3" /> Verified
                        </span>
                      ) : doc.status === "Needs Correction" ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200"
                          title={doc.correctionRemarks}
                        >
                          <FileWarning className="w-3 h-3" /> Needs Correction
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Clock className="w-3 h-3" /> Pending Review
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedDoc(doc);
                          setShowDocCorrectionForm(false);
                          setDocCorrectionRemarks(doc.correctionRemarks || "");
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> View Document
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* SECTION 5: VERIFICATION CHECKLIST                                       */}
      {/* ======================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              Section 5: Verification Checklist
            </h2>
          </div>

          <span className="text-[11px] font-mono text-slate-500">
            Mandatory checks verified:{" "}
            <strong className="text-emerald-700 font-bold">{completedChecksCount}</strong> of{" "}
            <strong>{totalMandatoryChecks}</strong>
          </span>
        </div>

        {/* Four Verification Items */}
        <div className="space-y-3 text-xs">
          {CHECKLIST_ITEMS.map((item) => {
            const isVerified = checklist[item.key];
            const detail: ChecklistAuditDetail = checklistDetails[item.key] || {
              status: isVerified ? "Verified" : "Pending",
            };
            const itemStatus = detail.status || (isVerified ? "Verified" : "Pending");

            return (
              <div
                key={item.key}
                className={`p-3.5 rounded-xl border transition-all ${
                  itemStatus === "Verified"
                    ? "bg-emerald-50/40 border-emerald-300"
                    : itemStatus === "Needs Correction"
                    ? "bg-rose-50/40 border-rose-300"
                    : "bg-slate-50/70 border-slate-200"
                }`}
              >
                {/* Header: Title and Status Badge */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-bold text-slate-900 text-xs block">
                    {item.title}
                  </span>

                  {itemStatus === "Verified" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                      <Check className="w-3 h-3" /> Verified
                    </span>
                  ) : itemStatus === "Needs Correction" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                      <FileWarning className="w-3 h-3" /> Needs Correction
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                      <Clock className="w-3 h-3" /> Pending Review
                    </span>
                  )}
                </div>

                {/* Short Description */}
                <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
                  {item.shortDescription}
                </p>

                {/* Notes or Remarks */}
                {detail.notes && (
                  <div className="bg-white/90 p-2 rounded-lg border border-slate-200/80 mb-2 text-[11px]">
                    <span className="font-semibold text-slate-700 block text-[10px] uppercase">
                      Auditor Remarks:
                    </span>
                    <span className="text-slate-800">{detail.notes}</span>
                  </div>
                )}

                {/* Verification Timestamp & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[10px]">
                  <span className="text-slate-500 font-mono">
                    {itemStatus === "Verified" && detail.verifiedAt ? (
                      <span className="text-emerald-800 font-medium">
                        Verified by {detail.verifiedBy || "Super Admin"} &bull; {detail.verifiedAt}
                      </span>
                    ) : itemStatus === "Needs Correction" ? (
                      <span className="text-rose-700 font-medium">Correction flagged for institution</span>
                    ) : (
                      <span>Pending Super Admin verification</span>
                    )}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {itemStatus !== "Verified" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenChecklistModal(item.key, "verify", item.title)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                        >
                          Mark as Verified
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenChecklistModal(item.key, "correction", item.title)}
                          className="px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100 rounded transition-colors"
                        >
                          Flag Issue
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleResetChecklistItem(item.key)}
                        className="px-2 py-0.5 text-[10px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors flex items-center gap-1"
                        title="Re-open check for evaluation"
                      >
                        <RotateCcw className="w-2.5 h-2.5" /> Re-open
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================================= */}
      {/* APPLICATION REVIEW SUMMARY                                              */}
      {/* ======================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">
            Application Review Summary
          </h2>
        </div>

        {/* Summary Metric Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[10px] font-medium text-slate-500 uppercase block">Mandatory Checks</span>
            <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">{totalMandatoryChecks}</span>
            <span className="text-[10px] text-slate-400">Total required</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[10px] font-medium text-emerald-700 uppercase block">Completed Checks</span>
            <span className="text-lg font-bold font-mono text-emerald-800 mt-0.5 block">
              {completedChecksCount}
            </span>
            <span className="text-[10px] text-emerald-600">Verified &amp; signed off</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[10px] font-medium text-amber-700 uppercase block">Pending Checks</span>
            <span className="text-lg font-bold font-mono text-amber-800 mt-0.5 block">
              {totalMandatoryChecks - completedChecksCount}
            </span>
            <span className="text-[10px] text-amber-600">Awaiting sign-off</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span className="text-[10px] font-medium text-rose-700 uppercase block">Needs Correction</span>
            <span className="text-lg font-bold font-mono text-rose-800 mt-0.5 block">
              {correctionDocsCount}
            </span>
            <span className="text-[10px] text-rose-600">Flagged documents</span>
          </div>
        </div>

        {/* Decision Readiness Status Banner */}
        {isApprovalReady ? (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong className="text-emerald-950 font-bold block">
                  Ready for Decision
                </strong>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  All 4 mandatory checks have been verified and supporting compliance documents certified.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 text-white rounded-md shrink-0 shadow-2xs">
              Eligible for Approval
            </span>
          </div>
        ) : (
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="font-bold text-amber-950">
                  Not Ready for Decision ({outstandingRequirements.length} Pending Requirement{outstandingRequirements.length > 1 ? "s" : ""})
                </span>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded border border-amber-300 font-mono">
                Checks Pending
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-900/90 pl-1">
              {outstandingRequirements.map((reqText, i) => (
                <li key={i}>{reqText}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ======================================================================= */}
      {/* 5. STICKY BOTTOM ACTION BAR                                             */}
      {/* ======================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3.5 px-4 sm:px-8 shadow-lg">
        <div className="max-w-[1140px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Left Side: Review Status & Verification Progress */}
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-medium">
              Review Status: <strong className="text-slate-900">{request.reviewStatus}</strong>
            </span>
            <span className="text-slate-300">&bull;</span>
            <span className="font-mono text-slate-600">
              Progress: <strong className="text-emerald-700 font-bold">{completedChecksCount} of {totalMandatoryChecks}</strong> Checks Verified
            </span>
          </div>

          {/* Right Side: Reject & Approve Actions */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {request.reviewStatus === "Under Review" && (
              <>
                {/* Reject Application Button */}
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  className="px-4 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-300 rounded-lg transition-colors cursor-pointer"
                >
                  Reject Application
                </button>

                {/* Approve Application Button (Disabled until all checks passed) */}
                <div className="relative group">
                  <button
                    type="button"
                    disabled={!isApprovalReady || isProcessing}
                    onClick={() => setShowApproveModal(true)}
                    className={`inline-flex items-center justify-center gap-1.5 px-5 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-colors ${
                      isApprovalReady && !isProcessing
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                        : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-80"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve Application
                  </button>

                  {/* Tooltip explaining disabled state */}
                  {!isApprovalReady && (
                    <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-72 bg-slate-900 text-white text-[11px] p-2.5 rounded-lg shadow-xl z-50 leading-snug">
                      <span className="font-bold block mb-1 text-amber-300">Approval Blocked:</span>
                      Complete all 4 verification checks and certify all supporting documents before approving.
                    </div>
                  )}
                </div>
              </>
            )}

            {request.reviewStatus === "Approved" && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Application Approved
                </span>
                {correspondingCollege && (
                  <Link
                    href={`/platform/colleges/${correspondingCollege.id}`}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors"
                  >
                    View College Profile
                  </Link>
                )}
              </div>
            )}

            {request.reviewStatus === "Rejected" && (
              <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
                <X className="w-3.5 h-3.5 text-rose-600" />
                Application Rejected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* DOCUMENT PREVIEW & INSPECTION PANEL MODAL                               */}
      {/* ======================================================================= */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-4 border border-slate-200 max-h-[92vh] flex flex-col justify-between overflow-hidden">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {selectedDoc.type}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        selectedDoc.status === "Verified"
                          ? "bg-emerald-100 text-emerald-800"
                          : selectedDoc.status === "Needs Correction"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {selectedDoc.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{selectedDoc.name}</h3>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {selectedDoc.fileName} &bull; Uploaded on {selectedDoc.uploadedAt}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* PDF Viewer Shell */}
              <div className="my-3 bg-slate-900 rounded-xl overflow-hidden border border-slate-800 text-white shadow-inner flex flex-col">
                {/* PDF Toolbar */}
                <div className="bg-slate-800/90 px-3 py-1.5 flex items-center justify-between text-xs border-b border-slate-700">
                  <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Page 1 of 3</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setDocZoom((z) => Math.max(75, z - 10))}
                      className="p-1 text-slate-400 hover:text-white rounded"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-[11px] px-1 text-slate-300">{docZoom}%</span>
                    <button
                      onClick={() => setDocZoom((z) => Math.min(150, z + 10))}
                      className="p-1 text-slate-400 hover:text-white rounded"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Official Attachment
                  </span>
                </div>

                {/* Document Mock Canvas */}
                <div
                  className="p-6 bg-slate-100 text-slate-800 overflow-y-auto max-h-[260px] space-y-3 font-serif"
                  style={{ transform: `scale(${docZoom / 100})`, transformOrigin: "top center" }}
                >
                  <div className="text-center pb-2 border-b-2 border-slate-300 space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      RAJIV GANDHI PROUDYOGIKI VISHWAVIDYALAYA / STATUTORY REGULATORY BODY
                    </span>
                    <span className="text-xs font-bold text-slate-900 block">
                      OFFICIAL INSTITUTIONAL REGISTRATION &amp; AFFILIATION RECORD
                    </span>
                    <span className="text-[10px] font-mono text-slate-600 block">
                      Ref: RGPV/AFFIL/2026-27/{request.collegeCode || "COL"}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
                    <p>
                      This official document verifies that <strong>{request.institutionName}</strong>, located at{" "}
                      {request.address || `${request.city}, ${request.state}`}, has submitted statutory verification records for academic session <strong>2026–2027</strong> under <strong>RGPV Bhopal</strong> affiliation.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-sans bg-white p-2.5 rounded border border-slate-200">
                      <div>
                        <span className="text-slate-400 text-[10px] block uppercase">Applicant Authority:</span>
                        <span className="font-semibold">{request.applicantName} ({request.applicantDesignation})</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block uppercase">Submission Date:</span>
                        <span className="font-mono">{selectedDoc.uploadedAt}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[10px] font-sans text-slate-400">
                    <span>Document Reference: {selectedDoc.fileName}</span>
                    <span className="font-bold text-emerald-800 uppercase tracking-widest border border-emerald-700/40 px-1.5 py-0.5 rounded bg-emerald-50">
                      SUBMITTED FOR VERIFICATION
                    </span>
                  </div>
                </div>
              </div>

              {/* Correction remarks if present */}
              {selectedDoc.status === "Needs Correction" && selectedDoc.correctionRemarks && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                  <strong className="block mb-0.5">Correction Requested:</strong>
                  <span>{selectedDoc.correctionRemarks}</span>
                </div>
              )}

              {/* Request Correction Form */}
              {showDocCorrectionForm && (
                <form
                  onSubmit={handleDocumentRequestCorrection}
                  className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2 text-xs"
                >
                  <span className="font-bold text-amber-900 block">Flag Correction for this Document</span>
                  <textarea
                    required
                    rows={2}
                    value={docCorrectionRemarks}
                    onChange={(e) => setDocCorrectionRemarks(e.target.value)}
                    placeholder="Specify the issue (e.g. Missing seal, illegible affiliation number)..."
                    className="w-full p-2 border border-amber-300 rounded text-xs bg-white text-slate-900 resize-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDocCorrectionForm(false)}
                      className="px-2.5 py-1 text-slate-600 hover:bg-amber-100 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded shadow-2xs"
                    >
                      Submit Correction Request
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Document Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <button
                type="button"
                onClick={() => showToast(`Downloading ${selectedDoc.fileName}...`, "info")}
                className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold"
              >
                <Download className="w-3.5 h-3.5" /> Download Document
              </button>

              <div className="flex items-center gap-2">
                {selectedDoc.status !== "Verified" ? (
                  <>
                    {!showDocCorrectionForm && (
                      <button
                        type="button"
                        onClick={() => setShowDocCorrectionForm(true)}
                        className="px-3 py-1.5 font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                      >
                        Request Correction
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDocumentVerify(selectedDoc)}
                      className="px-4 py-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Verify Document
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDocumentResetPending(selectedDoc)}
                    className="px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                  >
                    Reset to Pending Review
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="px-4 py-1.5 font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* AUDIT CHECKLIST ITEM MODAL                                              */}
      {/* ======================================================================= */}
      {checklistModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                  checklistModalItem.action === "verify"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
              >
                {checklistModalItem.action === "verify" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <FileWarning className="w-5 h-5 text-rose-600" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {checklistModalItem.action === "verify"
                    ? "Mark as Verified"
                    : "Flag Verification Issue"}
                </h3>
                <p className="text-[11px] text-slate-500">{checklistModalItem.title}</p>
              </div>
            </div>

            <form onSubmit={handleSaveChecklistAudit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Verification Notes / Remarks
                </label>
                <textarea
                  rows={3}
                  required
                  value={checklistNotesInput}
                  onChange={(e) => setChecklistNotesInput(e.target.value)}
                  placeholder={
                    checklistModalItem.action === "verify"
                      ? "e.g. Cross-referenced AICTE approval portal ref #2026-27. Valid."
                      : "e.g. Missing official seal or discrepancy in signatory appointment..."
                  }
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setChecklistModalItem(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg shadow-xs transition-colors ${
                    checklistModalItem.action === "verify"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {checklistModalItem.action === "verify" ? "Confirm & Mark Verified" : "Flag Issue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* APPROVAL CONFIRMATION DIALOG                                            */}
      {/* ======================================================================= */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Approve Application
                </h3>
                <p className="text-[11px] text-slate-500">
                  {request.institutionName}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>
                Are you sure you want to approve the registration application for:
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 space-y-1">
                <div>
                  <span className="text-slate-500 font-normal">Institution:</span> {request.institutionName}
                </div>
                <div>
                  <span className="text-slate-500 font-normal">Application ID:</span>{" "}
                  <span className="font-mono">{request.applicationId}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-normal">Affiliation:</span> Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                All 4 mandatory verification checks and compliance attachments have been completed. Approving confirms that the institution is verified for platform access.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveConfirm}
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors"
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* REJECTION CONFIRMATION DIALOG                                           */}
      {/* ======================================================================= */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
                <X className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Reject Application
                </h3>
                <p className="text-[11px] text-slate-500">{request.institutionName}</p>
              </div>
            </div>

            <form onSubmit={handleRejectConfirm} className="space-y-3.5 text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700">
                Application: <strong className="font-mono">{request.applicationId}</strong> &bull; {request.institutionName}
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full h-9 border border-slate-300 rounded-lg px-2.5 text-xs bg-white text-slate-900 focus:ring-rose-500 focus:border-rose-500"
                >
                  {REJECTION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Internal Note / Explanation <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectionExplanation}
                  onChange={(e) => setRejectionExplanation(e.target.value)}
                  placeholder="Provide internal notes or guidance regarding why the application was rejected..."
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-rose-500 focus:border-rose-500 resize-none"
                />
              </div>

              <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                This action will mark the registration application as Rejected in the platform registry.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs transition-colors"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
