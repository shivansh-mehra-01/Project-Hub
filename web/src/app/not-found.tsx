import Link from "next/link";
import { CollabexLogo } from "@/components/brand/CollabexLogo";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md w-full rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-xs space-y-5">
        <div className="flex justify-center">
          <CollabexLogo variant="light" size="sm" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-700">
            404 — Page Not Found
          </p>
          <h1 className="text-xl font-bold text-[#0F172A] font-heading">
            This route does not exist
          </h1>
          <p className="text-xs text-[#475569] leading-relaxed">
            The page you requested may have been moved or you may not have access to this destination.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-1">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            Go to Workspace
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
