"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  Send,
  Plus,
  Edit3,
  RefreshCw,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card } from "@/design-system/components/Card";
import { SlideOverDrawer } from "@/design-system/components/SlideOverDrawer";
import { Modal } from "@/design-system/components/Modal";
import { Input } from "@/design-system/components/Input";
import { Textarea } from "@/design-system/components/Textarea";
import { Select } from "@/design-system/components/Select";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import { GithubIcon } from "@/design-system/components/Icons";
import { studentApi } from "@/lib/api/studentApi";
import {
  ArchivedProjectSummaryDto,
  FacultyGuideSummaryDto,
  ProjectIdeaDto,
  SimilarityCheckResultDto,
} from "@/lib/api/types";
import { showToast } from "@/lib/toast";

const SDG_OPTIONS = [
  { value: "SDG-1", label: "SDG 1: No Poverty" },
  { value: "SDG-2", label: "SDG 2: Zero Hunger" },
  { value: "SDG-3", label: "SDG 3: Good Health and Well-being" },
  { value: "SDG-4", label: "SDG 4: Quality Education" },
  { value: "SDG-5", label: "SDG 5: Gender Equality" },
  { value: "SDG-6", label: "SDG 6: Clean Water and Sanitation" },
  { value: "SDG-7", label: "SDG 7: Affordable and Clean Energy" },
  { value: "SDG-8", label: "SDG 8: Decent Work and Economic Growth" },
  { value: "SDG-9", label: "SDG 9: Industry, Innovation, and Infrastructure" },
  { value: "SDG-10", label: "SDG 10: Reduced Inequalities" },
  { value: "SDG-11", label: "SDG 11: Sustainable Cities and Communities" },
  { value: "SDG-12", label: "SDG 12: Responsible Consumption and Production" },
  { value: "SDG-13", label: "SDG 13: Climate Action" },
  { value: "SDG-14", label: "SDG 14: Life Below Water" },
  { value: "SDG-15", label: "SDG 15: Life on Land" },
  { value: "SDG-16", label: "SDG 16: Peace, Justice, and Strong Institutions" },
  { value: "SDG-17", label: "SDG 17: Partnerships for the Goals" },
];

const DOMAIN_OPTIONS = [
  { value: "Artificial Intelligence & ML", label: "Artificial Intelligence & ML" },
  { value: "IoT & Embedded Systems", label: "IoT & Embedded Systems" },
  { value: "Cloud & Distributed Computing", label: "Cloud & Distributed Computing" },
  { value: "Cybersecurity & Cryptography", label: "Cybersecurity & Cryptography" },
  { value: "Renewable Energy & Smart Grid", label: "Renewable Energy & Smart Grid" },
  { value: "Healthcare & Biomedical Engineering", label: "Healthcare & Biomedical Engineering" },
  { value: "Robotics & Autonomous Systems", label: "Robotics & Autonomous Systems" },
  { value: "Web & Mobile Application Engineering", label: "Web & Mobile Application Engineering" },
];

