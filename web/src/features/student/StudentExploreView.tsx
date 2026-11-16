"use client";

import React, { useState } from "react";
import {
  Compass,
  Users2,
  BookOpen,
  Search,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Award,
  Layers,
  Send,
  FileText,
} from "lucide-react";
import { AppShell } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { SlideOverDrawer } from "@/design-system/components/SlideOverDrawer";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { GithubIcon } from "@/design-system/components/Icons";

interface PastProject {
  id: string;
  year: string;
  title: string;
  guide: string;
  domain: string;
  rating: string;
  tags: string[];
  abstract: string;
  githubUrl: string;
  publicationUrl?: string;
  architectureNotes: string;
}

export const StudentExploreView: React.FC = () => {
  const { problemBank, teams, currentPersona } = useProjectHubStore();
  const [filter, setFilter] = useState<"problems" | "peers" | "past">("problems");
  const [requestedId, setRequestedId] = useState<string | null>(null);

  // Active team allocation check
  const myTeam =
    teams.find(
      (t) =>
        t.teamCode === "2026-CS-MIN-01" ||
        t.id === "team-01" ||
        t.members.some((m) => m.name === currentPersona.name)
    ) || teams[0];
  const hasActiveProject = !!myTeam && (myTeam.state === "Active" || myTeam.teamCode === "2026-CS-MIN-01");

  // Peer invitation state
  const [invitedPeerIds, setInvitedPeerIds] = useState<string[]>([]);
  const [peerInviteBanner, setPeerInviteBanner] = useState("");

  // Past project inspection drawer state
  const [inspectingProject, setInspectingProject] = useState<PastProject | null>(null);

  const pastProjects: PastProject[] = [
    {
      id: "past-01",
      year: "2024-2025 (Major Sem 8)",
      title: "Automated Micro-Grid Solar Tracking with Maximum Power Point Tracking (MPPT)",
      guide: "Prof. S. K. Verma",
      domain: "Renewable Energy & IoT (SDG 7)",
      rating: "9.2/10 (Best Project Award)",
      tags: ["ESP32", "C++", "PID Controller", "MQTT", "Grafana"],
      abstract:
        "Dual-axis solar tracking system driven by active astronomical algorithm with Perturb and Observe (P&O) MPPT firmware, demonstrating a 31.4% increase in energy harvest across campus solar arrays.",
      architectureNotes:
        "Edge controller interfaces dual servo actuators and irradiance sensor arrays. Sensor data streams to an on-campus MQTT broker and TimescaleDB instance for real-time loss telemetry.",
      githubUrl: "https://github.com/sistec-cse/mppt-solar-microgrid",
      publicationUrl: "https://doi.org/10.1109/ENERGYCON.2025.1049281",
    },
    {
      id: "past-02",
      year: "2024-2025 (Major Sem 8)",
      title: "Self-Supervised Contrastive Learning for Chest X-Ray Pathology Detection",
      guide: "Dr. Amit Rawat",
      domain: "Healthcare & AI (SDG 3)",
      rating: "8.9/10 (IEEE Published)",
      tags: ["PyTorch", "ResNet-50", "FastAPI", "Docker", "KaTeX"],
      abstract:
        "MoCo-v2 pretraining on 80,000 unlabelled pulmonary scans achieving 0.88 AUC ROC for atypical pneumonia with minimal labelled radiological ground truth.",
      architectureNotes:
        "TorchServe inference microservice packaged in Docker container with Grad-CAM visual heatmaps embedded into DICOM hospital workstations.",
      githubUrl: "https://github.com/sistec-cse/contrastive-xray-diagnostics",
      publicationUrl: "https://doi.org/10.1109/JBHI.2025.3218902",
    },
    {
      id: "past-03",
      year: "2023-2024 (Minor Sem 6)",
      title: "Autonomous Warehouse AGV with LiDAR SLAM Navigation",
      guide: "Prof. Priya Nair",
      domain: "Robotics & Embedded (SDG 9)",
      rating: "8.8/10 (Dossier Archived)",
      tags: ["ROS2", "Python", "LiDAR", "Nav2", "Cartographer"],
      abstract:
        "Differential drive robot running 2D Cartographer SLAM and TEB local planner for warehouse collision avoidance within 2cm positional repeatability.",
      architectureNotes:
        "Raspberry Pi 4 compute module orchestrates STM32 motor driver board over UART. Nav2 goal poses dispatched via wireless ROS2 DDS bridges.",
      githubUrl: "https://github.com/sistec-cse/warehouse-agv-slam",
    },
  ];

  const openPeers = [
    {
      id: "peer-01",
      name: "Rohan Gupta",
      usn: "0176CS221038",
      skills: ["React", "FastAPI", "MongoDB", "Docker"],
      interest: "Web3 & Distributed Systems",
      lookingFor: "Teammates for Minor Project Sem 6",
    },
    {
      id: "peer-02",
      name: "Sanya Saxena",
      usn: "0176CS221049",
      skills: ["PyTorch", "OpenCV", "Embedded C", "TinyML"],
      interest: "Computer Vision & Edge AI",
      lookingFor: "Hardware-focused Team Lead",
    },
  ];

  const handleSendPeerInvite = (peer: (typeof openPeers)[0]) => {
    setInvitedPeerIds((prev) => [...prev, peer.id]);
    setPeerInviteBanner(`Team invitation successfully dispatched to ${peer.name} (${peer.usn}).`);
    setTimeout(() => setPeerInviteBanner(""), 4000);
  };

  return (
    <AppShell pageTitle="Explore Campus Repository" breadcrumb="Problem Bank &amp; Team Matching" activeTab="Explore">
      <div className="space-y-6">
        {/* Active Project Allocated Status Banner */}
        {hasActiveProject && myTeam && (
          <div className="p-4 bg-emerald-50 border border-emerald-200/90 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 stroke-[2]" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-950 font-heading">
                  Active Project Allocated: {myTeam.teamCode} — Topic requests are locked for this cycle
                </div>
                <div className="text-[11px] text-emerald-800 mt-0.5">
                  &ldquo;{myTeam.title}&rdquo; is verified under Guide {myTeam.guideName}. Topic allocations are finalized for your team.
                </div>
              </div>
            </div>
            <Badge variant="success" size="sm" dot>
              Allocated &amp; Locked
            </Badge>
          </div>
        )}

        {peerInviteBanner && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{peerInviteBanner}</span>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 select-none">
          <div className="flex gap-1.5 p-1 bg-white rounded-lg border border-[#E2E8F0] shadow-2xs overflow-x-auto">
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
              onClick={() => setFilter("peers")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                filter === "peers"
                  ? "bg-brand-primary text-white"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              Open Peers &amp; Teams ({openPeers.length})
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
              Past Campus Projects ({pastProjects.length})
            </button>
          </div>

          <div className="text-xs text-[#64748B]">
            Showing accredited proposals and peer profiles
          </div>
        </div>

        {/* 1. Problem Bank Grid */}
        {filter === "problems" && (
          problemBank.length === 0 ? (
            <EmptyState
              title="No Problem Statements Available"
              description="Faculty members have not posted any open research topics in the problem bank yet."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {problemBank.map((pb) => (
                <Card key={pb.id} className="hover:border-[#CBD5E1] transition-all flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="sdg" sdgNumber={pb.sdgNumber} size="sm">
                        {pb.domain}
                      </Badge>
                      <span className="text-[10px] text-[#64748B]">Capacity: {pb.capacity}</span>
                    </div>
                    <CardTitle className="pt-2 text-sm">{pb.title}</CardTitle>
                    <CardDescription className="line-clamp-3">{pb.abstract}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs pt-0">
                    <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                      <div className="text-[11px] text-[#64748B]">Faculty Mentor:</div>
                      <div className="font-semibold text-[#0F172A]">{pb.facultyName}</div>
                    </div>

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

                    <Button
                      size="sm"
                      variant={hasActiveProject || pb.taken ? "secondary" : requestedId === pb.id ? "secondary" : "primary"}
                      className="w-full"
                      disabled={hasActiveProject || pb.taken || requestedId === pb.id}
                      onClick={() => !hasActiveProject && setRequestedId(pb.id)}
                    >
                      {hasActiveProject
                        ? "Topic Requests Locked"
                        : pb.taken
                        ? "Topic Allocated"
                        : requestedId === pb.id
                        ? "Request Submitted to Faculty"
                        : "Request Topic Allotment"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {/* 2. Open Peers Grid */}
        {filter === "peers" && (
          openPeers.length === 0 ? (
            <EmptyState
              title="No Available Peers"
              description="All students in this cohort have already formed or joined project teams."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {openPeers.map((peer) => {
                const isInvited = invitedPeerIds.includes(peer.id);

                return (
                  <Card key={peer.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-[#0F172A]">{peer.name}</h4>
                        <span className="font-mono text-[11px] text-[#64748B]">{peer.usn}</span>
                      </div>
                      <Badge variant={isInvited ? "success" : "info"} size="sm" dot>
                        {isInvited ? "Invited" : "Open for Team"}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="text-[#64748B]">Domain Interest: </span>
                        <span className="font-semibold text-[#0F172A]">{peer.interest}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B]">Looking For: </span>
                        <span className="text-[#475569]">{peer.lookingFor}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {peer.skills.map((s, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0] font-mono text-[10px]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={isInvited ? "secondary" : "primary"}
                      className="w-full"
                      disabled={isInvited}
                      onClick={() => handleSendPeerInvite(peer)}
                      leftIcon={isInvited ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Send className="h-3.5 w-3.5" />}
                    >
                      {isInvited ? "Invite Sent ✓" : "Send Team Invite"}
                    </Button>
                  </Card>
                );
              })}
            </div>
          )
        )}

        {/* 3. Past Projects Grid */}
        {filter === "past" && (
          pastProjects.length === 0 ? (
            <EmptyState
              title="No Past Projects"
              description="No archived project records found for this academic department."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pastProjects.map((past) => (
                <Card key={past.id} className="p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-brand-primary bg-brand-primary-tint px-2 py-0.5 rounded border border-brand-primary-border">
                        {past.year}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-600 font-mono">
                        {past.rating}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-[#0F172A] leading-snug">{past.title}</h4>
                      <p className="text-xs text-[#64748B] mt-1">Guided by: {past.guide}</p>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {past.tags.map((t, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-white border border-[#E2E8F0] text-[10px] font-mono text-[#475569]"
                        >
                          {t}
                        </span>
                      ))}
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
      </div>

      {/* Inspect Past Project Slide-Over Drawer */}
      <SlideOverDrawer
        isOpen={!!inspectingProject}
        onClose={() => setInspectingProject(null)}
        title={inspectingProject?.title || "Project Details"}
        subtitle={`${inspectingProject?.year} • Guided by ${inspectingProject?.guide}`}
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-[#64748B] font-mono">Accredited SAR Dossier Archive</span>
            <Button size="sm" variant="secondary" onClick={() => setInspectingProject(null)}>
              Close Inspection
            </Button>
          </div>
        }
      >
        {inspectingProject && (
          <div className="space-y-5 text-xs">
            {/* Domain & Rating */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-brand-primary-tint border border-brand-primary-border">
              <div>
                <span className="text-[10px] text-[#64748B] block">Academic Domain</span>
                <span className="font-bold text-brand-primary">{inspectingProject.domain}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#64748B] block">Evaluation Outcome</span>
                <span className="font-bold text-emerald-700">{inspectingProject.rating}</span>
              </div>
            </div>

            {/* Abstract */}
            <div className="space-y-1.5">
              <span className="font-bold text-[#0F172A] block">Project Abstract:</span>
              <p className="text-[#475569] leading-relaxed p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                {inspectingProject.abstract}
              </p>
            </div>

            {/* Architecture Notes */}
            <div className="space-y-1.5">
              <span className="font-bold text-[#0F172A] block">System Architecture &amp; Firmware Integration:</span>
              <p className="text-[#475569] leading-relaxed p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                {inspectingProject.architectureNotes}
              </p>
            </div>

            {/* Tech Stack Chips */}
            <div className="space-y-1.5">
              <span className="font-bold text-[#0F172A] block">Technical Stack &amp; Protocols:</span>
              <div className="flex flex-wrap gap-1.5">
                {inspectingProject.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-md bg-white border border-[#CBD5E1] text-[#0F172A] font-mono text-xs font-semibold"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Repository & Paper Links */}
            <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
              <span className="font-bold text-[#0F172A] block">Accreditation Evidence &amp; Artifacts:</span>

              <div className="space-y-2">
                <a
                  href={inspectingProject.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-lg border border-[#E2E8F0] bg-white hover:border-brand-primary flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2">
                    <GithubIcon className="h-4 w-4 text-[#0F172A]" />
                    <span className="font-mono font-medium text-[#0F172A] group-hover:text-brand-primary">
                      {inspectingProject.githubUrl}
                    </span>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-[#64748B] group-hover:text-brand-primary" strokeWidth={1.75} />
                </a>

                {inspectingProject.publicationUrl && (
                  <a
                    href={inspectingProject.publicationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-lg border border-[#E2E8F0] bg-white hover:border-brand-primary flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-brand-primary" strokeWidth={1.75} />
                      <span className="font-mono font-medium text-[#0F172A] group-hover:text-brand-primary">
                        {inspectingProject.publicationUrl}
                      </span>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-[#64748B] group-hover:text-brand-primary" strokeWidth={1.75} />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </AppShell>
  );
};
