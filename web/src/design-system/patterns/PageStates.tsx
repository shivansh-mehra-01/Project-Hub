"use client";

import React from "react";
import { AlertCircle, AlertTriangle, Info, Loader2 } from "lucide-react";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { cn } from "@/lib/utils";

export interface PageLoadingStateProps {
  message?: string;
  className?: string;
}

export const PageLoadingState: React.FC<PageLoadingStateProps> = ({
  message = "Loading workspace data...",
  className,
}) => (
  <div
    role="status"
    aria-live="polite"
    className={cn(
      "min-h-[240px] flex flex-col items-center justify-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-8 text-center",
      className
    )}
  >
    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" strokeWidth={2} />
    <p className="text-xs font-medium text-[#475569]">{message}</p>
  </div>
);

export interface PageErrorStateProps {
  error: string | null | undefined;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const PageErrorState: React.FC<PageErrorStateProps> = ({
  error,
  onRetry,
  retryLabel = "Retry",
  className,
}) => {
  if (!error) return null;
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800",
        className
      )}
    >
      <div className="flex items-start sm:items-center gap-2.5 min-w-0">
        <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5 sm:mt-0" strokeWidth={1.75} />
        <span className="leading-relaxed">{error}</span>
      </div>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry} className="shrink-0">
          {retryLabel}
        </Button>
      )}
    </div>
  );
};

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "primary" | "danger" | "warning";
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  isLoading = false,
  children,
}) => {
  const iconConfig = {
    primary: <Info className="h-5 w-5 text-emerald-600 shrink-0" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />,
    danger: <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />,
  }[variant];

  const buttonVariant = variant === "danger" ? "danger" : "primary";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {iconConfig}
          <span className="text-sm font-bold text-[#0F172A]">{title}</span>
        </div>
      }
      description={description}
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={buttonVariant}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      }
    >
      {children && <div className="mt-1 text-xs text-[#475569]">{children}</div>}
    </Modal>
  );
};
