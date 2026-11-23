import React from "react";
import { SlideOverDrawer } from "@/design-system/components/SlideOverDrawer";
import { Badge } from "@/design-system/components/Badge";
import { HodProjectDto } from "@/lib/api";
import { BookOpen, AlertCircle, Users, CheckCircle2 } from "lucide-react";

export interface ProjectDetailsDrawerProps {
  project: HodProjectDto | null;
  onClose: () => void;
  onAssignGuide?: (project: HodProjectDto) => void;
}

export const ProjectDetailsDrawer: React.FC<ProjectDetailsDrawerProps> = ({
  project,
  onClose,
  onAssignGuide,
}) => {
  if (!project) return null;

  const isAtRisk = project.status === "AtRisk" || project.missedLogStreak >= 2;

  const statusVariant =
    project.status === "Completed"
      ? "success"
      : project.status === "ActiveBuild"
      ? "info"
      : project.status === "AtRisk"
      ? "danger"
      : "neutral";

  return (
    <SlideOverDrawer
      isOpen={!!project}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-slate-900">{project.teamCode}</span>
          <Badge variant={statusVariant} size="sm" dot>
            {project.status}
          </Badge>
        </div>
      }
      subtitle="Department Project Governance Overview"
    >
      <div className="space-y-6 text-xs text-slate-700">
        {/* Project Identity */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-slate-900 leading-snug">{project.title}</h4>
          <p className="text-slate-600 leading-relaxed text-xs whitespace-pre-line">
            {project.abstract || "No abstract provided."}
          </p>
        </div>

        {/* Governance Parameters */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Academic Track:</span>
            <span className="font-semibold text-slate-900">
              {project.academicTrackName || "General Track"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Domain Area:</span>
            <span className="font-semibold text-slate-900">
              {project.domainTag || "Engineering Core"}
            </span>
          </div>

          {project.sdgCode && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">SDG Alignment:</span>
              <span className="font-mono font-semibold text-emerald-800">
                SDG {project.sdgCode}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
            <span className="text-slate-500 font-medium">Assigned Guide:</span>
            <div className="flex items-center gap-2">
              <span
                className={`font-semibold ${
                  project.guideName ? "text-slate-900" : "text-amber-700"
                }`}
              >
                {project.guideName || "Unassigned"}
              </span>
              {onAssignGuide && (
                <button
                  type="button"
                  onClick={() => onAssignGuide(project)}
                  className="text-[11px] text-brand-primary hover:underline font-semibold cursor-pointer"
                >
                  {project.guideName ? "Change" : "Assign"}
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Missed Logbook Streak:</span>
            <span
              className={`font-mono font-bold ${
                isAtRisk ? "text-rose-700" : "text-slate-700"
              }`}
            >
              {project.missedLogStreak} Week{project.missedLogStreak === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Roster Status:</span>
            <span className="font-medium text-slate-800">
              {project.isRosterLocked ? "Locked (Active)" : "Unlocked (Editable)"}
            </span>
          </div>
        </div>

        {/* Enrolled Team Members */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-slate-500" />
              <span>Enrolled Student Members ({project.members.length})</span>
            </h5>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
            {project.members.map((m) => (
              <div key={m.userId} className="p-3 flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                    <span>{m.fullName}</span>
                    {m.isTeamLead && (
                      <Badge variant="role" role="TeamLead" size="sm">
                        Team Lead
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {m.moduleResponsibility || "General Module Responsibility"}
                  </div>
                </div>
                <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80 shrink-0">
                  {m.enrollmentNumber}
                </span>
              </div>
            ))}

            {project.members.length === 0 && (
              <div className="p-4 text-center text-slate-500 italic">
                No students enrolled in this project group.
              </div>
            )}
          </div>
        </div>
      </div>
    </SlideOverDrawer>
  );
};
