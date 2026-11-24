import React, { useState } from "react";
import { Modal } from "@/design-system/components/Modal";
import { Button } from "@/design-system/components/Button";
import { AlertCircle, AlertTriangle } from "lucide-react";

export type ProposalDecisionType = "endorse" | "return" | "reject";

export interface ProposalDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  decisionType: ProposalDecisionType;
  teamId: string;
  teamCode?: string;
  onConfirm: (teamId: string, decision: ProposalDecisionType, remarks?: string) => Promise<void>;
}

export const ProposalDecisionModal: React.FC<ProposalDecisionModalProps> = ({
  isOpen,
  onClose,
  decisionType,
  teamId,
  teamCode = "Team",
  onConfirm,
}) => {
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isEndorse = decisionType === "endorse";
  const isReturn = decisionType === "return";
  const isReject = decisionType === "reject";

  const getTitle = () => {
    if (isEndorse) return `Endorse Project Proposal (${teamCode})`;
    if (isReturn) return `Return Proposal for Revision (${teamCode})`;
    return `Reject Project Proposal (${teamCode})`;
  };

  const handleAction = async () => {
    setErrorMsg(null);
    if (!isEndorse && (!remarks.trim() || remarks.trim().length < 5)) {
      setErrorMsg(
        `Mandatory remarks of at least 5 characters required when ${
          isReturn ? "returning" : "rejecting"
        } a proposal.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(teamId, decisionType, remarks.trim() || undefined);
      setRemarks("");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process proposal decision.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()} size="md">
      <div className="space-y-4">
        {isEndorse ? (
          <p className="text-xs text-[#475569] leading-relaxed">
            Are you sure you want to endorse this proposal? The team will advance to{" "}
            <strong className="text-[#0F172A]">Pending Coordinator</strong> status for departmental scheduling and review.
          </p>
        ) : (
          <div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                {isReturn
                  ? "Returning resets the team to Draft status and unlocks the roster for revisions. Your guide assignment will be preserved."
                  : "Rejecting resets the team to Draft status and revokes your guide assignment so students can formulate a new scope."}
              </span>
            </div>
            <label className="text-xs font-semibold text-[#0F172A] block mb-1">
              Mandatory Justification / Feedback (Minimum 5 characters)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                isReturn
                  ? "Explain what technical or formulation revisions are required..."
                  : "Explain why this proposal cannot be accepted for supervision..."
              }
              rows={4}
              className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 resize-none"
            />
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>

          <Button
            variant={isReject ? "danger" : isReturn ? "secondary" : "primary"}
            className={isReturn ? "border-amber-300 text-amber-800 hover:bg-amber-50" : undefined}
            onClick={handleAction}
            isLoading={isSubmitting}
          >
            {isEndorse ? "Confirm Endorsement" : isReturn ? "Return to Team" : "Confirm Rejection"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
