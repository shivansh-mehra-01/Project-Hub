import { Suspense } from "react";
import { CollegeDetailsView } from "@/features/platform/colleges/CollegeDetailsView";

export async function generateStaticParams() {
  return [
    { id: "col-sistec-01" },
    { id: "col-lnct-02" },
    { id: "col-medicaps-03" },
    { id: "col-uit-04" },
    { id: "col-ips-05" },
  ];
}

export const metadata = {
  title: "College Profile | Colabex Super Admin",
  description: "Institutional profile, subscription tier, administrator details, and audit history.",
};

export default async function CollegeDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;

  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500">Loading college profile...</div>}>
      <CollegeDetailsView id={params.id} />
    </Suspense>
  );
}
