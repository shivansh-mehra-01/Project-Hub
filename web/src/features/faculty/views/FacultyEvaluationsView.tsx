"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AssignedDefenseTeamDto, StudentScoreInput, ArtifactSlotDto } from "@/lib/api/types";
import { facultyApi } from "@/lib/api/facultyApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import {
  RubricScoringGrid,
  RubricCriteriaScores,
} from "@/features/faculty/components/RubricScoringGrid";
import { IndividualStudentScoringTable } from "@/features/faculty/components/IndividualStudentScoringTable";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  FileCheck2,
  Lock,
  RefreshCw,
  ShieldAlert,
  Users,
} from "lucide-react";

export const FacultyEvaluationsView: React.FC = () => {
  const [teams, setTeams] = useState<AssignedDefenseTeamDto[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Deliverables verification state for FinalViva
  const [artifacts, setArtifacts] = useState<ArtifactSlotDto[]>([]);
  const [artifactsLoading, setArtifactsLoading] = useState<boolean>(false);

  // Scoring states
  const [rubricScores, setRubricScores] = useState<RubricCriteriaScores>({
    co1ProblemFormulation: 16,
    co2Methodology: 24,
    co3Implementation: 25,
    co4Presentation: 17,
  });

  const [studentScores, setStudentScores] = useState<Record<string, StudentScoreInput>>({});
  const [generalRemarks, setGeneralRemarks] = useState<string>("");
  const [isLockedLocally, setIsLockedLocally] = useState<boolean>(false);

  const loadAssignedTeams = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await facultyApi.getAssignedDefenseTeams();
      const list = Array.isArray(data) ? data : [];
      setTeams(list);
      if (list.length > 0) {
        setSelectedTeamId((prev) => {
          const exists = list.some((t) => t.teamId === prev);
          return exists ? prev : list[0].teamId;
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load assigned viva defense panels.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAssignedTeams();
  }, [loadAssignedTeams]);

  const selectedTeam = useMemo(
    () => teams.find((t) => t.teamId === selectedTeamId),
    [teams, selectedTeamId]
  );

  // Reset student scores and fetch artifacts when selected team changes
  useEffect(() => {
    if (!selectedTeam) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLockedLocally(selectedTeam.isEvaluationLocked);
    setSuccessMessage(null);
    setErrorMessage(null);

    // Initialize student scores for team members
    const initialScores: Record<string, StudentScoreInput> = {};
    (selectedTeam.members || []).forEach((m) => {
      initialScores[m.userId] = {
        studentUserId: m.userId,
        moduleOwnershipScore: 32,
        vivaQaScore: 32,
        logDisciplineScore: 18,
      };
    });
    setStudentScores(initialScores);

    // If FinalViva, check artifacts verification status
    if (selectedTeam.checkpointType === "FinalViva") {
      setArtifactsLoading(true);
      facultyApi
        .getTeamArtifacts(selectedTeam.teamId)
        .then((data) => {
          setArtifacts(Array.isArray(data) ? data : []);
        })
        .catch(() => {
          setArtifacts([]);
        })
        .finally(() => {
          setArtifactsLoading(false);
        });
    } else {
      setArtifacts([]);
    }
  }, [selectedTeam]);

  // Check FinalViva deliverable gates
  const deliverableGate = useMemo(() => {
    if (!selectedTeam || selectedTeam.checkpointType !== "FinalViva") {
      return { passes: true, missing: [] };
    }

    const thesis = artifacts.find(
      (a) => a.slotType === "FinalThesis" && a.status === "Verified"
    );
    const plagiarism = artifacts.find(
      (a) => a.slotType === "PlagiarismReport" && a.status === "Verified"
    );

    const missing: string[] = [];
    if (!thesis) missing.push("Final Thesis Document");
    if (!plagiarism) missing.push("Plagiarism Verification Report (< 15% similarity)");

    return {
      passes: missing.length === 0,
      missing,
    };
  }, [selectedTeam, artifacts]);

  // Computed scores
  const rawSharedTotal = useMemo(
    () =>
      rubricScores.co1ProblemFormulation +
      rubricScores.co2Methodology +
      rubricScores.co3Implementation +
      rubricScores.co4Presentation,
    [rubricScores]
  );

  const sharedContribution = useMemo(
    () => Math.round(rawSharedTotal * 0.6 * 10) / 10,
    [rawSharedTotal]
  );

  const handleStudentScoreChange = (studentId: string, updated: StudentScoreInput) => {
    setStudentScores((prev) => ({
      ...prev,
      [studentId]: updated,
    }));
  };

  const handleSubmitEvaluation = async () => {
    if (!selectedTeam) return;

    if (selectedTeam.isGuideConflict) {
      setErrorMessage(
        "Academic Policy Violation: You cannot grade a team you are guiding as primary mentor."
      );
      return;
    }

    if (!deliverableGate.passes) {
      setErrorMessage(
        `Final Viva Gate Blocked: ${deliverableGate.missing.join(" and ")} must be verified.`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = {
      projectTeamId: selectedTeam.teamId,
      checkpointType: selectedTeam.checkpointType,
      sharedRubricScoresJson: JSON.stringify(rubricScores),
      sharedTotalScore: rawSharedTotal,
      generalRemarks: generalRemarks.trim() || undefined,
      studentScores: Object.values(studentScores),
    };

    try {
      const res = await facultyApi.submitVivaEvaluation(payload);
      if (res && res.success) {
        setIsLockedLocally(true);
        setSuccessMessage(
          "Marks locked & recorded successfully. Institutional completion sign-off is pending department administration."
        );
      } else {
        setErrorMessage(
          "Evaluation submission failed. Ensure you are an appointed evaluator for this track."
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error occurred while submitting defense marks.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLocked = isLockedLocally || selectedTeam?.isEvaluationLocked || false;
  const isConflict = selectedTeam?.isGuideConflict || false;

  return (
    <div className="space-y-6">
      {/* Team Selector & Metadata Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Select Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="p-4 pb-2 border-b border-[#E2E8F0]">
            <CardTitle className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Assigned Defense Teams ({teams.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-[#64748B]">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                Loading appointed viva panels...
              </div>
            ) : teams.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B]">
                <Clock className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                No viva defense panels currently scheduled for your evaluator profile.
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#0F172A] block">
                  Select Team for Examination
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full text-xs font-medium py-2 px-3 bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {teams.map((t) => (
                    <option key={t.teamId} value={t.teamId}>
                      {t.teamCode} — {t.title.slice(0, 35)}...
                    </option>
                  ))}
                </select>

                {selectedTeam && (
                  <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div>
                      <span className="text-[#64748B] block text-[11px]">Checkpoint</span>
                      <span className="font-semibold text-slate-800">
                        {selectedTeam.checkpointType}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block text-[11px]">Venue / Mode</span>
                      <span className="font-mono text-slate-700">
                        {selectedTeam.roomOrLink || "Department Seminar Hall 3"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block text-[11px]">Assigned Guide</span>
                      <span className="font-medium text-slate-800">
                        {selectedTeam.guideName || "Not Assigned"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block text-[11px]">Examination Status</span>
                      {selectedTeam.isEvaluationLocked || isLockedLocally ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <Lock className="w-3.5 h-3.5" /> Marks Finalized & Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                          <Clock className="w-3.5 h-3.5" /> Pending Evaluation
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Team Overview */}
        <div className="lg:col-span-2 space-y-4">
          {selectedTeam ? (
            <>
              {/* Conflict of Interest Warning */}
              {isConflict && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-sm">
                      Conflict of Interest Safeguard Active
                    </h3>
                    <p className="text-xs text-amber-800 mt-1">
                      You are designated as the primary faculty mentor for{" "}
                      <span className="font-semibold">{selectedTeam.teamCode}</span>.
                      Per institutional statutory guidelines and university accreditation standards,
                      project guides cannot serve as viva examiners for their own teams.
                      Evaluation inputs have been locked.
                    </p>
                  </div>
                </div>
              )}

              {/* FinalViva Gate Banner */}
              {selectedTeam.checkpointType === "FinalViva" && (
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    deliverableGate.passes
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-rose-50 border-rose-200 text-rose-900"
                  }`}
                >
                  {deliverableGate.passes ? (
                    <FileCheck2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm">
                      Final Viva Defense Deliverables Gate
                    </h3>
                    {artifactsLoading ? (
                      <p className="text-xs text-slate-500 mt-1">
                        Verifying institutional deliverables repository...
                      </p>
                    ) : deliverableGate.passes ? (
                      <p className="text-xs text-emerald-800 mt-1">
                        Required statutory deliverables (Final Thesis & Plagiarism Verification
                        Report) are verified. Final defense evaluation may proceed.
                      </p>
                    ) : (
                      <p className="text-xs text-rose-800 mt-1">
                        Cannot submit final defense marks. The following required deliverables are
                        unverified:{" "}
                        <span className="font-semibold">
                          {deliverableGate.missing.join(", ")}
                        </span>
                        . Guide must verify deliverables prior to viva examination.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Locked Notice */}
              {isLocked && !isConflict && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 flex items-start gap-3">
                  <Lock className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-sm">Evaluation Finalized</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Marks have been submitted and locked into the institutional ledger. Any score
                      modifications require an approved Grade Unlock Exception signed off by the
                      Head of Department (HOD).
                    </p>
                  </div>
                </div>
              )}

              {/* Status and Feedback Alerts */}
              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
              {successMessage && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Scoring Forms */}
              <div className="space-y-6">
                {/* 60% Team Rubric */}
                <RubricScoringGrid
                  scores={rubricScores}
                  onChange={setRubricScores}
                  disabled={isLocked || isConflict}
                />

                {/* 40% Individual Student Matrix */}
                <IndividualStudentScoringTable
                  members={selectedTeam.members}
                  scores={studentScores}
                  sharedScaledScore={sharedContribution}
                  onChange={handleStudentScoreChange}
                  disabled={isLocked || isConflict}
                />

                {/* General Remarks */}
                <Card>
                  <CardHeader className="p-4 pb-2 border-b border-[#E2E8F0]">
                    <CardTitle className="text-sm font-semibold text-[#0F172A]">
                      Examiner General Remarks & Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <textarea
                      rows={3}
                      disabled={isLocked || isConflict}
                      value={generalRemarks}
                      onChange={(e) => setGeneralRemarks(e.target.value)}
                      placeholder="Add examiner panel feedback, technical observations, patent/publication recommendations..."
                      className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </CardContent>
                </Card>

                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 text-white">
                  <div>
                    <span className="text-xs text-slate-400 block">
                      Blended Assessment Policy
                    </span>
                    <span className="text-sm font-semibold text-slate-100">
                      60% Shared Rubric + 40% Individual Viva & Module Assessment
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    disabled={
                      isLocked ||
                      isConflict ||
                      isSubmitting ||
                      !deliverableGate.passes ||
                      !selectedTeam.members ||
                      selectedTeam.members.length === 0
                    }
                    onClick={handleSubmitEvaluation}
                    className="gap-2 text-xs px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Locking & Submitting Marks...
                      </>
                    ) : isLocked ? (
                      <>
                        <Lock className="w-4 h-4" /> Marks Finalized
                      </>
                    ) : (
                      <>
                        <Award className="w-4 h-4" /> Finalize & Lock Viva Evaluation
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Select an assigned defense team to begin viva evaluation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
