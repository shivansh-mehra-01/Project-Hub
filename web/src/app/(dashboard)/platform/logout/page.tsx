"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { LogoutConfirmationModal } from "@/features/platform/shared/GlobalPlatformModals";

export default function PlatformLogoutPage() {
  const router = useRouter();
  const { logout } = useProjectHubStore();
  const [isOpen, setIsOpen] = useState(true);

  const handleConfirm = (revokeAll: boolean) => {
    logout();
    router.replace("/login");
  };

  const handleCancel = () => {
    setIsOpen(false);
    router.back();
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <LogoutConfirmationModal
        isOpen={isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
