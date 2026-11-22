import React, { useState } from "react";
import { Modal } from "@/design-system/components/Modal";
import { Button } from "@/design-system/components/Button";
import { AlertCircle, RotateCcw } from "lucide-react";
import { hodApi } from "@/lib/api";

export interface ReturnProposalModalProps {
  team: { id: string; teamCode: string; title: string } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const ReturnProposalModal: React.FC<ReturnProposalModalProps> = ({
  team,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!team) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarks.trim()) {
      setErrorMessage("Please enter revision remarks explaining the required changes.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await hodApi.returnProposal(team.id, remarks.trim());
      onSuccess(`Proposal ${team.teamCode} returned to Draft with revision remarks.`);
      setRemarks("");
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to return proposal. Please try again.");
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
          <RotateCcw className="h-5 w-5 text-amber-600" />
          <span className="text-sm font-bold text-slate-900">Return Proposal for Revision</span>
        </div>
      }
      description="Returns the student capstone proposal to Draft status for student & coordinator revisions."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-amber-900">Proposal Team:</span>
            <span className="font-mono font-bold text-amber-900">{team.teamCode}</span>
          </div>
          <p className="text-slate-800 font-medium truncate">{team.title}</p>
        </div>

        <div>
          <label className="block font-semibold text-slate-800 mb-1.5">
            HOD Technical Revision Remarks & Action Items <span className="text-rose-600">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={remarks}
            onChange={(e) => {
              setRemarks(e.target.value);
              setErrorMessage(null);
            }}
            placeholder="e.g. Please refine system architecture diagram, clarify sensor interface methodology, and resubmit through faculty guide."
            className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary leading-relaxed"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            These remarks will be immediately delivered to the student team and assigned guide.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            className="bg-amber-700 hover:bg-amber-800 text-white"
          >
            Return to Coordinator
          </Button>
        </div>
      </form>
    </Modal>
  );
};
