"use client";

import React, { useState } from "react";
import { Compass, Users2, BookOpen, Search, ArrowRight, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";

export const StudentExploreView: React.FC = () => {
  const { problemBank } = useProjectHubStore();
  const [filter, setFilter] = useState<"problems" | "peers" | "past">("problems");
  const [requestedId, setRequestedId] = useState<string | null>(null);

  const pastProjects = [
    {
      id: "past-01",
      year: "2024-2025 (Major)",
      title: "Automated Micro-Grid Solar Tracking with Maximum Power Point Tracking (MPPT)",
      guide: "Prof. S. K. Verma",
      domain: "Renewable Energy & IoT",
      rating: "9.2/10 (Best Project Award)",
      tags: ["ESP32", "C++", "PID Controller"],
    },
    {
      id: "past-02",
      year: "2024-2025 (Major)",
      title: "Self-Supervised Contrastive Learning for Chest X-Ray Pathology Detection",
      guide: "Dr. Amit Rawat",
      domain: "Healthcare & AI",
      rating: "8.9/10 (IEEE Published)",
      tags: ["PyTorch", "ResNet-50", "FastAPI"],
    },
    {
      id: "past-03",
      year: "2023-2024 (Minor)",
      title: "Autonomous Warehouse AGV with LiDAR SLAM Navigation",
      guide: "Prof. Priya Nair",
      domain: "Robotics & Embedded",
      rating: "8.8/10",
      tags: ["ROS2", "Python", "LiDAR"],
    },
  ];

  const openPeers = [
    {
      id: "peer-01",
      name: "Rohan Gupta",
      usn: "0176CS221038",
      skills: ["React", "FastAPI", "MongoDB"],
      interest: "Web3 & Distributed Systems",
      lookingFor: "Teammates for Minor Project Sem 6",
    },
    {
      id: "peer-02",
      name: "Sanya Saxena",
      usn: "0176CS221049",
      skills: ["PyTorch", "OpenCV", "Embedded C"],
      interest: "Computer Vision & Edge AI",
      lookingFor: "Hardware-focused Team Lead",
    },
  ];

  return (
    <AppShell pageTitle="Explore Campus Repository" breadcrumb="Problem Bank &amp; Team Matching" activeTab="Explore">
      <div className="space-y-6">
        {/* Filter Pills */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 select-none">
          <div className="flex gap-1.5 p-1 bg-white rounded-lg border border-[#E2E8F0] shadow-2xs">
            <button
              type="button"
              onClick={() => setFilter("problems")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                filter === "problems"
                  ? "bg-[#4F46E5] text-white"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              Faculty Problem Bank ({problemBank.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("peers")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                filter === "peers"
                  ? "bg-[#4F46E5] text-white"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              Open Peers &amp; Teams ({openPeers.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("past")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                filter === "past"
                  ? "bg-[#4F46E5] text-white"
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
                    variant={requestedId === pb.id ? "secondary" : "primary"}
                    className="w-full"
                    disabled={pb.taken || requestedId === pb.id}
                    onClick={() => setRequestedId(pb.id)}
                  >
                    {pb.taken
                      ? "Topic Allocated"
                      : requestedId === pb.id
                      ? "Request Submitted to Faculty"
                      : "Request Topic Allotment"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 2. Open Peers Grid */}
        {filter === "peers" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openPeers.map((peer) => (
              <Card key={peer.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#0F172A]">{peer.name}</h4>
                    <span className="font-mono text-[11px] text-[#64748B]">{peer.usn}</span>
                  </div>
                  <Badge variant="info" size="sm">
                    Open for Team
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

                <Button size="sm" variant="secondary" className="w-full">
                  Send Team Invite
                </Button>
              </Card>
            ))}
          </div>
        )}

        {/* 3. Past Projects Grid */}
        {filter === "past" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pastProjects.map((past) => (
              <Card key={past.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#4F46E5] bg-[#EEF2FF] px-2 py-0.5 rounded">
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

                <Button size="sm" variant="ghost" className="w-full">
                  Inspect Abstract &amp; Repo
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};
