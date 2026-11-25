"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingModal } from "@/features/auth/OnboardingModal";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";

export default function OnboardingPage() {
  const router = useRouter();
  const { switchPersona } = useProjectHubStore();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <OnboardingModal
        isOpen={isOpen}
        onClose={() => router.replace("/login")}
        onComplete={() => {
          setIsOpen(false);
          router.replace("/login");
        }}
      />
    </div>
  );
}

