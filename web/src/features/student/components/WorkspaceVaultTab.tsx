"use client";

import React, { useRef, useState } from "react";
import { Download, Loader2, ShieldCheck, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/design-system/components/Card";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Modal } from "@/design-system/components/Modal";
import { studentApi } from "@/lib/api/studentApi";
import { ArtifactSlotDto, ArtifactSlotType } from "@/lib/api/types";
import { showToast } from "@/lib/toast";

export interface WorkspaceVaultTabProps {
  artifacts: ArtifactSlotDto[];
  onRefresh: () => Promise<void>;
}

const SLOTS: { slot: ArtifactSlotType; title: string; subtitle: string }[] = [
  { slot: "Synopsis", title: "1. Approved Synopsis", subtitle: "Signed proposal synopsis (PDF)" },
  { slot: "MidTermPPT", title: "2. Mid-Term Review", subtitle: "Presentation deck (PPT/PPTX/PDF)" },
  { slot: "PlagiarismReport", title: "3. Plagiarism Report", subtitle: "Similarity report (< 15%)" },
  { slot: "FinalThesis", title: "4. Final Thesis", subtitle: "Complete dissertation (PDF)" },
];

export const WorkspaceVaultTab: React.FC<WorkspaceVaultTabProps> = ({
  artifacts,
  onRefresh,
}) => {
  const [uploadSlot, setUploadSlot] = useState<ArtifactSlotType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const approvedCount = artifacts.filter((a) => a.status === "Verified").length;

  const handleDownload = async (artifact: ArtifactSlotDto) => {
    if (!artifact.id) {
      showToast("File is not available for download.", "error");
      return;
    }
    try {
      const blob = await studentApi.downloadArtifactBlob(artifact.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = artifact.fileName || "deliverable.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Download failed.", "error");
    }
  };

  const handleUpload = async () => {
    if (!uploadSlot || !selectedFile) return;
    setUploading(true);
    try {
      await studentApi.uploadArtifactFile(uploadSlot, selectedFile);
      setUploadSlot(null);
      setSelectedFile(null);
      showToast("Deliverable uploaded to vault.", "success");
      await onRefresh();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Upload failed.", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-primary" />
            <span>Capstone Document Vault</span>
          </CardTitle>
          <Badge variant={approvedCount === 4 ? "success" : "info"} size="sm">
            {approvedCount} of 4 Verified
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SLOTS.map((item) => {
              const artifact = artifacts.find((a) => a.slotType === item.slot);
              const isUploaded = Boolean(artifact?.fileName);
              const statusLabel =
                artifact?.status === "Verified"
                  ? "Verified"
                  : artifact?.status === "RevisionRequested"
                  ? "Revision"
                  : isUploaded
                  ? "Uploaded"
                  : "Pending";
              const statusVariant =
                artifact?.status === "Verified"
                  ? "success"
                  : artifact?.status === "RevisionRequested"
                  ? "warning"
                  : isUploaded
                  ? "info"
                  : "neutral";

              return (
                <div
                  key={item.slot}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">{item.title}</span>
                      <Badge variant={statusVariant} size="sm">{statusLabel}</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">{item.subtitle}</p>

                    {isUploaded && artifact ? (
                      <div className="p-2 rounded bg-white border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <button
                            type="button"
                            onClick={() => handleDownload(artifact)}
                            className="font-medium text-brand-primary hover:underline truncate text-left cursor-pointer"
                          >
                            {artifact.fileName}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownload(artifact)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-500 cursor-pointer shrink-0"
                            title="Download"
                          >
                            <Download className="h-3 w-3" />
                          </button>
                        </div>
                        {artifact.fileSizeBytes && (
                          <div className="text-[10px] text-slate-400 tabular-nums">
                            {Math.round(artifact.fileSizeBytes / 1024)} KB
                          </div>
                        )}
                        {artifact.reviewerNote && (
                          <div className="text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded">
                            {artifact.reviewerNote}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded bg-white border border-dashed border-slate-200 text-center text-[11px] text-slate-400">
                        Not uploaded
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant={isUploaded ? "secondary" : "primary"}
                    className="w-full text-xs"
                    leftIcon={<Upload className="h-3 w-3" />}
                    onClick={() => {
                      setUploadSlot(item.slot);
                      setSelectedFile(null);
                    }}
                  >
                    {isUploaded ? "Replace" : "Upload"}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={Boolean(uploadSlot)}
        onClose={() => {
          setUploadSlot(null);
          setSelectedFile(null);
        }}
        title={`Upload ${SLOTS.find((s) => s.slot === uploadSlot)?.title || "Deliverable"}`}
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              disabled={uploading}
              onClick={() => {
                setUploadSlot(null);
                setSelectedFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={uploading || !selectedFile}
              onClick={handleUpload}
              leftIcon={uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            >
              {uploading ? "Uploading..." : "Upload File"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,.ppt,.pptx"
            className="hidden"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-brand-primary transition-colors cursor-pointer rounded-xl p-6 text-center bg-slate-50 space-y-1.5"
          >
            <Upload className="h-6 w-6 text-brand-primary mx-auto" />
            {selectedFile ? (
              <div>
                <div className="font-bold text-brand-primary">{selectedFile.name}</div>
                <div className="text-[11px] text-slate-500">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>
            ) : (
              <>
                <div className="font-semibold text-slate-800">Click to select a file</div>
                <div className="text-[11px] text-slate-500">PDF, PPT, or PPTX (max 25MB)</div>
              </>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
