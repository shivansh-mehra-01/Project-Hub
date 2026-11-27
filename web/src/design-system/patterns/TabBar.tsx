"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface TabBarItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface TabBarProps<T extends string = string> {
  tabs: TabBarItem<T>[];
  activeTab: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
  className?: string;
}

export function TabBar<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  ariaLabel = "Section tabs",
  className,
}: TabBarProps<T>) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    const enabledIndices = tabs
      .map((t, idx) => (t.disabled ? -1 : idx))
      .filter((idx) => idx !== -1);
    if (enabledIndices.length === 0) return;

    const pos = enabledIndices.indexOf(currentIndex);
    let nextIndex: number | undefined;

    if (e.key === "ArrowRight") {
      nextIndex = enabledIndices[(pos + 1) % enabledIndices.length];
    } else if (e.key === "ArrowLeft") {
      nextIndex = enabledIndices[(pos - 1 + enabledIndices.length) % enabledIndices.length];
    } else if (e.key === "Home") {
      nextIndex = enabledIndices[0];
    } else if (e.key === "End") {
      nextIndex = enabledIndices[enabledIndices.length - 1];
    }

    if (nextIndex !== undefined) {
      e.preventDefault();
      onChange(tabs[nextIndex].id);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex items-center gap-1 border-b border-[#E2E8F0] overflow-x-auto no-scrollbar",
        className
      )}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            tabIndex={isActive ? 0 : -1}
            onClick={() => !tab.disabled && onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 rounded-t-md disabled:opacity-40 disabled:cursor-not-allowed",
              isActive
                ? "border-emerald-600 text-emerald-700 font-semibold"
                : "border-transparent text-[#475569] hover:text-[#0F172A] hover:border-[#CBD5E1]"
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full",
                  isActive
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-600"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
