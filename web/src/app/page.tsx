"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="h-6 w-6 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
