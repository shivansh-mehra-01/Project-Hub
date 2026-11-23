import { Suspense } from "react";
import { PlatformAdministratorsView } from "@/features/platform/administrators/PlatformAdministratorsView";

export const metadata = {
  title: "Platform Administrators | Colabex Super Admin",
  description: "Platform operator management with predefined roles and audit logging.",
};

export default function PlatformAdministratorsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500">Loading platform administrators...</div>}>
      <PlatformAdministratorsView />
    </Suspense>
  );
}
