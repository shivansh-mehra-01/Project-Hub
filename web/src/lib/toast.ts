export type ToastVariant = "success" | "warning" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

export function showToast(message: string, variant: ToastVariant = "info", duration = 4000) {
  if (typeof window === "undefined") return;
  const event = new CustomEvent("projecthub:toast", {
    detail: { message, variant, duration },
  });
  window.dispatchEvent(event);
}
