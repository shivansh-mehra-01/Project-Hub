"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  FolderGit2,
  Globe,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { PageHeader } from "@/design-system/patterns/PageHeader";
import { PageErrorState, PageLoadingState } from "@/design-system/patterns/PageStates";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/design-system/components/Card";
import { Modal } from "@/design-system/components/Modal";
import { studentApi } from "@/lib/api/studentApi";
import { showToast } from "@/lib/toast";
import {
  PendingPortfolioProjectDto,
  StudentAcademicRecordDto,
  VerifiedStudentPortfolioDto,
  VivaOutcome,
} from "@/lib/api/types";

function formatOutcome(outcome: VivaOutcome): {
  label: string;
  variant: "success" | "warning" | "danger" | "neutral";
} {
  switch (outcome) {
    case "Pass":
      return { label: "Passed", variant: "success" };
    case "ReViva":
      return { label: "Re-Defense Required", variant: "warning" };
    case "Fail":
      return { label: "Not Cleared", variant: "danger" };
    case "Pending":
      return { label: "Pending", variant: "neutral" };
    default:
      return { label: String(outcome), variant: "neutral" };
  }
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const StudentPortfolioView: React.FC = () => {
  useDashboardHeader({
    title: "Portfolio",
  });

  const [portfolio, setPortfolio] = useState<VerifiedStudentPortfolioDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [allowPublic, setAllowPublic] = useState(false);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const [copiedShareUrl, setCopiedShareUrl] = useState(false);

  const [detailRecord, setDetailRecord] = useState<StudentAcademicRecordDto | null>(null);
  const [credentialRecord, setCredentialRecord] = useState<StudentAcademicRecordDto | null>(null);

  const loadPortfolio = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await studentApi.getVerifiedPortfolio();
      setPortfolio(data);
      setAllowPublic(Boolean(data.allowPublicPortfolio));
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Unable to load your academic portfolio right now.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    studentApi
      .getVerifiedPortfolio()
      .then((data) => {
        if (!active) return;
        setPortfolio(data);
        setAllowPublic(Boolean(data.allowPublicPortfolio));
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error && err.message
              ? err.message
              : "Unable to load your academic portfolio right now."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleToggleVisibility = async () => {
    if (!portfolio || updatingVisibility) return;
    const nextValue = !allowPublic;
    setUpdatingVisibility(true);
    try {
      await studentApi.updatePortfolioVisibility({ allowPublicPortfolio: nextValue });
      setAllowPublic(nextValue);
      setPortfolio((prev) =>
        prev ? { ...prev, allowPublicPortfolio: nextValue } : prev
      );
      showToast(
        nextValue
          ? "Public portfolio link enabled."
          : "Portfolio set to private.",
        "success"
      );
    } catch {
      showToast("Could not update portfolio visibility. Please try again.", "error");
    } finally {
      setUpdatingVisibility(false);
    }
  };

  const handleCopyShareUrl = async () => {
    if (!portfolio?.publicPortfolioShareUrl) return;
    try {
      await navigator.clipboard.writeText(portfolio.publicPortfolioShareUrl);
      setCopiedShareUrl(true);
      setTimeout(() => setCopiedShareUrl(false), 2000);
    } catch {
      showToast("Unable to copy link to clipboard.", "error");
    }
  };

  if (loading) {
    return <PageLoadingState message="Loading your verified academic portfolio..." />;
  }

  if (error || !portfolio) {
    return (
      <PageErrorState
        error={error ?? "An unexpected error occurred while loading your academic records."}
        onRetry={() => void loadPortfolio()}
      />
    );
  }

  const verifiedProjects = portfolio.projects ?? [];
  const pendingProjects: PendingPortfolioProjectDto[] =
    portfolio.pendingVerificationProjects ?? [];
  const hasAnyProjects = verifiedProjects.length > 0 || pendingProjects.length > 0;

  const academicSubtitleParts = [
    portfolio.programName,
    portfolio.departmentName,
    portfolio.currentSemesterNumber
      ? `Semester ${portfolio.currentSemesterNumber}`
      : null,
    portfolio.collegeName,
  ].filter((part): part is string => Boolean(part && part.trim()));

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Academic Portfolio"
          description="Verified project records, credentials, and public showcase settings."
        />
        {/* Verified Academic Identity Header */}
        <Card>
          <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  {portfolio.studentName}
                </h2>
                {portfolio.enrollmentNumber && (
                  <Badge variant="neutral" size="sm">
                    <span className="font-mono">{portfolio.enrollmentNumber}</span>
                  </Badge>
                )}
              </div>
              {academicSubtitleParts.length > 0 && (
                <p className="text-sm text-slate-600">
                  {academicSubtitleParts.join(" • ")}
                </p>
              )}
            </div>

            {verifiedProjects.length > 0 && (
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                  <Globe className="h-3.5 w-3.5 text-slate-500" />
                  <span className="font-medium text-slate-700">
                    Public Showcase
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={allowPublic}
                    disabled={updatingVisibility}
                    onClick={() => void handleToggleVisibility()}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                      allowPublic ? "bg-emerald-600" : "bg-slate-300"
                    } ${updatingVisibility ? "opacity-60 cursor-wait" : ""}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                        allowPublic ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {allowPublic && portfolio.publicPortfolioShareUrl && (
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={
                      copiedShareUrl ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )
                    }
                    onClick={() => void handleCopyShareUrl()}
                  >
                    {copiedShareUrl ? "Copied Link" : "Copy Public Link"}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Empty State */}
        {!hasAnyProjects && (
          <Card className="border-dashed">
            <CardContent className="py-14 px-6 flex flex-col items-center text-center max-w-lg mx-auto space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center">
                <Award className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">
                  No completed projects in your portfolio yet
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Completed and department-verified projects will appear here automatically.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verified Academic Projects */}
        {verifiedProjects.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Verified Academic Projects ({verifiedProjects.length})
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {verifiedProjects.map((record) => {
                const outcome = formatOutcome(record.finalOutcome);
                const verifiedDate = formatDate(record.verifiedAtUtc);

                return (
                  <Card
                    key={record.id}
                    className="flex flex-col justify-between hover:border-emerald-200 transition-colors"
                  >
                    <CardHeader className="space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="neutral" size="sm">
                            {record.trackName}
                          </Badge>
                          {record.academicYear && (
                            <span className="text-xs font-medium text-slate-500">
                              {record.academicYear}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="success" size="sm">
                            Verified
                          </Badge>
                          <Badge variant={outcome.variant} size="sm">
                            {outcome.label}
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <CardTitle className="text-base text-slate-900 leading-snug">
                          {record.projectTitle}
                        </CardTitle>
                        {record.projectAbstract && (
                          <CardDescription className="mt-1.5 line-clamp-2 text-xs text-slate-600">
                            {record.projectAbstract}
                          </CardDescription>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-0">
                      <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                        <div>
                          <span className="text-slate-500 block">Your Role</span>
                          <span className="font-medium text-slate-900">
                            {record.roleDescription || (record.isTeamLead ? "Team Lead" : "Member")}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Verified Score</span>
                          <span className="font-semibold text-emerald-700">
                            {record.finalComputedMark.toFixed(1)} / 100
                          </span>
                        </div>
                        {record.guideName && (
                          <div>
                            <span className="text-slate-500 block">Faculty Guide</span>
                            <span className="font-medium text-slate-900">
                              {record.guideName}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500 block">
                            {verifiedDate ? "Verified On" : "Team Code"}
                          </span>
                          <span className="font-medium text-slate-900 font-mono">
                            {verifiedDate || record.teamCode}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-3 text-xs">
                          {record.verifiedRepositoryUrl && (
                            <a
                              href={record.verifiedRepositoryUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-700 font-medium"
                            >
                              <FolderGit2 className="h-3.5 w-3.5" />
                              <span>Repository</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {record.verifiedDemoUrl && (
                            <a
                              href={record.verifiedDemoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-700 font-medium"
                            >
                              <Globe className="h-3.5 w-3.5" />
                              <span>Demo</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<FileText className="h-3.5 w-3.5" />}
                            onClick={() => setCredentialRecord(record)}
                          >
                            Credential
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<BookOpen className="h-3.5 w-3.5" />}
                            onClick={() => setDetailRecord(record)}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Completed Projects Pending Final Verification */}
        {pendingProjects.length > 0 && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Completed — Verification Pending ({pendingProjects.length})
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Awaiting final closure and department verification
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pendingProjects.map((project) => (
                <Card
                  key={project.projectTeamId}
                  className="bg-slate-50/60 border-slate-200"
                >
                  <CardHeader className="pb-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {project.trackName && (
                          <Badge variant="neutral" size="sm">
                            {project.trackName}
                          </Badge>
                        )}
                        {project.academicYear && (
                          <span className="text-xs text-slate-500">
                            {project.academicYear}
                          </span>
                        )}
                      </div>
                      <Badge variant="warning" size="sm">
                        Verification Pending
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-semibold text-slate-900">
                      {project.projectTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs text-slate-600 space-y-2">
                    <div className="flex flex-wrap gap-x-5 gap-y-1">
                      <span>
                        <strong className="text-slate-700">Role:</strong>{" "}
                        {project.roleDescription}
                      </span>
                      {project.guideName && (
                        <span>
                          <strong className="text-slate-700">Guide:</strong>{" "}
                          {project.guideName}
                        </span>
                      )}
                      {project.teamCode && (
                        <span>
                          <strong className="text-slate-700">Team:</strong>{" "}
                          <code className="font-mono">{project.teamCode}</code>
                        </span>
                      )}
                    </div>
                    {project.repositoryUrl && (
                      <a
                        href={project.repositoryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-700 font-medium"
                      >
                        <FolderGit2 className="h-3.5 w-3.5" />
                        <span>Repository</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Project Detail Modal */}
      <Modal
        isOpen={Boolean(detailRecord)}
        onClose={() => setDetailRecord(null)}
        title={detailRecord?.projectTitle ?? "Project Details"}
        description={
          detailRecord
            ? [detailRecord.trackName, detailRecord.academicYear, detailRecord.teamCode]
                .filter(Boolean)
                .join(" • ")
            : undefined
        }
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            {detailRecord && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Award className="h-3.5 w-3.5" />}
                onClick={() => {
                  const target = detailRecord;
                  setDetailRecord(null);
                  setCredentialRecord(target);
                }}
              >
                View Credential
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={() => setDetailRecord(null)}>
              Close
            </Button>
          </div>
        }
      >
        {detailRecord && (
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success" size="sm">
                Verified Academic Record
              </Badge>
              <Badge variant={formatOutcome(detailRecord.finalOutcome).variant} size="sm">
                {formatOutcome(detailRecord.finalOutcome).label}
              </Badge>
              {detailRecord.isTeamLead && (
                <Badge variant="neutral" size="sm">
                  Team Lead
                </Badge>
              )}
            </div>

            {detailRecord.projectAbstract && (
              <div className="space-y-1">
                <h4 className="font-semibold text-slate-900">Project Summary</h4>
                <p className="text-slate-600 leading-relaxed">
                  {detailRecord.projectAbstract}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-500 block">Role / Contribution</span>
                <span className="font-medium text-slate-900">
                  {detailRecord.roleDescription}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Faculty Guide</span>
                <span className="font-medium text-slate-900">
                  {detailRecord.guideName || "Not recorded"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Team Defense Score</span>
                <span className="font-medium text-slate-900">
                  {detailRecord.sharedTotalScore.toFixed(1)} /{" "}
                  {detailRecord.sharedMaxScore.toFixed(1)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Final Computed Mark</span>
                <span className="font-semibold text-emerald-700">
                  {detailRecord.finalComputedMark.toFixed(1)} / 100
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Department</span>
                <span className="font-medium text-slate-900">
                  {detailRecord.departmentName}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Verified Date</span>
                <span className="font-medium text-slate-900">
                  {formatDate(detailRecord.verifiedAtUtc) || "Verified"}
                </span>
              </div>
            </div>

            {detailRecord.rubricCriteriaBreakdown.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-900">
                  Evaluation Rubric Breakdown
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {detailRecord.rubricCriteriaBreakdown.map((item, idx) => (
                    <div
                      key={`${item.criterionCode}-${idx}`}
                      className="px-3 py-2 flex items-center justify-between"
                    >
                      <span className="text-slate-700">{item.title}</span>
                      <span className="font-mono font-medium text-slate-900">
                        {item.awardedMarks} / {item.maxMarks}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(detailRecord.verifiedRepositoryUrl ||
              detailRecord.verifiedDemoUrl ||
              detailRecord.finalReportFileName) && (
              <div className="space-y-1.5">
                <h4 className="font-semibold text-slate-900">
                  Verified Artifacts & Links
                </h4>
                <div className="flex flex-wrap gap-3">
                  {detailRecord.verifiedRepositoryUrl && (
                    <a
                      href={detailRecord.verifiedRepositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-emerald-700 hover:underline font-medium"
                    >
                      <FolderGit2 className="h-3.5 w-3.5" />
                      <span>Repository</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {detailRecord.verifiedDemoUrl && (
                    <a
                      href={detailRecord.verifiedDemoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-emerald-700 hover:underline font-medium"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span>Live Demo</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {detailRecord.finalReportFileName && (
                    <span className="inline-flex items-center gap-1.5 text-slate-700">
                      <FileText className="h-3.5 w-3.5 text-slate-500" />
                      <span>{detailRecord.finalReportFileName}</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {detailRecord.verificationHash && (
              <div className="p-2.5 rounded bg-slate-100 border border-slate-200 font-mono text-[11px] text-slate-600 break-all">
                Verification Hash: {detailRecord.verificationHash}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Verified Credential Modal */}
      <Modal
        isOpen={Boolean(credentialRecord)}
        onClose={() => setCredentialRecord(null)}
        title="Verified Academic Credential"
        description={
          credentialRecord
            ? `${credentialRecord.collegeName || "Institution"} • ${credentialRecord.departmentName}`
            : undefined
        }
        footer={
          <div className="flex items-center justify-end w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCredentialRecord(null)}
            >
              Close
            </Button>
          </div>
        }
      >
        {credentialRecord && (
          <div className="p-5 bg-white border border-emerald-200 rounded-xl space-y-4">
            <div className="text-center space-y-1.5">
              <span className="text-[10px] font-bold tracking-widest text-emerald-700 uppercase">
                Official Academic Project Record
              </span>
              <h4 className="text-base font-bold text-slate-900">
                {credentialRecord.trackName}
                {credentialRecord.academicYear
                  ? ` (${credentialRecord.academicYear})`
                  : ""}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                This certifies that <strong>{credentialRecord.studentName}</strong>
                {credentialRecord.enrollmentNumber
                  ? ` (${credentialRecord.enrollmentNumber})`
                  : ""}{" "}
                completed <strong>{credentialRecord.projectTitle}</strong> as{" "}
                <strong>{credentialRecord.roleDescription}</strong> with an
                outcome of{" "}
                <strong>
                  {formatOutcome(credentialRecord.finalOutcome).label} (
                  {credentialRecord.finalComputedMark.toFixed(1)}/100)
                </strong>
                .
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <UserCheck className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <div>
                  <span className="text-slate-500 block text-[11px]">Guide</span>
                  <span className="font-medium text-slate-900">
                    {credentialRecord.guideName || "Assigned Faculty"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <div>
                  <span className="text-slate-500 block text-[11px]">Verified</span>
                  <span className="font-medium text-slate-900">
                    {formatDate(credentialRecord.verifiedAtUtc) || "Verified"}
                  </span>
                </div>
              </div>
            </div>

            {credentialRecord.verificationHash && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-600 break-all text-center">
                Verification Hash: {credentialRecord.verificationHash}
              </div>
            )}

            <div className="text-[11px] text-slate-600 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                Verified by {credentialRecord.departmentName}
                {credentialRecord.collegeName
                  ? ` • ${credentialRecord.collegeName}`
                  : ""}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