export const StudentExploreView: React.FC = () => {
  useDashboardHeader({ title: "Explore" });

  const [filter, setFilter] = useState<"past" | "ideas">("past");
  const [pastProjects, setPastProjects] = useState<ArchivedProjectSummaryDto[]>([]);
  const [ideas, setIdeas] = useState<ProjectIdeaDto[]>([]);
  const [facultyGuides, setFacultyGuides] = useState<FacultyGuideSummaryDto[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [sdgFilter, setSdgFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [inspectingProject, setInspectingProject] = useState<ArchivedProjectSummaryDto | null>(null);

  // Idea Modal State
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [currentIdeaId, setCurrentIdeaId] = useState<string | null>(null);

  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaAbstract, setIdeaAbstract] = useState("");
  const [ideaDomain, setIdeaDomain] = useState("Artificial Intelligence & ML");
  const [ideaSdg, setIdeaSdg] = useState("SDG-9");
  const [ideaGuideId, setIdeaGuideId] = useState("");
  const [submissionRemarks, setSubmissionRemarks] = useState("");

  const [similarityResult, setSimilarityResult] = useState<SimilarityCheckResultDto | null>(null);
  const [isCheckingSimilarity, setIsCheckingSimilarity] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);

  const hasActiveProject = ideas.some(
    (i) => i.status === "ActiveBuild" || i.status === "Approved" || i.status === "Archived"
  );

  const loadData = useCallback(async () => {
    try {
      const [pastRes, ideasRes, guidesRes] = await Promise.all([
        studentApi.getArchivedProjects({
          search: searchQuery || undefined,
          domain: domainFilter || undefined,
          sdg: sdgFilter || undefined,
        }),
        studentApi.getIdeas(),
        studentApi.getFacultyGuides().catch(() => [] as FacultyGuideSummaryDto[]),
      ]);
      setPastProjects(pastRes || []);
      setIdeas(ideasRes || []);
      setFacultyGuides(guidesRes || []);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to load projects.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, domainFilter, sdgFilter]);

  useEffect(() => {
    let active = true;
    Promise.all([
      studentApi.getArchivedProjects({
        search: searchQuery || undefined,
        domain: domainFilter || undefined,
        sdg: sdgFilter || undefined,
      }),
      studentApi.getIdeas(),
      studentApi.getFacultyGuides().catch(() => [] as FacultyGuideSummaryDto[]),
    ])
      .then(([pastRes, ideasRes, guidesRes]) => {
        if (!active) return;
        setPastProjects(pastRes || []);
        setIdeas(ideasRes || []);
        setFacultyGuides(guidesRes || []);
      })
      .catch((err: unknown) => {
        if (active) {
          showToast(err instanceof Error ? err.message : "Failed to load projects.", "error");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [searchQuery, domainFilter, sdgFilter]);

  const handleOpenCreateModal = () => {
    setIsEditingExisting(false);
    setIsResubmitting(false);
    setCurrentIdeaId(null);
    setIdeaTitle("");
    setIdeaAbstract("");
    setIdeaDomain("Artificial Intelligence & ML");
    setIdeaSdg("SDG-9");
    setSubmissionRemarks("");
    setSimilarityResult(null);
    setIdeaGuideId(facultyGuides[0]?.id ?? "");
    setIsIdeaModalOpen(true);
  };

  const handleOpenEditModal = (idea: ProjectIdeaDto, isResubmitFlow = false) => {
    setIsEditingExisting(true);
    setIsResubmitting(isResubmitFlow);
    setCurrentIdeaId(idea.id);
    setIdeaTitle(idea.title);
    setIdeaAbstract(idea.abstract);
    setIdeaDomain(idea.domainTag || "Artificial Intelligence & ML");
    setIdeaSdg(idea.sdgCode || "SDG-9");
    setIdeaGuideId(idea.guideUserId || facultyGuides[0]?.id || "");
    setSubmissionRemarks(isResubmitFlow ? `Addressing feedback: ${idea.latestReviewRemarks || ""}` : "");
    setSimilarityResult(
      idea.similarityScorePct
        ? {
            similarityScorePct: idea.similarityScorePct,
            similarProjectCode: idea.similarProjectCode,
            isWarning: idea.similarityScorePct >= 65,
            message:
              idea.similarityScorePct >= 65
                ? `High similarity detected (${idea.similarityScorePct}% overlap)`
                : `Verified originality (${idea.similarityScorePct}% similarity)`,
          }
        : null
    );
    setIsIdeaModalOpen(true);
  };

  const handleCheckSimilarity = async () => {
    if (ideaTitle.trim().length < 5) {
      showToast("Enter at least 5 characters in the title first.", "error");
      return;
    }
    setIsCheckingSimilarity(true);
    try {
      const res = await studentApi.checkSimilarity({
        title: ideaTitle.trim(),
        abstract: ideaAbstract.trim() || undefined,
        excludeTeamId: currentIdeaId || undefined,
      });
      setSimilarityResult(res);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Similarity check failed.", "error");
    } finally {
      setIsCheckingSimilarity(false);
    }
  };

  const handleSaveDraft = async () => {
    if (ideaTitle.trim().length < 5 || ideaAbstract.trim().length < 20) {
      showToast("Title (min 5 chars) and Abstract (min 20 chars) are required.", "error");
      return;
    }
    setIsSavingDraft(true);
    try {
      if (isEditingExisting && currentIdeaId) {
        await studentApi.updateIdea(currentIdeaId, {
          title: ideaTitle.trim(),
          abstract: ideaAbstract.trim(),
          domainTag: ideaDomain,
          sdgCode: ideaSdg,
          guideUserId: ideaGuideId || undefined,
        });
        showToast("Draft updated.", "success");
      } else {
        await studentApi.createIdea({
          title: ideaTitle.trim(),
          abstract: ideaAbstract.trim(),
          domainTag: ideaDomain,
          sdgCode: ideaSdg,
          guideUserId: ideaGuideId || undefined,
        });
        showToast("Project idea saved.", "success");
      }
      setIsIdeaModalOpen(false);
      await loadData();
      setFilter("ideas");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to save draft.", "error");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmitProposal = async () => {
    if (ideaTitle.trim().length < 5 || ideaAbstract.trim().length < 20) {
      showToast("Title (min 5 chars) and Abstract (min 20 chars) are required.", "error");
      return;
    }
    if (!ideaGuideId) {
      showToast("Select a preferred faculty guide.", "error");
      return;
    }
    setIsSubmittingProposal(true);
    try {
      let targetId = currentIdeaId;
      if (!isEditingExisting || !targetId) {
        const created = await studentApi.createIdea({
          title: ideaTitle.trim(),
          abstract: ideaAbstract.trim(),
          domainTag: ideaDomain,
          sdgCode: ideaSdg,
          guideUserId: ideaGuideId,
        });
        targetId = created.id;
      } else {
        await studentApi.updateIdea(targetId, {
          title: ideaTitle.trim(),
          abstract: ideaAbstract.trim(),
          domainTag: ideaDomain,
          sdgCode: ideaSdg,
          guideUserId: ideaGuideId,
        });
      }

      if (isResubmitting && targetId) {
        await studentApi.resubmitProposal(targetId, { remarks: submissionRemarks || undefined });
        showToast("Proposal resubmitted.", "success");
      } else if (targetId) {
        await studentApi.submitProposal(targetId, { remarks: submissionRemarks || undefined });
        showToast("Proposal submitted for review.", "success");
      }
      setIsIdeaModalOpen(false);
      await loadData();
      setFilter("ideas");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to submit proposal.", "error");
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  const handleQuickSubmit = async (idea: ProjectIdeaDto, isResubmit: boolean) => {
    if (!confirm(`${isResubmit ? "Resubmit" : "Submit"} "${idea.title}" for review?`)) return;
    try {
      if (isResubmit) {
        await studentApi.resubmitProposal(idea.id, {});
        showToast("Proposal resubmitted.", "success");
      } else {
        await studentApi.submitProposal(idea.id, {});
        showToast("Proposal submitted.", "success");
      }
      await loadData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to submit proposal.", "error");
    }
  };

  const formatReviewStatus = (status: string) => {
    switch (status) {
      case "Draft":
        return <Badge variant="neutral" size="sm">Draft</Badge>;
      case "PendingGuide":
        return <Badge variant="warning" size="sm" dot>Guide Review</Badge>;
      case "PendingCoordinator":
        return <Badge variant="info" size="sm" dot>Coordinator Review</Badge>;
      case "PendingHOD":
        return <Badge variant="info" size="sm" dot>HOD Approval</Badge>;
      case "ActiveBuild":
        return <Badge variant="success" size="sm" dot>Active</Badge>;
      case "Archived":
        return <Badge variant="neutral" size="sm">Archived</Badge>;
      case "Rejected":
        return <Badge variant="danger" size="sm">Rejected</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-5">
      {hasActiveProject && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-emerald-900 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Your team has an active project. New topic registrations are locked.</span>
          </div>
          <Badge variant="success" size="sm">Locked</Badge>
        </div>
      )}

      {/* Tabs & Primary Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 select-none">
        <div className="flex gap-1.5 p-1 bg-white rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setFilter("past")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              filter === "past" ? "bg-brand-primary text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Project Archive ({pastProjects.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("ideas")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              filter === "ideas" ? "bg-brand-primary text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>My Proposals ({ideas.length})</span>
            {ideas.some((i) => i.latestReviewRemarks && i.status === "Draft") && (
              <span className="h-2 w-2 rounded-full bg-amber-400" />
            )}
          </button>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={handleOpenCreateModal}
          disabled={hasActiveProject}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Register Project Idea
        </Button>
      </div>

      {/* Archive Search & Filters */}
      {filter === "past" && (
        <div className="flex flex-col md:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-brand-primary"
            />
          </div>
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700"
          >
            <option value="">All Domains</option>
            {DOMAIN_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <select
            value={sdgFilter}
            onChange={(e) => setSdgFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700"
          >
            <option value="">All SDGs</option>
            {SDG_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 flex items-center justify-center gap-2 text-xs text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin text-brand-primary" />
          <span>Loading...</span>
        </div>
      ) : filter === "past" ? (
        pastProjects.length === 0 ? (
          <EmptyState
            title="No Past Projects Found"
            description="No archived projects match your current filters."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pastProjects.map((past) => (
              <Card key={past.teamId} className="p-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-brand-primary bg-brand-primary-tint px-2 py-0.5 rounded font-mono">
                      {past.academicYear}
                    </span>
                    <span className="font-mono text-slate-500">{past.teamCode}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">{past.title}</h4>
                  <p className="text-xs text-slate-500">Guide: {past.guideName}</p>
                  <p className="text-xs text-slate-600 line-clamp-3">{past.abstract}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-[10px] text-slate-600">
                      {past.domainTag}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-[10px] font-mono text-slate-600">
                      {past.sdgCode}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setInspectingProject(past)}
                >
                  View Details
                </Button>
              </Card>
            ))}
          </div>
        )
      ) : ideas.length === 0 ? (
        <EmptyState
          title="No Project Ideas Yet"
          description="Register a project idea when you are ready."
          actionLabel="Register Project Idea"
          onAction={handleOpenCreateModal}
        />
      ) : (
        <div className="space-y-4">
          {ideas.map((idea) => {
            const isReturned = Boolean(idea.latestReviewRemarks) && idea.status === "Draft";
            const isDraft = idea.status === "Draft";

            return (
              <Card key={idea.id} className="p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {idea.teamCode}
                      </span>
                      {formatReviewStatus(idea.status)}
                      {idea.similarityScorePct !== undefined && idea.similarityScorePct !== null && (
                        <Badge variant={idea.similarityScorePct >= 65 ? "warning" : "success"} size="sm">
                          {idea.similarityScorePct}% Similarity
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{idea.title}</h3>
                    <div className="text-xs text-slate-500">
                      Guide: {idea.guideName || "Unassigned"} • {idea.domainTag} • {idea.sdgCode}
                    </div>
                  </div>

                  {isDraft && idea.isLeader && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenEditModal(idea, isReturned)}
                        leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                      >
                        {isReturned ? "Revise" : "Edit"}
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleQuickSubmit(idea, isReturned)}
                        leftIcon={<Send className="h-3.5 w-3.5" />}
                      >
                        {isReturned ? "Resubmit" : "Submit"}
                      </Button>
                    </div>
                  )}
                </div>

                {isReturned && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">
                        Revision Requested ({idea.latestReviewerName || "Guide"}):{" "}
                      </span>
                      <span>{idea.latestReviewRemarks}</span>
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-600 leading-relaxed">{idea.abstract}</p>

                {idea.reviewHistory && idea.reviewHistory.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
                    {idea.reviewHistory.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          <strong className="text-slate-700">{item.stage}</strong> — {item.action}
                          {item.remarks ? `: "${item.remarks}"` : ""}
                        </span>
                        <span className="font-mono">{new Date(item.occurredAtUtc).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Idea Modal */}
      <Modal
        isOpen={isIdeaModalOpen}
        onClose={() => setIsIdeaModalOpen(false)}
        size="lg"
        title={
          isResubmitting
            ? "Revise & Resubmit Proposal"
            : isEditingExisting
            ? "Edit Project Idea"
            : "Register Project Idea"
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsIdeaModalOpen(false)}
              disabled={isSavingDraft || isSubmittingProposal}
            >
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSaveDraft}
                isLoading={isSavingDraft}
                disabled={isSubmittingProposal}
              >
                Save Draft
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitProposal}
                isLoading={isSubmittingProposal}
                disabled={isSavingDraft}
                leftIcon={<Send className="h-3.5 w-3.5" />}
              >
                {isResubmitting ? "Resubmit" : "Submit for Review"}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3.5 text-xs">
          <Input
            label="Project Title *"
            value={ideaTitle}
            onChange={(e) => setIdeaTitle(e.target.value)}
            placeholder="e.g. Smart Campus Energy Optimizer"
            maxLength={200}
          />
          <Textarea
            label="Abstract & Scope *"
            value={ideaAbstract}
            onChange={(e) => setIdeaAbstract(e.target.value)}
            rows={4}
            placeholder="Problem statement, methodology, and expected outcomes (min 20 chars)..."
            maxLength={2000}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Domain *"
              value={ideaDomain}
              onChange={(e) => setIdeaDomain(e.target.value)}
              options={DOMAIN_OPTIONS}
            />
            <Select
              label="UN SDG *"
              value={ideaSdg}
              onChange={(e) => setIdeaSdg(e.target.value)}
              options={SDG_OPTIONS}
            />
          </div>

          {facultyGuides.length > 0 && (
            <Select
              label="Preferred Faculty Guide *"
              value={ideaGuideId}
              onChange={(e) => setIdeaGuideId(e.target.value)}
              options={facultyGuides.map((g) => ({
                value: g.id,
                label: `${g.fullName} (${g.designation || "Faculty"})`,
              }))}
            />
          )}

          <Input
            label={isResubmitting ? "Revision Notes" : "Remarks (Optional)"}
            value={submissionRemarks}
            onChange={(e) => setSubmissionRemarks(e.target.value)}
            placeholder="Notes for reviewer..."
          />

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-brand-primary" />
                <span>Originality Check</span>
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCheckSimilarity}
                disabled={isCheckingSimilarity || ideaTitle.trim().length < 5}
                isLoading={isCheckingSimilarity}
              >
                Check Originality
              </Button>
            </div>
            {similarityResult && (
              <div
                className={`p-2 rounded border ${
                  similarityResult.isWarning
                    ? "bg-rose-50 border-rose-200 text-rose-900"
                    : "bg-emerald-50 border-emerald-200 text-emerald-900"
                }`}
              >
                <div className="font-semibold">{similarityResult.message}</div>
                {similarityResult.similarProjectCode && (
                  <div className="text-[11px] mt-0.5">
                    Closest match: [{similarityResult.similarProjectCode}] {similarityResult.similarProjectTitle}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Past Project Drawer */}
      <SlideOverDrawer
        isOpen={Boolean(inspectingProject)}
        onClose={() => setInspectingProject(null)}
        title={inspectingProject?.title || "Project Details"}
        subtitle={
          inspectingProject
            ? `${inspectingProject.academicYear} • Guide: ${inspectingProject.guideName}`
            : undefined
        }
        footer={
          <Button size="sm" variant="secondary" onClick={() => setInspectingProject(null)}>
            Close
          </Button>
        }
      >
        {inspectingProject && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-500 block">Domain</span>
                <span className="font-semibold text-slate-900">{inspectingProject.domainTag}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">SDG</span>
                <span className="font-mono font-semibold text-emerald-700">{inspectingProject.sdgCode}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-semibold text-slate-900 block">Abstract</span>
              <p className="text-slate-600 leading-relaxed">{inspectingProject.abstract}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Team Code</span>
                <span className="font-mono font-semibold text-slate-900">{inspectingProject.teamCode}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Team Size</span>
                <span className="font-semibold text-slate-900">{inspectingProject.memberCount} Students</span>
              </div>
            </div>

            {inspectingProject.repoUrl && (
              <a
                href={inspectingProject.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-lg border border-slate-200 flex items-center justify-between hover:border-brand-primary"
              >
                <div className="flex items-center gap-2 truncate">
                  <GithubIcon className="h-4 w-4 shrink-0" />
                  <span className="font-mono truncate">{inspectingProject.repoUrl}</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              </a>
            )}
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
};
