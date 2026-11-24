"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { facultyApi } from "@/lib/api/facultyApi";
import {
  ArtifactSlotDto,
  ArtifactSlotType,
} from "@/lib/api/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { showToast } from "@/lib/toast";
import {
  FileCheck2,
  Download,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  FileText,
  ArrowLeft,
  Filter,
} from "lucide-react";

interface AggregatedDeliverableItem {
  teamId: string;
  teamCode: string;
  projectTitle: string;
  artifact: ArtifactSlotDto;
}

export const FacultyDeliverablesView: React.FC = () => {
  const router = useRouter();
  const [items, setItems] = useState<AggregatedDeliverableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [slotFilter, setSlotFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const slotLabels: Record<ArtifactSlotType, string> = {
    Synopsis: "Project Synopsis",
    MidTermPPT: "Mid-Term PPT Deck",
    PlagiarismReport: "Plagiarism Report",
    FinalThesis: "Final Capstone Thesis",
  };

  const loadAllDeliverables = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch guided teams
      const teams = await facultyApi.getMentoredTeams();

      // 2. Fetch artifacts for each team in parallel
      const artifactPromises = teams.map(async (t) => {
        try {
          const arts = await facultyApi.getTeamArtifacts(t.teamId);
          return arts.map((art) => ({
            teamId: t.teamId,
            teamCode: t.teamCode,
            projectTitle: t.title,
            artifact: art,
          }));
        } catch {
          return [];
        }
      });

      const results = await Promise.all(artifactPromises);
      const flattened = results.flat();
      setItems(flattened);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load capstone deliverables.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAllDeliverables();
  }, [loadAllDeliverables]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSlot =
        slotFilter === "ALL" || item.artifact.slotType === slotFilter;
      const matchesStatus =
        statusFilter === "ALL" || item.artifact.status === statusFilter;
      return matchesSlot && matchesStatus;
    });
  }, [items, slotFilter, statusFilter]);

  const handleDownload = async (item: AggregatedDeliverableItem) => {
    if (!item.artifact.id) {
      showToast("Artifact file not available for download.", "warning");
      return;
    }
    try {
      showToast(`Initiating download for ${item.artifact.fileName || "deliverable.pdf"}...`, "info");
      const blob = await facultyApi.downloadArtifact(item.artifact.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.artifact.fileName || `${item.artifact.slotType}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast("Download completed.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to download deliverable.";
      showToast(msg, "error");
    }
  };

  const handleReview = async (
    item: AggregatedDeliverableItem,
    isApproved: boolean
  ) => {
    if (!item.artifact.id) return;
    let note: string | undefined = undefined;
    if (!isApproved) {
      const input = window.prompt("Enter revision instructions for the student team:");
      if (input === null) return;
      if (!input.trim() || input.trim().length < 5) {
        showToast("Remarks of at least 5 characters required when requesting revision.", "warning");
        return;
      }
      note = input.trim();
    }

    try {
      await facultyApi.reviewArtifact(item.artifact.id, {
        isApproved,
        reviewerNote: note,
      });
      showToast(
        isApproved
          ? `Deliverable '${item.artifact.slotType}' marked as Verified.`
          : `Revision requested for '${item.artifact.slotType}'.`,
        "success"
      );
      await loadAllDeliverables();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record deliverable review.";
      showToast(msg, "error");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => router.push("/faculty")}
              className="text-xs text-[#64748B] hover:text-[#0F172A] flex items-center gap-1 font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </button>
          </div>
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">
            Capstone Deliverables Vault
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Institutional 4-slot deliverable verification (Synopsis, Mid-Term PPT, Plagiarism Report, Final Thesis)
          </p>
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={loadAllDeliverables}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Vault
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={loadAllDeliverables}>
            Retry
          </Button>
        </div>
      )}

      {/* Filter Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white border border-[#E2E8F0]">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#64748B] font-medium flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Slot:
          </span>
          {[
            { key: "ALL", label: "All Slots" },
            { key: "Synopsis", label: "Synopsis" },
            { key: "MidTermPPT", label: "Mid-Term PPT" },
            { key: "PlagiarismReport", label: "Plagiarism Report" },
            { key: "FinalThesis", label: "Final Thesis" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setSlotFilter(s.key)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                slotFilter === s.key
                  ? "bg-brand-primary text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#64748B] font-medium">Status:</span>
          {[
            { key: "ALL", label: "All" },
            { key: "Uploaded", label: "Pending Attest" },
            { key: "Verified", label: "Verified" },
            { key: "RevisionRequested", label: "Revision Requested" },
          ].map((st) => (
            <button
              key={st.key}
              onClick={() => setStatusFilter(st.key)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === st.key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Deliverables Table */}
      <Card>
        <CardHeader className="p-4 pb-3 border-b border-[#E2E8F0]">
          <CardTitle className="text-sm font-bold text-[#0F172A]">
            Deliverables Vault Queue ({filteredItems.length})
          </CardTitle>
          <p className="text-xs text-[#64748B] mt-0.5">
            Attest authentic student documents or stream genuine binary files
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse border border-slate-200" />
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4">Project Title</th>
                    <th className="py-3 px-4">Deliverable Slot</th>
                    <th className="py-3 px-4">File Name</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Reviewer Note</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredItems.map((item, idx) => {
                    const art = item.artifact;
                    const hasFile = art.status !== "Missing" && art.id;
                    return (
                      <tr key={`${item.teamId}-${art.slotType}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge variant="neutral" className="font-mono text-[11px]">
                            {item.teamCode}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-medium text-[#0F172A] max-w-xs truncate" title={item.projectTitle}>
                          {item.projectTitle}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-medium text-[#0F172A]">
                          <div className="flex items-center gap-1.5">
                            <span className="p-1 rounded bg-slate-100 text-slate-700">
                              <FileText className="w-3.5 h-3.5" />
                            </span>
                            <span>{slotLabels[art.slotType] || art.slotType}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#64748B] whitespace-nowrap">
                          {art.fileName || "—"}
                          {art.fileSizeBytes > 0 && (
                            <span className="text-[10px] text-slate-400 ml-1">
                              ({Math.round(art.fileSizeBytes / 1024)} KB)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge
                            variant={
                              art.status === "Verified"
                                ? "success"
                                : art.status === "Uploaded"
                                ? "info"
                                : art.status === "RevisionRequested"
                                ? "danger"
                                : "neutral"
                            }
                            dot={art.status !== "Missing"}
                          >
                            {art.status === "Missing" ? "Pending Upload" : art.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-[#64748B] max-w-xs truncate" title={art.reviewerNote || ""}>
                          {art.reviewerNote || "—"}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {hasFile ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleDownload(item)}
                                  leftIcon={<Download className="w-3.5 h-3.5" />}
                                >
                                  Download
                                </Button>
                                {art.status !== "Verified" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="border-amber-300 text-amber-800 hover:bg-amber-50"
                                      onClick={() => handleReview(item, false)}
                                      leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                                    >
                                      Revision
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      onClick={() => handleReview(item, true)}
                                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                    >
                                      Attest
                                    </Button>
                                  </>
                                )}
                              </>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Not submitted</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-14 px-4">
              <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-[#0F172A]">No Deliverables Found</h3>
              <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
                No deliverables match the selected slot and status filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
