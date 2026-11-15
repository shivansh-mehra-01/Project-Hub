"use client";

import React, { useState } from "react";
import { GraduationCap, Award, ExternalLink, QrCode, CheckCircle2, Share2, Copy } from "lucide-react";
import { AppShell } from "@/design-system/patterns/AppShell";
import { Button } from "@/design-system/components/Button";
import { Badge } from "@/design-system/components/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/design-system/components/Card";
import { Modal } from "@/design-system/components/Modal";
import { useProjectHubStore } from "@/mocks/ProjectHubStore";

export const StudentPortfolioView: React.FC = () => {
  const { currentPersona } = useProjectHubStore();
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard?.writeText("https://projecthub.sistec.ac.in/verify/0176CS221045");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppShell pageTitle="Academic Project Portfolio" breadcrumb="Verified Institutional Transcript" activeTab="Portfolio">
      <div className="space-y-6">
        {/* Profile Card Header */}
        <div className="p-6 rounded-xl border border-[#E2E8F0] bg-white shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-[#EEF2FF] border border-indigo-200 text-[#4F46E5] flex items-center justify-center font-bold text-xl">
              SM
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
                Enrollment USN: {currentPersona.enrollmentNumber || "0176CS221045"} • CGPA: 8.74
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCopyLink}
              leftIcon={<Share2 className="h-3.5 w-3.5" />}
            >
              {copied ? "Link Copied!" : "Share Verified Transcript"}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setShowCertificateModal(true)}
              leftIcon={<QrCode className="h-3.5 w-3.5" />}
            >
              View QR Credential
            </Button>
          </div>
        </div>

        {/* Longitudinal Projects Timeline */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#0F172A]">Degree Capstone Projects</h3>

          {/* Project 1: Minor Project Sem 6 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#4F46E5] bg-[#EEF2FF] px-2 py-0.5 rounded border border-indigo-100">
                  Year 3 • Minor Project (Semester 6)
                </span>
                <Badge variant="success" size="sm" dot>
                  Defense Score: 44.5/50 (89%)
                </Badge>
              </div>
              <CardTitle className="pt-2 text-sm">
                Smart IoT Energy Monitoring &amp; Anomaly Detection for Campus Labs
              </CardTitle>
              <CardDescription>
                Designed edge telemetric acquisition on ESP32 microcontrollers, deployed MQTT brokers
                on AWS EC2, and trained LSTM anomaly regression models.
              </CardDescription>
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
                  <div className="font-bold text-[#0F172A]">Prof. S. K. Verma</div>
                </div>
                <div>
                  <span className="text-[#64748B]">Target SDG:</span>
                  <div className="font-bold text-emerald-700">SDG 7 (Clean Energy)</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="font-semibold text-[#0F172A]">Demonstrated NBA Program Outcomes (POs):</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-white text-[#475569] border border-[#CBD5E1] text-[11px] font-mono">
                    PO2: Problem Analysis (High - 3)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white text-[#475569] border border-[#CBD5E1] text-[11px] font-mono">
                    PO3: Design/Development (High - 3)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white text-[#475569] border border-[#CBD5E1] text-[11px] font-mono">
                    PO5: Modern Tool Usage (Git, AWS, Next.js)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white text-[#475569] border border-[#CBD5E1] text-[11px] font-mono">
                    PO9: Individual &amp; Team Work
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project 2: Major Project Sem 7-8 Preview */}
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
                Comprehensive 1-year major project requiring full production deployment, research
                benchmarks, and formal university viva committee evaluation.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Verified Certificate Modal with QR */}
      <Modal
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
        title="Institutional Academic Credential"
        description="Tamper-proof verifiable digital transcript issued by SISTec Department of CSE."
        footer={
          <div className="flex items-center justify-end w-full">
            <Button variant="secondary" size="sm" onClick={() => setShowCertificateModal(false)}>
              Close
            </Button>
          </div>
        }
      >
        <div className="p-6 bg-white border-2 border-indigo-100 rounded-xl space-y-4 text-center">
          <div className="space-y-1">
            <span className="text-[10px] font-bold tracking-widest text-[#4F46E5] uppercase">
              Official University Transcript Record
            </span>
            <h4 className="text-base font-bold text-[#0F172A]">Minor Project Engineering Certificate</h4>
            <p className="text-xs text-[#64748B]">
              This certifies that <strong>Shivansh Mehra</strong> (USN: 0176CS221045) has successfully
              defended Minor Project Phase-1 with a score of <strong>44.5/50 (89%)</strong>.
            </p>
          </div>

          <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] inline-block mx-auto">
            <div className="h-32 w-32 bg-white border border-[#CBD5E1] p-2 flex items-center justify-center mx-auto">
              {/* Simulated QR Code Pattern */}
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
            <div className="font-mono text-[10px] text-[#64748B] mt-2">
              Verification Hash: 0x4f46e5...bmsce
            </div>
          </div>

          <div className="text-[11px] text-[#64748B] flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Digitally signed by HOD Dr. Ravindra Kumar Sharma</span>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
};
