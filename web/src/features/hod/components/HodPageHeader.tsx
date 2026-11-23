import React from "react";
import { cn } from "@/lib/utils";

export interface HodPageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  metadata?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const HodPageHeader: React.FC<HodPageHeaderProps> = ({
  title,
  description,
  badge,
  metadata,
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl border border-slate-200/80 bg-white shadow-2xs",
        className
      )}
    >
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 shrink-0" />
          <h1 className="text-base sm:text-lg font-bold font-heading text-slate-900 tracking-tight truncate">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
        {metadata && (
          <div className="pt-0.5 text-xs text-slate-600 font-medium">
            {metadata}
          </div>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
};
