"use client";

import React, { useId } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../components/Button";
import { cn } from "@/lib/utils";

export interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  className,
}) => {
  const selectId = useId();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]/60 text-xs text-[#475569]",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span>
          Showing <span className="font-semibold text-[#0F172A]">{startItem}</span> to{" "}
          <span className="font-semibold text-[#0F172A]">{endItem}</span> of{" "}
          <span className="font-semibold text-[#0F172A]">{totalItems}</span> results
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-[#CBD5E1]">
            <label htmlFor={selectId} className="text-[11px] text-[#64748B]">
              Rows:
            </label>
            <select
              id={selectId}
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="h-7 rounded border border-[#CBD5E1] bg-white px-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-brand-primary cursor-pointer"
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
        <span className="text-[#64748B] mr-2 text-[11px]">
          Page <span className="font-semibold text-[#0F172A]">{currentPage}</span> of{" "}
          <span className="font-semibold text-[#0F172A]">{totalPages}</span>
        </span>
        <Button
          size="sm"
          variant="secondary"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-7 w-7 p-0 flex items-center justify-center"
          aria-label="Previous Page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-7 w-7 p-0 flex items-center justify-center"
          aria-label="Next Page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
