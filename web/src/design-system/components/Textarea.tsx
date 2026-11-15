import React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, helperText, error, id, rows = 3, readOnly, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;

    const isReadOnly =
      readOnly !== undefined
        ? readOnly
        : Boolean(props.disabled) || (props.value !== undefined && !props.onChange);

    return (
      <div className="flex flex-col space-y-1.5 w-full">
        {label && (
          <label htmlFor={textareaId} className="text-xs font-semibold text-[#0F172A] tracking-tight">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          readOnly={isReadOnly}
          className={cn(
            "flex w-full rounded-lg border bg-white px-3 py-2 text-xs text-[#0F172A] placeholder:text-[#94A3B8] transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary disabled:cursor-not-allowed disabled:bg-[#F8FAFC]",
            error
              ? "border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/20"
              : "border-[#E2E8F0] hover:border-[#CBD5E1]",
            className
          )}
          {...props}
        />
        {error ? (
          <span className="text-[11px] font-medium text-[#DC2626]">{error}</span>
        ) : helperText ? (
          <span className="text-[11px] text-[#475569]">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

