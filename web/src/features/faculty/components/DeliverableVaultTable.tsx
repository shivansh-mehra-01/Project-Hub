import React from "react";
import { ArtifactSlotDto, ArtifactStatus, ArtifactSlotType } from "@/lib/api/types";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Download, CheckCircle2, RotateCcw, FileText } from "lucide-react";

export interface DeliverableVaultTableProps {
  artifacts: ArtifactSlotDto[];
  isLoading?: boolean;
  onDownload: (artifact: ArtifactSlotDto) => void;
  onReview: (artifact: ArtifactSlotDto, isApproved: boolean, note?: string) => void;
  canReview?: boolean;
}

export const DeliverableVaultTable: React.FC<DeliverableVaultTableProps> = ({
  artifacts,
  isLoading,
  onDownload,
  onReview,
  canReview = true,
}) => {
  const slotLabels: Record<ArtifactSlotType, string> = {
    Synopsis: "Project Synopsis",
    MidTermPPT: "Mid-Term Review Deck (PPT)",
    PlagiarismReport: "Plagiarism & Similarity Report",
    FinalThesis: "Final Capstone Thesis",
  };

  const getStatusBadge = (status: ArtifactStatus) => {
    switch (status) {
      case "Verified":
        return <Badge variant="success" dot>Verified</Badge>;
      case "Uploaded":
        return <Badge variant="info" dot>Uploaded</Badge>;
      case "RevisionRequested":
        return <Badge variant="danger" dot>Revision Requested</Badge>;
      case "Missing":
      default:
        return <Badge variant="neutral">Pending Upload</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-lg border border-slate-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold text-[11px] tracking-wider">
          <tr>
            <th className="py-3 px-4">Deliverable Slot</th>
            <th className="py-3 px-4">File Name</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Reviewer Note</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0]">
          {artifacts.map((art) => {
            const hasFile = art.status !== "Missing" && art.id;
            return (
              <tr key={art.slotType} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-4 font-medium text-[#0F172A] whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-md bg-slate-100 text-slate-700">
                      <FileText className="w-3.5 h-3.5" />
                    </span>
                    <span>{slotLabels[art.slotType] || art.slotType}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-[#64748B] font-mono text-[11px]">
                  {art.fileName || "—"}
                  {art.fileSizeBytes > 0 && (
                    <span className="text-[10px] text-slate-400 ml-1">
                      ({Math.round(art.fileSizeBytes / 1024)} KB)
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  {getStatusBadge(art.status)}
                </td>
                <td className="py-3 px-4 text-xs text-[#64748B] max-w-xs truncate" title={art.reviewerNote || ""}>
                  {art.reviewerNote || "—"}
                </td>
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    {hasFile ? (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onDownload(art)}
                          leftIcon={<Download className="w-3.5 h-3.5" />}
                        >
                          Download
                        </Button>
                        {canReview && art.status !== "Verified" && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="border-amber-300 text-amber-800 hover:bg-amber-50"
                              onClick={() => {
                                const note = window.prompt("Enter revision instructions for students:");
                                if (note !== null) {
                                  onReview(art, false, note.trim() || undefined);
                                }
                              }}
                              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                            >
                              Request Revision
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => onReview(art, true)}
                              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                            >
                              Attest
                            </Button>
                          </>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400 text-xs italic">Not submitted</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
