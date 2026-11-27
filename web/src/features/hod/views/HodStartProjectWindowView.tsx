"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Eye,
  FileText,
  Rocket,
  Users,
  UserCheck,
  ArrowLeft,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/design-system/components/Card";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { Select } from "@/design-system/components/Select";
import { Textarea } from "@/design-system/components/Textarea";
import { Badge } from "@/design-system/components/Badge";
import { Modal } from "@/design-system/components/Modal";
import { hodApi } from "@/lib/api/hodApi";
import { FacultyWorkloadDto, HodAcademicContextDto } from "@/lib/api/types";
import { HodProjectsTabBar } from "../components/HodProjectsTabBar";

type ProjectTypeOption = "Minor 1" | "Minor 2" | "Major 1" | "Major 2";

const PROJECT_TYPE_OPTIONS: { value: ProjectTypeOption; label: string }[] = [
  { value: "Minor 1", label: "Minor 1" },
  { value: "Minor 2", label: "Minor 2" },
  { value: "Major 1", label: "Major 1" },
  { value: "Major 2", label: "Major 2" },
];

const SEMESTER_OPTIONS: { value: number; label: string }[] = [
  { value: 5, label: "5th Semester" },
  { value: 6, label: "6th Semester" },
  { value: 7, label: "7th Semester" },
  { value: 8, label: "8th Semester" },
];

function isTypeCompatibleWithSemester(projectType: string, semesterNumber: number): string | null {
  if (!projectType || !semesterNumber) return null;
  const isMinor = projectType === "Minor 1" || projectType === "Minor 2";
  const isMajor = projectType === "Major 1" || projectType === "Major 2";
  if (isMinor && semesterNumber !== 5 && semesterNumber !== 6) {
    return `${projectType} is only compatible with 5th Semester or 6th Semester.`;
  }
  if (isMajor && semesterNumber !== 7 && semesterNumber !== 8) {
    return `${projectType} is only compatible with 7th Semester or 8th Semester.`;
  }
  return null;
}

