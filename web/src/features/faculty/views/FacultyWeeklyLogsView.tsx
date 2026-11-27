"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { facultyApi } from "@/lib/api/facultyApi";
import { ActionQueueItemDto } from "@/lib/api/types";
import { WeeklyLogInspectionDrawer } from "../components/WeeklyLogInspectionDrawer";
import { Card, CardHeader, CardTitle, CardContent } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { showToast } from "@/lib/toast";
import {
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

export const FacultyWeeklyLogsView: React.FC = () => {
  const router = useRouter();
  const [logItems, setLogItems] = useState<ActionQueueItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inspectingLog, setInspectingLog] = useState<ActionQueueItemDto | null>(null);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const queue = await facultyApi.getActionQueue();
      const logsOnly = queue.items.filter((i) => i.type === "LogVerification");
      setLogItems(logsOnly);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load weekly progress logs.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLogs();
  }, [loadLogs]);

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
        ? "Weekly logbook verified & signed successfully."
        : "Revision request dispatched to student team.",
      "success"
    );
    await loadLogs();
  };

  return (
    <div className="space-y-6 pb-12">

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={loadLogs}>
            Retry
          </Button>
        </div>
      )}

      {/* Verification Queue Card */}
      <Card>
        <CardHeader className="p-4 pb-3 border-b border-[#E2E8F0] flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-[#0F172A]">
              Pending Friday Logbooks ({logItems.length})
            </CardTitle>
            <p className="text-xs text-[#64748B] mt-0.5">
              Review weekly student engineering hours, tasks completed, and blockers
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse border border-slate-200" />
              ))}
            </div>
          ) : logItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4">Project Title</th>
                    <th className="py-3 px-4">Submission Summary</th>
                    <th className="py-3 px-4">Submitted At</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {logItems.map((item) => (
                    <tr key={item.itemId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="neutral" className="font-mono text-[11px]">
                          {item.teamCode}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium text-[#0F172A] max-w-xs truncate" title={item.teamTitle}>
                        {item.teamTitle}
                      </td>
                      <td className="py-3 px-4 text-[#475569] max-w-sm truncate" title={item.description}>
                        {item.description}
                      </td>
                      <td className="py-3 px-4 text-[#64748B] whitespace-nowrap">
                        {new Date(item.submittedAtUtc).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="warning" dot>Pending Review</Badge>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setInspectingLog(item)}
                          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                        >
                          Review & Sign
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-14 px-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-[#0F172A]">All Weekly Logbooks Verified</h3>
              <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
                No student logbooks are currently awaiting your signature. New submissions will appear here after Friday engineering diary entries.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historical Archive Policy Notice */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#64748B] flex items-start gap-3">
        <Calendar className="w-4 h-4 text-[#0F172A] shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-[#0F172A] mb-0.5">
            Continuous Progress Verification Policy
          </p>
          <p className="leading-relaxed">
            Students are required to submit weekly engineering diaries every Friday. This queue displays all unverified logbooks. Verified records are securely indexed into the institutional academic register.
          </p>
        </div>
      </div>

      {/* Log Review Drawer */}
      <WeeklyLogInspectionDrawer
        isOpen={Boolean(inspectingLog)}
        onClose={() => setInspectingLog(null)}
        item={inspectingLog}
        onVerify={handleVerifyLog}
      />
    </div>
  );
};
