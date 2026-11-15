import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, helperText, error, leftIcon, rightIcon, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="flex flex-col space-y-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-[#0F172A] tracking-tight">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-[#94A3B8]">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            className={cn(
              "flex h-9 w-full rounded-lg border bg-white px-3 py-1.5 text-xs text-[#0F172A] placeholder:text-[#94A3B8] transition-colors focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 focus:border-[#4F46E5] disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]",
              leftIcon && "pl-9",
              rightIcon && "pr-9",
              error
                ? "border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/20"
                : "border-[#E2E8F0] hover:border-[#CBD5E1]",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 flex items-center pointer-events-none text-[#94A3B8]">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <span className="text-[11px] font-medium text-[#DC2626]">{error}</span>
        ) : helperText ? (
          <span className="text-[11px] text-[#475569]">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
