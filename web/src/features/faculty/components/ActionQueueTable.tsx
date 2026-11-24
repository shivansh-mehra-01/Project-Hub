import React from "react";
import { ActionQueueItemDto } from "@/lib/api/types";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { FileCheck, FileText, Calendar, ArrowRight } from "lucide-react";

export interface ActionQueueTableProps {
  items: ActionQueueItemDto[];
  isLoading?: boolean;
  onInspectLog: (item: ActionQueueItemDto) => void;
  onInspectProposal: (item: ActionQueueItemDto) => void;
}

export const ActionQueueTable: React.FC<ActionQueueTableProps> = ({
  items,
  isLoading,
  onInspectLog,
  onInspectProposal,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 bg-slate-100 animate-pulse rounded-lg border border-slate-200"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <FileCheck className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-[#0F172A]">Action Queue Clear</h4>
        <p className="text-xs text-[#64748B] mt-1 max-w-sm mx-auto">
          All weekly progress logbooks and student project proposals have been reviewed.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] uppercase font-semibold text-[11px] tracking-wider">
          <tr>
            <th className="py-3 px-4">Action Item</th>
            <th className="py-3 px-4">Team</th>
            <th className="py-3 px-4">Project Title</th>
            <th className="py-3 px-4">Submitted</th>
            <th className="py-3 px-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0]">
          {items.map((item) => {
            const isLog = item.type === "LogVerification";
            return (
              <tr
                key={item.itemId}
                className="hover:bg-slate-50/80 transition-colors group"
              >
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {isLog ? (
                      <span className="p-1.5 rounded-md bg-blue-50 text-blue-700">
                        <Calendar className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="p-1.5 rounded-md bg-amber-50 text-amber-700">
                        <FileText className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <span className="font-medium text-[#0F172A]">
                      {isLog ? "Weekly Log" : "New Proposal"}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <Badge variant="neutral" className="font-mono text-[11px]">
                    {item.teamCode || "TEAM"}
                  </Badge>
                </td>
                <td className="py-3 px-4 max-w-xs">
                  <p className="truncate font-medium text-[#0F172A]" title={item.teamTitle}>
                    {item.teamTitle}
                  </p>
                  <p className="truncate text-[11px] text-[#64748B]" title={item.description}>
                    {item.description}
                  </p>
                </td>
                <td className="py-3 px-4 text-[#64748B] whitespace-nowrap">
                  {new Date(item.submittedAtUtc).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  {isLog ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onInspectLog(item)}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      Verify Log
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onInspectProposal(item)}
                      rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      Review Proposal
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
