"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Compass,
  Plus,
  Search,
  Send,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { Textarea } from "@/design-system/components/Textarea";
import { Modal } from "@/design-system/components/Modal";
import { studentApi } from "@/lib/api/studentApi";
import {
  CollegeTrackDto,
  PublishedTeamSummaryDto,
  TeamJoinRequestDto,
} from "@/lib/api/types";

export interface StudentTeamFormationPanelProps {
  availableTracks: CollegeTrackDto[];
  tracksLoading: boolean;
  onTeamCreated: () => Promise<void> | void;
}

export const StudentTeamFormationPanel: React.FC<StudentTeamFormationPanelProps> = ({
  availableTracks,
  tracksLoading,
  onTeamCreated,
}) => {
  const [activeTab, setActiveTab] = useState<"window" | "explore">("window");
  const [profileSkills, setProfileSkills] = useState<string[]>([]);

  // Window inspection & Create Team modal
  const [inspectingTrack, setInspectingTrack] = useState<CollegeTrackDto | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDomain, setProjectDomain] = useState("Software");
  const [projectAbstract, setProjectAbstract] = useState("");
  const [creatorRole, setCreatorRole] = useState("");
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [customSkillInput, setCustomSkillInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Explore Teams & Join Requests
  const [publishedTeams, setPublishedTeams] = useState<PublishedTeamSummaryDto[]>([]);
  const [myRequests, setMyRequests] = useState<TeamJoinRequestDto[]>([]);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("ALL");

  // Join Request modal
  const [joiningTeam, setJoiningTeam] = useState<PublishedTeamSummaryDto | null>(null);
  const [desiredRole, setDesiredRole] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const [sendingJoin, setSendingJoin] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [mountNow] = useState(() => Date.now());

  useEffect(() => {
    studentApi
      .getProfile()
      .then((p) => {
        if (p?.skills) setProfileSkills(p.skills);
      })
      .catch(() => {});
  }, []);

  const loadExploreData = useCallback(async () => {
    try {
      setExploreLoading(true);
      const [teamsRes, reqsRes] = await Promise.all([
        studentApi.explorePublishedTeams({
          trackId: selectedTeamFilter !== "ALL" ? selectedTeamFilter : undefined,
          search: searchQuery.trim() || undefined,
          skill: skillFilter.trim() || undefined,
        }),
        studentApi.getMyJoinRequests().catch(() => [] as TeamJoinRequestDto[]),
      ]);
      setPublishedTeams(teamsRes || []);
      setMyRequests(reqsRes || []);
    } catch {
      setPublishedTeams([]);
    } finally {
      setExploreLoading(false);
    }
  }, [selectedTeamFilter, searchQuery, skillFilter]);

  useEffect(() => {
    if (activeTab !== "explore" || availableTracks.length === 0) return;
    let active = true;
    Promise.all([
      studentApi.explorePublishedTeams({
        trackId: selectedTeamFilter !== "ALL" ? selectedTeamFilter : undefined,
        search: searchQuery.trim() || undefined,
        skill: skillFilter.trim() || undefined,
      }),
      studentApi.getMyJoinRequests().catch(() => [] as TeamJoinRequestDto[]),
    ])
      .then(([teamsRes, reqsRes]) => {
        if (!active) return;
        setPublishedTeams(teamsRes || []);
        setMyRequests(reqsRes || []);
      })
      .catch(() => {
        if (active) setPublishedTeams([]);
      })
      .finally(() => {
        if (active) setExploreLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeTab, availableTracks.length, selectedTeamFilter, searchQuery, skillFilter]);

  const selectedTrack = useMemo(
    () => availableTracks.find((t) => t.id === selectedTrackId) || availableTracks[0] || null,
    [availableTracks, selectedTrackId]
  );

  const openCreateModal = (track: CollegeTrackDto) => {
    setSelectedTrackId(track.id);
    setTeamName("");
    setProjectTitle("");
    setProjectAbstract("");
    setProjectDomain("Software");
    setCreatorRole(profileSkills[0] || "");
    setRequiredSkills([]);
    setCustomSkillInput("");
    setCreateError(null);
    setCreateOpen(true);
  };

  const handleAddRequiredSkill = (skill: string) => {
    const clean = skill.trim();
    if (!clean) return;
    if (!requiredSkills.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      setRequiredSkills((prev) => [...prev, clean]);
    }
    setCustomSkillInput("");
  };

  const handleCreateTeam = async (publishImmediately: boolean) => {
    if (!projectTitle.trim() || projectTitle.trim().length < 5) {
      setCreateError("Project title must be at least 5 characters.");
      return;
    }
    if (!projectAbstract.trim() || projectAbstract.trim().length < 20) {
      setCreateError("Project description must be at least 20 characters.");
      return;
    }
    try {
      setCreating(true);
      setCreateError(null);
      await studentApi.createTeam({
        academicTrackId: selectedTrackId || undefined,
        teamName: teamName.trim() || undefined,
        title: projectTitle.trim(),
        abstract: projectAbstract.trim(),
        domainTag: projectDomain.trim() || "Software",
        creatorRole: creatorRole.trim() || undefined,
        requiredSkillsCsv: requiredSkills.length > 0 ? requiredSkills.join(",") : undefined,
        publishImmediately,
      });
      setCreateOpen(false);
      await onTeamCreated();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create team.");
    } finally {
      setCreating(false);
    }
  };

  const handleSendJoinRequest = async () => {
    if (!joiningTeam) return;
    if (!desiredRole.trim() || desiredRole.trim().length < 2) {
      setJoinError("Please select or enter the role you want to contribute.");
      return;
    }
    try {
      setSendingJoin(true);
      setJoinError(null);
      await studentApi.sendJoinRequest(joiningTeam.teamId, {
        desiredRole: desiredRole.trim(),
        message: joinMessage.trim() || undefined,
      });
      setJoiningTeam(null);
      setFeedbackBanner(`Join request sent to ${joiningTeam.teamName || joiningTeam.title}.`);
      await loadExploreData();
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : "Failed to send join request.");
    } finally {
      setSendingJoin(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await studentApi.cancelJoinRequest(requestId);
      setFeedbackBanner("Pending join request cancelled.");
      await loadExploreData();
    } catch (err: unknown) {
      setFeedbackBanner(err instanceof Error ? err.message : "Failed to cancel request.");
    }
  };

  if (!tracksLoading && availableTracks.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-sm font-medium text-slate-600">No active project window</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Minimal Google-Drive-style 2-Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("window")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "window"
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Project Window</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("explore")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "explore"
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Explore Teams</span>
          </button>
        </div>

        {availableTracks.length > 0 && (
          <div className="pb-2 sm:pb-1">
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => openCreateModal(availableTracks[0])}
            >
              Start Project / Create Team
            </Button>
          </div>
        )}
      </div>

      {feedbackBanner && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{feedbackBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-[11px] font-semibold text-emerald-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SECTION A: PROJECT WINDOW */}
      {activeTab === "window" && (
        <div className="space-y-4">
          <div className="text-xs font-semibold text-slate-700">
            Open Department Project Tracks
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableTracks.map((track) => {
              const opensAt = track.registrationOpensUtc ? new Date(track.registrationOpensUtc).getTime() : null;
              const isUpcoming = opensAt !== null && mountNow < opensAt;
              return (
                <Card
                  key={track.id}
                  onClick={() => setInspectingTrack(track)}
                  className="cursor-pointer border-slate-200 hover:border-emerald-400 transition-all"
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{track.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {track.academicYear}
                          {track.semesterNumber ? ` • Semester ${track.semesterNumber}` : ""}
                          {track.subjectCode ? ` • ${track.subjectCode}` : ""}
                        </p>
                      </div>
                      <Badge variant={isUpcoming ? "warning" : "success"}>
                        {isUpcoming ? "Opens Soon" : "Open"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {track.participationMode === "Individual"
                          ? "Individual (1 member)"
                          : `Team Size: ${track.minTeamSize ?? 2}–${track.maxTeamSize ?? 4} members`}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {track.proposalDeadlineUtc
                          ? `Deadline: ${new Date(track.proposalDeadlineUtc).toLocaleDateString()}`
                          : "No hard deadline"}
                      </span>
                    </div>

                    {track.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {track.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTeamFilter(track.id);
                          setActiveTab("explore");
                        }}
                        className="text-xs font-medium text-emerald-700 hover:underline"
                      >
                        Browse Published Teams &rarr;
                      </button>

                      <Button
                        size="sm"
                        variant="primary"
                        disabled={isUpcoming}
                        onClick={(e) => {
                          e.stopPropagation();
                          openCreateModal(track);
                        }}
                      >
                        Start Project
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION B: EXPLORE TEAMS */}
      {activeTab === "explore" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by team name, project title, or domain..."
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs focus:border-emerald-600 focus:outline-none bg-white"
              />
            </div>

            <input
              type="text"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              placeholder="Filter by role or skill..."
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-none bg-white sm:w-48"
            />

            {availableTracks.length > 1 && (
              <select
                value={selectedTeamFilter}
                onChange={(e) => setSelectedTeamFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
              >
                <option value="ALL">All Windows</option>
                {availableTracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {profileSkills.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-500 font-medium">Match your profile skills:</span>
              {profileSkills.map((sk) => {
                const active = skillFilter.toLowerCase() === sk.toLowerCase();
                return (
                  <button
                    key={sk}
                    type="button"
                    onClick={() => setSkillFilter(active ? "" : sk)}
                    className={`rounded-full px-2.5 py-0.5 border transition cursor-pointer ${
                      active
                        ? "border-emerald-700 bg-emerald-700 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-400"
                    }`}
                  >
                    {sk}
                  </button>
                );
              })}
            </div>
          )}

          {exploreLoading ? (
            <Card className="p-8 text-center text-xs text-slate-500">
              Loading published teams...
            </Card>
          ) : publishedTeams.length === 0 ? (
            <Card className="p-8 text-center space-y-2">
              <p className="text-sm font-medium text-slate-700">No published teams found</p>
              <p className="text-xs text-slate-500">
                Be the first to create and publish a team for your project window.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {publishedTeams.map((team) => {
                const isFull = team.availableSlots <= 0;
                const reqStatus = team.myJoinRequestStatus;
                return (
                  <Card key={team.teamId} className="border-slate-200 bg-white">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">
                              {team.teamName || team.title}
                            </h3>
                            <span className="text-[11px] font-mono text-slate-500">
                              {team.teamCode}
                            </span>
                          </div>
                          {team.teamName && (
                            <p className="text-xs font-medium text-slate-700 mt-0.5">{team.title}</p>
                          )}
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {team.academicTrackName} • {team.domainTag}
                          </p>
                        </div>
                        <Badge variant={isFull ? "neutral" : "success"}>
                          {isFull
                            ? "Full"
                            : `${team.availableSlots} slot${team.availableSlots === 1 ? "" : "s"} open`}
                        </Badge>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2">{team.abstract}</p>

                      {team.requiredSkills.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[11px] font-semibold text-slate-500">
                            Looking for
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {team.requiredSkills.map((sk) => {
                              const matchesProfile = profileSkills.some(
                                (p) => p.toLowerCase() === sk.toLowerCase()
                              );
                              return (
                                <span
                                  key={sk}
                                  className={`px-2 py-0.5 rounded-full text-[11px] border ${
                                    matchesProfile
                                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 font-medium"
                                      : "border-slate-200 bg-slate-50 text-slate-700"
                                  }`}
                                >
                                  {sk}
                                  {matchesProfile ? " • Match" : ""}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold text-slate-500">
                          Members ({team.currentMemberCount}/{team.maxTeamSize})
                        </div>
                        <div className="space-y-1">
                          {team.members.map((m) => (
                            <div
                              key={m.userId}
                              className="flex items-center justify-between text-xs text-slate-700"
                            >
                              <span>
                                {m.fullName}
                                {m.isTeamLead ? " (Lead)" : ""}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {m.moduleResponsibility}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        {reqStatus === "Pending" && team.myJoinRequestId ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="warning" size="sm">
                              Request Pending
                            </Badge>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleCancelRequest(team.myJoinRequestId!)}
                            >
                              Cancel Request
                            </Button>
                          </div>
                        ) : reqStatus === "Rejected" ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="danger" size="sm">
                              Declined
                            </Badge>
                            {!isFull && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setJoiningTeam(team);
                                  setDesiredRole(profileSkills[0] || team.requiredSkills[0] || "");
                                  setJoinMessage("");
                                  setJoinError(null);
                                }}
                              >
                                Request Again
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={isFull}
                            leftIcon={<Send className="h-3.5 w-3.5" />}
                            onClick={() => {
                              setJoiningTeam(team);
                              setDesiredRole(profileSkills[0] || team.requiredSkills[0] || "");
                              setJoinMessage("");
                              setJoinError(null);
                            }}
                          >
                            Request to Join
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {myRequests.length > 0 && (
            <Card className="border-slate-200">
              <CardContent className="p-4 space-y-2.5">
                <div className="text-xs font-semibold text-slate-800">My Sent Join Requests</div>
                <div className="divide-y divide-slate-100">
                  {myRequests.map((req) => (
                    <div
                      key={req.id}
                      className="py-2 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">
                          {req.teamName || req.projectTitle}
                        </span>
                        <span className="text-slate-500"> • Role: {req.desiredRole}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            req.status === "Pending"
                              ? "warning"
                              : req.status === "Accepted"
                              ? "success"
                              : req.status === "Rejected"
                              ? "danger"
                              : "neutral"
                          }
                          size="sm"
                        >
                          {req.status}
                        </Badge>
                        {req.status === "Pending" && (
                          <button
                            type="button"
                            onClick={() => handleCancelRequest(req.id)}
                            className="text-[11px] font-medium text-rose-600 hover:underline inline-flex items-center gap-0.5"
                          >
                            <XCircle className="h-3 w-3" />
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Window Guidelines Modal */}
      <Modal
        isOpen={Boolean(inspectingTrack)}
        onClose={() => setInspectingTrack(null)}
        title={inspectingTrack?.name || "Project Window"}
        description={
          inspectingTrack
            ? `${inspectingTrack.academicYear}${inspectingTrack.semesterNumber ? ` • Semester ${inspectingTrack.semesterNumber}` : ""}`
            : undefined
        }
      >
        {inspectingTrack && (
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success">
                {inspectingTrack.participationMode === "Individual"
                  ? "Individual"
                  : `Team (${inspectingTrack.minTeamSize ?? 2}–${inspectingTrack.maxTeamSize ?? 4} members)`}
              </Badge>
              {inspectingTrack.coordinatorName && (
                <Badge variant="neutral">Coordinator: {inspectingTrack.coordinatorName}</Badge>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-1">
              <div className="font-semibold text-slate-800">Project Guidelines</div>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                {inspectingTrack.description?.trim()
                  ? inspectingTrack.description
                  : "No additional guidelines specified by the department."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-[11px] text-slate-500">Registration Opens</div>
                <div className="font-semibold text-slate-800 mt-0.5">
                  {inspectingTrack.registrationOpensUtc
                    ? new Date(inspectingTrack.registrationOpensUtc).toLocaleDateString()
                    : "Open Now"}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-[11px] text-slate-500">Registration Deadline</div>
                <div className="font-semibold text-slate-800 mt-0.5">
                  {inspectingTrack.proposalDeadlineUtc
                    ? new Date(inspectingTrack.proposalDeadlineUtc).toLocaleDateString()
                    : "No hard deadline"}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setInspectingTrack(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const target = inspectingTrack;
                  setInspectingTrack(null);
                  openCreateModal(target);
                }}
              >
                Start Project
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Team Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Start Project / Create Team"
        description="Configure your project details and team role requirements."
      >
        <div className="space-y-4">
          {createError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {createError}
            </div>
          )}

          {selectedTrack && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5 text-xs space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-emerald-950">{selectedTrack.name}</span>
                <Badge variant="success" size="sm">
                  {selectedTrack.participationMode === "Individual"
                    ? "Individual (1)"
                    : `Capacity: ${selectedTrack.minTeamSize ?? 2}–${selectedTrack.maxTeamSize ?? 4} members`}
                </Badge>
              </div>
              <div className="text-[11px] text-emerald-800">
                {selectedTrack.academicYear}
                {selectedTrack.semesterNumber ? ` • Semester ${selectedTrack.semesterNumber}` : ""}
                {selectedTrack.proposalDeadlineUtc
                  ? ` • Deadline: ${new Date(selectedTrack.proposalDeadlineUtc).toLocaleDateString()}`
                  : ""}
              </div>
            </div>
          )}

          {availableTracks.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project Window
              </label>
              <select
                value={selectedTrackId}
                onChange={(e) => setSelectedTrackId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              >
                {availableTracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.participationMode === "Individual" ? "Individual" : `Team ${t.minTeamSize ?? 2}–${t.maxTeamSize ?? 4}`})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Team Name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g., GridPulse Builders"
            />
            <Input
              label="Domain"
              value={projectDomain}
              onChange={(e) => setProjectDomain(e.target.value)}
              placeholder="e.g., AI / IoT / Systems"
            />
          </div>

          <Input
            label="Project Title *"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            placeholder="e.g., Smart Campus Energy Optimizer"
          />

          <Textarea
            label="Project Description *"
            rows={3}
            value={projectAbstract}
            onChange={(e) => setProjectAbstract(e.target.value)}
            placeholder="Describe the problem statement and proposed solution..."
          />

          <div className="space-y-1.5">
            <Input
              label="Your Role in Team"
              value={creatorRole}
              onChange={(e) => setCreatorRole(e.target.value)}
              placeholder="e.g., Backend & ML Lead"
            />
            {profileSkills.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  From your profile:
                </span>
                {profileSkills.map((sk) => (
                  <button
                    key={sk}
                    type="button"
                    onClick={() => setCreatorRole(`${sk} Lead`)}
                    className="rounded-full border border-slate-200 bg-slate-50 hover:border-emerald-400 px-2 py-0.5 text-[11px] text-slate-700"
                  >
                    {sk}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedTrack?.participationMode !== "Individual" && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Roles / Skills Looking For
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSkillInput}
                  onChange={(e) => setCustomSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddRequiredSkill(customSkillInput);
                    }
                  }}
                  placeholder="Add required skill or role (e.g., React, ML)..."
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => handleAddRequiredSkill(customSkillInput)}
                >
                  Add
                </Button>
              </div>
              {requiredSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {requiredSkills.map((sk) => (
                    <span
                      key={sk}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] text-emerald-800"
                    >
                      {sk}
                      <button
                        type="button"
                        onClick={() =>
                          setRequiredSkills((prev) => prev.filter((item) => item !== sk))
                        }
                        className="text-emerald-700 hover:text-emerald-950 font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={creating}
              onClick={() => handleCreateTeam(false)}
            >
              {creating ? "Saving..." : "Create Project"}
            </Button>
            {selectedTrack?.participationMode !== "Individual" && (
              <Button
                variant="primary"
                size="sm"
                disabled={creating}
                onClick={() => handleCreateTeam(true)}
              >
                {creating ? "Publishing..." : "Create & Publish Team"}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Send Join Request Modal */}
      <Modal
        isOpen={Boolean(joiningTeam)}
        onClose={() => setJoiningTeam(null)}
        title={`Request to Join ${joiningTeam?.teamName || joiningTeam?.title || "Team"}`}
        description="Choose the role you will contribute based on your profile skills."
      >
        {joiningTeam && (
          <div className="space-y-4">
            {joinError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {joinError}
              </div>
            )}

            <div className="space-y-1.5">
              <Input
                label="Your Role in This Team *"
                value={desiredRole}
                onChange={(e) => setDesiredRole(e.target.value)}
                placeholder="e.g., Backend Developer / AI Engineer"
              />
              {(profileSkills.length > 0 || joiningTeam.requiredSkills.length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(new Set([...profileSkills, ...joiningTeam.requiredSkills])).map(
                    (sk) => (
                      <button
                        key={sk}
                        type="button"
                        onClick={() => setDesiredRole(sk)}
                        className="rounded-full border border-slate-200 bg-slate-50 hover:border-emerald-400 px-2.5 py-0.5 text-[11px] text-slate-700"
                      >
                        {sk}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            <Textarea
              label="Message to Team Lead (Optional)"
              rows={3}
              value={joinMessage}
              onChange={(e) => setJoinMessage(e.target.value)}
              placeholder="Briefly share your relevant experience or why you'd like to join..."
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setJoiningTeam(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={sendingJoin}
                onClick={handleSendJoinRequest}
              >
                {sendingJoin ? "Sending..." : "Send Join Request"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
