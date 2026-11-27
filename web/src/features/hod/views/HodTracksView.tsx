"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Compass,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Lock,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Users,
  User,
  Calendar,
  BookOpen,
  X,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import {
  hodApi,
  CollegeTrackDto,
  HodAcademicContextDto,
  ParticipationMode,
  AcademicTrackStatus,
} from "@/lib/api";
import { HodProjectsTabBar } from "../components/HodProjectsTabBar";

const STATUS_BADGE: Record<AcademicTrackStatus, "success" | "warning" | "neutral" | "danger"> = {
  Open: "success",
  Draft: "neutral",
  Paused: "warning",
  Closed: "danger",
};

interface TrackFormState {
  name: string;
  description: string;
  academicYear: string;
  academicSessionId: string;
  semesterTermId: string;
  semesterNumber?: number;
  subjectOfferingId: string;
  participationMode: ParticipationMode;
  minTeamSize: number;
  maxTeamSize: number;
  allowCrossBranchTeams: boolean;
  allowInterdisciplinaryTeams: boolean;
  proposalDeadlineUtc: string;
  finalSubmissionDeadlineUtc: string;
  guideWeightPct: number;
  midTermWeightPct: number;
  finalVivaWeightPct: number;
  sharedProjectRubricPct: number;
  individualStudentRubricPct: number;
  launchImmediately: boolean;
}

const DEFAULT_FORM: TrackFormState = {
  name: "",
  description: "",
  academicYear: "2025-26",
  academicSessionId: "",
  semesterTermId: "",
  semesterNumber: undefined,
  subjectOfferingId: "",
  participationMode: "Team",
  minTeamSize: 2,
  maxTeamSize: 4,
  allowCrossBranchTeams: false,
  allowInterdisciplinaryTeams: false,
  proposalDeadlineUtc: "",
  finalSubmissionDeadlineUtc: "",
  guideWeightPct: 30,
  midTermWeightPct: 30,
  finalVivaWeightPct: 40,
  sharedProjectRubricPct: 60,
  individualStudentRubricPct: 40,
  launchImmediately: true,
};

