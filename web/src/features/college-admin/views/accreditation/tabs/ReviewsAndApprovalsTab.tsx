"use client";

import React, { useState } from "react";
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  Search,
  Filter,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import { ReviewRecordDto, SubmitReviewRequest } from "@/lib/api/accreditationTypes";
import { Modal } from "@/design-system/components/Modal";
import { Textarea } from "@/design-system/components/Textarea";

interface ReviewsAndApprovalsTabProps {
  reviews: ReviewRecordDto[];
  onUpdateReview: (reviewId: string, req: SubmitReviewRequest) => void;
  onNavigateTab: (tab: string) => void;
}

export const ReviewsAndApprovalsTab: React.FC<ReviewsAndApprovalsTabProps> = ({
  reviews,
  onUpdateReview,
  onNavigateTab,
}) => {
  const [selectedReview, setSelectedReview] = useState<ReviewRecordDto | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [reviewDecision, setReviewDecision] = useState<"Approved" | "Returned">("Approved");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filtered = reviews.filter((r) => {
    return statusFilter === "ALL" || r.status === statusFilter;
  });

  const handleDecisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReview) return;
    onUpdateReview(selectedReview.id, {
      status: reviewDecision,
      remarks: reviewRemarks || `Verified and ${reviewDecision.toLowerCase()} by Dean/College Admin.`,
    });
    setSelectedReview(null);
    setReviewRemarks("");
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. REVIEW QUEUE HEADER                                                    */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-slate-900">Accreditation Reviews & Sign-Off Queue</h2>
            <p className="text-xs text-slate-500">
              Departmental evidence endorsements and final Dean/Principal attestation workflow.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600">
            {reviews.filter((r) => r.status === "Pending").length} Pending Actions
          </span>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2">
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
              All ({reviews.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Pending")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === "Pending"
                  ? "bg-white text-amber-800 font-semibold shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Pending ({reviews.filter((r) => r.status === "Pending").length})
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
              Approved ({reviews.filter((r) => r.status === "Approved").length})
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. REVIEWS TABLE (Single Surface with Dividers)                           */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-4 min-w-[240px]">Review Item</th>
                <th className="py-2.5 px-4 min-w-[120px]">Criterion / Metric</th>
                <th className="py-2.5 px-4 min-w-[160px]">Submitted By</th>
                <th className="py-2.5 px-4 min-w-[100px] text-center">Priority</th>
                <th className="py-2.5 px-4 min-w-[110px] text-center">Status</th>
                <th className="py-2.5 px-4 min-w-[120px] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Review Item */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {item.entityType}
                        </span>
                        {item.priority === "Critical" && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Urgent
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-slate-900 leading-snug">
                        {item.entityTitle}
                      </div>
                    </div>
                  </td>

                  {/* Criterion / Metric */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5">
                      <span className="font-mono text-xs font-bold text-slate-900 block">
                        Metric {item.metricCode || "—"}
                      </span>
                      <span className="text-[11px] text-slate-500 block truncate">
                        {item.criterionCode || "—"}
                      </span>
                    </div>
                  </td>

                  {/* Submitted By */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5 text-xs">
                      <span className="font-medium text-slate-800 block">
                        {item.submittedByName}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {new Date(item.submittedAtUtc).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </td>

                  {/* Priority */}
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`font-semibold text-[11px] ${
                        item.priority === "Critical"
                          ? "text-red-700"
                          : item.priority === "High"
                          ? "text-amber-700"
                          : "text-slate-600"
                      }`}
                    >
                      {item.priority}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                        item.status === "Approved"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : item.status === "Pending"
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          item.status === "Approved"
                            ? "bg-emerald-600"
                            : item.status === "Pending"
                            ? "bg-amber-500"
                            : "bg-slate-500"
                        }`}
                      />
                      {item.status}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    {item.status === "Pending" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReview(item);
                          setReviewRemarks("");
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-800 hover:bg-emerald-900 text-white transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
                        <span>Review</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">Completed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision Modal */}
      {selectedReview && (
        <Modal
          isOpen={!!selectedReview}
          onClose={() => setSelectedReview(null)}
          title="Review Accreditation Verification Item"
          description={`Verify compliance for ${selectedReview.entityTitle}`}
        >
          <form onSubmit={handleDecisionSubmit} className="space-y-4 pt-1 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="font-semibold text-slate-900 block">
                Metric: {selectedReview.metricCode} ({selectedReview.criterionCode})
              </span>
              <span className="text-slate-500 block">
                Submitted by {selectedReview.submittedByName}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Verification Decision</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReviewDecision("Approved")}
                  className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    reviewDecision === "Approved"
                      ? "border-emerald-800 bg-emerald-50 text-emerald-900 font-bold"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" strokeWidth={1.75} />
                  <span>Approve Compliance</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewDecision("Returned")}
                  className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    reviewDecision === "Returned"
                      ? "border-amber-800 bg-amber-50 text-amber-900 font-bold"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <XCircle className="h-4 w-4 text-amber-700" strokeWidth={1.75} />
                  <span>Return for Revision</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Review Remarks & Notes</label>
              <Textarea
                rows={3}
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                placeholder="State verified items or specific deficiencies requiring revision..."
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer"
              >
                Submit Decision
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
