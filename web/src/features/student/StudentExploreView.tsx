"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Compass,
  Search,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  Send,
  Plus,
  Edit3,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
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
  ProblemBankStatementDto,
  ProjectIdeaDto,
  SimilarityCheckResultDto,
} from "@/lib/api/types";

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
  useDashboardHeader({
    title: "Project Discovery & Idea Registration",
    breadcrumb: "Problem Bank • Project Archive • Idea Proposals",
  });

  const [filter, setFilter] = useState<"problems" | "past" | "ideas">("problems");

  // Remote data state
  const [problemBank, setProblemBank] = useState<ProblemBankStatementDto[]>([]);
  const [pastProjects, setPastProjects] = useState<ArchivedProjectSummaryDto[]>([]);
  const [ideas, setIdeas] = useState<ProjectIdeaDto[]>([]);
  const [facultyGuides, setFacultyGuides] = useState<FacultyGuideSummaryDto[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [sdgFilter, setSdgFilter] = useState("");

  // Loading & Error
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Archive inspection drawer
  const [inspectingProject, setInspectingProject] = useState<ArchivedProjectSummaryDto | null>(null);

  // Idea Modal State
  const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [currentIdeaId, setCurrentIdeaId] = useState<string | null>(null);

  // Modal Form Fields
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaAbstract, setIdeaAbstract] = useState("");
  const [ideaDomain, setIdeaDomain] = useState("Artificial Intelligence & ML");
  const [ideaSdg, setIdeaSdg] = useState("SDG-9");
  const [ideaGuideId, setIdeaGuideId] = useState("");
  const [adoptedProblemBankId, setAdoptedProblemBankId] = useState<string | undefined>(undefined);
  const [submissionRemarks, setSubmissionRemarks] = useState("");

  // Similarity Check State
  const [similarityResult, setSimilarityResult] = useState<SimilarityCheckResultDto | null>(null);
  const [isCheckingSimilarity, setIsCheckingSimilarity] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);

  // Active project check: does the student have an approved or active project?
  const hasActiveProject = ideas.some(
    (i) => i.status === "ActiveBuild" || i.status === "Approved" || i.status === "Archived"
  );

  // Load all foundational data
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [pbRes, pastRes, ideasRes, guidesRes] = await Promise.all([
        studentApi.getProblemBank({
          search: searchQuery || undefined,
          domain: domainFilter || undefined,
          sdg: sdgFilter || undefined,
        }),
        studentApi.getArchivedProjects({
          search: searchQuery || undefined,
          domain: domainFilter || undefined,
          sdg: sdgFilter || undefined,
        }),
        studentApi.getIdeas(),
        studentApi.getFacultyGuides().catch(() => [] as FacultyGuideSummaryDto[]),
      ]);

      setProblemBank(pbRes || []);
      setPastProjects(pastRes || []);
      setIdeas(ideasRes || []);
      setFacultyGuides(guidesRes || []);
      if (guidesRes && guidesRes.length > 0 && !ideaGuideId) {
        setIdeaGuideId(guidesRes[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || "Failed to load project discovery data.");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, domainFilter, sdgFilter, ideaGuideId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Open modal to create a new project idea
  const handleOpenCreateModal = () => {
    setIsEditingExisting(false);
    setIsResubmitting(false);
    setCurrentIdeaId(null);
    setIdeaTitle("");
    setIdeaAbstract("");
    setIdeaDomain("Artificial Intelligence & ML");
    setIdeaSdg("SDG-9");
    setAdoptedProblemBankId(undefined);
    setSubmissionRemarks("");
    setSimilarityResult(null);
    if (facultyGuides.length > 0) {
      setIdeaGuideId(facultyGuides[0].id);
    }
    setIsIdeaModalOpen(true);
  };

  // Open modal when adopting a problem bank statement
  const handleAdoptStatement = (statement: ProblemBankStatementDto) => {
    setIsEditingExisting(false);
    setIsResubmitting(false);
    setCurrentIdeaId(null);
    setIdeaTitle(statement.title);
    setIdeaAbstract(statement.abstract);
    setIdeaDomain(statement.departmentName || "Artificial Intelligence & ML");
    setIdeaSdg(statement.sdgCode || "SDG-9");
    setIdeaGuideId(statement.proposedByFacultyId || (facultyGuides[0]?.id ?? ""));
    setAdoptedProblemBankId(statement.id);
    setSubmissionRemarks("");
    setSimilarityResult(null);
    setIsIdeaModalOpen(true);
  };

  // Open modal to edit existing draft
  const handleOpenEditModal = (idea: ProjectIdeaDto, isResubmitFlow = false) => {
    setIsEditingExisting(true);
    setIsResubmitting(isResubmitFlow);
    setCurrentIdeaId(idea.id);
    setIdeaTitle(idea.title);
    setIdeaAbstract(idea.abstract);
    setIdeaDomain(idea.domainTag || "Artificial Intelligence & ML");
    setIdeaSdg(idea.sdgCode || "SDG-9");
    setIdeaGuideId(idea.guideUserId || (facultyGuides[0]?.id ?? ""));
    setAdoptedProblemBankId(undefined);
    setSubmissionRemarks(isResubmitFlow ? `Resubmission addressing feedback: ${idea.latestReviewRemarks || ""}` : "");
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

  // Check similarity
  const handleCheckSimilarity = async () => {
    if (!ideaTitle.trim() || ideaTitle.trim().length < 5) {
      setErrorMessage("Please enter a title of at least 5 characters to check originality.");
      return;
    }
    setIsCheckingSimilarity(true);
    setErrorMessage(null);
    try {
      const res = await studentApi.checkSimilarity({
        title: ideaTitle.trim(),
        abstract: ideaAbstract.trim() || undefined,
        excludeTeamId: currentIdeaId || undefined,
      });
      setSimilarityResult(res);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || "Similarity check failed.");
    } finally {
      setIsCheckingSimilarity(false);
    }
  };

  // Save idea as draft
  const handleSaveDraft = async () => {
    if (!ideaTitle.trim() || ideaTitle.trim().length < 5) {
      setErrorMessage("Project Title must be at least 5 characters long.");
      return;
    }
    if (!ideaAbstract.trim() || ideaAbstract.trim().length < 20) {
      setErrorMessage("Project Abstract must be at least 20 characters long.");
      return;
    }

    setIsSavingDraft(true);
    setErrorMessage(null);

    try {
      if (isEditingExisting && currentIdeaId) {
        await studentApi.updateIdea(currentIdeaId, {
          title: ideaTitle.trim(),
          abstract: ideaAbstract.trim(),
          domainTag: ideaDomain,
          sdgCode: ideaSdg,
          guideUserId: ideaGuideId || undefined,
        });
        setSuccessBanner("Project idea draft successfully updated.");
      } else {
        await studentApi.createIdea({
          title: ideaTitle.trim(),
          abstract: ideaAbstract.trim(),
          domainTag: ideaDomain,
          sdgCode: ideaSdg,
          guideUserId: ideaGuideId || undefined,
          adoptedProblemBankId: adoptedProblemBankId,
        });
        setSuccessBanner("Project idea draft successfully registered.");
      }

      setIsIdeaModalOpen(false);
      await loadInitialData();
      setFilter("ideas");
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || "Failed to save project draft.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Submit proposal for review (or resubmit)
  const handleSubmitProposal = async () => {
    if (!ideaTitle.trim() || ideaTitle.trim().length < 5) {
      setErrorMessage("Project Title must be at least 5 characters long.");
      return;
    }
    if (!ideaAbstract.trim() || ideaAbstract.trim().length < 20) {
      setErrorMessage("Project Abstract must be at least 20 characters long.");
      return;
    }
    if (!ideaGuideId) {
      setErrorMessage("Please select a preferred faculty guide before submitting.");
      return;
    }

    setIsSubmittingProposal(true);
    setErrorMessage(null);

    try {
      let targetId = currentIdeaId;

      // If creating fresh, first create draft
      if (!isEditingExisting || !targetId) {
        const createRes = await studentApi.createIdea({
          title: ideaTitle.trim(),
          abstract: ideaAbstract.trim(),
          domainTag: ideaDomain,
          sdgCode: ideaSdg,
          guideUserId: ideaGuideId,
          adoptedProblemBankId: adoptedProblemBankId,
        });
        targetId = createRes.id;
      } else {
        // Update draft first
        await studentApi.updateIdea(targetId, {
          title: ideaTitle.trim(),
          abstract: ideaAbstract.trim(),
          domainTag: ideaDomain,
          sdgCode: ideaSdg,
          guideUserId: ideaGuideId,
        });
      }

      if (isResubmitting && targetId) {
        await studentApi.resubmitProposal(targetId, {
          remarks: submissionRemarks || "Resubmitted with revisions addressing faculty feedback.",
        });
        setSuccessBanner("Proposal successfully revised and resubmitted to Faculty Guide.");
      } else if (targetId) {
        await studentApi.submitProposal(targetId, {
          remarks: submissionRemarks || "Initial proposal submission for faculty review.",
        });
        setSuccessBanner("Proposal submitted successfully to Faculty Guide. Team roster is now locked.");
      }

      setIsIdeaModalOpen(false);
      await loadInitialData();
      setFilter("ideas");
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || "Failed to submit project proposal.");
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  // Quick submit from cards list
  const handleQuickSubmit = async (idea: ProjectIdeaDto, isResubmit: boolean) => {
    if (!confirm(`Are you sure you want to ${isResubmit ? "resubmit" : "submit"} "${idea.title}" for Faculty Review?`)) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (isResubmit) {
        await studentApi.resubmitProposal(idea.id, {
          remarks: "Resubmitted with revisions addressing reviewer remarks.",
        });
        setSuccessBanner("Proposal resubmitted to Faculty Guide.");
      } else {
        await studentApi.submitProposal(idea.id, {
          remarks: "Submitted for faculty guide review.",
        });
        setSuccessBanner("Proposal submitted to Faculty Guide. Roster locked.");
      }
      await loadInitialData();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || "Failed to submit proposal.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatReviewStatus = (status: string) => {
    switch (status) {
      case "Draft":
        return <Badge variant="neutral" size="sm">Draft</Badge>;
      case "PendingGuide":
        return <Badge variant="warning" size="sm" dot>Under Faculty Guide Review</Badge>;
      case "PendingCoordinator":
        return <Badge variant="info" size="sm" dot>Coordinator Verification</Badge>;
      case "PendingHOD":
        return <Badge variant="info" size="sm" dot>Pending HOD Approval</Badge>;
      case "ActiveBuild":
        return <Badge variant="success" size="sm" dot>Approved &amp; Active</Badge>;
      case "Archived":
        return <Badge variant="neutral" size="sm">Archived</Badge>;
      case "Rejected":
        return <Badge variant="danger" size="sm">Proposal Rejected</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-medium flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900 text-xs font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active Project Allocated Banner */}
      {hasActiveProject && (
        <div className="p-4 bg-emerald-50 border border-emerald-200/90 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4 stroke-[2]" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-950 font-heading">
                Active Project Allocated — Topic registrations are locked for your team
              </div>
              <div className="text-[11px] text-emerald-800 mt-0.5">
                Your team already has an approved project active in the development workspace. New proposals cannot be submitted.
              </div>
            </div>
          </div>
          <Badge variant="success" size="sm" dot>
            Allocated &amp; Locked
          </Badge>
        </div>
      )}

      {/* Filter Tabs & Quick Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 select-none">
        <div className="flex gap-1.5 p-1 bg-white rounded-lg border border-[#E2E8F0] shadow-2xs overflow-x-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilter("problems")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
              filter === "problems"
                ? "bg-brand-primary text-white"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Faculty Problem Bank ({problemBank.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("past")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
              filter === "past"
                ? "bg-brand-primary text-white"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Campus Project Archive ({pastProjects.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("ideas")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filter === "ideas"
                ? "bg-brand-primary text-white"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            <span>My Proposals &amp; Ideas ({ideas.length})</span>
            {ideas.some((i) => i.latestReviewRemarks && i.status === "Draft") && (
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" title="Feedback available" />
            )}
          </button>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={handleOpenCreateModal}
          disabled={hasActiveProject}
          leftIcon={<Plus className="h-4 w-4" />}
          title={hasActiveProject ? "You already have an active allocated project." : undefined}
        >
          Register Project Idea
        </Button>
      </div>

      {/* Search and Filters Bar (for Problem Bank & Archive) */}
      {(filter === "problems" || filter === "past") && (
        <div className="p-3 bg-white rounded-xl border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search by keywords, title, or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary text-[#0F172A]"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full md:w-auto">
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="text-xs rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-[#475569] focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer w-full sm:w-auto"
            >
              <option value="">All Academic Domains</option>
              {DOMAIN_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>

            <select
              value={sdgFilter}
              onChange={(e) => setSdgFilter(e.target.value)}
              className="text-xs rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-[#475569] focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer w-full sm:w-auto"
            >
              <option value="">All SDG Goals</option>
              {SDG_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
          <RefreshCw className="h-6 w-6 text-brand-primary animate-spin" />
          <p className="text-xs text-[#64748B]">Loading institutional repository...</p>
        </div>
      )}

      {/* 1. Problem Bank Grid */}
      {!isLoading && filter === "problems" && (
        problemBank.length === 0 ? (
          <EmptyState
            title="No Problem Statements Found"
            description="No open research topics match your current filter criteria."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {problemBank.map((pb) => (
              <Card key={pb.id} className="hover:border-[#CBD5E1] transition-all flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-brand-primary bg-brand-primary-tint px-2 py-0.5 rounded border border-brand-primary-border font-mono">
                      {pb.sdgCode || "SDG-9"}
                    </span>
                    <span className="text-[10px] text-[#64748B]">
                      Capacity: {pb.maxTeamCapacity} {pb.maxTeamCapacity === 1 ? "Team" : "Teams"}
                    </span>
                  </div>
                  <CardTitle className="pt-2 text-sm leading-snug">{pb.title}</CardTitle>
                  <CardDescription className="line-clamp-3 text-xs leading-relaxed">{pb.abstract}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 text-xs pt-0">
                  <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                    <div className="text-[11px] text-[#64748B]">Faculty Mentor &amp; Department:</div>
                    <div className="font-semibold text-[#0F172A]">{pb.facultyName}</div>
                    <div className="text-[10px] text-[#64748B]">{pb.departmentName} ({pb.departmentCode})</div>
                  </div>

                  {pb.prerequisites && pb.prerequisites.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-semibold text-[#64748B]">Prerequisites:</div>
                      <div className="flex flex-wrap gap-1">
                        {pb.prerequisites.map((p, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded bg-white text-[#475569] border border-[#CBD5E1] text-[10px] font-mono"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant={hasActiveProject || pb.isAllocated ? "secondary" : "primary"}
                    className="w-full"
                    disabled={hasActiveProject || pb.isAllocated}
                    onClick={() => handleAdoptStatement(pb)}
                    title={hasActiveProject ? "You are already registered in an active project for this cycle." : undefined}
                    leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                  >
                    {hasActiveProject
                      ? "Allocation Finalized"
                      : pb.isAllocated
                      ? "Topic Fully Allocated"
                      : "Adopt & Register Idea"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* 2. Past Projects Grid */}
      {!isLoading && filter === "past" && (
        pastProjects.length === 0 ? (
          <EmptyState
            title="No Past Projects Found"
            description="No archived project records match your filter criteria in this department."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pastProjects.map((past) => (
              <Card key={past.teamId} className="p-4 space-y-3 flex flex-col justify-between hover:border-[#CBD5E1] transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-brand-primary bg-brand-primary-tint px-2 py-0.5 rounded border border-brand-primary-border font-mono">
                      {past.academicYear}
                    </span>
                    <span className="text-[11px] font-mono font-medium text-[#64748B]">
                      {past.teamCode}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#0F172A] leading-snug">{past.title}</h4>
                    <p className="text-xs text-[#64748B] mt-1">Guided by: {past.guideName}</p>
                  </div>

                  <p className="text-xs text-[#475569] line-clamp-3 leading-relaxed">{past.abstract}</p>

                  <div className="flex flex-wrap gap-1 pt-1">
                    <span className="px-2 py-0.5 rounded bg-white border border-[#E2E8F0] text-[10px] font-mono text-[#475569]">
                      {past.domainTag}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white border border-[#E2E8F0] text-[10px] font-mono text-[#475569]">
                      {past.sdgCode}
                    </span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full mt-2"
                  onClick={() => setInspectingProject(past)}
                  leftIcon={<Search className="h-3.5 w-3.5" strokeWidth={1.75} />}
                >
                  Inspect Abstract &amp; Repo
                </Button>
              </Card>
            ))}
          </div>
        )
      )}

      {/* 3. My Proposals & Ideas Grid */}
      {!isLoading && filter === "ideas" && (
        ideas.length === 0 ? (
          <EmptyState
            title="No Project Ideas Registered Yet"
            description="You have not created or submitted any project ideas for this academic cycle."
            actionLabel="Create First Project Idea"
            onAction={handleOpenCreateModal}
          />
        ) : (
          <div className="space-y-4">
            {ideas.map((idea) => {
              const isReturned = !!idea.latestReviewRemarks && idea.status === "Draft";
              const isLead = idea.isLeader;
              const isDraft = idea.status === "Draft";

              return (
                <Card key={idea.id} className="p-5 space-y-4 border border-[#E2E8F0] hover:border-[#CBD5E1] transition-all">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#F1F5F9] pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded">
                          {idea.teamCode}
                        </span>
                        {formatReviewStatus(idea.status)}
                        {idea.similarityScorePct !== undefined && idea.similarityScorePct !== null && (
                          <Badge
                            variant={idea.similarityScorePct >= 65 ? "warning" : "success"}
                            size="sm"
                          >
                            Similarity: {idea.similarityScorePct}%
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-[#0F172A] pt-0.5">{idea.title}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {isDraft && isLead && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleOpenEditModal(idea, isReturned)}
                            leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                          >
                            {isReturned ? "Revise Proposal" : "Edit Draft"}
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleQuickSubmit(idea, isReturned)}
                            leftIcon={<Send className="h-3.5 w-3.5" />}
                          >
                            {isReturned ? "Resubmit Proposal" : "Submit for Review"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Return Remarks Banner (if proposal was returned by faculty) */}
                  {isReturned && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5 shadow-2xs">
                      <div className="flex items-center gap-1.5 font-bold text-amber-950">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>Proposal Returned for Revision by {idea.latestReviewerName || "Faculty Guide"}</span>
                        {idea.latestReviewedAtUtc && (
                          <span className="font-normal text-amber-700 text-[11px]">
                            • {new Date(idea.latestReviewRemarks ? idea.latestReviewedAtUtc : "").toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="p-2.5 bg-white/70 rounded-lg border border-amber-200/60 text-amber-900 italic font-mono text-xs">
                        &ldquo;{idea.latestReviewRemarks}&rdquo;
                      </div>
                      <p className="text-[11px] text-amber-800">
                        Please update your project scope and submit your revisions using the &ldquo;Revise Proposal&rdquo; button above.
                      </p>
                    </div>
                  )}

                  {/* Proposal Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                      <span className="text-[11px] text-[#64748B] block">Assigned / Preferred Faculty Guide:</span>
                      <span className="font-semibold text-[#0F172A] block">{idea.guideName || "Not Assigned"}</span>
                      {idea.guideEmail && (
                        <span className="text-[10px] text-[#64748B] font-mono block">{idea.guideEmail}</span>
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                      <span className="text-[11px] text-[#64748B] block">Academic Domain &amp; SDG:</span>
                      <span className="font-semibold text-[#0F172A] block">{idea.domainTag}</span>
                      <span className="text-[10px] text-brand-primary font-mono font-bold block">{idea.sdgCode}</span>
                    </div>

                    <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                      <span className="text-[11px] text-[#64748B] block">Team Lead &amp; Roster Status:</span>
                      <span className="font-semibold text-[#0F172A] block">
                        {idea.isLeader ? "You (Team Leader)" : "Team Member"}
                      </span>
                      <span className="text-[10px] text-[#64748B] block">
                        Roster: {idea.isRosterLocked ? "Locked for Review" : "Open for Draft"}
                      </span>
                    </div>
                  </div>

                  {/* Abstract */}
                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-[#0F172A] block">Project Abstract:</span>
                    <p className="text-[#475569] leading-relaxed p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                      {idea.abstract}
                    </p>
                  </div>

                  {/* Review Lifecycle Progress Steps */}
                  <div className="pt-2 border-t border-[#F1F5F9] space-y-2">
                    <span className="text-xs font-bold text-[#0F172A] block">Proposal Review Lifecycle</span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                      <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                        idea.status === "Draft"
                          ? "bg-amber-50 border-amber-200 text-amber-950 font-semibold"
                          : "bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]"
                      }`}>
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[11px] ${
                          idea.status !== "Draft" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {idea.status !== "Draft" ? "✓" : "1"}
                        </div>
                        <div>
                          <div className="font-medium text-[11px]">Draft Idea</div>
                          <div className="text-[10px] text-[#94A3B8]">Lead Author</div>
                        </div>
                      </div>

                      <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                        idea.status === "PendingGuide"
                          ? "bg-blue-50 border-blue-200 text-blue-950 font-semibold"
                          : idea.status === "PendingCoordinator" || idea.status === "PendingHOD" || idea.status === "ActiveBuild"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                          : "bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]"
                      }`}>
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[11px] ${
                          idea.status === "PendingCoordinator" || idea.status === "PendingHOD" || idea.status === "ActiveBuild"
                            ? "bg-emerald-100 text-emerald-800"
                            : idea.status === "PendingGuide"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-[#E2E8F0] text-[#64748B]"
                        }`}>
                          {idea.status === "PendingCoordinator" || idea.status === "PendingHOD" || idea.status === "ActiveBuild" ? "✓" : "2"}
                        </div>
                        <div>
                          <div className="font-medium text-[11px]">Guide Review</div>
                          <div className="text-[10px] text-[#94A3B8]">Faculty Endorsement</div>
                        </div>
                      </div>

                      <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                        idea.status === "PendingCoordinator"
                          ? "bg-indigo-50 border-indigo-200 text-indigo-950 font-semibold"
                          : idea.status === "PendingHOD" || idea.status === "ActiveBuild"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                          : "bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]"
                      }`}>
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[11px] ${
                          idea.status === "PendingHOD" || idea.status === "ActiveBuild"
                            ? "bg-emerald-100 text-emerald-800"
                            : idea.status === "PendingCoordinator"
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-[#E2E8F0] text-[#64748B]"
                        }`}>
                          {idea.status === "PendingHOD" || idea.status === "ActiveBuild" ? "✓" : "3"}
                        </div>
                        <div>
                          <div className="font-medium text-[11px]">Coordinator</div>
                          <div className="text-[10px] text-[#94A3B8]">Department Verification</div>
                        </div>
                      </div>

                      <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                        idea.status === "PendingHOD"
                          ? "bg-sky-50 border-sky-200 text-sky-950 font-semibold"
                          : idea.status === "ActiveBuild"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                          : "bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B]"
                      }`}>
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[11px] ${
                          idea.status === "ActiveBuild"
                            ? "bg-emerald-100 text-emerald-800"
                            : idea.status === "PendingHOD"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-[#E2E8F0] text-[#64748B]"
                        }`}>
                          {idea.status === "ActiveBuild" ? "✓" : "4"}
                        </div>
                        <div>
                          <div className="font-medium text-[11px]">HOD Approval</div>
                          <div className="text-[10px] text-[#94A3B8]">Final Sanction</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Review Audit History (if available) */}
                  {idea.reviewHistory && idea.reviewHistory.length > 0 && (
                    <div className="pt-2 border-t border-[#F1F5F9] space-y-1.5">
                      <span className="text-xs font-bold text-[#0F172A] block">Review Audit Trail</span>
                      <div className="space-y-1 text-xs">
                        {idea.reviewHistory.map((item, idx) => (
                          <div key={idx} className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-between text-[11px]">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-[#0F172A]">{item.stage} — {item.action}</span>
                              {item.remarks && <p className="text-[#475569] italic">&ldquo;{item.remarks}&rdquo;</p>}
                            </div>
                            <div className="text-right text-[10px] text-[#64748B] shrink-0 font-mono">
                              {item.reviewerName && <div>{item.reviewerName}</div>}
                              <div>{new Date(item.occurredAtUtc).toLocaleDateString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* 4. Idea Registration & Edit Modal */}
      <Modal
        isOpen={isIdeaModalOpen}
        onClose={() => setIsIdeaModalOpen(false)}
        size="lg"
        title={
          isResubmitting
            ? "Revise & Resubmit Project Proposal"
            : isEditingExisting
            ? "Edit Project Idea Draft"
            : adoptedProblemBankId
            ? "Adopt Problem Statement & Register Idea"
            : "Register New Project Idea"
        }
        description="Provide comprehensive details about your project topic. Originality is verified against the institutional repository."
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
                disabled={isSavingDraft || isSubmittingProposal}
                isLoading={isSavingDraft}
              >
                Save as Draft
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitProposal}
                disabled={isSavingDraft || isSubmittingProposal}
                isLoading={isSubmittingProposal}
                leftIcon={<Send className="h-4 w-4" />}
              >
                {isResubmitting ? "Resubmit for Review" : "Submit for Faculty Review"}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 text-xs py-1">
          {/* Project Title */}
          <div>
            <label className="text-xs font-semibold text-[#0F172A] block mb-1">
              Project Title <span className="text-rose-500">*</span>
            </label>
            <Input
              value={ideaTitle}
              onChange={(e) => setIdeaTitle(e.target.value)}
              placeholder="e.g. Real-Time Autonomous Micro-Grid Power Tracking with Edge ML"
              maxLength={200}
            />
            <div className="flex justify-between items-center text-[10px] text-[#64748B] mt-1">
              <span>Minimum 5 characters, academic standard title.</span>
              <span>{ideaTitle.length}/200</span>
            </div>
          </div>

          {/* Project Abstract */}
          <div>
            <label className="text-xs font-semibold text-[#0F172A] block mb-1">
              Project Abstract &amp; Scope <span className="text-rose-500">*</span>
            </label>
            <Textarea
              value={ideaAbstract}
              onChange={(e) => setIdeaAbstract(e.target.value)}
              rows={4}
              placeholder="Detail the motivation, technical architecture, planned methodology, and expected deliverables..."
              maxLength={2000}
            />
            <div className="flex justify-between items-center text-[10px] text-[#64748B] mt-1">
              <span>Minimum 20 characters describing problem and approach.</span>
              <span>{ideaAbstract.length}/2000</span>
            </div>
          </div>

          {/* Domain & SDG */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#0F172A] block mb-1">
                Academic Domain <span className="text-rose-500">*</span>
              </label>
              <Select
                value={ideaDomain}
                onChange={(e) => setIdeaDomain(e.target.value)}
                options={DOMAIN_OPTIONS}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#0F172A] block mb-1">
                UN Sustainable Development Goal (SDG) <span className="text-rose-500">*</span>
              </label>
              <Select
                value={ideaSdg}
                onChange={(e) => setIdeaSdg(e.target.value)}
                options={SDG_OPTIONS}
              />
            </div>
          </div>

          {/* Preferred Guide Selection */}
          <div>
            <label className="text-xs font-semibold text-[#0F172A] block mb-1">
              Preferred Faculty Guide / Mentor <span className="text-rose-500">*</span>
            </label>
            {facultyGuides.length === 0 ? (
              <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#64748B]">
                No department faculty mentors found. Your HOD will assign a guide during review.
              </div>
            ) : (
              <Select
                value={ideaGuideId}
                onChange={(e) => setIdeaGuideId(e.target.value)}
                options={facultyGuides.map((g) => ({
                  value: g.id,
                  label: `${g.fullName} (${g.designation || "Faculty Mentor"} • ${g.email})`,
                }))}
              />
            )}
          </div>

          {/* Submission Remarks (Optional) */}
          <div>
            <label className="text-xs font-semibold text-[#0F172A] block mb-1">
              {isResubmitting ? "Revision Notes for Faculty Guide" : "Submission Remarks (Optional)"}
            </label>
            <Input
              value={submissionRemarks}
              onChange={(e) => setSubmissionRemarks(e.target.value)}
              placeholder={
                isResubmitting
                  ? "Describe the changes made to address faculty comments..."
                  : "Additional notes or context for the faculty reviewer..."
              }
            />
          </div>

          {/* Real-time Similarity Check Section */}
          <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-primary" />
                <span className="font-semibold text-xs text-[#0F172A]">Institutional Originality Check</span>
              </div>
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
              <div className={`p-2.5 rounded-lg border text-xs ${
                similarityResult.isWarning
                  ? "bg-rose-50 border-rose-200 text-rose-950"
                  : "bg-emerald-50 border-emerald-200 text-emerald-950"
              }`}>
                <div className="flex items-center gap-1.5 font-bold">
                  {similarityResult.isWarning ? (
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  )}
                  <span>{similarityResult.message}</span>
                </div>
                {similarityResult.isWarning && similarityResult.similarProjectCode && (
                  <p className="mt-1 text-[11px] text-rose-800">
                    Overlap with project [{similarityResult.similarProjectCode}] &ldquo;{similarityResult.similarProjectTitle}&rdquo;.
                    Consider revising your abstract to emphasize distinctive technical contributions.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* 5. Inspect Past Project Slide-Over Drawer */}
      <SlideOverDrawer
        isOpen={!!inspectingProject}
        onClose={() => setInspectingProject(null)}
        title={inspectingProject?.title || "Project Details"}
        subtitle={`${inspectingProject?.academicYear} • Guided by ${inspectingProject?.guideName}`}
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-[#64748B] font-mono">NBA / SAR Accredited Project Archive</span>
            <Button size="sm" variant="secondary" onClick={() => setInspectingProject(null)}>
              Close Inspection
            </Button>
          </div>
        }
      >
        {inspectingProject && (
          <div className="space-y-5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-brand-primary-tint border border-brand-primary-border">
              <div>
                <span className="text-[10px] text-[#64748B] block">Academic Domain</span>
                <span className="font-bold text-brand-primary">{inspectingProject.domainTag}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#64748B] block">UN SDG Code</span>
                <span className="font-bold text-emerald-700 font-mono">{inspectingProject.sdgCode}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="font-bold text-[#0F172A] block">Project Abstract:</span>
              <p className="text-[#475569] leading-relaxed p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                {inspectingProject.abstract}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <span className="text-[10px] text-[#64748B] block">Project Identifier</span>
                <span className="font-mono font-bold text-[#0F172A]">{inspectingProject.teamCode}</span>
              </div>
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <span className="text-[10px] text-[#64748B] block">Team Size</span>
                <span className="font-bold text-[#0F172A]">{inspectingProject.memberCount} Students</span>
              </div>
            </div>

            {inspectingProject.repoUrl && (
              <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
                <span className="font-bold text-[#0F172A] block">Accredited Repository Artifact:</span>
                <a
                  href={inspectingProject.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-lg border border-[#E2E8F0] bg-white hover:border-brand-primary flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2">
                    <GithubIcon className="h-4 w-4 text-[#0F172A]" />
                    <span className="font-mono font-medium text-[#0F172A] group-hover:text-brand-primary">
                      {inspectingProject.repoUrl}
                    </span>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-[#64748B] group-hover:text-brand-primary" strokeWidth={1.75} />
                </a>
              </div>
            )}
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
};
