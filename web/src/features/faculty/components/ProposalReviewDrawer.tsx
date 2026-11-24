import React from "react";
import { ActionQueueItemDto, ProjectProposalDto } from "@/lib/api/types";
import { SlideOverDrawer } from "@/design-system/components/SlideOverDrawer";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { CheckCircle2, RotateCcw, XCircle, Users } from "lucide-react";

export interface ProposalReviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: ActionQueueItemDto | ProjectProposalDto | null;
  onEndorse: (teamId: string) => void;
  onReturn: (teamId: string) => void;
  onReject: (teamId: string) => void;
}

export const ProposalReviewDrawer: React.FC<ProposalReviewDrawerProps> = ({
  isOpen,
  onClose,
  proposal,
  onEndorse,
  onReturn,
  onReject,
}) => {
  if (!proposal) return null;

  const teamId = "teamId" in proposal ? proposal.teamId : proposal.projectTeamId;
  const teamCode = proposal.teamCode;
  const title = "title" in proposal ? proposal.title : proposal.teamTitle;
  const description = "description" in proposal ? proposal.description : proposal.abstract;
  const sdgCode = "sdgCode" in proposal ? proposal.sdgCode : undefined;
  const domainTag = "domainTag" in proposal ? proposal.domainTag : undefined;
  const memberCount = "memberCount" in proposal ? proposal.memberCount : undefined;
  const similarity = "similarityScorePct" in proposal ? proposal.similarityScorePct : undefined;

  return (
    <SlideOverDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Project Proposal Dossier Review"
      width="lg"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <Badge variant="neutral" className="font-mono text-xs">
              {teamCode}
            </Badge>
            <h3 className="font-semibold text-[#0F172A] text-base mt-1">
              {title}
            </h3>
          </div>
          <Badge variant="warning" dot>Pending Guide Endorsement</Badge>
        </div>

        <div>
          <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block mb-1">
            Project Abstract & Formulation
          </label>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-[#0F172A] leading-relaxed whitespace-pre-wrap">
            {description || "No detailed synopsis available."}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          {domainTag && (
            <div className="p-3 rounded-lg border border-slate-200">
              <span className="text-[#64748B] block text-[11px]">Domain / Specialization</span>
              <span className="font-semibold text-[#0F172A]">{domainTag}</span>
            </div>
          )}
          {sdgCode && (
            <div className="p-3 rounded-lg border border-slate-200">
              <span className="text-[#64748B] block text-[11px]">UN Sustainable Development Goal</span>
              <Badge variant="sdg" sdgNumber={parseInt(sdgCode.replace(/\D/g, "") || "9", 10)} className="mt-1">
                {sdgCode}
              </Badge>
            </div>
          )}
          {memberCount !== undefined && (
            <div className="p-3 rounded-lg border border-slate-200">
              <span className="text-[#64748B] block text-[11px]">Team Membership</span>
              <span className="font-semibold text-[#0F172A] flex items-center gap-1 mt-0.5">
                <Users className="w-3.5 h-3.5 text-[#64748B]" /> {memberCount} Registered Students
              </span>
            </div>
          )}
          {similarity !== undefined && similarity !== null && (
            <div className="p-3 rounded-lg border border-slate-200">
              <span className="text-[#64748B] block text-[11px]">Past Project Overlap</span>
              <span
                className={`font-semibold mt-0.5 inline-block ${
                  similarity > 20 ? "text-amber-700" : "text-emerald-700"
                }`}
              >
                {similarity}% Similarity Advisory
              </span>
            </div>
          )}
        </div>

        <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900 leading-normal">
          <strong>Guide Responsibility:</strong> Endorsing this proposal indicates that you agree to mentor this project team through the academic cycle and that the scope meets university curriculum requirements.
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Close
          </Button>

          <Button
            variant="danger"
            onClick={() => onReject(teamId)}
            leftIcon={<XCircle className="w-4 h-4" />}
          >
            Reject Proposal
          </Button>

          <Button
            variant="secondary"
            className="border-amber-300 text-amber-800 hover:bg-amber-50"
            onClick={() => onReturn(teamId)}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Return for Revision
          </Button>

          <Button
            variant="primary"
            onClick={() => onEndorse(teamId)}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Endorse Proposal
          </Button>
        </div>
      </div>
    </SlideOverDrawer>
  );
};
