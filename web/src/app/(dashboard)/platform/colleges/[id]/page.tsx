import { Suspense } from "react";
import { CollegeDetailsView } from "@/features/platform/colleges/CollegeDetailsView";

export const metadata = {
  title: "College Profile | Colabex Super Admin",
  description: "Institutional profile, subscription tier, administrator details, and audit history.",
};

async function CollegeDetailsContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CollegeDetailsView id={id} />;
}

export default function CollegeDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-500">Loading college profile...</div>}>
      <CollegeDetailsContent params={props.params} />
    </Suspense>
  );
}
