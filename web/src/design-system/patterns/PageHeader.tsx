"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageBreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  breadcrumbs?: PageBreadcrumbItem[];
  backHref?: string;
  backLabel?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  breadcrumbs,
  backHref,
  backLabel = "Back",
  onBack,
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="space-y-1 min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-[#64748B] mb-1">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={`${crumb.label}-${idx}`}>
                {idx > 0 && <ChevronRight className="h-3 w-3 text-[#94A3B8]" />}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-[#0F172A] transition-colors focus-visible:outline-none focus-visible:underline"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-medium text-[#0F172A]">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#475569] hover:text-[#0F172A] transition-colors mb-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{backLabel}</span>
          </Link>
        ) : onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#475569] hover:text-[#0F172A] transition-colors mb-1 cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{backLabel}</span>
          </button>
        ) : null}

        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight font-heading">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-[#475569] leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
};
