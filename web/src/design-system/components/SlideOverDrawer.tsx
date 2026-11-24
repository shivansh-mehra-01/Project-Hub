"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SlideOverDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "md" | "lg"; // md = 480px default
}

export const SlideOverDrawer: React.FC<SlideOverDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  description,
  badge,
  children,
  footer,
  width = "md",
}) => {
  const effectiveSubtitle = subtitle || description;
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    md: "w-full max-w-[480px]",
    lg: "w-full max-w-[560px]",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0F172A]/30 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 flex pl-0 sm:pl-10 max-w-full w-full sm:w-auto">
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "relative flex flex-col bg-white shadow-2xl border-l border-[#E2E8F0] transform transition-transform duration-300 ease-in-out w-full",
            widthClasses[width]
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 sm:p-5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="space-y-1 pr-4">
              <div className="flex items-center gap-2">
                {title && (
                  <h3 className="text-sm font-bold text-[#0F172A] tracking-tight">
                    {title}
                  </h3>
                )}
                {badge}
              </div>
              {effectiveSubtitle && (
                <p className="text-xs text-[#475569] leading-relaxed">{effectiveSubtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close drawer</span>
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5">{children}</div>

          {/* Sticky Footer Action Bar */}
          {footer && (
            <div className="p-3 sm:p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

