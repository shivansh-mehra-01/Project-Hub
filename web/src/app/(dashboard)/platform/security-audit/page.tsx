import { Suspense } from "react";
import { SecurityAuditView } from "@/features/platform/security-audit/SecurityAuditView";

export const metadata = {
  title: "Security & Audit | Colabex Super Admin",
  description: "Monitor administrator access, review security events and track important platform activities.",
};

export default function SecurityAuditPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500 text-sm">
          Loading Security & Audit console...
        </div>
      }
    >
      <SecurityAuditView />
    </Suspense>
  );
}
