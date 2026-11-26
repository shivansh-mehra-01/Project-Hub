"use client";

import React from "react";
import { CollegeOverviewView } from "./views/CollegeOverviewView";
import { CoursesAndBranchesView } from "./views/CoursesAndBranchesView";
import { HodManagementView } from "./views/HodManagementView";
import { StaffDirectoryView } from "./views/StaffDirectoryView";
import { CollegeSettingsView } from "./views/CollegeSettingsView";

export interface CollegeAdminViewProps {
  initialTab?: "overview" | "courses" | "departments" | "hods" | "users" | "settings";
}

export const CollegeAdminView: React.FC<CollegeAdminViewProps> = ({ initialTab = "overview" }) => {
  switch (initialTab) {
    case "courses":
    case "departments":
      return <CoursesAndBranchesView />;
    case "hods":
      return <HodManagementView />;
    case "users":
      return <StaffDirectoryView />;
    case "settings":
      return <CollegeSettingsView />;
    case "overview":
    default:
      return <CollegeOverviewView />;
  }
};
