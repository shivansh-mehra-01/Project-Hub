"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, CheckCircle2, Lock } from "lucide-react";
import { authApi, setAuthSession } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { CollabexLogo } from "@/components/brand/CollabexLogo";

function ActivateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !token.trim()) {
      setError("Institutional email and activation token are required.");
      return;
    }
    if (newPassword.length < 12) {
      setError("Password must be at least 12 characters with uppercase, lowercase, digit, and symbol.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const auth = await authApi.activate({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        newPassword,
      });
      setAuthSession(null, auth.user);
      showToast("Account activated successfully!", "success");
      const role = auth.user.role;
      if (role === "SuperAdmin") router.replace("/admin");
      else if (role === "CollegeAdmin") router.replace("/college");
      else if (role === "HOD") router.replace("/hod");
      else if (role === "Faculty") router.replace(auth.user.isProjectCoordinator ? "/coordinator" : "/faculty");
      else router.replace("/student");
    } catch (err: any) {
      setError(err.message || "Activation failed. The link may have expired.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <CollabexLogo variant="light" size="md" />
          <h1 className="text-xl font-bold text-slate-900 pt-2">Activate College Account</h1>
          <p className="text-xs text-slate-500">
            Verify your token and set your personal password (minimum 12 characters with uppercase, lowercase, digit, and symbol).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 space-y-1">
              <p>{error}</p>
              <div className="flex items-center gap-3 pt-1 font-semibold">
                <a href="/onboarding" className="underline text-red-800">
                  Request a new activation link
                </a>
                <a href="/login" className="underline text-slate-700">
                  Sign in
                </a>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Registered Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@gmail.com or name@college.edu.in"
              required
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Activation Token</label>
            <div className="relative">
              <KeyRound className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste activation token"
                required
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">New Password</label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 12 characters"
                required
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{isLoading ? "Activating..." : "Activate & Enter Workspace"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAFC]" />}>
      <ActivateForm />
    </Suspense>
  );
}
