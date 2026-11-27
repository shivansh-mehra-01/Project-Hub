"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderGit2, Compass } from "lucide-react";

export const HodProjectsTabBar: React.FC = () => {
  const pathname = usePathname();
  const isTracks = pathname?.startsWith("/hod/projects/tracks");

  return (
    <div className="flex items-center gap-1 border-b border-slate-200 pb-0">
      <Link
        href="/hod/projects"
        className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
          !isTracks
            ? "border-emerald-700 text-emerald-800"
            : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
        }`}
      >
        <FolderGit2 className="h-3.5 w-3.5" />
        <span>Student Projects</span>
      </Link>
      <Link
        href="/hod/projects/tracks"
        className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
          isTracks
            ? "border-emerald-700 text-emerald-800"
            : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
        }`}
      >
        <Compass className="h-3.5 w-3.5" />
        <span>Project Tracks</span>
      </Link>
    </div>
  );
};
