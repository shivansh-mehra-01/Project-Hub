"use client";

import React from "react";
import { AlertTriangle, RefreshCw, ServerOff } from "lucide-react";

interface ApiConnectionBannerProps {
  onRetry: () => void;
  message?: string;
  error?: string | null;
  isRetrying?: boolean;
}

export const ApiConnectionBanner: React.FC<ApiConnectionBannerProps> = ({
  onRetry,
  message = "Unable to connect to Colabex backend service. Institutional metrics and records cannot be loaded.",
  error,
  isRetrying = false,
}) => {
  if (error !== undefined && !error) return null;
  const displayMessage = error || message;
  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 mb-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
            <ServerOff className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-rose-300">Backend Connection Error</h4>
            <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">
              {displayMessage}
            </p>
            <p className="text-[11px] text-slate-400 mt-2">
              Ensure the ASP.NET Core API server is active on the host machine. Mock fallback data is disabled to guarantee statutory accuracy.
            </p>
          </div>
        </div>
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-medium transition-colors border border-rose-500/30 cursor-pointer shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
          {isRetrying ? "Retrying..." : "Retry Connection"}
        </button>
      </div>
    </div>
  );
};
