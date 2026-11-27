"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ProblemBankStatement, CreateProblemStatementRequest } from "@/lib/api/types";
import { facultyApi } from "@/lib/api/facultyApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { ProblemStatementModal } from "@/features/faculty/components/ProblemStatementModal";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Filter,
  Globe2,
  Plus,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";

export const FacultyProblemBankView: React.FC = () => {
  const [statements, setStatements] = useState<ProblemBankStatement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSdg, setSelectedSdg] = useState<string>("ALL");
  const [allocationFilter, setAllocationFilter] = useState<"ALL" | "AVAILABLE" | "ALLOCATED">("ALL");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const fetchStatements = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await facultyApi.getProblemBank();
      setStatements(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load department problem bank.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStatements();
  }, [fetchStatements]);

  const handleProposeTopic = async (payload: CreateProblemStatementRequest) => {
    await facultyApi.createProblemStatement(payload);
    setSuccessToast("New problem statement published to the department bank.");
    setTimeout(() => setSuccessToast(null), 4000);
    await fetchStatements();
  };

  const filteredStatements = useMemo(() => {
    return statements.filter((s) => {
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = s.title.toLowerCase().includes(q);
        const matchesAbstract = s.abstract.toLowerCase().includes(q);
        const matchesPrereq = s.prerequisitesCsv?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesAbstract && !matchesPrereq) return false;
      }

      // SDG filter
      if (selectedSdg !== "ALL" && s.sdgCode !== selectedSdg) {
        return false;
      }

      // Allocation filter
      if (allocationFilter === "AVAILABLE" && s.isAllocated) return false;
      if (allocationFilter === "ALLOCATED" && !s.isAllocated) return false;

      return true;
    });
  }, [statements, searchQuery, selectedSdg, allocationFilter]);

  const sdgOptions = [
    { code: "ALL", label: "All SDG Goals" },
    { code: "SDG-03", label: "SDG-03: Good Health & Well-being" },
    { code: "SDG-04", label: "SDG-04: Quality Education" },
    { code: "SDG-07", label: "SDG-07: Affordable & Clean Energy" },
    { code: "SDG-09", label: "SDG-09: Industry, Innovation & Infrastructure" },
    { code: "SDG-11", label: "SDG-11: Sustainable Cities & Communities" },
    { code: "SDG-12", label: "SDG-12: Responsible Consumption" },
    { code: "SDG-13", label: "SDG-13: Climate Action" },
  ];

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {successToast && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search topics by title, abstract, or prerequisite technologies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 shrink-0 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filter:</span>
          </div>

          <select
            value={selectedSdg}
            onChange={(e) => setSelectedSdg(e.target.value)}
            className="text-xs py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium max-w-[180px]"
          >
            {sdgOptions.map((sdg) => (
              <option key={sdg.code} value={sdg.code}>
                {sdg.label}
              </option>
            ))}
          </select>

          <select
            value={allocationFilter}
            onChange={(e) =>
              setAllocationFilter(e.target.value as "ALL" | "AVAILABLE" | "ALLOCATED")
            }
            className="text-xs py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            <option value="ALL">All Allocations</option>
            <option value="AVAILABLE">Available Only</option>
            <option value="ALLOCATED">Allocated</option>
          </select>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="gap-1.5 text-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Propose Topic
          </Button>
        </div>
      </div>

      {/* Statement Cards Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-[#64748B]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
          Loading department problem statements...
        </div>
      ) : filteredStatements.length === 0 ? (
        <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
          <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-semibold text-slate-600">No problem statements found</p>
          <p className="text-xs text-slate-400 mt-1">
            {statements.length === 0
              ? "No problem topics have been proposed for this department yet."
              : "No topics match your current search and filter criteria."}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="mt-4 gap-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Propose First Topic
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStatements.map((item) => (
            <Card key={item.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                      <Globe2 className="w-3 h-3" />
                      {item.sdgCode}
                    </span>
                    {item.isAllocated ? (
                      <Badge variant="neutral" className="text-[10px] font-semibold">
                        Allocated
                      </Badge>
                    ) : (
                      <Badge variant="success" className="text-[10px] font-semibold">
                        Available
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-sm font-bold text-[#0F172A] line-clamp-2">
                    {item.title}
                  </CardTitle>
                </div>
              </CardHeader>

              <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4 text-xs">
                <p className="text-slate-600 line-clamp-3 leading-relaxed">
                  {item.abstract}
                </p>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {item.prerequisitesCsv && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Prerequisites & Stack
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {item.prerequisitesCsv.split(",").map((p, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-mono"
                          >
                            {p.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      Capacity: {item.maxTeamCapacity} students
                    </span>
                    <span>
                      {new Date(item.createdAtUtc).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Proposal Modal */}
      <ProblemStatementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleProposeTopic}
      />
    </div>
  );
};
