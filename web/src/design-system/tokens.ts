/**
 * Project Hub Permanent Design Tokens
 * Strictly conforms to .agents/rules/03-ui-design-system.md
 */

export const colors = {
  canvas: "#F8FAFC", // Slate 50
  surface: "#FFFFFF",
  hover: "#F1F5F9", // Slate 100
  border: "#E2E8F0", // Slate 200
  divider: "#CBD5E1", // Slate 300

  // Text
  primaryText: "#0F172A", // Slate 900
  secondaryText: "#475569", // Slate 600
  mutedText: "#94A3B8", // Slate 400

  // Brand Accent
  primary: "#4F46E5", // Deep Indigo
  primaryHover: "#4338CA",
  primaryLight: "#EEF2FF", // Indigo 50

  // Semantic Status
  status: {
    approved: {
      bg: "#DCFCE7",
      text: "#166534",
      border: "#BBF7D0",
    },
    pending: {
      bg: "#FEF3C7",
      text: "#92400E",
      border: "#FDE68A",
    },
    active: {
      bg: "#DBEAFE",
      text: "#1E40AF",
      border: "#BFDBFE",
    },
    danger: {
      bg: "#FEE2E2",
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
