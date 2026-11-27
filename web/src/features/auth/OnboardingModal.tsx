"use client";

import React, { useState } from "react";
import { CheckCircle2, ArrowRight, UserCheck, Code, Calendar } from "lucide-react";
import { Modal } from "@/design-system/components/Modal";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { TagMultiSelect } from "@/design-system/components/TagMultiSelect";

export interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  initialEmail?: string;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialEmail = "",
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [enrollment, setEnrollment] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([
    "TypeScript",
    "Next.js",
    "IoT / ESP32",
    "Python",
  ]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([
    "IoT & Smart Systems",
    "Cloud & Distributed Systems",
  ]);
  const [availabilityHours, setAvailabilityHours] = useState("15");

  const commonSkills = [
    "TypeScript",
    "Python",
    "C# / .NET",
    "React / Next.js",
    "PostgreSQL",
    "IoT / ESP32",
    "PyTorch / AI",
    "Docker / AWS",
  ];

  const commonDomains = [
    "IoT & Smart Systems",
    "Computer Vision & AI",
    "Enterprise SaaS",
    "Healthcare Tech",
    "Clean Energy & Sustainability",
  ];

  const handleNext = () => {
    if (step < 3) {
      setStep((step + 1) as 1 | 2 | 3);
    } else {
      onComplete();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="First-Time Campus Activation"
      description={`Step ${step} of 3: ${
        step === 1
          ? "Verify Institutional Identity"
          : step === 2
          ? "Technical Skills & Domain Interests"
          : "Workload Availability & Confirmation"
      }`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[#64748B] hover:text-[#0F172A] font-medium"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setStep((step - 1) as 1 | 2 | 3)}
              >
                Back
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleNext}
              rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
            >
              {step === 3 ? "Complete & Enter Workspace" : "Continue"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Step Indicators */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-primary">
            <span className="h-5 w-5 rounded-full bg-brand-primary-tint text-brand-primary flex items-center justify-center text-[10px] font-mono">
              1
            </span>
            <span>Identity</span>
          </div>
          <div
            className={`h-0.5 flex-1 mx-2 ${
              step >= 2 ? "bg-brand-primary" : "bg-[#E2E8F0]"
            }`}
          />
          <div
            className={`flex items-center gap-2 text-xs font-semibold ${
              step >= 2 ? "text-brand-primary" : "text-[#94A3B8]"
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                step >= 2
                  ? "bg-brand-primary-tint text-brand-primary"
                  : "bg-[#F1F5F9] text-[#94A3B8]"
              }`}
            >
              2
            </span>
            <span>Skills</span>
          </div>
          <div
            className={`h-0.5 flex-1 mx-2 ${
              step === 3 ? "bg-brand-primary" : "bg-[#E2E8F0]"
            }`}
          />
          <div
            className={`flex items-center gap-2 text-xs font-semibold ${
              step === 3 ? "text-brand-primary" : "text-[#94A3B8]"
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                step === 3
                  ? "bg-brand-primary-tint text-brand-primary"
                  : "bg-[#F1F5F9] text-[#94A3B8]"
              }`}
            >
              3
            </span>
            <span>Commitment</span>
          </div>
        </div>

        {/* Step 1: Identity */}
        {step === 1 && (
          <div className="space-y-3.5">
            <div className="p-3 bg-brand-primary-tint rounded-lg border border-brand-primary-border flex items-start gap-2.5">
              <UserCheck className="h-4 w-4 text-brand-primary shrink-0 mt-0.5" strokeWidth={1.75} />
              <div className="text-xs text-brand-primary-text leading-relaxed">
                Pre-registered student record found in SISTec Department of CSE
                roster. Please verify and complete your profile.
              </div>
            </div>

            <Input
              label="Full Name (As per University Records)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Enrollment / USN Number"
                value={enrollment}
                disabled
                readOnly
                helperText="Locked to institutional registry"
              />
              <Input
                label="College Email Address"
                value={initialEmail}
                disabled
                readOnly
                helperText="Verified via SISTec SSO"
              />
            </div>
            <Input
              label="WhatsApp / Contact Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              helperText="Used strictly for urgent coordinator & viva panel notices"
            />
          </div>
        )}

        {/* Step 2: Skills & Domains */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs text-[#475569]">
              Select your core technical competencies and preferred project
              domains. Coordinators utilize these to auto-match orphan team
              members and guide topics.
            </div>

            <TagMultiSelect
              label="Technical Skills & Stacks"
              availableTags={commonSkills}
              selectedTags={selectedSkills}
              onChange={setSelectedSkills}
              helperText="Click chips to toggle or add custom tags"
            />

            <TagMultiSelect
              label="Preferred Project Domains"
              availableTags={commonDomains}
              selectedTags={selectedDomains}
              onChange={setSelectedDomains}
            />
          </div>
        )}

        {/* Step 3: Availability & Academic Agreement */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Minor Project (Sem 6) Commitment:</strong> Requires a
                minimum of 12-16 weekly engineering hours, mandatory Friday
                logbook submissions, and mid-semester viva defense.
              </div>
            </div>

            <Input
              label="Estimated Weekly Engineering Hours"
              type="number"
              value={availabilityHours}
              onChange={(e) => setAvailabilityHours(e.target.value)}
              helperText="Typical recommendation: 12 - 16 hours/week"
            />

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-2">
              <span className="text-xs font-semibold text-[#0F172A]">
                Academic Integrity & IP Pledge
              </span>
              <p className="text-[11px] text-[#475569] leading-relaxed">
                I hereby declare that all project deliverables, Git commits, and
                weekly log submissions will represent original work developed
                under the supervision of SISTec faculty.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

