import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepperGPSProps {
  currentStep: number; // 1 to 5
  className?: string;
}

const steps = [
  { step: 1, label: "Profile", sub: "Activation & Skills" },
  { step: 2, label: "Team & Idea", sub: "Roster Lock & Proposal" },
  { step: 3, label: "Approvals", sub: "Guide & HOD Sign-off" },
  { step: 4, label: "Build & Logs", sub: "Sprints & Friday Checks" },
  { step: 5, label: "Viva & Archive", sub: "Defense & NBA Dossier" },
];

export const StepperGPS: React.FC<StepperGPSProps> = ({ currentStep, className }) => {
  return (
    <div className={cn("w-full bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs", className)}>
      <div className="flex items-center justify-between overflow-x-auto gap-2">
        {steps.map((s, idx) => {
          const isCompleted = s.step < currentStep;
          const isCurrent = s.step === currentStep;

          return (
            <React.Fragment key={s.step}>
              <div className="flex items-center gap-2.5 shrink-0">
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all tabular-nums",
                    isCompleted
                      ? "bg-emerald-600 text-white"
                      : isCurrent
                      ? "bg-[#4F46E5] text-white ring-4 ring-[#EEF2FF]"
                      : "bg-[#F1F5F9] text-[#94A3B8] border border-[#E2E8F0]"
                  )}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : s.step}
                </div>
                <div className="flex flex-col">
                  <span
                    className={cn(
                      "text-xs font-semibold leading-none",
                      isCurrent
                        ? "text-[#4F46E5]"
                        : isCompleted
                        ? "text-[#0F172A]"
                        : "text-[#94A3B8]"
                    )}
                  >
                    {s.label}
                  </span>
                  <span className="text-[10px] text-[#64748B] hidden sm:inline mt-0.5">
                    {s.sub}
                  </span>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 min-w-[20px] rounded transition-colors hidden sm:block",
                    isCompleted ? "bg-emerald-500" : "bg-[#E2E8F0]"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

