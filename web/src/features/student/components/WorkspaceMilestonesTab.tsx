"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, History, Plus } from "lucide-react";
import { Card } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { Textarea } from "@/design-system/components/Textarea";
import { Modal } from "@/design-system/components/Modal";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import { ConfirmationDialog, PageLoadingState } from "@/design-system/patterns/PageStates";
import { studentApi } from "@/lib/api/studentApi";
import { MilestoneReviewHistoryDto, ProjectMilestoneDto } from "@/lib/api/types";
import { showToast } from "@/lib/toast";
import {
  canStudentSubmitMilestone,
  validateHttpUrl,
} from "@/features/shared/projectLifecycleHelpers";

export interface WorkspaceMilestonesTabProps {
  milestones: ProjectMilestoneDto[];
  isTeamLead: boolean;
  onRefreshMilestones: () => Promise<void>;
}

export const WorkspaceMilestonesTab: React.FC<WorkspaceMilestonesTabProps> = ({
  milestones,
  isTeamLead,
  onRefreshMilestones,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitTarget, setSubmitTarget] = useState<ProjectMilestoneDto | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [taskPct, setTaskPct] = useState(0);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<ProjectMilestoneDto | null>(null);
  const [historyItems, setHistoryItems] = useState<MilestoneReviewHistoryDto[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const openHistoryModal = async (milestone: ProjectMilestoneDto) => {
    setHistoryTarget(milestone);
    setLoadingHistory(true);
    setHistoryItems([]);
    try {
      const items = await studentApi.getMilestoneHistory(milestone.id);
      setHistoryItems(items || []);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to load milestone review history.", "error");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !description.trim() || !targetDate) {
      showToast("Fill all required milestone fields.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await studentApi.createWorkspaceMilestone({
        title: title.trim(),
        description: description.trim(),
        targetDateUtc: new Date(targetDate).toISOString(),
        requiredTaskCompletionPercentage: taskPct,
      });
      setShowCreateModal(false);
      setTitle("");
      setDescription("");
      setTargetDate("");
      setTaskPct(0);
      showToast("Milestone created.", "success");
      await onRefreshMilestones();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to create milestone.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestSubmit = () => {
    if (!submitTarget) return;
    const urlCheck = validateHttpUrl(evidenceUrl);
    if (!urlCheck.valid) {
      showToast(urlCheck.error || "Invalid Evidence URL.", "error");
      return;
    }
    setConfirmSubmitOpen(true);
  };

  const handleSubmit = async () => {
    if (!submitTarget || !evidenceUrl.trim()) return;
    setSubmitting(true);
    try {
      await studentApi.submitWorkspaceMilestone(submitTarget.id, {
        submissionEvidenceUrl: evidenceUrl.trim(),
        submissionNotes: notes.trim() || undefined,
      });
      setConfirmSubmitOpen(false);
      setSubmitTarget(null);
      setEvidenceUrl("");
      setNotes("");
      showToast("Milestone submitted for guide review.", "success");
      await onRefreshMilestones();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to submit milestone.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Milestones ({milestones.length})</h3>
        {isTeamLead && (
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setShowCreateModal(true)}
          >
            New Milestone
          </Button>
        )}
      </div>

      {milestones.length === 0 ? (
        <EmptyState
          title="No milestones yet"
          description={isTeamLead ? "Create a milestone to track project checkpoints." : "No milestones created yet."}
        />
      ) : (
        <div className="space-y-3">
          {milestones.map((m) => {
            const variant =
              m.status === "Approved"
                ? "success"
                : m.status === "SubmittedForReview"
                ? "info"
                : m.status === "RevisionRequested"
                ? "warning"
                : "neutral";

            const label =
              m.status === "Approved"
                ? "Approved"
                : m.status === "SubmittedForReview"
                ? "In Review"
                : m.status === "RevisionRequested"
                ? "Revision Requested"
                : "Pending";

            return (
              <Card key={m.id} className="p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">{m.title}</h4>
                      <Badge variant={variant} size="sm">{label}</Badge>
                      {m.isOverdue && m.status !== "Approved" && (
                        <Badge variant="danger" size="sm">Overdue</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">{m.description}</p>
                  </div>
                  <div className="text-xs text-slate-500 shrink-0 tabular-nums">
                    Due {new Date(m.targetDateUtc).toLocaleDateString()}
                  </div>
                </div>

                {m.requiredTaskCompletionPercentage > 0 && (
                  <div className="text-xs text-slate-600 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-brand-primary" />
                    <span>Requires {m.requiredTaskCompletionPercentage}% task completion</span>
                  </div>
                )}

                {m.reviewFeedback && (
                  <div
                    className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                      m.status === "Approved"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : "bg-amber-50 border-amber-200 text-amber-900"
                    }`}
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{m.reviewFeedback}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-3">
                    {m.submissionEvidenceUrl && (
                      <a
                        href={m.submissionEvidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-brand-primary hover:underline font-medium"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>View Evidence</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => openHistoryModal(m)}
                      className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                    >
                      <History className="h-3 w-3" />
                      <span>Review History</span>
                    </button>
                  </div>
                  {canStudentSubmitMilestone(m.status, isTeamLead) && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setSubmitTarget(m);
                        setEvidenceUrl(m.submissionEvidenceUrl || "");
                        setNotes("");
                      }}
                    >
                      {m.status === "RevisionRequested" ? "Resubmit" : "Submit for Review"}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Milestone Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New Milestone"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreate} isLoading={submitting}>
              Create
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <Input
            label="Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Architecture Sign-off"
          />
          <Textarea
            label="Description *"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Deliverables and acceptance criteria..."
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Target Date *"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
            <Input
              label="Required Tasks (%)"
              type="number"
              min={0}
              max={100}
              value={taskPct.toString()}
              onChange={(e) => setTaskPct(parseInt(e.target.value, 10) || 0)}
            />
          </div>
        </div>
      </Modal>

      {/* Submit Milestone Modal */}
      <Modal
        isOpen={Boolean(submitTarget)}
        onClose={() => setSubmitTarget(null)}
        title={`Submit: ${submitTarget?.title || "Milestone"}`}
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={() => setSubmitTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleRequestSubmit} disabled={submitting}>
              Submit
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <Input
            label="Evidence URL *"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
            placeholder="https://github.com/..."
          />
          <Textarea
            label="Notes (Optional)"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Summary for your faculty guide..."
          />
        </div>
      </Modal>

      <ConfirmationDialog
        isOpen={confirmSubmitOpen}
        onClose={() => !submitting && setConfirmSubmitOpen(false)}
        onConfirm={handleSubmit}
        title="Submit Milestone for Review"
        description={`Submit "${submitTarget?.title || "Milestone"}" to your faculty guide? Editing will be locked while it is under review.`}
        confirmText="Submit Milestone"
        variant="primary"
        isLoading={submitting}
      />

      <Modal
        isOpen={Boolean(historyTarget)}
        onClose={() => setHistoryTarget(null)}
        title={`Review History: ${historyTarget?.title || "Milestone"}`}
        footer={
          <Button variant="secondary" size="sm" onClick={() => setHistoryTarget(null)}>
            Close
          </Button>
        }
      >
        {loadingHistory ? (
          <PageLoadingState message="Loading milestone review history..." className="py-6" />
        ) : historyItems.length === 0 ? (
          <EmptyState
            title="No review history yet"
            description="Guide review decisions and feedback for this milestone will appear here."
            className="py-6"
          />
        ) : (
          <div className="space-y-2.5 text-xs max-h-80 overflow-y-auto">
            {historyItems.map((rev) => (
              <div key={rev.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">
                    {rev.reviewerName} • {rev.resultStatus}
                  </span>
                  <span className="text-slate-400 tabular-nums">
                    {new Date(rev.reviewedAtUtc).toLocaleDateString()}
                  </span>
                </div>
                {rev.feedback && <p className="text-slate-600">{rev.feedback}</p>}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};
