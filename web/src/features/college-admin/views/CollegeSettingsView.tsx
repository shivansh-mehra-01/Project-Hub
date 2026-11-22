"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Building2,
  Landmark,
  MapPin,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Save,
  Loader2,
  Upload,
  X,
  Plus,
  Users,
  HardDrive,
  GitBranch,
  Kanban,
  Lock,
  Globe,
  SlidersHorizontal,
  RefreshCw,
  FileCheck2,
  Check,
  Sparkles,
  Info,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { collegeApi } from "@/lib/api/collegeApi";
import { CollegeSettingsDto, UpdateCollegeSettingsRequest } from "@/lib/api/types";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";

export const CollegeSettingsView: React.FC = () => {
  const { college: mockCollege, onboardCollege } = useProjectHubStore();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"general" | "plan" | "integrations" | "security">("general");

  // General Details
  const [collegeName, setCollegeName] = useState(mockCollege.name || "Sagar Institute of Science and Technology (SISTec)");
  const [affiliatedUniversity, setAffiliatedUniversity] = useState(
    "Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)"
  );
  const [campusAddress, setCampusAddress] = useState(
    "Airport Road, Gandhi Nagar, Bhopal, MP 462036"
  );
  const [campuses, setCampuses] = useState<string[]>([
    "Main Campus (Bhopal)",
    "Extension Center",
  ]);
  const [newCampusInput, setNewCampusInput] = useState("");
  const [isAddingCampus, setIsAddingCampus] = useState(false);

  // Visual Branding & Seals
  const [crestUrl, setCrestUrl] = useState<string>("/college-crest.png");
  const [principalSealUrl, setPrincipalSealUrl] = useState<string>("");
  const [imageError, setImageError] = useState<{ crest: boolean; seal: boolean }>({ crest: false, seal: false });

  // Plan & Usage
  const [licenseTier, setLicenseTier] = useState("Enterprise Institutional");
  const [maxSeats, setMaxSeats] = useState(1200);
  const [enrolledCount, setEnrolledCount] = useState(480);
  const [storageQuotaGb, setStorageQuotaGb] = useState(50);
  const [usedStorageGb, setUsedStorageGb] = useState(14.5);

  // Feature Integrations
  const [nbaEnabled, setNbaEnabled] = useState(true);
  const [githubEnabled, setGithubEnabled] = useState(true);
  const [jiraEnabled, setJiraEnabled] = useState(false);

  // Security & SSO
  const [ssoDomain, setSsoDomain] = useState(mockCollege.domain || "@sistec.ac.in");
  const [enforceStrictSso, setEnforceStrictSso] = useState(false);

  // File Upload Refs
  const crestFileInputRef = useRef<HTMLInputElement>(null);
  const sealFileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useDashboardHeader({
    title: "Campus Settings",
    breadcrumb: "Institutional Configuration & Platform Control",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await collegeApi.getSettings();
      if (res) {
        if (res.name) setCollegeName(res.name);
        if (res.affiliatedUniversity) setAffiliatedUniversity(res.affiliatedUniversity);
        if (res.campusAddress) setCampusAddress(res.campusAddress);
        if (res.campusesCsv) {
          const list = res.campusesCsv
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean);
          if (list.length > 0) setCampuses(list);
        }
        if (res.crestUrl) setCrestUrl(res.crestUrl);
        if (res.principalSealUrl) setPrincipalSealUrl(res.principalSealUrl);
        if (res.ssoDomain) setSsoDomain(res.ssoDomain);
        if (res.enforceStrictSso !== undefined) setEnforceStrictSso(res.enforceStrictSso);
        if (res.nbaModuleEnabled !== undefined) setNbaEnabled(res.nbaModuleEnabled);
        if (res.githubIntegrationEnabled !== undefined) setGithubEnabled(res.githubIntegrationEnabled);
        if (res.jiraIntegrationEnabled !== undefined) setJiraEnabled(res.jiraIntegrationEnabled);
        if (res.licenseTier) setLicenseTier(res.licenseTier);
        if (res.maxStudentSeats) setMaxSeats(res.maxStudentSeats);
        if (res.enrolledStudentCount) setEnrolledCount(res.enrolledStudentCount);
      }
    } catch (err) {
      console.warn("Settings API fallback used", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("File size exceeds 2MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCrestUrl(result);
      setImageError((prev) => ({ ...prev, crest: false }));
      showToast("College logo updated!");
    };
    reader.readAsDataURL(file);
  };

  // Handle Seal Upload
  const handleSealUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("File size exceeds 2MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setPrincipalSealUrl(result);
      setImageError((prev) => ({ ...prev, seal: false }));
      showToast("Principal digital seal updated!");
    };
    reader.readAsDataURL(file);
  };

  // Add Campus Tag
  const handleAddCampus = () => {
    const trimmed = newCampusInput.trim();
    if (!trimmed) return;
    if (campuses.includes(trimmed)) {
      showToast("Campus name already exists.");
      return;
    }
    setCampuses((prev) => [...prev, trimmed]);
    setNewCampusInput("");
    setIsAddingCampus(false);
  };

  const handleRemoveCampus = (index: number) => {
    setCampuses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: UpdateCollegeSettingsRequest = {
        name: collegeName.trim(),
        affiliatedUniversity: affiliatedUniversity.trim(),
        campusAddress: campusAddress.trim(),
        campusesCsv: campuses.join(", "),
        crestUrl: crestUrl || "/college-crest.png",
        principalSealUrl: principalSealUrl || "",
        ssoDomain: ssoDomain.trim(),
        enforceStrictSso,
        nbaModuleEnabled: nbaEnabled,
        githubIntegrationEnabled: githubEnabled,
        jiraIntegrationEnabled: jiraEnabled,
      };

      await collegeApi.updateSettings(payload);
      onboardCollege({
        name: payload.name,
        domain: ssoDomain,
      });

      showToast("Settings successfully saved!");
    } catch (err) {
      console.error(err);
      showToast("Error updating settings.");
    } finally {
      setSaving(false);
    }
  };

  const seatsPercent = Math.min(Math.round((enrolledCount / maxSeats) * 100), 100);
  const storagePercent = Math.min(Math.round((usedStorageGb / storageQuotaGb) * 100), 100);

  return (
    <div className="space-y-5 pb-16 font-sans max-w-5xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-lg animate-in fade-in">
          <CheckCircle2 className="h-4 w-4" />
          {toastMessage}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. INSTITUTIONAL HERO BANNER                                               */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Logo Preview */}
            <div className="relative h-14 w-14 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 group">
              {crestUrl && !imageError.crest ? (
                <Image
                  src={crestUrl}
                  alt="College Logo"
                  width={56}
                  height={56}
                  className="h-full w-full object-contain p-1"
                  onError={() => setImageError((prev) => ({ ...prev, crest: true }))}
                  unoptimized
                />
              ) : (
                <Building2 className="h-7 w-7 text-emerald-800" strokeWidth={1.75} />
              )}
            </div>

            {/* Institution Info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-slate-900 truncate">
                  {collegeName || "Sagar Institute of Science and Technology"}
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  AISHE & NBA Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {affiliatedUniversity} • {campuses.length} Campus Locations
              </p>
            </div>
          </div>

          {/* Quick License Pill */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {licenseTier}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MODERN SEGMENTED TABS                                                  */}
      {/* ========================================================================= */}
      <div className="flex border-b border-slate-200 gap-1 sm:gap-4 text-xs font-medium overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`pb-3 px-1 transition-all relative inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === "general"
              ? "text-emerald-700 font-bold border-b-2 border-emerald-600"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>General & Identity</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("plan")}
          className={`pb-3 px-1 transition-all relative inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === "plan"
              ? "text-emerald-700 font-bold border-b-2 border-emerald-600"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Plan & Quotas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("integrations")}
          className={`pb-3 px-1 transition-all relative inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === "integrations"
              ? "text-emerald-700 font-bold border-b-2 border-emerald-600"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Integrations & Add-ons</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`pb-3 px-1 transition-all relative inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === "security"
              ? "text-emerald-700 font-bold border-b-2 border-emerald-600"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Lock className="h-4 w-4" />
          <span>Security & SSO</span>
        </button>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-5">
        {/* ========================================================================= */}
        {/* TAB 1: GENERAL & IDENTITY                                                 */}
        {/* ========================================================================= */}
        {activeTab === "general" && (
          <div className="space-y-5">
            {/* 1A. Institution Details */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Institution Details</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official college identity, state university affiliation, and campus locations
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* College Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    Official College Name
                  </label>
                  <input
                    type="text"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="e.g. Sagar Institute of Science and Technology (SISTec)"
                    className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
                    required
                  />
                </div>

                {/* Affiliated University */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Landmark className="h-3.5 w-3.5 text-slate-400" />
                    Affiliated University
                  </label>
                  <input
                    type="text"
                    value={affiliatedUniversity}
                    onChange={(e) => setAffiliatedUniversity(e.target.value)}
                    placeholder="e.g. Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)"
                    className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
                    required
                  />
                </div>

                {/* Physical Address */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    Main Campus Physical Address
                  </label>
                  <input
                    type="text"
                    value={campusAddress}
                    onChange={(e) => setCampusAddress(e.target.value)}
                    placeholder="Physical street address, city, state and PIN code"
                    className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Configured Campuses (Interactive Tags) */}
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-slate-400" />
                      Configured Campuses & Centers
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      Appears on project viva rubrics & NBA dossiers
                    </span>
                  </label>

                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-wrap items-center gap-2">
                    {campuses.map((campus, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-800 shadow-2xs"
                      >
                        <Building2 className="h-3 w-3 text-emerald-600" />
                        {campus}
                        {campuses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCampus(idx)}
                            className="text-slate-400 hover:text-rose-600 transition-colors ml-0.5 cursor-pointer"
                            title="Remove campus"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    ))}

                    {isAddingCampus ? (
                      <div className="inline-flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newCampusInput}
                          onChange={(e) => setNewCampusInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddCampus();
                            } else if (e.key === "Escape") {
                              setIsAddingCampus(false);
                            }
                          }}
                          placeholder="Campus name..."
                          autoFocus
                          className="h-7 px-2 text-xs rounded-lg border border-emerald-500 bg-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddCampus}
                          className="h-7 px-2.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingCampus(false)}
                          className="h-7 px-2 text-slate-500 hover:text-slate-800 text-xs transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAddingCampus(true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-slate-300 hover:border-emerald-600 bg-white text-slate-600 hover:text-emerald-700 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Campus Location</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 1B. Visual Branding & Official Seals */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Branding, Logo & Official Seals</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  High-resolution assets displayed on student project certificates, scorecards, and NBA SAR reports
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. College Logo / Crest Card */}
                <div className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/40 flex flex-col justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Live Preview Frame */}
                    <div className="relative h-20 w-20 rounded-2xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs group">
                      {crestUrl && !imageError.crest ? (
                        <Image
                          src={crestUrl}
                          alt="College Crest Preview"
                          width={80}
                          height={80}
                          className="h-full w-full object-contain p-2"
                          onError={() => setImageError((prev) => ({ ...prev, crest: true }))}
                          unoptimized
                        />
                      ) : (
                        <Building2 className="h-8 w-8 text-slate-400" />
                      )}
                    </div>

                    {/* Description */}
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block">
                        Official College Crest / Logo
                      </span>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Appears on top navigation bar, report headers, and student certificates.
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                        PNG or SVG up to 2MB (Square recommended)
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200/70">
                    <input
                      ref={crestFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => crestFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Upload Logo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCrestUrl("/college-crest.png");
                        setImageError((prev) => ({ ...prev, crest: false }));
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 transition-colors cursor-pointer"
                    >
                      Use Default
                    </button>
                  </div>
                </div>

                {/* 2. Dean / Principal Digital Seal Stamp Card */}
                <div className="p-5 rounded-2xl border border-slate-200/90 bg-slate-50/40 flex flex-col justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Live Seal Preview Frame */}
                    <div className="relative h-20 w-20 rounded-2xl border-2 border-emerald-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs p-1">
                      {principalSealUrl && !imageError.seal ? (
                        <Image
                          src={principalSealUrl}
                          alt="Principal Digital Seal"
                          width={80}
                          height={80}
                          className="h-full w-full object-contain"
                          onError={() => setImageError((prev) => ({ ...prev, seal: true }))}
                          unoptimized
                        />
                      ) : (
                        /* Modern Vector Fallback Seal */
                        <div className="h-full w-full rounded-full border-2 border-dashed border-emerald-600 flex flex-col items-center justify-center text-center p-1 bg-emerald-50/60">
                          <ShieldCheck className="h-6 w-6 text-emerald-700 mb-0.5" />
                          <span className="text-[7px] font-bold text-emerald-800 uppercase tracking-tighter leading-none">
                            OFFICIAL SEAL
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 block">
                          Dean / Principal Digital Seal
                        </span>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          Active Stamp
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Cryptographically stamped onto exported NBA SAR dossiers and rubric scorecards.
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                        Transparent circular PNG / SVG recommended
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200/70">
                    <input
                      ref={sealFileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      onChange={handleSealUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => sealFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Upload Digital Seal</span>
                    </button>
                    {principalSealUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setPrincipalSealUrl("");
                          setImageError((prev) => ({ ...prev, seal: false }));
                        }}
                        className="text-xs text-rose-600 hover:text-rose-800 px-2 py-1 transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PLAN & USAGE                                                       */}
        {/* ========================================================================= */}
        {activeTab === "plan" && (
          <div className="space-y-5">
            {/* Plan Tier Banner */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                  Active Subscription
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">
                  {licenseTier}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Institutional multi-department tenant license with full NBA compliance suite
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  Enterprise Active
                </span>
              </div>
            </div>

            {/* Gauges Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Student Seats Gauge */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Users className="h-4 w-4 text-emerald-800" strokeWidth={1.75} />
                    <span>Enrolled Student Seats</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-slate-900">
                    {enrolledCount} / {maxSeats} ({seatsPercent}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ease-out ${
                      seatsPercent > 90 ? "bg-rose-500" : "bg-emerald-700"
                    }`}
                    style={{ width: `${seatsPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>{maxSeats - enrolledCount} seats available</span>
                  <span className="font-semibold text-emerald-700">Healthy Capacity</span>
                </div>
              </div>

              {/* Cloud Storage Gauge */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <HardDrive className="h-4 w-4 text-emerald-800" strokeWidth={1.75} />
                    <span>Cloud Project Storage</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-slate-900">
                    {usedStorageGb} GB / {storageQuotaGb} GB ({storagePercent}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ease-out ${
                      storagePercent > 90 ? "bg-amber-500" : "bg-emerald-700"
                    }`}
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>{(storageQuotaGb - usedStorageGb).toFixed(1)} GB remaining</span>
                  <span className="font-semibold text-emerald-700">Multi-region GCS Backup</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: INTEGRATIONS & ADD-ONS                                             */}
        {/* ========================================================================= */}
        {activeTab === "integrations" && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Platform Modules & Integrations</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enable or disable automated evaluation workflows and third-party developer tool sync
              </p>
            </div>

            <div className="space-y-3">
              {/* Module 1: NBA Accreditation */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors duration-200 ease-out bg-white">
                <div className="flex items-center gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-900">
                      NBA Accreditation Rubric Engine
                    </span>
                    <span className="text-xs text-slate-500">
                      Automated PO1–PO12 direct assessment matrix and official SAR exports
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={nbaEnabled}
                    onChange={(e) => setNbaEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>

              {/* Module 2: GitHub VCS */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200/90 hover:border-slate-300 transition-colors bg-white">
                <div className="flex items-center gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-900">
                      GitHub VCS Code Telemetry
                    </span>
                    <span className="text-xs text-slate-500">
                      Track commit frequency, pull requests, and verified weekly coding logs
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={githubEnabled}
                    onChange={(e) => setGithubEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>

              {/* Module 3: Jira Agile */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200/90 hover:border-slate-300 transition-colors bg-white">
                <div className="flex items-center gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <Kanban className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-900">
                      Jira Sprint & Agile Integration
                    </span>
                    <span className="text-xs text-slate-500">
                      Allow student teams to link Jira project sprint boards and milestone cards
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jiraEnabled}
                    onChange={(e) => setJiraEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SECURITY & SSO                                                     */}
        {/* ========================================================================= */}
        {activeTab === "security" && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Institutional Security & SSO</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage connected campus Identity Provider (Google Workspace / Microsoft 365)
              </p>
            </div>

            <div className="space-y-4">
              {/* Authorized Domain */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.75} />
                  Authorized Campus Domain
                </label>
                <input
                  type="text"
                  value={ssoDomain}
                  onChange={(e) => setSsoDomain(e.target.value)}
                  placeholder="e.g. @sistec.ac.in"
                  className="w-full h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-emerald-700 font-mono"
                  required
                />
                <span className="text-[11px] text-slate-500 block">
                  Only accounts ending in this domain can sign into your college portal
                </span>
              </div>

              {/* Strict SSO Card */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-3.5">
                  <div className="h-10 w-10 rounded-lg bg-slate-200/80 text-slate-700 flex items-center justify-center shrink-0">
                    <Lock className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-900">Enforce Strict SSO</span>
                    <span className="text-xs text-slate-500">
                      Mandate Google Workspace / Microsoft Entra ID authentication for all users
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enforceStrictSso}
                    onChange={(e) => setEnforceStrictSso(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-700" />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BOTTOM ACTION BAR                                                         */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.75} />
            Changes apply campus-wide across all departments and student portfolios.
          </span>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 h-9 px-5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors duration-200 ease-out cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
