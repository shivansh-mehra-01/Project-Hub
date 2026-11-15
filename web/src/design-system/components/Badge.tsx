import React from "react";
import { cn } from "@/lib/utils";
import { roleBadges } from "../tokens";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "info" | "danger" | "neutral" | "role" | "sdg";
  role?: "SuperAdmin" | "CollegeAdmin" | "HOD" | "Faculty" | "Coordinator" | "Student" | "TeamLead";
  sdgNumber?: number;
  size?: "sm" | "md";
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "neutral",
  role,
  sdgNumber,
  size = "md",
  dot = false,
  children,
  ...props
}) => {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-0.5 text-xs",
  };

  if (variant === "role" && role && roleBadges[role]) {
    const r = roleBadges[role];
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 font-medium rounded-full border",
          r.bg,
          r.text,
          r.border,
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
        {children || r.label}
      </span>
    );
  }

  if (variant === "sdg" && sdgNumber) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 font-mono font-medium rounded-md border px-2 py-0.5 text-[11px] tabular-nums bg-emerald-50 text-emerald-800 border-emerald-200",
          className
        )}
        {...props}
      >
        <span className="font-bold text-[9px] uppercase tracking-wider bg-emerald-700 text-white px-1 py-0.2 rounded">
          SDG {sdgNumber}
        </span>
        <span>{children}</span>
      </span>
    );
  }

  const variantClasses = {
    success: "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]",
    warning: "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]",
    info: "bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]",
    danger: "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]",
    neutral: "bg-[#F1F5F9] text-[#334155] border-[#E2E8F0]",
    role: "bg-slate-100 text-slate-700 border-slate-200",
    sdg: "bg-emerald-50 text-emerald-800 border-emerald-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      <span>{children}</span>
    </span>
  );
};
