import React from "react";
import { Card, CardContent } from "@/design-system/components/Card";
import { cn } from "@/lib/utils";

export interface FacultyStatCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  icon?: React.ReactNode;
  variant?: "neutral" | "emerald" | "amber" | "blue";
  onClick?: () => void;
}

export const FacultyStatCard: React.FC<FacultyStatCardProps> = ({
  label,
  value,
  subtext,
  icon,
  variant = "neutral",
  onClick,
}) => {
  const variantStyles = {
    neutral: "bg-white border-[#E2E8F0] text-[#0F172A]",
    emerald: "bg-emerald-50/50 border-emerald-200 text-emerald-950",
    amber: "bg-amber-50/50 border-amber-200 text-amber-950",
    blue: "bg-blue-50/50 border-blue-200 text-blue-950",
  };

  const iconBgStyles = {
    neutral: "bg-[#F1F5F9] text-[#475569]",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
  };

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        variantStyles[variant],
        onClick && "cursor-pointer hover:shadow-md hover:border-slate-300"
      )}
      onClick={onClick}
    >
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtext && (
            <p className="text-xs text-[#64748B] mt-1 font-medium">{subtext}</p>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 [&>svg]:w-5 [&>svg]:h-5",
              iconBgStyles[variant]
            )}
          >
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
