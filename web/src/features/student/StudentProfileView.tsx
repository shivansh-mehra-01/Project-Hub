"use client";

import React, { useState, useEffect } from "react";
import {
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  Phone,
  Loader2,
  Pencil,
  X,
  Plus,
  Trash2,
  ExternalLink,
  Globe,
  Code2,
  Briefcase,
  Building2,
  GraduationCap,
  Mail,
  Calendar,
} from "lucide-react";
import { GithubIcon } from "@/design-system/components/Icons";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Input } from "@/design-system/components/Input";
import { Textarea } from "@/design-system/components/Textarea";
import { TagMultiSelect } from "@/design-system/components/TagMultiSelect";
import { studentApi } from "@/lib/api/studentApi";
import { StudentProfileDto, StudentSocialLinkDto } from "@/lib/api/types";
import { showToast } from "@/lib/toast";

const SOCIAL_PLATFORMS = [
  "GitHub",
  "LinkedIn",
  "Portfolio",
  "GitLab",
  "LeetCode",
  "HackerRank",
  "Behance",
  "Personal Website",
  "Other",
] as const;

const SKILL_CATALOG = [
  "TypeScript",
  "Python",
  "React",
  "Next.js",
  "C# / .NET",
  "Docker",
  "PyTorch",
  "PostgreSQL",
  "IoT / ESP32",
  "TailwindCSS",
  "Kubernetes",
  "Spring Boot",
  "Flutter",
  "Rust",
];

function getPlatformIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case "github":
      return <GithubIcon className="h-4 w-4 shrink-0 text-slate-700" />;
    case "linkedin":
    case "portfolio":
    case "behance":
      return <Briefcase className="h-4 w-4 shrink-0 text-sky-700" />;
    case "gitlab":
    case "leetcode":
    case "hackerrank":
      return <Code2 className="h-4 w-4 shrink-0 text-emerald-700" />;
    default:
      return <Globe className="h-4 w-4 shrink-0 text-indigo-700" />;
  }
}

