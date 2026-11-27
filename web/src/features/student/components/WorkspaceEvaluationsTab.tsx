"use client";

import React from "react";
import { Award, Calendar, ExternalLink, Lock, MapPin, Users2, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import { StudentVivaResultDto } from "@/lib/api/types";

export interface WorkspaceEvaluationsTabProps {
  evaluation: StudentVivaResultDto | null;
}

export const WorkspaceEvaluationsTab: React.FC<WorkspaceEvaluationsTabProps> = ({
  evaluation,
}) => {
  if (!evaluation) {
    return (
      <Card>
        <CardContent className="py-10">
          <EmptyState
            title="Evaluation Not Scheduled"
            description="Defense schedules and scores will appear here once scheduled by your department."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand-primary" />
            <span>Viva Defense Schedule</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={evaluation.isPublished ? "success" : "info"} size="sm">
              {evaluation.evaluationStage}
            </Badge>
            <Badge
              variant={
                evaluation.outcome === "Pass"
                  ? "success"
                  : evaluation.outcome === "Fail"
                  ? "danger"
                  : evaluation.outcome === "ReViva"
                  ? "warning"
                  : "neutral"
              }
              size="sm"
            >
              {evaluation.outcome}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="text-xs space-y-3">
          {evaluation.schedule ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-slate-500">Date &amp; Time</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {new Date(evaluation.schedule.scheduledDateUtc).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}{" "}
                    ({evaluation.schedule.durationMinutes}m)
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-slate-500">Venue / Link</div>
                  {evaluation.schedule.venueOrLink.toLowerCase().startsWith("http") ? (
                    <a
                      href={evaluation.schedule.venueOrLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand-primary hover:underline inline-flex items-center gap-1 mt-0.5"
                    >
                      <Video className="h-3.5 w-3.5" />
                      <span>Join Virtual Defense</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <div className="font-semibold text-slate-900 inline-flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                      <span>{evaluation.schedule.venueOrLink}</span>
                    </div>
                  )}
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-slate-500">Evaluators</div>
                  <div className="font-semibold text-slate-900 inline-flex items-center gap-1 mt-0.5">
                    <Users2 className="h-3.5 w-3.5 text-slate-500" />
                    <span>
                      {evaluation.schedule.evaluatorNames?.length
                        ? evaluation.schedule.evaluatorNames.join(", ")
                        : "Panel Assigned"}
                    </span>
                  </div>
                </div>
              </div>
              {evaluation.schedule.candidateInstructions && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                  <strong>Instructions:</strong> {evaluation.schedule.candidateInstructions}
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-500">Defense date and venue have not been scheduled yet.</p>
          )}
        </CardContent>
      </Card>

      {!evaluation.isPublished ? (
        <Card>
          <CardContent className="p-5 flex items-center gap-3 text-xs text-slate-600">
            <Lock className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Scores remain sealed until officially published by the department.</span>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-brand-primary" />
              <span>Published Scorecard</span>
            </CardTitle>
            <div className="text-lg font-bold text-brand-primary tabular-nums">
              {evaluation.sharedTotalScore?.toFixed(1) ?? "0"} / {evaluation.sharedMaxScore?.toFixed(1) ?? "0"}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {evaluation.criteriaScores && evaluation.criteriaScores.length > 0 && (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {evaluation.criteriaScores.map((c) => (
                  <div key={c.criterionCode} className="px-3 py-2 flex items-center justify-between">
                    <span className="font-medium text-slate-800">{c.title || c.criterionCode}</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {c.awardedMarks.toFixed(1)} / {c.maxMarks.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {evaluation.myIndividualScore && (
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between font-bold text-emerald-950">
                  <span>Your Individual Score</span>
                  <span>Final Mark: {evaluation.myIndividualScore.finalComputedStudentMark.toFixed(1)}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>Ownership: <strong>{evaluation.myIndividualScore.moduleOwnershipScore.toFixed(1)}/10</strong></div>
                  <div>Viva Q&amp;A: <strong>{evaluation.myIndividualScore.vivaQaScore.toFixed(1)}/10</strong></div>
                  <div>Logbook: <strong>{evaluation.myIndividualScore.logDisciplineScore.toFixed(1)}/10</strong></div>
                  <div>Subtotal: <strong>{evaluation.myIndividualScore.individualTotalScore.toFixed(1)}/30</strong></div>
                </div>
              </div>
            )}

            {evaluation.generalRemarks && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <strong>Panel Feedback:</strong> {evaluation.generalRemarks}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
