import React from "react";
import { AssignedDefenseTeamMemberDto, StudentScoreInput } from "@/lib/api/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";

export interface IndividualStudentScoringTableProps {
  members: AssignedDefenseTeamMemberDto[];
  scores: Record<string, StudentScoreInput>;
  sharedScaledScore: number; // out of 60m
  onChange: (studentId: string, updated: StudentScoreInput) => void;
  disabled?: boolean;
}

export const IndividualStudentScoringTable: React.FC<IndividualStudentScoringTableProps> = ({
  members,
  scores,
  sharedScaledScore,
  onChange,
  disabled = false,
}) => {
  const handleScoreChange = (
    studentId: string,
    field: "moduleOwnershipScore" | "vivaQaScore" | "logDisciplineScore",
    val: number,
    max: number
  ) => {
    const clamped = Math.max(0, Math.min(max, isNaN(val) ? 0 : val));
    const current = scores[studentId] || {
      studentUserId: studentId,
      moduleOwnershipScore: 0,
      vivaQaScore: 0,
      logDisciplineScore: 0,
    };
    onChange(studentId, {
      ...current,
      [field]: clamped,
    });
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-3 border-b border-[#E2E8F0]">
        <CardTitle className="text-sm font-bold text-[#0F172A]">
          Individual Student Assessment Matrix (40% Weight)
        </CardTitle>
        <p className="text-xs text-[#64748B] mt-0.5">
          Mandatory individual grading for every active student member (Module /40m + Viva /40m + Log Discipline /20m = 100m total individual)
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Assigned Module</th>
                <th className="py-3 px-3 text-center">Module (/40)</th>
                <th className="py-3 px-3 text-center">Viva (/40)</th>
                <th className="py-3 px-3 text-center">Discipline (/20)</th>
                <th className="py-3 px-4 text-center">Individual Total (/100)</th>
                <th className="py-3 px-4 text-right">Blended Final Mark (/100)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {members.map((m) => {
                const s = scores[m.userId] || {
                  studentUserId: m.userId,
                  moduleOwnershipScore: 0,
                  vivaQaScore: 0,
                  logDisciplineScore: 0,
                };

                const indivTotal =
                  s.moduleOwnershipScore + s.vivaQaScore + s.logDisciplineScore;
                const indivWeighted = Math.round(indivTotal * 0.4 * 10) / 10;
                const finalMark = Math.round((sharedScaledScore + indivWeighted) * 10) / 10;

                return (
                  <tr key={m.userId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs">
                          {m.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-[#0F172A]">{m.fullName}</p>
                          <p className="text-[10px] text-[#64748B] font-mono">{m.enrollmentCode}</p>
                        </div>
                        {m.isTeamLead && (
                          <Badge variant="role" role="TeamLead" size="sm">
                            Lead
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#64748B] max-w-xs truncate">
                      {m.moduleResponsibility || (
                        <span className="italic text-slate-400">Full System Scope</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min={0}
                        max={40}
                        step={0.5}
                        disabled={disabled}
                        value={s.moduleOwnershipScore}
                        onChange={(e) =>
                          handleScoreChange(
                            m.userId,
                            "moduleOwnershipScore",
                            parseFloat(e.target.value),
                            40
                          )
                        }
                        className="w-16 text-center font-mono py-1 px-1 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min={0}
                        max={40}
                        step={0.5}
                        disabled={disabled}
                        value={s.vivaQaScore}
                        onChange={(e) =>
                          handleScoreChange(
                            m.userId,
                            "vivaQaScore",
                            parseFloat(e.target.value),
                            40
                          )
                        }
                        className="w-16 text-center font-mono py-1 px-1 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min={0}
                        max={20}
                        step={0.5}
                        disabled={disabled}
                        value={s.logDisciplineScore}
                        onChange={(e) =>
                          handleScoreChange(
                            m.userId,
                            "logDisciplineScore",
                            parseFloat(e.target.value),
                            20
                          )
                        }
                        className="w-16 text-center font-mono py-1 px-1 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-700">
                      <span>{indivTotal}</span>
                      <span className="text-[10px] text-slate-400 block font-sans">
                        (40%: {indivWeighted}m)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Badge
                        variant={
                          finalMark >= 75
                            ? "success"
                            : finalMark >= 50
                            ? "neutral"
                            : "danger"
                        }
                        className="font-mono font-bold text-xs"
                      >
                        {finalMark} / 100
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
