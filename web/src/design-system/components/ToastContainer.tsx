"use client";

import React, { useEffect, useState } from "react";
import { ToastBanner } from "./ToastBanner";
import { ToastVariant } from "@/lib/toast";

export const ToastContainer: React.FC = () => {
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    variant: ToastVariant;
    duration?: number;
  } | null>(null);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<{
        message: string;
        variant?: ToastVariant;
        duration?: number;
      }>;
      if (customEvent.detail?.message) {
        setToast({
          id: Date.now(),
          message: customEvent.detail.message,
          variant: customEvent.detail.variant || "info",
          duration: customEvent.detail.duration || 4000,
        });
      }
    };

    window.addEventListener("projecthub:toast", handleToast);
    return () => window.removeEventListener("projecthub:toast", handleToast);
  }, []);

  if (!toast) return null;

  return (
    <ToastBanner
      key={toast.id}
      message={toast.message}
      variant={toast.variant}
      duration={toast.duration}
      onClose={() => setToast(null)}
    />
  );
};