export const HodStartProjectWindowView: React.FC = () => {
  const router = useRouter();

  useDashboardHeader({
    title: "Start Project Window",
    breadcrumb: "HOD Console • Projects • Start Project Window",
  });

  const [context, setContext] = useState<HodAcademicContextDto | null>(null);
  const [faculty, setFaculty] = useState<FacultyWorkloadDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Section 1: Project Details
  const [projectType, setProjectType] = useState<ProjectTypeOption | "">("");
  const [semesterNumber, setSemesterNumber] = useState<string>("");

  // Section 2: Team Rules
  const [minTeamSize, setMinTeamSize] = useState<string>("2");
  const [maxTeamSize, setMaxTeamSize] = useState<string>("4");

  // Section 3: Registration Schedule
  const [registrationOpens, setRegistrationOpens] = useState<string>("");
  const [registrationDeadline, setRegistrationDeadline] = useState<string>("");

  // Section 4: Project Guidelines
  const [guidelines, setGuidelines] = useState<string>("");

  // Section 5: Project Coordinator
  const [coordinatorId, setCoordinatorId] = useState<string>("");

  // Submission & Preview states
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const [ctxData, facData] = await Promise.all([
          hodApi.getAcademicContext(),
          hodApi.getFaculty(),
        ]);
        if (!mounted) return;
        setContext(ctxData);
        setFaculty(facData);
      } catch (err: unknown) {
        if (!mounted) return;
        setLoadError(err instanceof Error ? err.message : "Failed to load academic configuration.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const activeSession = useMemo(() => {
    if (!context?.availableSessions?.length) return null;
    return context.availableSessions.find((s) => s.isActive) ?? context.availableSessions[0];
  }, [context]);

  const academicYear = activeSession?.label || "";

  const applicableBatch = useMemo(() => {
    if (!semesterNumber || !context?.semesterBatches?.length) return "";
    const semNum = Number(semesterNumber);
    const match = context.semesterBatches.find((b) => b.semesterNumber === semNum);
    return match?.admissionBatch || "";
  }, [context, semesterNumber]);

  const selectedCoordinator = useMemo(
    () => faculty.find((f) => f.facultyId === coordinatorId) || null,
    [faculty, coordinatorId]
  );

  const selectedSemesterLabel = useMemo(() => {
    const found = SEMESTER_OPTIONS.find((s) => String(s.value) === semesterNumber);
    return found?.label || "";
  }, [semesterNumber]);

  const matchedSemesterTerm = useMemo(() => {
    if (!semesterNumber || !context?.availableSemesters?.length) return null;
    const semNum = Number(semesterNumber);
    return context.availableSemesters.find((s) => s.semesterNumber === semNum) || null;
  }, [context, semesterNumber]);

  const validateForm = (): string | null => {
    if (!projectType) return "Please select a Project Type.";
    if (!semesterNumber) return "Please select a Semester.";

    const semNum = Number(semesterNumber);
    const compatibilityError = isTypeCompatibleWithSemester(projectType, semNum);
    if (compatibilityError) return compatibilityError;

    if (!academicYear) return "No active Academic Year is configured for your institution.";

    const minVal = Number(minTeamSize);
    const maxVal = Number(maxTeamSize);
    if (!Number.isInteger(minVal) || minVal < 1) {
      return "Minimum Team Size must be a positive whole number (at least 1).";
    }
    if (!Number.isInteger(maxVal) || maxVal < 1) {
      return "Maximum Team Size must be a positive whole number (at least 1).";
    }
    if (minVal > maxVal) {
      return "Minimum Team Size must not exceed Maximum Team Size.";
    }
    if (maxVal > 10) {
      return "Maximum Team Size cannot exceed 10 members.";
    }

    if (!registrationOpens) return "Please select the Registration Opens date.";
    if (!registrationDeadline) return "Please select the Registration Deadline date.";

    const openDate = new Date(`${registrationOpens}T00:00:00Z`);
    const deadlineDate = new Date(`${registrationDeadline}T23:59:59Z`);
    if (Number.isNaN(openDate.getTime()) || Number.isNaN(deadlineDate.getTime())) {
      return "Please provide valid registration dates.";
    }
    if (deadlineDate <= openDate || registrationDeadline <= registrationOpens) {
      return "Registration Deadline must be after the Registration Opens date.";
    }

    return null;
  };

  const handlePreview = () => {
    const err = validateForm();
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError(null);
    setPreviewOpen(true);
  };

  const handleStartWindow = async () => {
    const err = validateForm();
    if (err) {
      setValidationError(err);
      return;
    }

    setValidationError(null);
    setSubmitting(true);

    try {
      const semNum = Number(semesterNumber);
      const validTermId =
        matchedSemesterTerm?.id && matchedSemesterTerm.id !== "00000000-0000-0000-0000-000000000000"
          ? matchedSemesterTerm.id
          : undefined;

      const windowName = `${projectType} — ${selectedSemesterLabel}`;
      const opensIso = new Date(`${registrationOpens}T00:00:00Z`).toISOString();
      const deadlineIso = new Date(`${registrationDeadline}T23:59:59Z`).toISOString();

      await hodApi.createTrack({
        name: windowName,
        projectType,
        description: guidelines.trim() || undefined,
        academicYear,
        academicSessionId: activeSession?.id,
        semesterTermId: validTermId,
        semesterNumber: semNum,
        participationMode: Number(maxTeamSize) === 1 ? "Individual" : "Team",
        minTeamSize: Number(minTeamSize),
        maxTeamSize: Number(maxTeamSize),
        registrationOpensUtc: opensIso,
        proposalDeadlineUtc: deadlineIso,
        coordinatorUserId: coordinatorId || undefined,
        launchImmediately: true,
      });

      setPreviewOpen(false);
      setSuccessMessage(`Project window "${windowName}" started successfully.`);
      setTimeout(() => {
        router.push("/hod/projects/tracks");
      }, 900);
    } catch (err: unknown) {
      setValidationError(err instanceof Error ? err.message : "Failed to start project window.");
      setPreviewOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <HodProjectsTabBar />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Start Project Window
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Initiate a new academic project cycle for{" "}
            <span className="font-semibold text-slate-700">
              {context?.departmentName || "your department"}
            </span>
            . Eligible students will be able to form teams and submit proposals once registration opens.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
          onClick={() => router.push("/hod/projects/tracks")}
        >
          Back to Tracks
        </Button>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {validationError && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center text-xs text-slate-500">
            Loading department academic configuration...
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Section 1: Project Details */}
          <Card>
            <CardHeader>
              <CardTitle>1. Project Details</CardTitle>
              <CardDescription>
                Select the project type and target semester. Academic year and batch are derived from institutional records.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Project Type *"
                value={projectType}
                onChange={(e) => {
                  const nextType = e.target.value as ProjectTypeOption | "";
                  setProjectType(nextType);
                  setValidationError(null);
                }}
              >
                <option value="">Select project type</option>
                {PROJECT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>

              <Select
                label="Semester *"
                value={semesterNumber}
                onChange={(e) => {
                  setSemesterNumber(e.target.value);
                  setValidationError(null);
                }}
                helperText={
                  projectType && semesterNumber
                    ? isTypeCompatibleWithSemester(projectType, Number(semesterNumber)) ?? undefined
                    : undefined
                }
                error={
                  projectType && semesterNumber
                    ? isTypeCompatibleWithSemester(projectType, Number(semesterNumber)) ?? undefined
                    : undefined
                }
              >
                <option value="">Select semester</option>
                {SEMESTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </option>
                ))}
              </Select>

              <Input
                label="Academic Year"
                value={academicYear || "Not configured"}
                readOnly
                disabled
                helperText="Derived from the active institutional academic session."
              />

              <Input
                label="Applicable Batch"
                value={
                  semesterNumber
                    ? applicableBatch || "Derived from active semester enrollments"
                    : "Select a semester to view batch"
                }
                readOnly
                disabled
                helperText="Mapped from active student enrollments in this semester."
              />
            </CardContent>
          </Card>

          {/* Section 2: Team Rules */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-700" />
                <CardTitle>2. Team Rules</CardTitle>
              </div>
              <CardDescription>
                Configure allowed team size bounds for student registrations in this window.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Minimum Team Size *"
                type="number"
                min={1}
                max={10}
                step={1}
                value={minTeamSize}
                onChange={(e) => setMinTeamSize(e.target.value)}
              />
              <Input
                label="Maximum Team Size *"
                type="number"
                min={1}
                max={10}
                step={1}
                value={maxTeamSize}
                onChange={(e) => setMaxTeamSize(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Section 3: Registration Schedule */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-700" />
                <CardTitle>3. Registration Schedule</CardTitle>
              </div>
              <CardDescription>
                Define when eligible students can begin registering teams and the final registration cutoff.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Registration Opens *"
                type="date"
                value={registrationOpens}
                onChange={(e) => setRegistrationOpens(e.target.value)}
              />
              <Input
                label="Registration Deadline *"
                type="date"
                value={registrationDeadline}
                min={registrationOpens || undefined}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Section 4: Project Guidelines */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-700" />
                <CardTitle>4. Project Guidelines</CardTitle>
              </div>
              <CardDescription>
                General academic rules and submission instructions displayed to students in this cycle.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                label="Project Guidelines"
                rows={4}
                value={guidelines}
                onChange={(e) => setGuidelines(e.target.value)}
                placeholder="Enter project rules, instructions and submission requirements..."
              />
            </CardContent>
          </Card>

          {/* Section 5: Project Coordinator */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-700" />
                <CardTitle>5. Project Coordinator</CardTitle>
              </div>
              <CardDescription>
                Optionally assign a faculty coordinator from your department for this project window.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                label="Assign Coordinator"
                value={coordinatorId}
                onChange={(e) => setCoordinatorId(e.target.value)}
              >
                <option value="">Select faculty coordinator</option>
                {faculty.map((f) => (
                  <option key={f.facultyId} value={f.facultyId}>
                    {f.fullName} ({f.employeeCode})
                  </option>
                ))}
              </Select>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 pb-6">
            <Button
              type="button"
              variant="secondary"
              leftIcon={<Eye className="h-4 w-4" />}
              onClick={handlePreview}
              disabled={submitting}
            >
              Preview
            </Button>
            <Button
              type="button"
              variant="primary"
              leftIcon={<Rocket className="h-4 w-4" />}
              onClick={handleStartWindow}
              disabled={submitting}
            >
              {submitting ? "Starting Window..." : "Start Window"}
            </Button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Review Project Window Details"
        description="Confirm the configuration before opening this project window to eligible students."
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <div>
              <div className="text-[11px] text-slate-500">Project Type</div>
              <div className="font-semibold text-slate-900 mt-0.5">{projectType}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Semester</div>
              <div className="font-semibold text-slate-900 mt-0.5">{selectedSemesterLabel}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Academic Year</div>
              <div className="font-semibold text-slate-900 mt-0.5">{academicYear}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Applicable Batch</div>
              <div className="font-semibold text-slate-900 mt-0.5">
                {applicableBatch || "Derived from active enrollments"}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Team Size</div>
              <div className="font-semibold text-slate-900 mt-0.5">
                {minTeamSize} – {maxTeamSize} member(s)
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Assigned Coordinator</div>
              <div className="font-semibold text-slate-900 mt-0.5">
                {selectedCoordinator ? selectedCoordinator.fullName : "Not assigned"}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Registration Opens</div>
              <div className="font-semibold text-slate-900 mt-0.5">{registrationOpens}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Registration Deadline</div>
              <div className="font-semibold text-slate-900 mt-0.5">{registrationDeadline}</div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3 space-y-1">
            <div className="text-[11px] font-semibold text-slate-700">Project Guidelines</div>
            <p className="text-slate-600 whitespace-pre-line">
              {guidelines.trim() || "No specific guidelines entered."}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Badge variant="success">Status on Creation: Open</Badge>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPreviewOpen(false)}>
                Edit Details
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartWindow}
                disabled={submitting}
              >
                {submitting ? "Starting..." : "Confirm & Start Window"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
