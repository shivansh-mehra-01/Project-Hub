"use client";

import React, { useState, useEffect } from "react";
import { Lock, Save, CheckCircle2, AlertCircle, Phone, Loader2 } from "lucide-react";
import { GithubIcon } from "@/design-system/components/Icons";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Input } from "@/design-system/components/Input";
import { Textarea } from "@/design-system/components/Textarea";
import { TagMultiSelect } from "@/design-system/components/TagMultiSelect";
import { studentApi } from "@/lib/api/studentApi";
import { StudentProfileDto } from "@/lib/api/types";
import { showToast } from "@/lib/toast";

export const StudentProfileView: React.FC = () => {
  useDashboardHeader({
    title: "Learner Academic Profile",
    breadcrumb: "Learner Academic Profile",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<StudentProfileDto | null>(null);

  // Form editable states
  const [skills, setSkills] = useState<string[]>([]);
  const [githubUsername, setGithubUsername] = useState("");
  const [jiraKey, setJiraKey] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bio, setBio] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await studentApi.getProfile();
        if (isMounted && data) {
          setProfile(data);
          setSkills(data.skills || []);
          setGithubUsername(data.gitHubHandle || "");
          setJiraKey(data.jiraKey || "");
          setPhoneNumber(data.phoneNumber || "");
          setBio(data.bio || "");
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await studentApi.updateProfile({
        skills,
        gitHubHandle: githubUsername.trim() || undefined,
        jiraKey: jiraKey.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        bio: bio.trim() || undefined,
      });

      if (updated) {
        setProfile(updated);
        setIsSaved(true);
        showToast("Profile changes saved successfully!", "success");
        setTimeout(() => setIsSaved(false), 2500);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "An unexpected error occurred while saving", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
        <div className="h-96 bg-slate-100 rounded-xl" />
        <div className="space-y-6">
          <div className="h-44 bg-slate-100 rounded-xl" />
          <div className="h-48 bg-slate-100 rounded-xl" />
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 1. Locked College Identity Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Institutional Enrollment Identity</CardTitle>
            <Badge variant="neutral" size="sm" dot>
              Locked
            </Badge>
          </div>
          <CardDescription>
            University enrollment credentials are verified and locked to college registry records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3.5">
          {/* Profile Completion Indicator */}
          {profile && (
            <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100 mb-2">
              <div className="flex items-center justify-between text-xs font-medium text-indigo-900 mb-1.5">
                <span>Academic Profile Completion</span>
                <span className="font-semibold">{profile.profileCompletionPercentage}%</span>
              </div>
              <div className="w-full bg-indigo-200/50 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${profile.profileCompletionPercentage}%` }}
                />
              </div>
            </div>
          )}

          <Input label="Student Full Name" value={profile?.fullName || ""} disabled readOnly />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="University Roll / USN"
              value={profile?.enrollmentOrEmployeeCode || ""}
              disabled
              readOnly
            />
            <Input
              label="Academic Program"
              value={`${profile?.academicProgram || "B.Tech"} • Sem ${profile?.currentSemester || "—"}`}
              disabled
              readOnly
            />
          </div>
          <Input
            label="Academic Branch"
            value={profile ? `${profile.departmentName} (${profile.departmentCode})` : "Computer Science & Eng (CSE)"}
            disabled
            readOnly
          />
          <Input label="College Email" value={profile?.email || ""} disabled readOnly />
          <Input
            label="Engineering College"
            value={profile ? `${profile.collegeName} (${profile.collegeCode})` : ""}
            disabled
            readOnly
          />
          {profile?.academicSessionName && (
            <Input
              label="Current Academic Session"
              value={profile.academicSessionName}
              disabled
              readOnly
            />
          )}

          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs text-[#64748B] flex items-start gap-2">
            <Lock className="h-4 w-4 text-[#94A3B8] shrink-0 mt-0.5" />
            <span>
              To update institutional credentials, university name, or roll number, contact your Department Coordinator or the HOD office.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Skills & Integrations Card */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Technical Skills &amp; Stack</CardTitle>
            <CardDescription>
              Visible on peer matching searches and faculty problem bank requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TagMultiSelect
              availableTags={[
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
              ]}
              selectedTags={skills}
              onChange={setSkills}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Personal Developer Handles</CardTitle>
            <CardDescription>
              Link your developer handles, contact details, and statement to showcase individual accomplishments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <Input
              label="GitHub Profile / Organization"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              leftIcon={<GithubIcon className="h-4 w-4" />}
              placeholder="github username (e.g. jdoe2026)"
            />
            <Input
              label="Jira / Issue Tracker Project Key"
              value={jiraKey}
              onChange={(e) => setJiraKey(e.target.value)}
              placeholder="e.g. SISTEC-CSE"
            />
            <Input
              label="Contact Phone Number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+91 98765 43210"
              leftIcon={<Phone className="h-4 w-4" />}
            />
            <Textarea
              label="Learner Bio / Project Interests"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief description of your research interests, technical goals, or capstone vision..."
              rows={3}
            />

            <Button
              size="sm"
              variant="primary"
              onClick={handleSave}
              disabled={isSaving}
              leftIcon={
                isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isSaved ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )
              }
            >
              {isSaving ? "Saving Changes..." : isSaved ? "Profile Saved!" : "Save Profile Changes"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
