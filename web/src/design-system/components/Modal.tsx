"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "md",
}) => {
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

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-[calc(100vw-24px)] sm:w-full max-h-[90dvh] flex flex-col rounded-xl bg-white shadow-xl border border-[#E2E8F0] z-10 overflow-hidden transform transition-all my-auto sm:my-8",
          maxWidthClasses[maxWidth]
        )}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between p-4 sm:p-5 border-b border-[#E2E8F0] bg-[#F8FAFC] shrink-0">
          <div className="space-y-1 pr-4">
            {title && (
              <h3 className="text-base font-semibold text-[#0F172A] tracking-tight">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-xs text-[#475569] leading-relaxed">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">{children}</div>

        {/* Sticky Footer */}
        {footer && (
          <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2.5 p-3 sm:p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

