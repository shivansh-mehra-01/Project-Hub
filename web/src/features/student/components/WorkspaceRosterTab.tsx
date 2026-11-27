"use client";

import React from "react";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { GithubIcon } from "@/design-system/components/Icons";
import { DashboardProjectSummaryDto } from "@/lib/api/types";

export interface WorkspaceRosterTabProps {
  project: DashboardProjectSummaryDto;
}

export const WorkspaceRosterTab: React.FC<WorkspaceRosterTabProps> = ({ project }) => {
  const doneCount = project.tasks.filter((t) => t.status === "Done").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono font-bold text-xs text-brand-primary bg-brand-primary-tint px-2 py-0.5 rounded border border-brand-primary-border">
              {project.teamCode}
            </span>
            <Badge variant="success" size="sm" dot>
              {project.status}
            </Badge>
          </div>
          <CardTitle className="pt-2 text-base">{project.title}</CardTitle>
          {project.abstract && <CardDescription>{project.abstract}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-slate-500 block">Faculty Guide</span>
              <span className="font-semibold text-slate-900">{project.guideName || "Unassigned"}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Domain</span>
              <span className="font-semibold text-slate-900">{project.domainTag || "—"}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Weekly Logs</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {project.weeklyLogs.length} Submitted
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Sprint Tasks</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {doneCount}/{project.tasks.length} Done
              </span>
            </div>
          </div>

          {project.githubRepoUrl && (
            <div className="p-3 rounded-lg border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GithubIcon className="h-4 w-4 text-slate-800" />
                <span className="text-slate-500">Repository:</span>
                <a
                  href={project.githubRepoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  <span>{project.githubRepoUrl}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900">Team Members ({project.members.length})</h4>
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white">
              {project.members.map((m) => (
                <div key={m.userId} className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {m.fullName}
                      {m.isTeamLead && (
                        <span className="text-brand-primary font-semibold ml-1.5">(Lead)</span>
                      )}
                    </div>
                    {m.moduleResponsibility && (
                      <div className="text-[11px] text-slate-500">{m.moduleResponsibility}</div>
                    )}
                  </div>
                  <span className="font-mono text-xs tabular-nums text-slate-500">
                    {m.enrollmentCode}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
