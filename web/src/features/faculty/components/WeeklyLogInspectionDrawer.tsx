import React, { useState } from "react";
import { ActionQueueItemDto } from "@/lib/api/types";
import { SlideOverDrawer } from "@/design-system/components/SlideOverDrawer";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { CheckCircle2, AlertCircle } from "lucide-react";

export interface WeeklyLogInspectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: ActionQueueItemDto | null;
  onVerify: (logId: string, decision: "Approved" | "NeedsRevision", remarks?: string) => Promise<void>;
}

export const WeeklyLogInspectionDrawer: React.FC<WeeklyLogInspectionDrawerProps> = ({
  isOpen,
  onClose,
  item,
  onVerify,
}) => {
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!item) return null;

  const handleAction = async (decision: "Approved" | "NeedsRevision") => {
    setErrorMsg(null);
    if (decision === "NeedsRevision" && (!remarks.trim() || remarks.trim().length < 5)) {
      setErrorMsg("Mandatory remarks of at least 5 characters required when requesting revision.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onVerify(item.itemId, decision, remarks.trim() || undefined);
      setRemarks("");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record logbook verification.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SlideOverDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Weekly Progress Logbook Verification"
      width="md"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <Badge variant="neutral" className="font-mono text-xs">
              {item.teamCode}
            </Badge>
            <h4 className="font-semibold text-[#0F172A] text-sm mt-1">
              {item.teamTitle}
            </h4>
          </div>
          <Badge variant="warning" dot>Pending Sign-off</Badge>
        </div>

        <div>
          <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block mb-1">
            Student Submission Description
          </label>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-[#0F172A] leading-relaxed whitespace-pre-wrap">
            {item.description}
          </div>
        </div>

        <div className="text-xs text-[#64748B]">
          <span className="font-medium">Submitted:</span>{" "}
          {new Date(item.submittedAtUtc).toLocaleString()}
        </div>

        <div>
          <label className="text-xs font-semibold text-[#0F172A] block mb-1.5">
            Faculty Guide Remarks & Recommendations
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter feedback or specific revision requirements (mandatory if requesting revision)..."
            rows={4}
            className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 resize-none"
          />
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            variant="secondary"
            className="border-amber-300 text-amber-800 hover:bg-amber-50"
            onClick={() => handleAction("NeedsRevision")}
            isLoading={isSubmitting}
          >
            Request Revision
          </Button>

          <Button
            variant="primary"
            onClick={() => handleAction("Approved")}
            isLoading={isSubmitting}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Verify & Sign
          </Button>
        </div>
      </div>
    </SlideOverDrawer>
  );
};
