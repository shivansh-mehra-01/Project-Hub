"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { facultyApi } from "@/lib/api/facultyApi";
import {
  ActionQueueDto,
  ActionQueueItemDto,
  AssignedDefenseTeamDto,
  ProjectProposalDto,
} from "@/lib/api/types";
import { getUserProfile, authApi } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { FacultyStatCard } from "../components/FacultyStatCard";
import { ActionQueueTable } from "../components/ActionQueueTable";
import { WeeklyLogInspectionDrawer } from "../components/WeeklyLogInspectionDrawer";
import { ProposalReviewDrawer } from "../components/ProposalReviewDrawer";
import {
  ProposalDecisionModal,
  ProposalDecisionType,
} from "../components/ProposalDecisionModal";
import { MentoredTeamCard } from "../components/MentoredTeamCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/design-system/components/Card";
import { Button } from "@/design-system/components/Button";
import { PageHeader } from "@/design-system/patterns/PageHeader";
import { PageErrorState } from "@/design-system/patterns/PageStates";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import {
  Users,
  Calendar,
  FileText,
  GraduationCap,
  ArrowRight,
} from "lucide-react";

export const FacultyDashboardView: React.FC = () => {
  const router = useRouter();
  const [profile, setProfile] = useState(() => getUserProfile());

  useEffect(() => {
    if (profile) return;
    let active = true;
    authApi
      .session()
      .then((res) => {
        if (active && res.authenticated && res.user) {
          setProfile(res.user);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [profile]);

  const [actionQueue, setActionQueue] = useState<ActionQueueDto | null>(null);
  const [mentoredTeams, setMentoredTeams] = useState<ProjectProposalDto[]>([]);
  const [defenseTeams, setDefenseTeams] = useState<AssignedDefenseTeamDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drawers and modals
  const [inspectingLog, setInspectingLog] = useState<ActionQueueItemDto | null>(null);
  const [inspectingProposal, setInspectingProposal] = useState<ActionQueueItemDto | null>(null);

  const [decisionModal, setDecisionModal] = useState<{
    isOpen: boolean;
    type: ProposalDecisionType;
    teamId: string;
    teamCode: string;
  }>({
    isOpen: false,
    type: "endorse",
    teamId: "",
    teamCode: "",
  });

  const loadDashboardData = useCallback(async () => {
    try {
      const [queueRes, teamsRes, defenseRes] = await Promise.allSettled([
        facultyApi.getActionQueue(),
        facultyApi.getMentoredTeams(),
        facultyApi.getAssignedDefenseTeams(),
      ]);

      if (queueRes.status === "fulfilled") {
        setActionQueue(queueRes.value);
      } else {
        throw queueRes.reason;
      }

      if (teamsRes.status === "fulfilled") {
        setMentoredTeams(teamsRes.value);
      }

      if (defenseRes.status === "fulfilled") {
        setDefenseTeams(defenseRes.value);
      }
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load faculty dashboard data.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboardData();
  }, [loadDashboardData]);

  const handleVerifyLog = async (
    logId: string,
    decision: "Approved" | "NeedsRevision",
    remarks?: string
  ) => {
    await facultyApi.verifyLog(logId, {
      decision,
      isApproved: decision === "Approved",
      remarks,
    });
    showToast(
      decision === "Approved"
        ? "Weekly progress log verified & signed."
        : "Revision request dispatched to student.",
      "success"
    );
    await loadDashboardData();
  };

  const handleOpenDecision = (teamId: string, type: ProposalDecisionType) => {
    const target = actionQueue?.items.find((i) => i.projectTeamId === teamId);
    setDecisionModal({
      isOpen: true,
      type,
      teamId,
      teamCode: target?.teamCode || "Team",
    });
  };

  const handleConfirmDecision = async (
    teamId: string,
    decision: ProposalDecisionType,
    remarks?: string
  ) => {
    if (decision === "endorse") {
      await facultyApi.endorseProposal(teamId);
      showToast("Proposal endorsed & forwarded to Department Coordinator.", "success");
    } else if (decision === "return") {
      await facultyApi.returnProposal(teamId, { remarks: remarks! });
      showToast("Proposal returned to student team for revision.", "success");
    } else if (decision === "reject") {
      await facultyApi.rejectProposal(teamId, { remarks: remarks! });
      showToast("Proposal rejected. Guide assignment revoked.", "success");
    }
    setInspectingProposal(null);
    await loadDashboardData();
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={`Welcome back, ${profile?.fullName || "Faculty"}`}
        description={profile?.departmentName || "Faculty & Guide Mentorship Console"}
      />

      <PageErrorState error={error} onRetry={loadDashboardData} />

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <FacultyStatCard
          label="Mentored Teams"
          value={isLoading ? "—" : mentoredTeams.length}
          subtext="Active capstone & minor teams"
          icon={<Users />}
          variant="neutral"
          onClick={() => router.push("/faculty/teams")}
        />

        <FacultyStatCard
          label="Pending Logbooks"
          value={isLoading ? "—" : actionQueue?.pendingLogsCount ?? 0}
          subtext="Friday check-ins awaiting sign-off"
          icon={<Calendar />}
          variant="amber"
          onClick={() => router.push("/faculty/logs")}
        />

        <FacultyStatCard
          label="Pending Proposals"
          value={isLoading ? "—" : actionQueue?.pendingProposalsCount ?? 0}
          subtext="Student dossiers requiring review"
          icon={<FileText />}
          variant="blue"
          onClick={() => router.push("/faculty/proposals")}
        />

        <FacultyStatCard
          label="Defense Teams"
          value={isLoading ? "—" : defenseTeams.length}
          subtext="Assigned viva examination panels"
          icon={<GraduationCap />}
          variant="emerald"
          onClick={() => router.push("/faculty/evaluations")}
        />
      </div>

      {/* Priority Action Queue */}
      <Card>
        <CardHeader className="p-4 pb-3 border-b border-[#E2E8F0] flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-[#0F172A]">
              Priority Action Queue
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ActionQueueTable
            items={actionQueue?.items ?? []}
            isLoading={isLoading}
            onInspectLog={(item) => setInspectingLog(item)}
            onInspectProposal={(item) => setInspectingProposal(item)}
          />
        </CardContent>
      </Card>

      {/* Mentored Teams Portfolio Teaser */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#0F172A]">Mentored Project Teams</h2>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push("/faculty/teams")}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            View All ({mentoredTeams.length})
          </Button>
        </div>

        {mentoredTeams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mentoredTeams.slice(0, 3).map((team) => (
              <MentoredTeamCard
                key={team.teamId}
                team={team}
                onOpenWorkspace={(teamId) => router.push(`/faculty/teams/${teamId}?from=dashboard`)}
              />
            ))}
          </div>
        ) : !isLoading ? (
          <EmptyState
            title="No mentored teams yet"
            description="No project teams are assigned to your mentorship yet."
          />
        ) : null}
      </div>

      {/* Drawers & Modals */}
      <WeeklyLogInspectionDrawer
        isOpen={Boolean(inspectingLog)}
        onClose={() => setInspectingLog(null)}
        item={inspectingLog}
        onVerify={handleVerifyLog}
      />

      <ProposalReviewDrawer
        isOpen={Boolean(inspectingProposal)}
        onClose={() => setInspectingProposal(null)}
        proposal={inspectingProposal}
        onEndorse={(teamId) => handleOpenDecision(teamId, "endorse")}
        onReturn={(teamId) => handleOpenDecision(teamId, "return")}
        onReject={(teamId) => handleOpenDecision(teamId, "reject")}
      />

      <ProposalDecisionModal
        isOpen={decisionModal.isOpen}
        onClose={() =>
          setDecisionModal((prev) => ({ ...prev, isOpen: false }))
        }
        decisionType={decisionModal.type}
        teamId={decisionModal.teamId}
        teamCode={decisionModal.teamCode}
        onConfirm={handleConfirmDecision}
      />
    </div>
  );
};
