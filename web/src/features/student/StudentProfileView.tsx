"use client";

import React, { useState } from "react";
import { User, Lock, Save, CheckCircle2, ShieldCheck } from "lucide-react";
import { GithubIcon } from "@/design-system/components/Icons";
import { AppShell } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Input } from "@/design-system/components/Input";
import { TagMultiSelect } from "@/design-system/components/TagMultiSelect";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";

export const StudentProfileView: React.FC = () => {
  const { currentPersona, college } = useProjectHubStore();

  const [skills, setSkills] = useState(["TypeScript", "Next.js", "Python", "IoT / ESP32", "Docker"]);
  const [githubUsername, setGithubUsername] = useState("shivanshmehra");
  const [jiraKey, setJiraKey] = useState("SISTEC-CSE");
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <AppShell pageTitle="Learner Academic Profile" breadcrumb="Enrollment &amp; Integrations" activeTab="Profile">
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
            <Input label="Student Full Name" value={currentPersona.name} disabled readOnly />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="University Roll / USN"
                value={currentPersona.enrollmentNumber || "0176CS221045"}
                disabled
                readOnly
              />
              <Input label="Academic Branch" value="Computer Science & Eng (CSE)" disabled readOnly />
            </div>
            <Input label="College Email" value={currentPersona.email} disabled readOnly />
            <Input label="Engineering College" value={college.name} disabled readOnly />

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs text-[#64748B] flex items-start gap-2">
              <Lock className="h-4 w-4 text-[#94A3B8] shrink-0 mt-0.5" />
              <span>
                To update university name or roll number, contact Department Coordinator{" "}
                <strong>Prof. Priya Nair</strong> or the HOD office.
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
                availableTags={["TypeScript", "Python", "React", "Next.js", "C# / .NET", "Docker", "PyTorch"]}
                selectedTags={skills}
                onChange={setSkills}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Developer &amp; Tracker Integrations</CardTitle>
              <CardDescription>
                Connect team code repositories for automated commit evidence checks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <Input
                label="GitHub Profile / Organization"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                leftIcon={<GithubIcon className="h-4 w-4" />}
                placeholder="github username"
              />
              <Input
                label="Jira / Issue Tracker Project Key"
                value={jiraKey}
                onChange={(e) => setJiraKey(e.target.value)}
                placeholder="e.g. SISTEC-CSE"
              />

              <Button
                size="sm"
                variant="primary"
                onClick={handleSave}
                leftIcon={<Save className="h-3.5 w-3.5" />}
              >
                {isSaved ? "Profile Saved!" : "Save Profile Changes"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
};
