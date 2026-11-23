import { Suspense } from "react";
import { PlatformProfileView } from "@/features/platform/profile/PlatformProfileView";

export const metadata = {
  title: "My Profile | Colabex Super Admin",
  description: "Personal account, authentication, active sessions, and preferences for the Super Admin.",
};

export default function PlatformProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500 text-sm">
          Loading My Profile...
        </div>
      }
    >
      <PlatformProfileView />
    </Suspense>
  );
}
