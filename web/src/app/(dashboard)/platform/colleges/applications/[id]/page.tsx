import { Suspense } from "react";
import { ApplicationDetailsView } from "@/features/platform/colleges/ApplicationDetailsView";

export async function generateStaticParams() {
  return [
    { id: "req-01" },
    { id: "req-02" },
    { id: "req-03" },
    { id: "req-04" },
    { id: "req-05" },
  ];
}

export const metadata = {
  title: "Application Details | Colabex Super Admin",
  description: "Review and process institutional onboarding application on Project Hub.",
};

export default async function ApplicationDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;

  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500">Loading application details...</div>}>
      <ApplicationDetailsView id={params.id} />
    </Suspense>
  );
}