export const HodTracksView: React.FC = () => {
  useDashboardHeader({
    title: "Department Project Tracks",
    breadcrumb: "HOD Console • Project Tracks",
  });

  const [tracks, setTracks] = useState<CollegeTrackDto[]>([]);
  const [context, setContext] = useState<HodAcademicContextDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<CollegeTrackDto | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<TrackFormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [tracksData, ctxData] = await Promise.all([
        hodApi.getTracks(),
        hodApi.getAcademicContext().catch(() => null),
      ]);
      setTracks(tracksData);
      setContext(ctxData);
    } catch (err: any) {
      setError(err?.message || "Failed to load department project tracks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateWizard = () => {
    const activeSession = context?.availableSessions?.find((s) => s.isActive) ?? context?.availableSessions?.[0];
    const firstSem = context?.availableSemesters?.[0];
    const validSemId = firstSem?.id && firstSem.id !== "00000000-0000-0000-0000-000000000000" ? firstSem.id : "";
    setEditingTrack(null);
    setWizardStep(1);
    setFormError(null);
    setForm({
      ...DEFAULT_FORM,
      academicYear: activeSession?.label || "2025-26",
      academicSessionId: activeSession?.id || "",
      semesterTermId: validSemId,
      semesterNumber: firstSem?.semesterNumber,
      subjectOfferingId: context?.availableOfferings?.[0]?.id || "",
    });
    setModalOpen(true);
  };

  const openEditModal = (track: CollegeTrackDto) => {
    setEditingTrack(track);
    setWizardStep(1);
    setFormError(null);
    setForm({
      name: track.name,
      description: track.description || "",
      academicYear: track.academicYear,
      academicSessionId: track.academicSessionId || "",
      semesterTermId: track.semesterTermId || "",
      subjectOfferingId: track.subjectOfferingId || "",
      participationMode: track.participationMode || "Team",
      minTeamSize: track.minTeamSize ?? 2,
      maxTeamSize: track.maxTeamSize ?? 4,
      allowCrossBranchTeams: !!track.allowCrossBranchTeams,
      allowInterdisciplinaryTeams: !!track.allowInterdisciplinaryTeams,
      proposalDeadlineUtc: track.proposalDeadlineUtc ? track.proposalDeadlineUtc.slice(0, 16) : "",
      finalSubmissionDeadlineUtc: track.finalSubmissionDeadlineUtc ? track.finalSubmissionDeadlineUtc.slice(0, 16) : "",
      guideWeightPct: track.guideWeightPct,
      midTermWeightPct: track.midTermWeightPct,
      finalVivaWeightPct: track.finalVivaWeightPct,
      sharedProjectRubricPct: track.sharedProjectRubricPct,
      individualStudentRubricPct: track.individualStudentRubricPct,
      launchImmediately: track.status === "Open",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!form.name.trim()) {
      setFormError("Track name is required.");
      return;
    }
    if (form.guideWeightPct + form.midTermWeightPct + form.finalVivaWeightPct !== 100) {
      setFormError("Evaluation weights (Guide + Mid-Term + Final Viva) must sum to 100%.");
      return;
    }
    if (form.sharedProjectRubricPct + form.individualStudentRubricPct !== 100) {
      setFormError("Rubric split (Shared + Individual) must sum to 100%.");
      return;
    }
    if (
      form.proposalDeadlineUtc &&
      form.finalSubmissionDeadlineUtc &&
      new Date(form.proposalDeadlineUtc) >= new Date(form.finalSubmissionDeadlineUtc)
    ) {
      setFormError("Proposal deadline must be earlier than the final submission deadline.");
      return;
    }

    try {
      setSubmitting(true);
      const proposalIso = form.proposalDeadlineUtc ? new Date(form.proposalDeadlineUtc).toISOString() : undefined;
      const finalIso = form.finalSubmissionDeadlineUtc ? new Date(form.finalSubmissionDeadlineUtc).toISOString() : undefined;

      if (editingTrack) {
        await hodApi.updateTrack(editingTrack.id, {
          name: form.name.trim(),
          description: form.description.trim(),
          participationMode: form.participationMode,
          minTeamSize: form.participationMode === "Individual" ? 1 : form.minTeamSize,
          maxTeamSize: form.participationMode === "Individual" ? 1 : form.maxTeamSize,
          allowCrossBranchTeams: form.allowCrossBranchTeams,
          allowInterdisciplinaryTeams: form.allowInterdisciplinaryTeams,
          proposalDeadlineUtc: proposalIso,
          finalSubmissionDeadlineUtc: finalIso,
          guideWeightPct: form.guideWeightPct,
          midTermWeightPct: form.midTermWeightPct,
          finalVivaWeightPct: form.finalVivaWeightPct,
          sharedProjectRubricPct: form.sharedProjectRubricPct,
          individualStudentRubricPct: form.individualStudentRubricPct,
        });
        showToast("Project track updated.");
      } else {
        const cleanSemId =
          form.semesterTermId && form.semesterTermId !== "00000000-0000-0000-0000-000000000000"
            ? form.semesterTermId
            : undefined;
        await hodApi.createTrack({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          academicYear: form.academicYear.trim() || "2025-26",
          academicSessionId: form.academicSessionId || undefined,
          semesterTermId: cleanSemId,
          semesterNumber: form.semesterNumber,
          subjectOfferingId: form.subjectOfferingId || undefined,
          participationMode: form.participationMode,
          minTeamSize: form.participationMode === "Individual" ? 1 : form.minTeamSize,
          maxTeamSize: form.participationMode === "Individual" ? 1 : form.maxTeamSize,
          launchImmediately: form.launchImmediately,
          allowCrossBranchTeams: form.allowCrossBranchTeams,
          allowInterdisciplinaryTeams: form.allowInterdisciplinaryTeams,
          proposalDeadlineUtc: proposalIso,
          finalSubmissionDeadlineUtc: finalIso,
          guideWeightPct: form.guideWeightPct,
          midTermWeightPct: form.midTermWeightPct,
          finalVivaWeightPct: form.finalVivaWeightPct,
          sharedProjectRubricPct: form.sharedProjectRubricPct,
          individualStudentRubricPct: form.individualStudentRubricPct,
        });
        showToast(form.launchImmediately ? "Project track initialized and launched." : "Project track saved as draft.");
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || "Failed to save project track.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLifecycleAction = async (
    trackId: string,
    action: "launch" | "pause" | "resume" | "close"
  ) => {
    try {
      if (action === "launch") await hodApi.launchTrack(trackId);
      if (action === "pause") await hodApi.pauseTrack(trackId);
      if (action === "resume") await hodApi.resumeTrack(trackId);
      if (action === "close") await hodApi.closeTrack(trackId);
      showToast(`Track ${action}ed successfully.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || `Failed to ${action} track.`);
    }
  };

  const openTracksCount = tracks.filter((t) => (t.status ?? (t.isActive ? "Open" : "Closed")) === "Open").length;

  return (
    <div className="space-y-6">
      <HodProjectsTabBar />
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Department Project Tracks
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Initialize, launch, and govern Minor, Major, Mini, and Individual project tracks for{" "}
            <span className="font-semibold text-slate-700">
              {context?.departmentName || "your department"}
            </span>
            .
          </p>
        </div>

        <Link href="/hod/projects/start-window">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Start Project Window
          </Button>
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && openTracksCount === 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-amber-950">
                  No Open Project Track for Students
                </h2>
                <p className="text-xs text-amber-800 mt-0.5">
                  Students in your department cannot start new Minor, Major, or Individual projects until at least one track is launched.
                </p>
              </div>
            </div>
            <Link href="/hod/projects/start-window">
              <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                Start Project Window
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center text-xs text-slate-500">
            Loading department project tracks...
          </CardContent>
        </Card>
      ) : tracks.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <Compass className="h-8 w-8 text-slate-400 mx-auto" />
            <div className="text-sm font-semibold text-slate-800">
              No Department Project Tracks Initialized
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Create a track to define whether students participate individually or in teams, set proposal deadlines, and configure evaluation weights.
            </p>
            <Link href="/hod/projects/start-window">
              <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                Start Project Window
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tracks.map((track) => {
            const status: AcademicTrackStatus = track.status ?? (track.isActive ? "Open" : "Closed");
            const isIndividual = track.participationMode === "Individual";
            return (
              <Card key={track.id} className="border-slate-200/90 bg-white">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">{track.name}</CardTitle>
                        <Badge variant={STATUS_BADGE[status]}>{status}</Badge>
                      </div>
                      <CardDescription className="mt-1 text-xs">
                        {track.academicYear}
                        {track.semesterNumber ? ` • Sem ${track.semesterNumber}` : ""}
                        {track.subjectCode ? ` • ${track.subjectCode} (${track.subjectName})` : ""}
                      </CardDescription>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEditModal(track)}
                      leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                    >
                      Edit
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {track.description && (
                    <p className="text-xs text-slate-600">{track.description}</p>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="rounded-lg bg-slate-50 border border-slate-200/70 p-2.5">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        {isIndividual ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                        Participation
                      </div>
                      <div className="font-semibold text-slate-800 mt-0.5">
                        {isIndividual
                          ? "Individual (1)"
                          : `Team (${track.minTeamSize ?? 2}–${track.maxTeamSize ?? 4})`}
                      </div>
                    </div>

                    <div className="rounded-lg bg-slate-50 border border-slate-200/70 p-2.5">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        Projects
                      </div>
                      <div className="font-semibold text-slate-800 mt-0.5">
                        {track.teamCount ?? 0} Registered
                      </div>
                    </div>

                    <div className="rounded-lg bg-slate-50 border border-slate-200/70 p-2.5 col-span-2 sm:col-span-1">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Proposal Cutoff
                      </div>
                      <div className="font-semibold text-slate-800 mt-0.5">
                        {track.proposalDeadlineUtc
                          ? new Date(track.proposalDeadlineUtc).toLocaleDateString()
                          : "No cutoff"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500">
                      Eval: {track.guideWeightPct}% Guide / {track.midTermWeightPct}% Mid / {track.finalVivaWeightPct}% Viva
                    </span>

                    <div className="flex items-center gap-2">
                      {status === "Draft" && (
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<Play className="h-3.5 w-3.5" />}
                          onClick={() => handleLifecycleAction(track.id, "launch")}
                        >
                          Launch
                        </Button>
                      )}
                      {status === "Open" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Pause className="h-3.5 w-3.5" />}
                          onClick={() => handleLifecycleAction(track.id, "pause")}
                        >
                          Pause
                        </Button>
                      )}
                      {status === "Paused" && (
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                          onClick={() => handleLifecycleAction(track.id, "resume")}
                        >
                          Resume
                        </Button>
                      )}
                      {status !== "Closed" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Lock className="h-3.5 w-3.5" />}
                          onClick={() => handleLifecycleAction(track.id, "close")}
                        >
                          Close
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editingTrack ? "Edit Project Track" : "Initialize Department Project Track"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Step {wizardStep} of 3 • {wizardStep === 1 ? "Track Identity & Scope" : wizardStep === 2 ? "Participation & Deadlines" : "Evaluation Weights & Launch"}
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Close modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { step: 1 as const, label: "1. Identity & Scope" },
                  { step: 2 as const, label: "2. Mode & Deadlines" },
                  { step: 3 as const, label: "3. Weights & Launch" },
                ].map((item) => (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => {
                      if (item.step <= wizardStep || form.name.trim()) {
                        setFormError(null);
                        setWizardStep(item.step);
                      }
                    }}
                    className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-left transition ${
                      wizardStep === item.step
                        ? "bg-emerald-700 text-white"
                        : wizardStep > item.step
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {formError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {formError}
                </div>
              )}

              {wizardStep === 1 && (
                <div className="space-y-4">
                  {!editingTrack && (
                    <div>
                      <div className="text-[11px] font-semibold text-slate-500 mb-1.5">Quick Presets</div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: "Minor Project", name: `Minor Project Sem ${form.semesterNumber ?? 6} (${form.academicYear})`, mode: "Team" as ParticipationMode, min: 2, max: 4 },
                          { label: "Major Project", name: `Major Project Sem ${form.semesterNumber ?? 8} (${form.academicYear})`, mode: "Team" as ParticipationMode, min: 2, max: 4 },
                          { label: "Mini Project", name: `Mini Project Sem ${form.semesterNumber ?? 4} (${form.academicYear})`, mode: "Team" as ParticipationMode, min: 2, max: 3 },
                          { label: "Individual Capstone", name: `Individual Capstone Sem ${form.semesterNumber ?? 1} (${form.academicYear})`, mode: "Individual" as ParticipationMode, min: 1, max: 1 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() =>
                              setForm((p) => ({
                                ...p,
                                name: preset.name,
                                participationMode: preset.mode,
                                minTeamSize: preset.min,
                                maxTeamSize: preset.max,
                              }))
                            }
                            className="rounded-full border border-slate-200 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition"
                          >
                            + {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Track Name *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g., Minor Project Sem 6 (2025-26)"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Description / Guidelines
                    </label>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Objectives, deliverables, and expectations for students..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Academic Year
                      </label>
                      <input
                        type="text"
                        value={form.academicYear}
                        disabled={!!editingTrack}
                        onChange={(e) => setForm((p) => ({ ...p, academicYear: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs disabled:bg-slate-100"
                      />
                    </div>

                    {!editingTrack && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Target Semester
                        </label>
                        <select
                          value={form.semesterNumber ? String(form.semesterNumber) : ""}
                          onChange={(e) => {
                            const semNum = e.target.value ? Number(e.target.value) : undefined;
                            const matched = context?.availableSemesters?.find((s) => s.semesterNumber === semNum);
                            const validId =
                              matched?.id && matched.id !== "00000000-0000-0000-0000-000000000000"
                                ? matched.id
                                : "";
                            setForm((p) => ({
                              ...p,
                              semesterNumber: semNum,
                              semesterTermId: validId,
                            }));
                          }}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                        >
                          <option value="">Default Department Semester</option>
                          {context?.availableSemesters?.map((s) => (
                            <option key={`sem-${s.semesterNumber}`} value={String(s.semesterNumber)}>
                              Sem {s.semesterNumber} — {s.semesterName}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Only students enrolled in this semester will see this track.
                        </p>
                      </div>
                    )}
                  </div>

                  {!editingTrack && (context?.availableOfferings?.length ?? 0) > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Subject Offering
                      </label>
                      <select
                        value={form.subjectOfferingId}
                        onChange={(e) => setForm((p) => ({ ...p, subjectOfferingId: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      >
                        <option value="">Default / General Track</option>
                        {context?.availableOfferings?.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.subjectCode} — {o.subjectName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Participation Mode
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {(["Team", "Individual"] as ParticipationMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() =>
                            setForm((p) => ({
                              ...p,
                              participationMode: mode,
                              minTeamSize: mode === "Individual" ? 1 : p.minTeamSize < 2 ? 2 : p.minTeamSize,
                              maxTeamSize: mode === "Individual" ? 1 : p.maxTeamSize < 2 ? 4 : p.maxTeamSize,
                            }))
                          }
                          className={`rounded-lg border p-3 text-left text-xs transition ${
                            form.participationMode === mode
                              ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="font-semibold">{mode} Project</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {mode === "Team"
                              ? "Students form teams and invite teammates"
                              : "Solo student project without team invitations"}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {form.participationMode === "Team" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Min Team Size
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={form.minTeamSize}
                          onChange={(e) => setForm((p) => ({ ...p, minTeamSize: Number(e.target.value) || 1 }))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Max Team Size
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={form.maxTeamSize}
                          onChange={(e) => setForm((p) => ({ ...p, maxTeamSize: Number(e.target.value) || 4 }))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Proposal Cutoff
                      </label>
                      <input
                        type="datetime-local"
                        value={form.proposalDeadlineUtc}
                        onChange={(e) => setForm((p) => ({ ...p, proposalDeadlineUtc: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Final Submission Cutoff
                      </label>
                      <input
                        type="datetime-local"
                        value={form.finalSubmissionDeadlineUtc}
                        onChange={(e) => setForm((p) => ({ ...p, finalSubmissionDeadlineUtc: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Guide Weight (%)
                      </label>
                      <input
                        type="number"
                        value={form.guideWeightPct}
                        onChange={(e) => setForm((p) => ({ ...p, guideWeightPct: Number(e.target.value) || 0 }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Mid-Term (%)
                      </label>
                      <input
                        type="number"
                        value={form.midTermWeightPct}
                        onChange={(e) => setForm((p) => ({ ...p, midTermWeightPct: Number(e.target.value) || 0 }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Final Viva (%)
                      </label>
                      <input
                        type="number"
                        value={form.finalVivaWeightPct}
                        onChange={(e) => setForm((p) => ({ ...p, finalVivaWeightPct: Number(e.target.value) || 0 }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Shared Rubric (%)
                      </label>
                      <input
                        type="number"
                        value={form.sharedProjectRubricPct}
                        onChange={(e) => setForm((p) => ({ ...p, sharedProjectRubricPct: Number(e.target.value) || 0 }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Individual Rubric (%)
                      </label>
                      <input
                        type="number"
                        value={form.individualStudentRubricPct}
                        onChange={(e) => setForm((p) => ({ ...p, individualStudentRubricPct: Number(e.target.value) || 0 }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>
                  </div>

                  {!editingTrack && (
                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.launchImmediately}
                        onChange={(e) => setForm((p) => ({ ...p, launchImmediately: e.target.checked }))}
                      />
                      <span className="font-medium text-slate-800">
                        Launch immediately (students can discover and start projects right away)
                      </span>
                    </label>
                  )}

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Evaluation Split Total</span>
                      <Badge
                        variant={form.guideWeightPct + form.midTermWeightPct + form.finalVivaWeightPct === 100 ? "success" : "danger"}
                        size="sm"
                      >
                        {form.guideWeightPct + form.midTermWeightPct + form.finalVivaWeightPct}% / 100%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Rubric Split Total</span>
                      <Badge
                        variant={form.sharedProjectRubricPct + form.individualStudentRubricPct === 100 ? "success" : "danger"}
                        size="sm"
                      >
                        {form.sharedProjectRubricPct + form.individualStudentRubricPct}% / 100%
                      </Badge>
                    </div>
                    <div className="pt-1 text-[11px] text-slate-500">
                      Track: <strong className="text-slate-800">{form.name || "Untitled"}</strong> •{" "}
                      {form.semesterNumber ? `Semester ${form.semesterNumber}` : "Default Semester"} •{" "}
                      {form.participationMode === "Individual" ? "Individual (1)" : `Team (${form.minTeamSize}–${form.maxTeamSize})`}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-t border-slate-200">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFormError(null);
                  if (wizardStep === 1) setModalOpen(false);
                  else setWizardStep((s) => (s - 1) as 1 | 2);
                }}
              >
                {wizardStep === 1 ? "Cancel" : "Back"}
              </Button>

              {wizardStep < 3 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (wizardStep === 1 && !form.name.trim()) {
                      setFormError("Track name is required before continuing.");
                      return;
                    }
                    if (wizardStep === 2) {
                      if (form.participationMode === "Team" && (form.minTeamSize < 1 || form.maxTeamSize < form.minTeamSize || form.maxTeamSize > 10)) {
                        setFormError("Team size bounds must satisfy 1 <= Min <= Max <= 10.");
                        return;
                      }
                      if (
                        form.proposalDeadlineUtc &&
                        form.finalSubmissionDeadlineUtc &&
                        new Date(form.proposalDeadlineUtc) >= new Date(form.finalSubmissionDeadlineUtc)
                      ) {
                        setFormError("Proposal deadline must be earlier than the final submission deadline.");
                        return;
                      }
                    }
                    setFormError(null);
                    setWizardStep((s) => (s + 1) as 2 | 3);
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={submitting}
                  onClick={handleSave}
                >
                  {submitting ? "Saving..." : editingTrack ? "Save Changes" : form.launchImmediately ? "Initialize & Launch" : "Save as Draft"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
