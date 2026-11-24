import React from "react";
import { ProjectProposalDto } from "@/lib/api/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Users, ArrowRight, AlertTriangle } from "lucide-react";

export interface MentoredTeamCardProps {
  team: ProjectProposalDto;
  onOpenWorkspace: (teamId: string) => void;
}

export const MentoredTeamCard: React.FC<MentoredTeamCardProps> = ({
  team,
  onOpenWorkspace,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ActiveBuild":
        return <Badge variant="success" dot>Active Build</Badge>;
      case "PendingGuide":
        return <Badge variant="warning" dot>Pending Guide</Badge>;
      case "PendingCoordinator":
        return <Badge variant="info" dot>Pending Coordinator</Badge>;
      case "ReadyForViva":
        return <Badge variant="info" dot>Ready for Viva</Badge>;
      case "Completed":
        return <Badge variant="success" dot>Completed</Badge>;
      case "AtRisk":
        return <Badge variant="danger" dot>At Risk</Badge>;
      case "Rejected":
        return <Badge variant="danger" dot>Rejected</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const isAtRisk = team.status === "AtRisk";

  return (
    <Card className="hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <Badge variant="neutral" className="font-mono text-xs font-semibold">
            {team.teamCode}
          </Badge>
          <div className="flex items-center gap-1.5">
            {isAtRisk && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800 border border-red-200"
                title="Team flagged At Risk due to missed logs or academic delay"
              >
                <AlertTriangle className="w-3 h-3" /> At Risk
              </span>
            )}
            {getStatusBadge(team.status)}
          </div>
        </div>
        <h3 className="font-semibold text-sm text-[#0F172A] line-clamp-1 leading-snug" title={team.title}>
          {team.title}
        </h3>
        <p className="text-xs text-[#64748B] line-clamp-2 mt-1">
          {team.abstract || "No project abstract provided."}
        </p>
      </CardHeader>

      <CardContent className="p-5 pt-0 pb-3 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F1F5F9] text-xs text-[#64748B]">
          {team.domainTag && (
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
              {team.domainTag}
            </span>
          )}
          {team.sdgCode && (
            <Badge variant="sdg" sdgNumber={parseInt(team.sdgCode.replace(/\D/g, "") || "9", 10)}>
              {team.sdgCode}
            </Badge>
          )}
          <span className="flex items-center gap-1 text-[11px] text-[#64748B] ml-auto">
            <Users className="w-3.5 h-3.5" />
            {team.memberCount} {team.memberCount === 1 ? "Student" : "Students"}
          </span>
        </div>

        {team.similarityScorePct !== undefined && team.similarityScorePct !== null && (
          <div className="text-[11px] text-[#64748B] flex items-center justify-between">
            <span>Similarity Advisory:</span>
            <span
              className={
                team.similarityScorePct > 20
                  ? "font-semibold text-amber-700"
                  : "font-semibold text-emerald-700"
              }
            >
              {team.similarityScorePct}% overlap
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-5 pt-3 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400 font-mono">
          {team.similarProjectCode ? `Ref: ${team.similarProjectCode}` : team.teamCode}
        </span>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => onOpenWorkspace(team.teamId)}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          Open Workspace
        </Button>
      </CardFooter>
    </Card>
  );
};
