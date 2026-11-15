"use client";

import React, { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Search, ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  searchColumnKey?: string;
  statusFilterKey?: string;
  statusOptions?: { label: string; value: string }[];
  onRowClick?: (row: TData) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Search records...",
  searchColumnKey,
  statusFilterKey,
  statusOptions,
  onRowClick,
  emptyTitle = "No records found",
  emptyDescription = "There are currently no items matching your criteria.",
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Filter data by status if statusFilterKey is provided
  const filteredData = React.useMemo(() => {
    if (!statusFilterKey || selectedStatus === "ALL") return data;
    return data.filter((row: any) => {
      const val = row[statusFilterKey];
      return String(val).toLowerCase() === selectedStatus.toLowerCase();
    });
  }, [data, statusFilterKey, selectedStatus]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className={cn("space-y-3 w-full", className)}>
      {/* Search Bar & Filter Pills Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 h-4 w-4 text-[#94A3B8] pointer-events-none top-2.5" />
          <input
            type="text"
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
          />
        </div>

        {/* Status Filter Pills */}
        {statusOptions && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedStatus("ALL")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-full border transition-colors cursor-pointer shrink-0",
                selectedStatus === "ALL"
                  ? "bg-[#0F172A] text-white border-[#0F172A]"
                  : "bg-white text-[#475569] border-[#E2E8F0] hover:bg-[#F8FAFC]"
              )}
            >
              All ({data.length})
            </button>
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedStatus(opt.value)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-full border transition-colors cursor-pointer shrink-0",
                  selectedStatus === opt.value
                    ? "bg-[#4F46E5] text-white border-[#4F46E5]"
                    : "bg-white text-[#475569] border-[#E2E8F0] hover:bg-[#F8FAFC]"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-medium">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const isSorted = header.column.getIsSorted();

                    return (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          "py-3 px-4 font-semibold text-[#475569] select-none",
                          canSort && "cursor-pointer hover:text-[#0F172A]"
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {canSort && (
                            <span className="text-[#94A3B8]">
                              {isSorted === "asc" ? (
                                <ChevronUp className="h-3.5 w-3.5 text-[#4F46E5]" />
                              ) : isSorted === "desc" ? (
                                <ChevronDown className="h-3.5 w-3.5 text-[#4F46E5]" />
                              ) : (
                                <ChevronsUpDown className="h-3.5 w-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <tbody className="divide-y divide-[#E2E8F0] text-[#0F172A]">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick && onRowClick(row.original)}
                    className={cn(
                      "hover:bg-[#F8FAFC] transition-colors",
                      onRowClick && "cursor-pointer"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="py-3 px-4 tabular-nums">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="py-8 text-center">
                    <EmptyState
                      title={emptyTitle}
                      description={emptyDescription}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {table.getPageCount() > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#475569]">
            <div className="tabular-nums">
              Showing{" "}
              <span className="font-semibold text-[#0F172A]">
                {table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                  1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-[#0F172A]">
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) *
                    table.getState().pagination.pageSize,
                  filteredData.length
                )}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[#0F172A]">
                {filteredData.length}
              </span>{" "}
              entries
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-1 rounded-md border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 font-mono tabular-nums">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </span>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-1 rounded-md border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
