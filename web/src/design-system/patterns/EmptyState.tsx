import React from "react";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../components/Button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC]/50 space-y-3",
        className
      )}
    >
      <div className="h-10 w-10 rounded-full bg-white border border-[#E2E8F0] shadow-2xs flex items-center justify-center text-[#94A3B8]">
        {icon || <FolderOpen className="h-4 w-4 text-[#047857]" strokeWidth={1.75} />}
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-semibold text-[#0F172A]">{title}</h4>
        <p className="text-xs text-[#475569] leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button size="sm" variant="primary" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

