import React from "react";
import { AppShell } from "@/design-system/patterns/AppShell";

export const metadata = {
  title: "Project Hub — Institutional Governance",
  description: "Enterprise Academic Project Governance and NBA Accreditation Management",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
