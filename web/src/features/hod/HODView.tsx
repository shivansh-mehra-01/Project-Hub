"use client";

import React from "react";
import { HodOverviewView } from "./views/HodOverviewView";
import { HodProjectsView } from "./views/HodProjectsView";
import { HodFacultyView } from "./views/HodFacultyView";
import { HodApprovalsView } from "./views/HodApprovalsView";
import { HodReportsView } from "./views/HodReportsView";

export interface HODViewProps {
  initialTab?: "overview" | "projects" | "faculty" | "approvals" | "reports";
}

/**
 * Backward-compatible HODView wrapper that mounts dedicated feature views.
 * Each primary screen now maintains its own single-responsibility architecture
 * and direct Next.js route mapping.
 */
export const HODView: React.FC<HODViewProps> = ({ initialTab = "overview" }) => {
  switch (initialTab) {
    case "projects":
      return <HodProjectsView />;
    case "faculty":
      return <HodFacultyView />;
    case "approvals":
      return <HodApprovalsView />;
    case "reports":
      return <HodReportsView />;
    case "overview":
    default:
      return <HodOverviewView />;
  }
};
