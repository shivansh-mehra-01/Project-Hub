"use client";

import React, { useEffect } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastBannerProps {
  message: string | null;
  variant?: "success" | "warning" | "error" | "info";
  duration?: number;
  onClose: () => void;
  className?: string;
}

export const ToastBanner: React.FC<ToastBannerProps> = ({
  message,
  variant = "success",
  duration = 3500,
  onClose,
  className,
}) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const variantStyles = {
    success: "bg-emerald-950 border-emerald-500/40 text-emerald-200",
    warning: "bg-amber-950 border-amber-500/40 text-amber-200",
    error: "bg-rose-950 border-rose-500/40 text-rose-200",
    info: "bg-slate-900 border-slate-600/40 text-slate-200",
  };

  const iconStyles = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" strokeWidth={2} />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" strokeWidth={2} />,
    error: <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" strokeWidth={2} />,
    info: <Info className="h-4 w-4 text-slate-400 shrink-0" strokeWidth={2} />,
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed top-4 right-4 z-50 max-w-md w-full shadow-2xl rounded-xl border p-3 flex items-center justify-between gap-3 text-xs font-medium backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2 duration-200",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {iconStyles[variant]}
        <span className="truncate leading-tight text-white">{message}</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
        aria-label="Close notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
