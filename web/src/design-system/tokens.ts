/**
 * Project Hub Permanent Design Tokens
 * Strictly conforms to .agents/rules/03-ui-design-system.md
 */

export const colors = {
  canvas: "var(--canvas-bg, #F8FAFC)", // Porcelain Off-White (Slate 50)
  surface: "var(--card-bg, #FFFFFF)",
  hover: "#F1F5F9", // Slate 100
  border: "var(--card-border, #E2E8F0)", // Slate 200
  divider: "#CBD5E1", // Slate 300
  charcoal: "var(--shell-bg, #111827)", // Dark Anchor (Navbar / Sidebar)

  // Text
  primaryText: "#0F172A", // Slate 900
  secondaryText: "#475569", // Slate 600
  mutedText: "#94A3B8", // Slate 400

  // Brand Accent: Single-source CSS variable driven
  primary: "var(--brand-primary, #047857)",
  primaryHover: "var(--brand-primary-hover, #065F46)",
  primaryLight: "var(--brand-primary-tint, #ECFDF5)",
  primaryTextAccent: "var(--brand-primary-text, #065F46)",
  primaryBorder: "var(--brand-primary-border, #A7F3D0)",
  emeraldTint: "#D1FAE5",

  // Shell & Navigation Tokens
  shellBg: "var(--shell-bg, #111827)",
  shellSurface: "var(--shell-surface, #1F2937)",
  shellBorder: "var(--shell-border, #374151)",
  shellText: "var(--shell-text, #F9FAFB)",
  shellMuted: "var(--shell-muted, #9CA3AF)",
  topbarBg: "var(--topbar-bg, #111827)",
  topbarText: "var(--topbar-text, #F9FAFB)",
  topbarBorder: "var(--topbar-border, #1F2937)",

  // Semantic Status
  status: {
    approved: {
      bg: "#ECFDF5",
      text: "#065F46",
      border: "#A7F3D0",
    },
    pending: {
      bg: "#FEF3C7",
      text: "#92400E",
      border: "#FDE68A",
    },
    active: {
      bg: "#EFF6FF",
      text: "#1E40AF",
      border: "#BFDBFE",
    },
    danger: {
      bg: "#FEF2F2",
      text: "#991B1B",
      border: "#FECACA",
    },
    neutral: {
      bg: "#F1F5F9",
      text: "#334155",
      border: "#E2E8F0",
    },
  },
} as const;

export const radii = {
  card: "rounded-xl", // 12px
  input: "rounded-lg", // 8px
  button: "rounded-lg", // 8px
  pill: "rounded-full",
} as const;

export const roleBadges: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  SuperAdmin: {
    label: "Super Admin",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  CollegeAdmin: {
    label: "College Admin",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  HOD: {
    label: "HOD",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
  },
  Faculty: {
    label: "Faculty",
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
  },
  Coordinator: {
    label: "Coordinator",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  Student: {
    label: "Student",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
  },
  TeamLead: {
    label: "Team Lead",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
};

