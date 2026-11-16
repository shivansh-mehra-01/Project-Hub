import React from "react";

export interface CollabexLogoProps {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
  className?: string;
}

export interface CollabexIconProps {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  color?: string;
  className?: string;
}

/**
 * High-precision organic 4-node metaball vector paths:
 * - METABALL_LOGO_PATH: Scaled and positioned in the viewBox="0 0 240 60" layout.
 * - METABALL_ICON_PATH: Centered in viewBox="0 0 60 60" for standalone badges & favicons.
 */
const METABALL_LOGO_PATH =
  "M 17.14 49.23 C 15.21 49.44, 13.18 48.69, 11.82 47.30 C 10.45 45.91, 9.81 43.81, 10.08 41.89 C 10.34 39.97, 11.81 38.53, 13.02 36.99 C 14.23 35.45, 14.73 33.23, 14.05 31.45 C 13.36 29.67, 11.80 28.31, 10.89 26.56 C 9.97 24.82, 9.69 22.86, 10.50 21.06 C 11.32 19.27, 13.01 17.81, 14.91 17.38 C 16.80 16.96, 18.89 17.42, 20.42 18.63 C 21.95 19.85, 22.34 21.89, 23.11 23.70 C 23.88 25.51, 25.45 26.85, 27.34 27.34 C 29.23 27.83, 31.40 27.61, 33.12 26.71 C 34.85 25.80, 36.04 24.12, 36.45 22.22 C 36.86 20.32, 36.01 18.34, 36.04 16.43 C 36.08 14.51, 37.39 12.66, 39.07 11.66 C 40.75 10.66, 42.85 10.43, 44.68 11.13 C 46.51 11.83, 48.03 13.36, 48.55 15.24 C 49.06 17.11, 48.69 19.27, 47.54 20.83 C 46.39 22.40, 44.35 22.97, 42.56 23.67 C 40.76 24.37, 39.27 25.95, 38.71 27.88 C 38.15 29.81, 39.28 31.59, 41.31 32.02 C 43.35 32.45, 45.16 31.36, 46.68 30.15 C 48.21 28.94, 50.07 28.11, 52.02 28.34 C 53.96 28.58, 55.75 29.74, 56.69 31.46 C 57.62 33.18, 57.76 35.34, 56.97 37.13 C 56.18 38.92, 54.57 40.34, 52.67 40.77 C 50.78 41.21, 48.65 40.77, 47.16 39.54 C 45.66 38.30, 44.31 36.66, 42.40 36.33 C 40.48 36.00, 38.59 36.96, 37.04 38.16 C 35.50 39.35, 33.49 39.98, 31.58 39.65 C 29.67 39.33, 27.94 37.97, 27.16 36.19 C 26.37 34.41, 26.02 32.48, 24.56 31.06 C 23.11 29.64, 20.69 28.97, 19.44 30.19 C 18.20 31.41, 18.36 34.11, 19.19 35.81 C 20.02 37.52, 21.81 38.74, 22.47 40.57 C 23.13 42.41, 22.96 44.56, 21.94 46.20 C 20.91 47.85, 19.07 49.02, 17.14 49.23 Z";

