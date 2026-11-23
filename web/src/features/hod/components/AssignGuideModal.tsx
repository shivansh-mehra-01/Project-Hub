import React, { useState, useEffect } from "react";
import { Modal } from "@/design-system/components/Modal";
import { Button } from "@/design-system/components/Button";
import { UserCheck, AlertCircle } from "lucide-react";
import { hodApi, HodProjectDto, FacultyWorkloadDto } from "@/lib/api";

export interface AssignGuideModalProps {
  project: HodProjectDto | null;
  faculty: FacultyWorkloadDto[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const AssignGuideModal: React.FC<AssignGuideModalProps> = ({
  project,
  faculty,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedGuideId, setSelectedGuideId] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      setSelectedGuideId(project.guideUserId || "");
      setReason("");
      setErrorMessage(null);
    }
  }, [project]);

  if (!project) return null;

  const isReassignment = !!project.guideUserId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuideId) {
      setErrorMessage("Please select an eligible faculty mentor.");
      return;
    }
    if (!reason.trim()) {
      setErrorMessage("Please provide a mandatory audit reason for allocation.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await hodApi.assignGuide(project.id, {
        guideUserId: selectedGuideId,
        reason: reason.trim(),
      });

      const successMsg = res.previousGuideName
        ? `Guide reassigned from ${res.previousGuideName} to ${res.guideName}. Audit logged.`
        : `Guide ${res.guideName} allocated to team ${res.teamCode}.`;

      onSuccess(successMsg);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to assign faculty guide. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-bold text-slate-900">
            {isReassignment ? "Reassign Faculty Guide" : "Allocate Faculty Guide"}
          </span>
        </div>
      }
      description={`Manage mentorship allocation for capstone team ${project.teamCode}.`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Project Context */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">Project Team:</span>
            <span className="font-mono font-bold text-slate-900">{project.teamCode}</span>
          </div>
          <p className="text-slate-700 font-medium truncate">{project.title}</p>
          {project.guideName && (
            <p className="text-[11px] text-slate-500">
              Current Assigned Mentor: <strong className="text-slate-800">{project.guideName}</strong>
            </p>
          )}
        </div>

        {/* Faculty Guide Selector */}
        <div>
          <label className="block font-semibold text-slate-800 mb-1.5">
            Select Department Faculty Mentor <span className="text-rose-600">*</span>
          </label>
          <select
            required
            value={selectedGuideId}
            onChange={(e) => {
              setSelectedGuideId(e.target.value);
              setErrorMessage(null);
            }}
            className="w-full rounded-lg border border-slate-300 p-2.5 text-xs bg-white text-slate-900 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary cursor-pointer"
          >
            <option value="">-- Choose eligible department faculty mentor --</option>
            {faculty.map((f) => {
              const isAtCapacity = f.currentMentoredTeams >= f.maxMentorTeams && f.facultyId !== project.guideUserId;
              return (
                <option
                  key={f.facultyId}
                  value={f.facultyId}
                  disabled={isAtCapacity}
                >
                  {f.fullName} — ({f.currentMentoredTeams} / {f.maxMentorTeams} teams mentored)
                  {isAtCapacity ? " [AT CAPACITY]" : ""}
                  {f.isProjectCoordinator ? " • Coordinator" : ""}
                </option>
              );
            })}
          </select>
        </div>

        {/* Audit Rationale */}
        <div>
          <label className="block font-semibold text-slate-800 mb-1.5">
            Mandatory Allocation Rationale <span className="text-rose-600">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setErrorMessage(null);
            }}
            placeholder="e.g. Mentor domain alignment with AI/ML research specialization or workload rebalancing."
            className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary leading-relaxed"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            This reason is permanently preserved in the departmental governance audit trail.
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            Confirm Allocation
          </Button>
        </div>
      </form>
    </Modal>
  );
};
