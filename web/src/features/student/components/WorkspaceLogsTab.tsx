"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { Textarea } from "@/design-system/components/Textarea";
import { EmptyState } from "@/design-system/patterns/EmptyState";
import { studentApi } from "@/lib/api/studentApi";
import { WeeklyLogDto } from "@/lib/api/types";
import { showToast } from "@/lib/toast";

export interface WorkspaceLogsTabProps {
  logs: WeeklyLogDto[];
  guideName?: string;
  onRefresh: () => Promise<void>;
}

export const WorkspaceLogsTab: React.FC<WorkspaceLogsTabProps> = ({
  logs,
  guideName,
  onRefresh,
}) => {
  const nextWeek = logs.length > 0 ? Math.max(...logs.map((l) => l.weekNumber)) + 1 : 1;
  const [weekNumber, setWeekNumber] = useState(nextWeek);
  const [accomplishments, setAccomplishments] = useState("");
  const [blockers, setBlockers] = useState("");
  const [hours, setHours] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (weekNumber < 1) {
      showToast("Week number must be at least 1.", "error");
      return;
    }
    if (hours < 1 || hours > 168) {
      showToast("Hours logged must be between 1 and 168.", "error");
      return;
    }
    if (accomplishments.trim().length < 5) {
      showToast("Please describe your accomplishments (at least 5 characters).", "error");
      return;
    }
    setSubmitting(true);
    try {
      await studentApi.submitLog({
        weekNumber,
        accomplishmentsSummary: accomplishments.trim(),
        blockersSummary: blockers.trim() || undefined,
        hoursLogged: hours,
        gitCommitCount: 0,
      });
      setAccomplishments("");
      setBlockers("");
      setWeekNumber((w) => w + 1);
      showToast("Weekly log submitted.", "success");
      await onRefresh();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to submit log.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
      <Card className="md:col-span-5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weekly Check-In</CardTitle>
          {guideName && <p className="text-xs text-slate-500">Reviewed by {guideName}</p>}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Week #"
                type="number"
                min={1}
                value={weekNumber}
                onChange={(e) => setWeekNumber(parseInt(e.target.value, 10) || 1)}
              />
              <Input
                label="Hours Logged"
                type="number"
                min={1}
                value={hours}
                onChange={(e) => setHours(parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <Textarea
              label="Accomplishments *"
              placeholder="What was completed this week?"
              value={accomplishments}
              onChange={(e) => setAccomplishments(e.target.value)}
              required
              rows={3}
            />
            <Textarea
              label="Blockers (Optional)"
              placeholder="Any roadblocks or help needed..."
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              rows={2}
            />
            <Button type="submit" variant="primary" size="sm" className="w-full" isLoading={submitting}>
              Submit Weekly Log
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="md:col-span-7">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Logbook History ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {logs.length === 0 ? (
            <EmptyState title="No logs yet" description="Submit your first weekly check-in." />
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    Week {log.weekNumber} • {log.authorName} • {log.hoursLogged}h
                  </span>
                  <Badge variant={log.isVerified ? "success" : "info"} size="sm">
                    {log.isVerified ? "Verified" : "Pending"}
                  </Badge>
                </div>
                <p className="text-slate-700">{log.accomplishmentsSummary}</p>
                {log.blockersSummary && (
                  <p className="text-slate-500">Blockers: {log.blockersSummary}</p>
                )}
                {log.mentorRemarks && (
                  <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-emerald-800 text-[11px]">
                    <strong>Guide:</strong> {log.mentorRemarks}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
