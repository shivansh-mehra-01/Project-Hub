"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Award,
  ExternalLink,
  QrCode,
  CheckCircle2,
  Share2,
  Copy,
  ArrowRight,
  GitBranch,
  Sparkles,
  Lock,
  Globe,
  Check,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";
import { useDashboardHeader } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Modal } from "@/design-system/components/Modal";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";
import { studentApi } from "@/lib/api/studentApi";
import { VerifiedStudentPortfolioDto, StudentAcademicRecordDto } from "@/lib/api/types";

export const StudentPortfolioView: React.FC = () => {
  useDashboardHeader({
    title: "Academic Project Portfolio",
    breadcrumb: "Verified Institutional Transcript",
  });

  const {
    currentPersona,
    teams,
    continueProjectToNextTrack,
  } = useProjectHubStore();

  const [verifiedPortfolio, setVerifiedPortfolio] = useState<VerifiedStudentPortfolioDto | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioVisibility, setPortfolioVisibility] = useState(false);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const [selectedRecordForModal, setSelectedRecordForModal] = useState<StudentAcademicRecordDto | null>(null);

  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showContinuityModal, setShowContinuityModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setPortfolioLoading(true);
    studentApi
      .getVerifiedPortfolio()
      .then((data) => {
        if (active && data) {
          setVerifiedPortfolio(data);
          setPortfolioVisibility(data.allowPublicPortfolio);
        }
      })
      .catch(() => {
        // Fallback to store
      })
      .finally(() => {
        if (active) setPortfolioLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleToggleVisibility = async () => {
    try {
      setUpdatingVisibility(true);
      const newVisibility = !portfolioVisibility;
      const res = await studentApi.updatePortfolioVisibility({ allowPublicPortfolio: newVisibility });
      setPortfolioVisibility(res.allowPublicPortfolio);
      setToastMessage(res.message || (newVisibility ? "Public portfolio enabled." : "Portfolio set to private."));
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: unknown) {
      setToastMessage(err instanceof Error ? err.message : "Failed to update portfolio visibility.");
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setUpdatingVisibility(false);
    }
  };

  const studentUsn = verifiedPortfolio?.enrollmentNumber || currentPersona.enrollmentNumber || "";

  const isTeamLead =
    currentPersona.role === "TeamLead" ||
    teams.some((t) => t.members?.some((m) => m.isLead && m.name === currentPersona.name));

  // Find Minor Project team from live store only (never fabricate mock seed teams)
  const minorTeam =
    teams.find(
      (t) =>
        t.trackName === "Minor Project" ||
        t.members?.some((m) => m.name === currentPersona.name || (studentUsn && m.enrollmentNumber === studentUsn))
    ) ||
    teams[0];

  // Find linked Major Project team if continued
  const majorTeam = teams.find(
    (t) =>
      t.trackName === "Major Phase-I" &&
      (Boolean(t.projectLineageId && t.projectLineageId === minorTeam?.projectLineageId) || t.teamCode?.includes("MAJ"))
  );

  const handleCopyLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://collabex.io";
    const shareUrl = verifiedPortfolio?.publicPortfolioShareUrl
      ? `${origin}${verifiedPortfolio.publicPortfolioShareUrl}`
      : `${origin}/verify/${studentUsn}`;
    navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    setToastMessage(`Transcript link copied! ${portfolioVisibility ? "Public sharing is active." : "Note: Public consent is currently private."}`);
    setTimeout(() => setToastMessage(null), 4000);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenCredential = () => {
    setShowCertificateModal(true);
  };

  const handleExecuteContinuity = () => {
    if (minorTeam?.id) {
      continueProjectToNextTrack(minorTeam.id, "Major Phase-I");
    }
    setShowContinuityModal(false);
    setToastMessage("Project continuity established! Major Phase-I active in Workspace.");
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Toast Feedback */}
        {toastMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium flex items-center justify-between shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <Link
              href="/student"
              className="text-emerald-700 underline font-semibold hover:text-emerald-900 cursor-pointer text-xs"
            >
              Open Workspace &rarr;
            </Link>
          </div>
        )}

        {/* Profile Card Header */}
        <div className="p-6 rounded-xl border border-[#E2E8F0] bg-white shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-brand-primary-tint border border-brand-primary-border text-brand-primary flex items-center justify-center font-bold text-xl font-mono">
              {currentPersona.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0F172A]">{currentPersona.name}</h2>
                <Badge variant="success" size="sm" dot>
                  Institutional Verified
                </Badge>
              </div>
              <div className="text-xs text-[#64748B]">
                B.Tech in Computer Science &amp; Engineering • Sagar Institute of Science and Technology
              </div>
              <div className="font-mono text-xs text-[#475569] tabular-nums">
                Enrollment USN: {studentUsn} • CGPA: 8.74
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant={portfolioVisibility ? "primary" : "secondary"}
              onClick={handleToggleVisibility}
              disabled={updatingVisibility}
              leftIcon={portfolioVisibility ? <Globe className="h-3.5 w-3.5 text-white" /> : <Lock className="h-3.5 w-3.5 text-slate-500" />}
            >
              {updatingVisibility ? "Updating..." : portfolioVisibility ? "Public Consent: ON" : "Public Consent: OFF"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCopyLink}
              leftIcon={<Share2 className="h-3.5 w-3.5" strokeWidth={1.75} />}
            >
              {copied ? "Link Copied!" : "Share Verified Transcript"}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleOpenCredential}
              leftIcon={<QrCode className="h-3.5 w-3.5" strokeWidth={1.75} />}
            >
              View QR Credential
            </Button>
          </div>
        </div>

        {/* Longitudinal Projects Timeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0F172A] font-heading">Degree Capstone Projects</h3>
            <span className="text-xs text-[#64748B]">Multi-Track Continuous Engineering</span>
          </div>

          {/* Phase 10: Authoritative Verified Institutional Records from Database */}
          {verifiedPortfolio?.projects && verifiedPortfolio.projects.length > 0 && (
            <div className="space-y-4">
              {verifiedPortfolio.projects.map((proj) => (
                <Card key={proj.id} className="border border-emerald-300 bg-white shadow-xs">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-brand-primary bg-brand-primary-tint px-2 py-0.5 rounded border border-brand-primary-border">
                          {proj.academicYear} • {proj.trackName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          Team: {proj.teamCode}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={proj.finalOutcome === "Pass" ? "success" : "danger"} size="sm" dot>
                          {proj.finalOutcome}: {proj.finalComputedMark.toFixed(1)} / 100
                        </Badge>
                        <Badge variant="success" size="sm">
                          Institutional Sealed Record
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="pt-2 text-sm">{proj.projectTitle}</CardTitle>
                    <CardDescription>{proj.projectAbstract}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                      <div>
                        <span className="text-[#64748B]">Role:</span>
                        <div className="font-bold text-[#0F172A]">
                          {proj.roleDescription} {proj.isTeamLead ? "(Team Lead)" : ""}
                        </div>
                      </div>
                      <div>
                        <span className="text-[#64748B]">Individual Score:</span>
                        <div className="font-bold text-[#0F172A] font-mono tabular-nums">
                          {proj.individualContributionScore.toFixed(1)} pts
                        </div>
                      </div>
                      <div>
                        <span className="text-[#64748B]">Faculty Guide:</span>
                        <div className="font-bold text-[#0F172A]">{proj.guideName}</div>
                      </div>
                      <div>
                        <span className="text-[#64748B]">Verified Date:</span>
                        <div className="font-bold text-slate-700">
                          {new Date(proj.verifiedAtUtc).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* Verified Artifacts & Credentials */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                      <div className="flex flex-wrap items-center gap-2">
                        {proj.verifiedRepositoryUrl && (
                          <a
                            href={proj.verifiedRepositoryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Institutional Codebase</span>
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                          </a>
                        )}
                        {proj.verifiedDemoUrl && (
                          <a
                            href={proj.verifiedDemoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Live Deployment</span>
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                          </a>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setSelectedRecordForModal(proj);
                          setShowCertificateModal(true);
                        }}
                        leftIcon={<QrCode className="h-3.5 w-3.5" strokeWidth={1.75} />}
                      >
                        View Verified Certificate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Project 1: Minor Project Sem 6 */}
          <Card className="border border-[#E2E8F0] shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-brand-primary bg-brand-primary-tint px-2 py-0.5 rounded border border-brand-primary-border">
                    Year 3 • Minor Project (Semester 6)
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Lineage: {minorTeam?.projectLineageId || "lin-2026-cs-01"}
                  </span>
                </div>
                <Badge variant="success" size="sm" dot>
                  Defense Score: 44.5/50 (89%)
                </Badge>
              </div>
              <CardTitle className="pt-2 text-sm">{minorTeam?.title || "Degree Capstone Project"}</CardTitle>
              <CardDescription>{minorTeam?.abstract || "Continuous engineering degree capstone project."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <div>
                  <span className="text-[#64748B]">Role:</span>
                  <div className="font-bold text-[#0F172A]">Team Lead &amp; Firmware Engineer</div>
                </div>
                <div>
                  <span className="text-[#64748B]">Individual Contribution:</span>
                  <div className="font-bold text-[#0F172A] font-mono tabular-nums">40% of Project Workload</div>
                </div>
                <div>
                  <span className="text-[#64748B]">Faculty Guide:</span>
                  <div className="font-bold text-[#0F172A]">{minorTeam?.guideName || "Prof. S. K. Verma"}</div>
                </div>
                <div>
                  <span className="text-[#64748B]">Target SDG:</span>
                  <div className="font-bold text-emerald-700">SDG {minorTeam?.sdgNumber || 7} (Clean Energy)</div>
                </div>
              </div>

              {/* Dynamic Project Continuity Action */}
              <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 font-heading">
                    <GitBranch className="h-4 w-4 text-emerald-700" />
                    <span>Project Continuity Pipeline</span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Carries forward verified team roster (3 members), Faculty Guide ({minorTeam?.guideName || "Prof. S. K. Verma"}), and repository endpoints into Major Project Phase-I.
                  </p>
                </div>

                {isTeamLead && !majorTeam && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setShowContinuityModal(true)}
                    className="shrink-0"
                    rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                  >
                    Continue into Next Track &rarr;
                  </Button>
                )}

                {majorTeam && (
                  <div className="flex items-center gap-2">
                    <Badge variant="success" size="sm" dot>
                      Major Phase-I Active
                    </Badge>
                    <Link
                      href="/student"
                      className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Project 2: Major Project Sem 7-8 */}
          {majorTeam ? (
            <Card className="border border-emerald-300 bg-emerald-50/20 shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                      Year 4 • Major Project Phase-I (Semester 7)
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Lineage ID: {majorTeam.projectLineageId}
                    </span>
                  </div>
                  <Badge variant="info" size="sm" dot>
                    Active Build Phase
                  </Badge>
                </div>
                <CardTitle className="pt-2 text-sm text-[#0F172A]">{majorTeam.title}</CardTitle>
                <CardDescription>
                  Advanced scale extension: Hardware telemetry scaled to 32 industrial distribution nodes with distributed LSTM inference and cloud failover.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-white rounded-lg border border-[#E2E8F0]">
                  <div>
                    <span className="text-[#64748B]">Assigned Mentor:</span>
                    <div className="font-bold text-[#0F172A]">{majorTeam.guideName}</div>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Team Code:</span>
                    <div className="font-mono font-bold text-brand-primary">{majorTeam.teamCode}</div>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Repository Link:</span>
                    <div className="font-mono text-[11px] text-[#475569] truncate">
                      {majorTeam.githubUrl ? majorTeam.githubUrl.replace(/^https?:\/\//, "") : "No repository linked"}
                    </div>
                  </div>
                  <div>
                    <span className="text-[#64748B]">Team Lead:</span>
                    <div className="font-bold text-[#0F172A]">Shivansh Mehra</div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Link href="/student">
                    <Button size="sm" variant="secondary" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                      Go to Major Project Workspace
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed bg-[#F8FAFC]/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-[#64748B] bg-white px-2 py-0.5 rounded border border-[#E2E8F0]">
                    Year 4 • Major Project (Semester 7 &amp; 8)
                  </span>
                  <Badge variant="neutral" size="sm">
                    Upcoming (July 2026)
                  </Badge>
                </div>
                <CardTitle className="pt-2 text-sm text-[#475569]">
                  Full Capstone System &amp; IEEE Publication Stage
                </CardTitle>
                <CardDescription>
                  Comprehensive 1-year major project requiring full production deployment, research benchmarks, and formal university viva committee evaluation.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>

      {/* Continuity Confirmation Modal */}
      <Modal
        isOpen={showContinuityModal}
        onClose={() => setShowContinuityModal(false)}
        title="Continue Project into Major Project Phase-I"
        description="Establish academic continuity for Minor Project 2026-CS-MIN-01 into the upcoming Semester 7 track."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={() => setShowContinuityModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleExecuteContinuity}>
              Confirm &amp; Provision Next Track
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/60 space-y-2">
            <div className="font-bold text-emerald-950 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-emerald-700" />
              <span>Preserved Project Lineage &amp; Configuration:</span>
            </div>
            <ul className="space-y-1.5 text-emerald-900 font-medium">
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-700" />
                <span>Roster Carried Forward: Shivansh Mehra (Lead), Aarav Sharma, Diya Patel</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-700" />
                <span>Designated Faculty Guide: Prof. S. K. Verma</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-700" />
                <span>Lineage ID: <code className="font-mono font-bold">lin-2026-cs-01</code></span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-700" />
                <span>Connected VCS Repository: {minorTeam?.githubUrl ? minorTeam.githubUrl.replace(/^https?:\/\//, "") : "No repository linked"}</span>
              </li>
            </ul>
          </div>
          <p className="text-[#64748B] text-[11px] leading-relaxed">
            Provisioning will create a linked Phase-I workspace under team code{" "}
            <strong className="font-mono text-slate-800">2026-CS-MAJ-1-01</strong>, enabling your team to immediately define Phase-I architecture benchmarks without re-registering.
          </p>
        </div>
      </Modal>

      {/* Verified Certificate Modal with QR */}
      <Modal
        isOpen={showCertificateModal}
        onClose={() => {
          setShowCertificateModal(false);
          setSelectedRecordForModal(null);
        }}
        title="Institutional Academic Credential"
        description="Tamper-proof verifiable digital transcript issued by SISTec Department of CSE."
        footer={
          <div className="flex items-center justify-end w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowCertificateModal(false);
                setSelectedRecordForModal(null);
              }}
            >
              Close
            </Button>
          </div>
        }
      >
        <div className="p-6 bg-white border-2 border-emerald-100 rounded-xl space-y-4 text-center">
          <div className="space-y-1">
            <span className="text-[10px] font-bold tracking-widest text-brand-primary uppercase font-mono">
              Official University Transcript Record
            </span>
            <h4 className="text-base font-bold text-[#0F172A]">
              {selectedRecordForModal
                ? `${selectedRecordForModal.trackName} Engineering Certificate`
                : "Minor Project Engineering Certificate"}
            </h4>
            <p className="text-xs text-[#64748B]">
              This certifies that <strong>{selectedRecordForModal?.studentName || "Shivansh Mehra"}</strong> (USN:{" "}
              {selectedRecordForModal?.enrollmentNumber || studentUsn}) has successfully defended{" "}
              {selectedRecordForModal?.projectTitle || "Minor Project Phase-1"} with a score of{" "}
              <strong>
                {selectedRecordForModal
                  ? `${selectedRecordForModal.finalComputedMark.toFixed(1)}/100 (${selectedRecordForModal.finalOutcome})`
                  : "44.5/50 (89%)"}
              </strong>
              .
            </p>
          </div>

          <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] inline-block mx-auto max-w-sm">
            <div className="h-32 w-32 bg-white border border-[#CBD5E1] p-2 flex items-center justify-center mx-auto">
              <div className="grid grid-cols-6 gap-1 w-full h-full p-1 bg-white">
                {Array.from({ length: 36 }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-xs ${
                      i % 2 === 0 || i % 7 === 0 ? "bg-[#0F172A]" : "bg-transparent"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="font-mono text-[10px] text-[#64748B] mt-2 break-all">
              Verification Hash:{" "}
              {selectedRecordForModal?.verificationHash || "Pending Attestation"} • Attainment Attested
            </div>
          </div>

          <div className="text-[11px] text-[#64748B] flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Digitally signed and sealed by Department Leadership • {selectedRecordForModal?.departmentName || "CSE"}</span>
          </div>
        </div>
      </Modal>
    </>
  );
};