const METABALL_ICON_PATH =
  "M 13.41 49.23 C 11.47 49.44, 9.45 48.69, 8.08 47.30 C 6.72 45.91, 6.08 43.81, 6.34 41.89 C 6.61 39.97, 8.08 38.53, 9.28 36.99 C 10.49 35.45, 11.00 33.23, 10.31 31.45 C 9.63 29.67, 8.07 28.31, 7.15 26.56 C 6.23 24.82, 5.95 22.86, 6.77 21.06 C 7.59 19.27, 9.28 17.81, 11.17 17.38 C 13.07 16.96, 15.16 17.42, 16.68 18.63 C 18.21 19.85, 18.61 21.89, 19.38 23.70 C 20.14 25.51, 21.71 26.85, 23.60 27.34 C 25.50 27.83, 27.67 27.61, 29.39 26.71 C 31.11 25.80, 32.30 24.12, 32.71 22.22 C 33.12 20.32, 32.27 18.34, 32.31 16.43 C 32.34 14.51, 33.65 12.66, 35.33 11.66 C 37.01 10.66, 39.11 10.43, 40.94 11.13 C 42.77 11.83, 44.29 13.36, 44.81 15.24 C 45.33 17.11, 44.96 19.27, 43.81 20.83 C 42.66 22.40, 40.62 22.97, 38.82 23.67 C 37.03 24.37, 35.54 25.95, 34.98 27.88 C 34.42 29.81, 35.54 31.59, 37.58 32.02 C 39.62 32.45, 41.42 31.36, 42.95 30.15 C 44.48 28.94, 46.33 28.11, 48.28 28.34 C 50.23 28.58, 52.01 29.74, 52.95 31.46 C 53.89 33.18, 54.03 35.34, 53.24 37.13 C 52.45 38.92, 50.83 40.34, 48.94 40.77 C 47.04 41.21, 44.92 40.77, 43.42 39.54 C 41.92 38.30, 40.58 36.66, 38.66 36.33 C 36.74 36.00, 34.86 36.96, 33.31 38.16 C 31.76 39.35, 29.76 39.98, 27.85 39.65 C 25.94 39.33, 24.20 37.97, 23.42 36.19 C 22.64 34.41, 22.28 32.48, 20.83 31.06 C 19.37 29.64, 16.96 28.97, 15.71 30.19 C 14.46 31.41, 14.63 34.11, 15.46 35.81 C 16.28 37.52, 18.07 38.74, 18.73 40.57 C 19.39 42.41, 19.22 44.56, 18.20 46.20 C 17.18 47.85, 15.34 49.02, 13.41 49.23 Z";

/**
 * Standalone organic 4-node metaball glyph icon.
 */
export const CollabexIcon: React.FC<CollabexIconProps> = ({
  variant = "light",
  size = "md",
  color,
  className = "",
}) => {
  const sizeMap = {
    sm: "h-6 w-6",
    md: "h-9 w-9",
    lg: "h-12 w-12",
  };

  const glyphColor =
    color || (variant === "dark" ? "#10B981" : "#047857");

  return (
    <svg
      viewBox="0 0 60 60"
      fill={glyphColor}
      aria-hidden="true"
      className={`shrink-0 ${sizeMap[size]} ${className}`}
    >
      <path d={METABALL_ICON_PATH} />
    </svg>
  );
};

/**
 * Custom Collabex Brand Logo Component:
 * Features the signature 4-node flowing organic metaball vector glyph
 * directly beside the bold lowercase "collabex" wordmark.
 * Fully responsive via internal viewBox="0 0 240 60".
 */
export const CollabexLogo: React.FC<CollabexLogoProps> = ({
  variant = "light",
  size = "md",
  iconOnly = false,
  className = "",
}) => {
  // If icon-only is requested, render the centered glyph
  if (iconOnly) {
    return <CollabexIcon variant={variant} size={size} className={className} />;
  }

  // Exact scale handles:
  // sm = height 24px
  // md = height 36px
  // lg = height 48px
  const sizeStyles = {
    sm: { height: 24 },
    md: { height: 36 },
    lg: { height: 48 },
  };

  const glyphColor = variant === "dark" ? "#10B981" : "#047857";
  const textColor = variant === "dark" ? "#FFFFFF" : "#111827";

  return (
    <svg
      viewBox="0 0 240 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={sizeStyles[size]}
      className={`w-auto shrink-0 select-none ${className}`}
      aria-label="Collabex"
      role="img"
    >
      {/* 4-Node Organic Flowing Metaball Glyph */}
      <path d={METABALL_LOGO_PATH} fill={glyphColor} />

      {/* Geometric Lowercase "collabex" Wordmark */}
      <text
        x="68"
        y="41"
        fontFamily="var(--font-heading), Plus Jakarta Sans, Inter, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="34"
        letterSpacing="-0.04em"
        fill={textColor}
      >
        collabex
      </text>
    </svg>
  );
};

export default CollabexLogo;
