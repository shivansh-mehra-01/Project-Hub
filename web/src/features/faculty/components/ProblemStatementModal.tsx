import React, { useState } from "react";
import { Modal } from "@/design-system/components/Modal";
import { Button } from "@/design-system/components/Button";
import { CreateProblemStatementRequest } from "@/lib/api/types";
import { AlertCircle } from "lucide-react";

export interface ProblemStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProblemStatementRequest) => Promise<void>;
  academicTrackId?: string;
}

export const ProblemStatementModal: React.FC<ProblemStatementModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  academicTrackId = "",
}) => {
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [sdgCode, setSdgCode] = useState("SDG-09");
  const [prerequisitesCsv, setPrerequisitesCsv] = useState("");
  const [maxTeamCapacity, setMaxTeamCapacity] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim() || title.trim().length < 5) {
      setErrorMsg("Title must be at least 5 characters.");
      return;
    }
    if (!abstract.trim() || abstract.trim().length < 20) {
      setErrorMsg("Abstract / Technical synopsis must be at least 20 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        academicTrackId: academicTrackId || "00000000-0000-0000-0000-000000000000",
        departmentId: "00000000-0000-0000-0000-000000000000", // Server-enforced from caller profile
        title: title.trim(),
        abstract: abstract.trim(),
        sdgCode,
        prerequisitesCsv: prerequisitesCsv.trim() || undefined,
        maxTeamCapacity,
      });
      setTitle("");
      setAbstract("");
      setPrerequisitesCsv("");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to publish problem statement.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sdgOptions = [
    { code: "SDG-03", label: "SDG 3: Good Health and Well-being" },
    { code: "SDG-04", label: "SDG 4: Quality Education" },
    { code: "SDG-07", label: "SDG 7: Affordable and Clean Energy" },
    { code: "SDG-09", label: "SDG 9: Industry, Innovation, and Infrastructure" },
    { code: "SDG-11", label: "SDG 11: Sustainable Cities and Communities" },
    { code: "SDG-13", label: "SDG 13: Climate Action" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Propose Project Topic"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="font-semibold text-[#0F172A] block mb-1.5">
            Topic Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., IoT LoRaWAN Soil Moisture Monitoring for Precision Agriculture"
            className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            required
          />
        </div>

        <div>
          <label className="font-semibold text-[#0F172A] block mb-1.5">
            Description & Scope *
          </label>
          <textarea
            value={abstract}
            onChange={(e) => setAbstract(e.target.value)}
            placeholder="Describe the challenge, deliverables, methodology, and expected outcomes..."
            rows={4}
            className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 resize-none"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div className="min-w-0">
            <label className="font-semibold text-[#0F172A] block mb-1.5">
              UN SDG Goal
            </label>
            <select
              value={sdgCode}
              onChange={(e) => setSdgCode(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white truncate"
            >
              {sdgOptions.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-[#0F172A] block mb-1.5">
              Max Team Size
            </label>
            <input
              type="number"
              min={1}
              max={6}
              value={maxTeamCapacity}
              onChange={(e) => setMaxTeamCapacity(parseInt(e.target.value, 10) || 4)}
              className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>
        </div>

        <div>
          <label className="font-semibold text-[#0F172A] block mb-1.5">
            Required Skills (comma-separated)
          </label>
          <input
            type="text"
            value={prerequisitesCsv}
            onChange={(e) => setPrerequisitesCsv(e.target.value)}
            placeholder="e.g., Embedded C, LoRaWAN, Python, MQTT"
            className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
            Publish Topic
          </Button>
        </div>
      </form>
    </Modal>
  );
};
