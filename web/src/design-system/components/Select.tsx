import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options?: { value: string | number; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, helperText, error, options, children, id, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;

    return (
      <div className="flex flex-col space-y-1.5 w-full">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold text-[#0F172A] tracking-tight">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              "flex h-9 w-full appearance-none rounded-lg border bg-white px-3 pr-8 py-1.5 text-xs text-[#0F172A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#047857]/30 focus:border-[#047857] disabled:cursor-not-allowed disabled:bg-[#F8FAFC]",
              error
                ? "border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/20"
                : "border-[#E2E8F0] hover:border-[#CBD5E1]",
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <ChevronDown className="absolute right-2.5 h-4 w-4 pointer-events-none text-[#94A3B8]" strokeWidth={1.75} />
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

Select.displayName = "Select";

