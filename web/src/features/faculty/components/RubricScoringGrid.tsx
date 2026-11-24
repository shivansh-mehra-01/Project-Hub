import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/design-system/components/Card";

export interface RubricCriteriaScores {
  co1ProblemFormulation: number;
  co2Methodology: number;
  co3Implementation: number;
  co4Presentation: number;
}

export interface RubricScoringGridProps {
  scores: RubricCriteriaScores;
  onChange: (scores: RubricCriteriaScores) => void;
  disabled?: boolean;
}

export const RubricScoringGrid: React.FC<RubricScoringGridProps> = ({
  scores,
  onChange,
  disabled = false,
}) => {
  const criteria = [
    {
      key: "co1ProblemFormulation" as const,
      label: "Problem Formulation & Literature Review (CO1)",
      max: 20,
      description: "Clarity of research challenge, state-of-the-art literature survey, and feasibility analysis",
    },
    {
      key: "co2Methodology" as const,
      label: "Engineering Methodology & Architecture (CO2)",
      max: 30,
      description: "System block diagrams, algorithm design, hardware/software design trade-offs",
    },
    {
      key: "co3Implementation" as const,
      label: "Prototype Implementation & Verification (CO3)",
      max: 30,
      description: "Working hardware/software demonstration, test benches, modular code structure",
    },
    {
      key: "co4Presentation" as const,
      label: "Viva Defense, Q&A & Communication (CO4)",
      max: 20,
      description: "Oral presentation, cross-questioning defense, slides structure, and time management",
    },
  ];

  const rawTotal =
    scores.co1ProblemFormulation +
    scores.co2Methodology +
    scores.co3Implementation +
    scores.co4Presentation;

  // 60% weight of final mark (rawTotal out of 100m * 60%)
  const weightedScore = Math.round(rawTotal * 0.6 * 10) / 10;

  const handleScoreChange = (key: keyof RubricCriteriaScores, val: number, max: number) => {
    const clamped = Math.max(0, Math.min(max, isNaN(val) ? 0 : val));
    onChange({
      ...scores,
      [key]: clamped,
    });
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-3 border-b border-[#E2E8F0] flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-[#0F172A]">
            Shared Project Rubric (60% Weight)
          </CardTitle>
          <p className="text-xs text-[#64748B] mt-0.5">
            Team-level criteria mapped to Course Outcomes (CO1–CO4) • Total 100m
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-[#64748B] block">Team Mark / 60% Contribution</span>
          <span className="text-base font-bold text-emerald-700">
            {weightedScore} / 60.0
          </span>
          <span className="text-[10px] text-slate-400 block font-mono">
            (Team Raw: {rawTotal} / 100m)
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4 text-xs">
        {criteria.map((c) => (
          <div
            key={c.key}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200"
          >
            <div className="max-w-md">
              <p className="font-semibold text-[#0F172A]">{c.label}</p>
              <p className="text-[11px] text-[#64748B] mt-0.5">{c.description}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="number"
                min={0}
                max={c.max}
                step={0.5}
                disabled={disabled}
                value={scores[c.key] || 0}
                onChange={(e) =>
                  handleScoreChange(c.key, parseFloat(e.target.value), c.max)
                }
                className="w-20 text-center font-mono font-semibold py-1.5 px-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
              />
              <span className="text-xs text-[#64748B] font-mono w-10 text-right">
                / {c.max}m
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
