"use client";

import React, { useState } from "react";
import {
  FolderArchive,
  FileText,
  Upload,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Tag,
  ShieldCheck,
} from "lucide-react";
import { EvidenceDocumentDto, UploadEvidenceRequest } from "@/lib/api/accreditationTypes";

interface EvidenceAndDocumentsTabProps {
  evidenceList: EvidenceDocumentDto[];
  onUploadEvidence: (req: UploadEvidenceRequest) => void;
  onNavigateTab: (tab: string) => void;
}

export const EvidenceAndDocumentsTab: React.FC<EvidenceAndDocumentsTabProps> = ({
  evidenceList,
  onUploadEvidence,
  onNavigateTab,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [criterionFilter, setCriterionFilter] = useState<string>("ALL");

  const filtered = evidenceList.filter((doc) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      doc.title.toLowerCase().includes(q) ||
      doc.fileName.toLowerCase().includes(q) ||
      doc.uploadedByName.toLowerCase().includes(q) ||
      doc.metricCode.toLowerCase().includes(q);

    const matchStatus = statusFilter === "ALL" || doc.status === statusFilter;
    const matchCriterion = criterionFilter === "ALL" || doc.criterionCode === criterionFilter;

    return matchSearch && matchStatus && matchCriterion;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. DOCUMENT VAULT HEADER & METRICS                                        */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-slate-900">Accreditation Evidence & Document Vault</h2>
            <p className="text-xs text-slate-500">
              Central repository for institutional proof, rubrics, survey reports, and committee minutes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-slate-600">
              {evidenceList.length} Total Uploaded Records
            </span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search evidence title, file, or metric..."
              className="w-full pl-8 pr-3 h-8 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center p-0.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  statusFilter === "ALL"
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All ({evidenceList.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("Approved")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  statusFilter === "Approved"
                    ? "bg-white text-emerald-800 font-semibold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Approved
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("UnderReview")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  statusFilter === "UnderReview"
                    ? "bg-white text-amber-800 font-semibold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Under Review
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("Draft")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  statusFilter === "Draft"
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Draft
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. EVIDENCE DOCUMENTS TABLE (Single Surface with Dividers)                */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-4 min-w-[240px]">Evidence Title & File</th>
                <th className="py-2.5 px-4 min-w-[120px]">Criterion / Metric</th>
                <th className="py-2.5 px-4 min-w-[150px]">Uploaded By</th>
                <th className="py-2.5 px-4 min-w-[100px]">File Size</th>
                <th className="py-2.5 px-4 min-w-[110px] text-center">Status</th>
                <th className="py-2.5 px-4 min-w-[100px] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Title & File */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-900 leading-snug">
                        {doc.title}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                        <FileText className="h-3 w-3 text-slate-400" strokeWidth={1.75} />
                        <span className="truncate max-w-sm">{doc.fileName}</span>
                      </div>
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          {doc.tags.map((t, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[9px] font-semibold"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Criterion / Metric */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5">
                      <span className="font-mono text-xs font-bold text-slate-900 block">
                        Metric {doc.metricCode}
                      </span>
                      <span className="text-[11px] text-slate-500 block truncate">
                        {doc.criterionCode}
                      </span>
                    </div>
                  </td>

                  {/* Uploaded By */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5 text-xs">
                      <span className="font-medium text-slate-800 block">
                        {doc.uploadedByName}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {new Date(doc.uploadedAtUtc).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </td>

                  {/* File Size */}
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {formatFileSize(doc.fileSizeBytes)}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                        doc.status === "Approved"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : doc.status === "UnderReview"
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          doc.status === "Approved"
                            ? "bg-emerald-600"
                            : doc.status === "UnderReview"
                            ? "bg-amber-500"
                            : "bg-slate-500"
                        }`}
                      />
                      {doc.status}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(doc, null, 2)], {
                          type: "application/json",
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = doc.fileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-900 transition-colors cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
                      <span>Download</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
