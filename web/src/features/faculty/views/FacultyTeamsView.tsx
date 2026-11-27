"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { facultyApi } from "@/lib/api/facultyApi";
import { ProjectProposalDto } from "@/lib/api/types";
import { MentoredTeamCard } from "../components/MentoredTeamCard";
import { Button } from "@/design-system/components/Button";
import { Search, RefreshCw, AlertCircle, Users, ArrowLeft } from "lucide-react";

export const FacultyTeamsView: React.FC = () => {
  const router = useRouter();
  const [teams, setTeams] = useState<ProjectProposalDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const loadTeams = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await facultyApi.getMentoredTeams();
      setTeams(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load mentored project teams.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTeams();
  }, []);

  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      const matchesSearch =
        searchQuery === "" ||
        t.teamCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.domainTag.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || t.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [teams, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 pb-12">

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={loadTeams}>
            Retry
          </Button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white border border-[#E2E8F0]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by team code, project title, or domain..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          {["ALL", "ActiveBuild", "PendingGuide", "ReadyForViva", "AtRisk"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? "bg-brand-primary text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {st === "ALL" ? `All (${teams.length})` : st}
            </button>
          ))}
        </div>
      </div>

      {/* Teams Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-56 rounded-xl bg-slate-100 border border-slate-200 animate-pulse"
            />
          ))}
        </div>
      ) : filteredTeams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((team) => (
            <MentoredTeamCard
              key={team.teamId}
              team={team}
              onOpenWorkspace={(teamId) => router.push(`/faculty/teams/${teamId}`)}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
          <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-sm text-[#0F172A]">No Teams Found</h3>
          <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== "ALL"
              ? "No mentored project teams match the selected filter criteria."
              : "No project teams are currently assigned to your direct faculty guidance."}
          </p>
        </div>
      )}
    </div>
  );
};
