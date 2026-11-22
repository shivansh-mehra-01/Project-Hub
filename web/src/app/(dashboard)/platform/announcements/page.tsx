import { Suspense } from "react";
import { AnnouncementsView } from "@/features/platform/announcements/AnnouncementsView";

export const metadata = {
  title: "Announcements | Colabex Super Admin",
  description: "Platform-wide communications, maintenance notices, and operational announcements for affiliated colleges.",
};

export default function PlatformAnnouncementsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500">Loading announcements...</div>}>
      <AnnouncementsView />
    </Suspense>
  );
}
