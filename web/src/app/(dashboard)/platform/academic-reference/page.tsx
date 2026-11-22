import { Suspense } from "react";
import { AcademicReferenceView } from "@/features/platform/academic-reference/AcademicReferenceView";

export const metadata = {
  title: "Academic Reference | Colabex Super Admin",
  description: "Standard university, degree program, and verified engineering branch catalog for Colabex.",
};

export default function AcademicReferencePage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500">Loading academic reference catalog...</div>}>
      <AcademicReferenceView />
    </Suspense>
  );
}
