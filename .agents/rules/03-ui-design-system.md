# UI Design System & Component Guidelines

## 1. Aesthetic Philosophy: Structured B2B Minimalism
- **Inspirations:** Linear, Notion, and Stripe.
- **Default Mode:** Clean Light Mode default. High contrast, high readability, density-balanced academic enterprise UI.
- **Strict Prohibitions:**
  - Strictly **NO** glassmorphism, heavy gradients, or fuzzy blur filters.
  - Strictly **NO** heavy or multi-layered drop shadows (use subtle `box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)` or crisp borders).
  - Strictly **NO** cluttered, low-contrast color palettes.

---

## 2. Design Tokens & Palette

| Token Name | Hex Code | Tailwind / HSL | Usage Description |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `#F8FAFC` | `slate-50` (`210 40% 98%`) | Base page background across all authenticated views |
| **Card Surface** | `#FFFFFF` | `white` (`0 0% 100%`) | Cards, tables, modals, slide-over panels |
| **Border / Divider** | `#E2E8F0` | `slate-200` (`214 32% 91%`) | 1px solid clean structure lines, table borders |
| **Primary Accent** | `#4F46E5` | `indigo-600` (`243 75% 59%`) | Primary action buttons, active navigation indicators, key highlights |
| **Primary Text** | `#0F172A` | `slate-900` (`222 47% 11%`) | Headings, primary metrics, active data |
| **Secondary Text** | `#475569` | `slate-600` (`215 16% 47%`) | Subheadings, labels, table meta text |
| **Muted Surface** | `#F1F5F9` | `slate-100` (`210 40% 96%`) | Table headers, chip backgrounds, disabled states |
| **Success State** | `#059669` | `emerald-600` | Approved milestones, completed stages, NBA achieved |
| **Warning State** | `#D97706` | `amber-600` | Pending guide reviews, revision requests |
| **Destructive State**| `#DC2626` | `red-600` | Rejection, grade locks, removal actions |

---

## 3. Typography & Numerical Formatting
- **Body & Interface Font:** `Inter`, sans-serif. Clean, legibly spaced, modern neutral.
- **Monospace & Numerical Font:** `JetBrains Mono`, monospace.
  - Mandatory on: Student Enrollment Numbers (USN/PRN/Roll No), Team Codes (e.g. `2026-CS-MAJ-042`), Rubric Marks, Weightages, and Hashes.
  - Always enforce `tabular-nums` CSS on data tables and score displays to eliminate horizontal jitter when values update.

---

## 4. Navigation Shell & Ergonomics
- **Desktop Layout:**
  - Fixed **240px** left sidebar with tenant branding, role badge, and role-specific navigation menu.
  - Fixed **64px** top header housing global search, academic cycle switcher, notifications, and user avatar menu.
  - Max-width **1200px** centralized content container with standard `p-6` or `p-8` spacing.
- **Mobile Responsive Layout:**
  - Fixed **56px** top bar with college logo and cycle badge.
  - Fixed **64px** bottom navigation bar showing at most 4 primary tabs per role (e.g. Student: `Workspace`, `Explore`, `Portfolio`, `Profile`).
- **Contextual Inspection (Slide-Over Drawer):**
  - **480px** width right-side slide-over drawer for reviewing project synopses, weekly logs, and rubric evaluation scorecards.
  - Never force full page navigation away from a list/table to view item details; retain scroll position on the parent grid.

