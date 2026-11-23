import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/design-system/components/Card";

export interface HodMetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  variant?: "emerald" | "amber" | "rose" | "blue" | "neutral";
  onClick?: () => void;
  className?: string;
  badge?: React.ReactNode;
}

export const HodMetricCard: React.FC<HodMetricCardProps> = ({
  label,
  value,
  subtitle,
  icon: Icon,
  variant = "neutral",
  onClick,
  className,
  badge,
}) => {
  const isClickable = !!onClick;

  const colorStyles = {
    emerald: {
      text: "text-emerald-800",
      bg: "bg-emerald-50 text-emerald-700 border-emerald-100",
      sub: "text-emerald-700",
    },
    amber: {
      text: "text-amber-800",
      bg: "bg-amber-50 text-amber-700 border-amber-100",
      sub: "text-amber-700",
    },
    rose: {
      text: "text-rose-800",
      bg: "bg-rose-50 text-rose-700 border-rose-100",
      sub: "text-rose-700",
    },
    blue: {
      text: "text-blue-800",
      bg: "bg-blue-50 text-blue-700 border-blue-100",
      sub: "text-blue-700",
    },
    neutral: {
      text: "text-slate-900",
      bg: "bg-slate-100 text-slate-700 border-slate-200",
      sub: "text-slate-600",
    },
  }[variant];

  return (
    <Card
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "transition-all duration-150 border-slate-200/80 bg-white",
        isClickable &&
          "cursor-pointer hover:border-slate-300 hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary active:scale-[0.99]",
        className
      )}
    >
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 truncate">
              {label}
            </span>
            {badge}
          </div>
          <div
            className={cn(
              "text-2xl font-bold font-heading tabular-nums leading-none tracking-tight",
              colorStyles.text
            )}
          >
            {value}
          </div>
          {subtitle && (
            <p className={cn("text-[11px] font-medium leading-tight truncate", colorStyles.sub)}>
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={cn(
            "h-10 w-10 rounded-xl border flex items-center justify-center shrink-0",
            colorStyles.bg
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      </CardContent>
    </Card>
  );
};
