import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/design-system/components/Button";

export interface HodTablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const HodTablePagination: React.FC<HodTablePaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  className,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) return null;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200/80 bg-slate-50/50 text-xs text-slate-600 ${className || ""}`}
    >
      <div className="flex items-center gap-2">
        <span>
          Showing <span className="font-semibold text-slate-900">{startItem}</span> to{" "}
          <span className="font-semibold text-slate-900">{endItem}</span> of{" "}
          <span className="font-semibold text-slate-900">{totalItems}</span> results
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-300">
            <span className="text-[11px] text-slate-500">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="h-7 rounded border border-slate-300 bg-white px-1.5 text-xs text-slate-800 focus:outline-none focus:border-brand-primary cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-slate-500 mr-2 text-[11px]">
          Page <span className="font-semibold text-slate-800">{currentPage}</span> of{" "}
          <span className="font-semibold text-slate-800">{totalPages}</span>
        </span>
        <Button
          size="sm"
          variant="secondary"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-7 w-7 p-0 flex items-center justify-center cursor-pointer disabled:opacity-40"
          aria-label="Previous Page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-7 w-7 p-0 flex items-center justify-center cursor-pointer disabled:opacity-40"
          aria-label="Next Page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