export const StudentProfileView: React.FC = () => {
  useDashboardHeader({
    title: "Learner Academic Profile",
    breadcrumb: "Learner Academic Profile",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<StudentProfileDto | null>(null);

  // Edit mode & draft form states
  const [isEditing, setIsEditing] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<StudentSocialLinkDto[]>([]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bio, setBio] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const syncDraftFromProfile = (data: StudentProfileDto) => {
    setSkills(data.skills || []);
    setSocialLinks((data.socialLinks || []).map((l) => ({ ...l })));
    setPhoneNumber(data.phoneNumber || "");
    setBio(data.bio || "");
    setValidationError(null);
  };

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await studentApi.getProfile();
        if (isMounted && data) {
          setProfile(data);
          syncDraftFromProfile(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load student profile");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const handleEnterEdit = () => {
    if (profile) {
      syncDraftFromProfile(profile);
    }
    setSavedBanner(false);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (profile) {
      syncDraftFromProfile(profile);
    }
    setIsEditing(false);
  };

  const handleAddLink = () => {
    if (socialLinks.length >= 10) {
      setValidationError("You can add at most 10 social or developer links.");
      return;
    }
    setValidationError(null);
    setSocialLinks((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        platform: "GitHub",
        label: "GitHub",
        url: "",
      },
    ]);
  };

  const handleUpdateLink = (index: number, patch: Partial<StudentSocialLinkDto>) => {
    setValidationError(null);
    setSocialLinks((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const next = { ...item, ...patch };
        if (patch.platform && patch.platform !== "Other" && (!item.label || item.label === item.platform)) {
          next.label = patch.platform;
        }
        return next;
      })
    );
  };

  const handleRemoveLink = (index: number) => {
    setValidationError(null);
    setSocialLinks((prev) => prev.filter((_, idx) => idx !== index));
  };

  const validateForm = (): string | null => {
    const cleanPhone = phoneNumber.trim();
    if (cleanPhone.length > 25) {
      return "Phone number cannot exceed 25 characters.";
    }
    if (cleanPhone && !/^[\+0-9\s\-()]{7,25}$/.test(cleanPhone)) {
      return "Invalid phone number format (7–25 digits, spaces, +, -, or parentheses).";
    }

    const cleanBio = bio.trim();
    if (cleanBio.length > 500) {
      return "Bio cannot exceed 500 characters.";
    }

    const seenUrls = new Set<string>();
    for (let i = 0; i < socialLinks.length; i++) {
      const link = socialLinks[i];
      const url = link.url.trim();
      if (!url) {
        return `Please enter a URL for link #${i + 1} (${link.platform}) or remove it.`;
      }
      if (url.length > 300) {
        return `Link #${i + 1} URL cannot exceed 300 characters.`;
      }
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return `Link #${i + 1} has an invalid URL. Include https:// or http://.`;
      }
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return `Link #${i + 1} must use https:// or http://.`;
      }
      const normalized = parsed.href.replace(/\/+$/, "").toLowerCase();
      if (seenUrls.has(normalized)) {
        return `Duplicate link URL detected: ${url}`;
      }
      seenUrls.add(normalized);

      if (link.platform === "Other" && !link.label?.trim()) {
        return `Please enter a label for custom link #${i + 1}.`;
      }
      if (link.label && link.label.trim().length > 40) {
        return `Label for link #${i + 1} cannot exceed 40 characters.`;
      }
    }

    return null;
  };

  const handleSave = async () => {
    if (isSaving) return;
    const formError = validateForm();
    if (formError) {
      setValidationError(formError);
      showToast(formError, "error");
      return;
    }

    setValidationError(null);
    setIsSaving(true);
    try {
      const cleanedLinks: StudentSocialLinkDto[] = socialLinks.map((l) => ({
        id: l.id,
        platform: l.platform,
        label: l.platform === "Other" ? l.label?.trim() || "Other" : l.label?.trim() || l.platform,
        url: l.url.trim(),
      }));

      const updated = await studentApi.updateProfile({
        skills,
        socialLinks: cleanedLinks,
        phoneNumber: phoneNumber.trim(),
        bio: bio.trim(),
      });

      if (updated) {
        setProfile(updated);
        syncDraftFromProfile(updated);
        setIsEditing(false);
        setSavedBanner(true);
        showToast("Profile updated successfully!", "success");
        setTimeout(() => setSavedBanner(false), 3000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred while saving";
      setValidationError(msg);
      showToast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse" aria-label="Loading student profile">
        <div className="h-36 bg-slate-100 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-slate-100 rounded-xl" />
          <div className="h-64 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <Card className="border-red-200 bg-red-50/50 p-6">
        <div className="flex flex-col items-center justify-center text-center space-y-3 py-6">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <h3 className="text-lg font-semibold text-slate-800">Unable to Load Profile</h3>
          <p className="text-sm text-slate-600 max-w-md">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (!profile) return null;

  const initials = (profile.fullName || "ST")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");

  const departmentDisplay = profile.departmentName
    ? profile.departmentCode
      ? `${profile.departmentName} (${profile.departmentCode})`
      : profile.departmentName
    : "Department not assigned";

  const collegeDisplay = profile.collegeName
    ? profile.collegeCode
      ? `${profile.collegeName} (${profile.collegeCode})`
      : profile.collegeName
    : "College not assigned";

  const isActivelyEnrolled = profile.academicStatus === "Active" && Boolean(profile.programName);
  const programHeadline = profile.programName
    ? profile.currentSemester > 0
      ? `${profile.programName} • Sem ${profile.currentSemester}`
      : profile.programName
    : "No active semester enrollment";

  const enrollmentBadgeVariant =
    profile.academicStatus === "Active"
      ? "success"
      : profile.academicStatus === "Graduated"
        ? "info"
        : profile.academicStatus === "Detained"
          ? "warning"
          : "neutral";

  return (
    <div className="space-y-5 pb-8 max-w-6xl">
      {/* PRIMARY IDENTITY & ACADEMIC HERO */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
            <div className="flex items-start gap-4 min-w-0">
              <div className="h-16 w-16 rounded-2xl bg-emerald-800 text-white font-bold text-xl flex items-center justify-center shrink-0 shadow-xs">
                {initials}
              </div>

              <div className="min-w-0 space-y-2">
                {/* Primary Identity Row: Name, USN, Enrollment Status */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {profile.fullName}
                  </h1>
                  {profile.enrollmentCode ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-900 text-white font-mono text-xs font-semibold tracking-wide">
                      {profile.enrollmentCode}
                    </span>
                  ) : (
                    <Badge variant="warning" size="sm">
                      USN Pending
                    </Badge>
                  )}
                  <Badge variant={enrollmentBadgeVariant} size="sm">
                    {profile.academicStatus || "Not Enrolled"}
                  </Badge>
                </div>

                {/* Primary Academic Line: Branch + Program/Semester */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-slate-800">
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>{departmentDisplay}</span>
                  </span>
                  <span className="text-slate-300" aria-hidden="true">•</span>
                  <span className={profile.programName ? "text-slate-700" : "text-slate-500 font-normal"}>
                    {programHeadline}
                  </span>
                  {profile.admissionBatch && (
                    <>
                      <span className="text-slate-300" aria-hidden="true">•</span>
                      <span className="text-xs text-slate-500 font-normal">
                        Batch {profile.admissionBatch}
                      </span>
                    </>
                  )}
                </div>

                {/* Secondary College & Session Context */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-0.5">
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{collegeDisplay}</span>
                  </span>
                  {profile.academicSessionName && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>
                        {isActivelyEnrolled ? "Academic Session" : "College Active Session"}:{" "}
                        <strong className="font-medium text-slate-700">{profile.academicSessionName}</strong>
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2.5 shrink-0">
              {!isEditing ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleEnterEdit}
                  leftIcon={<Pencil className="h-3.5 w-3.5" />}
                >
                  Edit Profile
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    leftIcon={<X className="h-3.5 w-3.5" />}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleSave}
                    disabled={isSaving}
                    leftIcon={
                      isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )
                    }
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {savedBanner && (
            <div className="mt-4 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>Your profile changes have been saved.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {isEditing ? (
        /* EDIT MODE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-6">
            {/* About / Bio */}
            <Card>
              <CardHeader>
                <CardTitle>About &amp; Project Interests</CardTitle>
                <CardDescription>
                  Share your technical interests and capstone goals with peers and faculty.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Textarea
                    label="Learner Bio / Project Interests"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Describe your research interests, technical focus, or project goals..."
                    rows={4}
                    maxLength={500}
                  />
                  <div className="text-[11px] text-slate-400 text-right font-mono">
                    {bio.trim().length} / 500
                  </div>
                </div>

                <Input
                  label="Contact Phone Number (Optional, Private)"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  leftIcon={<Phone className="h-4 w-4" />}
                />
              </CardContent>
            </Card>

            {/* Dynamic Social & Developer Links Editor */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle>Social &amp; Developer Links</CardTitle>
                    <CardDescription>
                      Add links to your GitHub, LinkedIn, Portfolio, LeetCode, or other profiles.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleAddLink}
                    disabled={socialLinks.length >= 10}
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                  >
                    Add Link
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {socialLinks.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center text-xs text-slate-500">
                    No links added yet. Click <strong>Add Link</strong> to attach your developer or portfolio profiles.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {socialLinks.map((link, index) => (
                      <div
                        key={link.id}
                        className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2.5"
                      >
                        <div className="flex flex-col sm:flex-row gap-2.5">
                          <div className="sm:w-44 shrink-0">
                            <label
                              htmlFor={`link-platform-${index}`}
                              className="block text-[11px] font-semibold text-slate-700 mb-1"
                            >
                              Platform
                            </label>
                            <select
                              id={`link-platform-${index}`}
                              value={link.platform}
                              onChange={(e) => handleUpdateLink(index, { platform: e.target.value })}
                              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                            >
                              {SOCIAL_PLATFORMS.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                          </div>

                          {link.platform === "Other" && (
                            <div className="sm:w-40 shrink-0">
                              <label
                                htmlFor={`link-label-${index}`}
                                className="block text-[11px] font-semibold text-slate-700 mb-1"
                              >
                                Custom Label
                              </label>
                              <input
                                id={`link-label-${index}`}
                                type="text"
                                value={link.label || ""}
                                onChange={(e) => handleUpdateLink(index, { label: e.target.value })}
                                placeholder="e.g. Kaggle"
                                maxLength={40}
                                className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                              />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <label
                              htmlFor={`link-url-${index}`}
                              className="block text-[11px] font-semibold text-slate-700 mb-1"
                            >
                              Profile URL
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                id={`link-url-${index}`}
                                type="url"
                                value={link.url}
                                onChange={(e) => handleUpdateLink(index, { url: e.target.value })}
                                placeholder="https://github.com/username"
                                maxLength={300}
                                className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveLink(index)}
                                aria-label={`Remove link ${index + 1}`}
                                title="Remove link"
                                className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center shrink-0 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {validationError && (
                  <div
                    role="alert"
                    className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium"
                  >
                    {validationError}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-5 space-y-6">
            {/* Skills Editor */}
            <Card>
              <CardHeader>
                <CardTitle>Technical Skills &amp; Stack</CardTitle>
                <CardDescription>
                  Select skills or add custom tags. Used in peer matching searches.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TagMultiSelect
                  availableTags={SKILL_CATALOG}
                  selectedTags={skills}
                  onChange={setSkills}
                />
              </CardContent>
            </Card>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
              <Lock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Institutional identity fields (name, USN, college, department, and enrollment) are locked to college registry records and cannot be edited here.
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* NORMAL READ-ONLY PROFILE VIEW */
        <div className="space-y-5">
          {/* SECONDARY PROFILE CONTENT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7 space-y-5">
              {/* About / Project Interests */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">About &amp; Project Interests</CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.bio ? (
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {profile.bio}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">
                      No bio added yet. Use Edit Profile to add your project interests.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Social & Developer Links */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Social &amp; Developer Links</CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.socialLinks && profile.socialLinks.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {profile.socialLinks.map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-300 transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {getPlatformIcon(link.platform)}
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-900 truncate">
                                {link.label || link.platform}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">{link.url}</div>
                            </div>
                          </div>
                          <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-700 shrink-0" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      No developer or portfolio links added yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-5 space-y-5">
              {/* Saved Technical Skills */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Technical Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.skills && profile.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      No technical skills added yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* SUPPORTING INFORMATION (Subtle, compact) */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-3 text-xs text-slate-600">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    Registered Email
                  </span>
                  <span className="font-medium text-slate-800 truncate">{profile.email}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    Phone (Private)
                  </span>
                  <span className={profile.phoneNumber ? "font-medium text-slate-800" : "text-slate-400"}>
                    {profile.phoneNumber || "Not provided"}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200/70 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Profile Completion</span>
                    <span className="font-mono font-semibold text-slate-700">
                      {profile.profileCompletionPercentage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-700 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${profile.profileCompletionPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="pt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Lock className="h-3 w-3 shrink-0" />
                  <span>College-managed institutional identity &amp; enrollment records.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
