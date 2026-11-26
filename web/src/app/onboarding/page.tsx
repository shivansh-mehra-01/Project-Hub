"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, CheckCircle2, IdCard, Mail, Loader2, AlertTriangle } from "lucide-react";
import { authApi } from "@/lib/api";
import { CollabexLogo } from "@/components/brand/CollabexLogo";

interface PublicCollegeOption {
  id: string;
  name: string;
  tenantCode: string;
}

export default function OnboardingPage() {
  const [colleges, setColleges] = useState<PublicCollegeOption[]>([]);
  const [loadingColleges, setLoadingColleges] = useState(true);
  const [collegeId, setCollegeId] = useState("");
  const [collegeUserId, setCollegeUserId] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    authApi
      .getPublicColleges()
      .then((list) => {
        if (!active) return;
        const safeList = Array.isArray(list) ? list : [];
        setColleges(safeList);
        if (safeList.length === 1) {
          setCollegeId(safeList[0].id);
        }
      })
      .catch(() => {
        if (!active) return;
        setError("Unable to load active institutions. Please refresh and try again.");
      })
      .finally(() => {
        if (active) setLoadingColleges(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorCode(null);
    setSentMessage(null);

    if (!collegeId || !collegeUserId.trim() || !email.trim()) {
      setError("Please select your college and enter your College ID and registered email.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await authApi.rosterSignup({
        collegeId,
        collegeUserId: collegeUserId.trim(),
        email: email.trim().toLowerCase(),
      });
      setSentMessage(
        res.message ||
          "Roster record verified. Check your registered email for your activation link to set your password."
      );
    } catch (err: any) {
      setErrorCode(err?.data?.code || null);
      setError(
        err?.data?.message ||
          err?.message ||
          "We could not verify an eligible roster record for this college, College ID, and email."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <CollabexLogo variant="light" size="md" />
          <h1 className="text-xl font-bold text-slate-900 pt-2">Activate Your College Account</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Verify your identity against your college&apos;s approved student or faculty roster.
            Personal or institutional emails listed in the roster are supported.
          </p>
        </div>

        {sentMessage ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>Email Verification Required</span>
              </div>
              <p className="leading-relaxed text-emerald-800">{sentMessage}</p>
              <p className="text-[11px] text-emerald-700">
                Open the verification link in your email to set your password and activate your account.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setSentMessage(null)}
                className="font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Use different details
              </button>
              <Link href="/login" className="font-semibold text-emerald-700 hover:text-emerald-800">
                Back to Sign In →
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                  errorCode === "ALREADY_ACTIVATED"
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>{error}</p>
                  {errorCode === "ALREADY_ACTIVATED" && (
                    <Link
                      href="/login"
                      className="inline-block font-semibold underline text-amber-950"
                    >
                      Go to Sign In
                    </Link>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">College / Institution</label>
              <div className="relative">
                <Building2 className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <select
                  value={collegeId}
                  onChange={(e) => setCollegeId(e.target.value)}
                  disabled={loadingColleges}
                  required
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-50"
                >
                  <option value="">
                    {loadingColleges ? "Loading colleges..." : "Select your college"}
                  </option>
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.tenantCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                College ID (Enrollment / Employee ID)
              </label>
              <div className="relative">
                <IdCard className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={collegeUserId}
                  onChange={(e) => setCollegeUserId(e.target.value)}
                  placeholder="e.g. 0176CS221045 or STAFF-101"
                  required
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Registered Email</label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com or name@college.edu.in"
                  required
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || loadingColleges}
              className="w-full h-10 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{submitting ? "Verifying Roster..." : "Send Activation Link"}</span>
            </button>
          </form>
        )}

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Sign In</span>
          </Link>
          <Link href="/activate" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Already have a token?
          </Link>
        </div>
      </div>
    </div>
  );
}
