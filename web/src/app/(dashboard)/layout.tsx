import React from "react";
import { AppShell } from "@/design-system/patterns/AppShell";
import { PlatformDataProvider } from "@/features/platform/data/platformDataStore";

export const metadata = {
  title: "Colabex — Enterprise Platform & Institutional Governance",
  description: "Enterprise Academic Project Governance and Multi-Tenant Institutional Platform",
};

export const instant = false;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlatformDataProvider>
      <AppShell>{children}</AppShell>
    </PlatformDataProvider>
  );
}
