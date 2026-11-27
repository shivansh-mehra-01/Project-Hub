"use client";

import React, { useState } from "react";
import { CheckCircle2, History, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { Textarea } from "@/design-system/components/Textarea";
import { ConfirmationDialog } from "@/design-system/patterns/PageStates";
import { studentApi } from "@/lib/api/studentApi";
import { ArtifactSlotDto, ProjectReportSubmissionDto } from "@/lib/api/types";
import { showToast } from "@/lib/toast";
import {
  canStudentEditSubmission,
  hasSubmissionDraftChanges,
} from "@/features/shared/projectLifecycleHelpers";

export interface WorkspaceSubmissionTabProps {
  submission: ProjectReportSubmissionDto | null;
  artifacts: ArtifactSlotDto[];
  isTeamLead: boolean;
  onSubmissionChange: (next: ProjectReportSubmissionDto) => void;
  onGoToVault?: () => void;
}

export const WorkspaceSubmissionTab: React.FC<WorkspaceSubmissionTabProps> = ({
  submission,
  artifacts,
  isTeamLead,
  onSubmissionChange,
  onGoToVault,
}) => {
  const [title, setTitle] = useState(submission?.projectTitle || "");
  const [abstract, setAbstract] = useState(submission?.abstract || "");
  const [problemStatement, setProblemStatement] = useState(submission?.problemStatement || "");
  const [methodology, setMethodology] = useState(submission?.methodology || "");
  const [implSummary, setImplSummary] = useState(submission?.implementationSummary || "");
  const [results, setResults] = useState(submission?.resultsAndConclusion || "");
  const [references, setReferences] = useState(submission?.references || "");
  const [repoUrl, setRepoUrl] = useState(submission?.repositoryUrl || "");
  const [demoUrl, setDemoUrl] = useState(submission?.demoUrl || "");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const canEdit = canStudentEditSubmission(submission?.status, isTeamLead);

  const hasUnsavedChanges = hasSubmissionDraftChanges(
    {
      projectTitle: title,
      abstract,
      problemStatement,
      methodology,
      implementationSummary: implSummary,
      resultsAndConclusion: results,
      references,
      repositoryUrl: repoUrl,
      demoUrl,
    },
    submission
  );

  const readiness = submission?.readiness;
  const checks = [
    { label: "Faculty Guide", ok: Boolean(readiness?.hasAllocatedGuide) },
    { label: "Approved Milestone", ok: Boolean(readiness?.hasApprovedMilestones) },
    { label: "No Pending Reviews", ok: !readiness?.hasPendingMilestonesInReview },
    { label: "Required Fields", ok: Boolean(readiness?.hasRequiredAcademicFields) },
    { label: "Report Attached", ok: Boolean(readiness?.hasAttachedReport) },
  ];

  const handleSaveDraft = async () => {
    if (title.trim().length < 3 || abstract.trim().length < 20) {
      showToast("Title (min 3 chars) and Abstract (min 20 chars) are required.", "error");
      return;
    }
    setSaving(true);
    try {
      const updated = await studentApi.saveSubmissionDraft({
        projectTitle: title.trim(),
        abstract: abstract.trim(),
        problemStatement: problemStatement.trim(),
        methodology: methodology.trim(),
        implementationSummary: implSummary.trim(),
        resultsAndConclusion: results.trim(),
        references: references.trim(),
        repositoryUrl: repoUrl.trim() || undefined,
        demoUrl: demoUrl.trim() || undefined,
      });
      onSubmissionChange(updated);
      showToast("Draft saved.", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to save draft.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAttachFromVault = async () => {
    const thesis = artifacts.find((a) => a.slotType === "FinalThesis" && a.fileName);
    if (!thesis?.fileName) {
      showToast("Upload your Final Thesis in the Vault tab first.", "error");
      return;
    }
    try {
      const res = await studentApi.attachReportDeliverable({
        reportFileName: thesis.fileName,
        reportFileSizeBytes: thesis.fileSizeBytes || 0,
        reportSha256Checksum: thesis.sha256Checksum || "",
      });
      onSubmissionChange(res);
      showToast("Report attached from vault.", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to attach report.", "error");
    }
  };

  const handleRequestSubmit = () => {
    if (hasUnsavedChanges) {
      showToast("Save your draft changes before submitting the final report.", "warning");
      return;
    }
    setConfirmSubmitOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const submitted = await studentApi.submitFinalReport({});
      onSubmissionChange(submitted);
      setConfirmSubmitOpen(false);
      showToast("Final report submitted for review.", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Submission failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const statusVariant =
    submission?.status === "Accepted"
      ? "success"
      : submission?.status === "RevisionRequested"
      ? "warning"
      : submission?.status === "Submitted" || submission?.status === "Resubmitted"
      ? "info"
      : "neutral";

  return (
    <div className="space-y-5">
      {/* Compact Readiness Bar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Final Project Report</CardTitle>
          <Badge variant={statusVariant} size="sm">
            {submission ? `${submission.status} (v${submission.versionNumber})` : "Draft"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {checks.map((c) => (
              <div
                key={c.label}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs ${
                  c.ok
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                {c.ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-slate-400" />
                )}
                <span>{c.label}</span>
              </div>
            ))}
          </div>

          {readiness?.blockingReasons && readiness.blockingReasons.length > 0 && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {readiness.blockingReasons.join(" • ")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Report Form */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <Input
            label="Project Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!canEdit}
          />
          <Textarea
            label="Abstract (min 20 chars)"
            value={abstract}
            onChange={(e) => setAbstract(e.target.value)}
            rows={3}
            disabled={!canEdit}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Textarea
              label="Problem Statement"
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              rows={3}
              disabled={!canEdit}
            />
            <Textarea
              label="Methodology"
              value={methodology}
              onChange={(e) => setMethodology(e.target.value)}
              rows={3}
              disabled={!canEdit}
            />
            <Textarea
              label="Implementation Summary"
              value={implSummary}
              onChange={(e) => setImplSummary(e.target.value)}
              rows={3}
              disabled={!canEdit}
            />
            <Textarea
              label="Results & Conclusion"
              value={results}
              onChange={(e) => setResults(e.target.value)}
              rows={3}
              disabled={!canEdit}
            />
          </div>
          <Textarea
            label="References"
            value={references}
            onChange={(e) => setReferences(e.target.value)}
            rows={2}
            disabled={!canEdit}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Repository URL"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              disabled={!canEdit}
            />
            <Input
              label="Demo URL"
              value={demoUrl}
              onChange={(e) => setDemoUrl(e.target.value)}
              disabled={!canEdit}
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-semibold text-slate-800">Attached Report: </span>
              {submission?.reportFileName ? (
                <span className="text-emerald-700 font-medium">{submission.reportFileName}</span>
              ) : (
                <span className="text-slate-500">None</span>
              )}
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                {!artifacts.some((a) => a.slotType === "FinalThesis" && a.fileName) && onGoToVault && (
                  <Button size="sm" variant="ghost" onClick={onGoToVault}>
                    Upload in Vault &rarr;
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={handleAttachFromVault}>
                  Attach Thesis from Vault
                </Button>
              </div>
            )}
          </div>

          {canEdit && (
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={handleSaveDraft} isLoading={saving}>
                Save Draft
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!readiness?.isEligibleForSubmission || submitting}
                isLoading={submitting}
                onClick={handleRequestSubmit}
              >
                {submission?.status === "RevisionRequested" ? "Resubmit Report" : "Submit Final Report"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        isOpen={confirmSubmitOpen}
        onClose={() => !submitting && setConfirmSubmitOpen(false)}
        onConfirm={handleSubmit}
        title={submission?.status === "RevisionRequested" ? "Resubmit Final Project Report" : "Submit Final Project Report"}
        description="Once submitted, your final report and attachments are locked for faculty guide review until reviewed."
        confirmText={submission?.status === "RevisionRequested" ? "Resubmit Report" : "Submit Final Report"}
        variant="primary"
        isLoading={submitting}
      />

      {submission?.reviewHistories && submission.reviewHistories.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4 text-brand-primary" />
              <span>Review History</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {submission.reviewHistories.map((rev) => (
              <div key={rev.id} className="p-3 rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">
                    v{rev.submissionVersion} — {rev.resultStatus}
                  </span>
                  <span className="text-slate-400">
                    {new Date(rev.reviewedAtUtc).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-600">{rev.feedback}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
