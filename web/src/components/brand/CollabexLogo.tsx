import React from "react";

export interface CollabexLogoProps {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}

export interface CollabexIconProps {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  color?: string;
  className?: string;
}

/**
 * Organic flowing 4-node metaball icon.
 * Features 4 symmetric circular nodes with curved tangential bridge fillets
 * and a central collaborative aperture.
 */
export const CollabexIcon: React.FC<CollabexIconProps> = ({
  variant = "light",
  size = "md",
  color,
  className = "",
}) => {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const fillColor =
    color || (variant === "dark" ? "#10B981" : "#047857");

  return (
    <svg
      viewBox="0 0 32 32"
      fill={fillColor}
      aria-hidden="true"
      className={`shrink-0 ${sizeClasses[size]} ${className}`}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 11.5 7.5 A 4.5 4.5 0 0 1 20.5 7.5 A 4 4 0 0 0 24.5 11.5 A 4.5 4.5 0 0 1 24.5 20.5 A 4 4 0 0 0 20.5 24.5 A 4.5 4.5 0 0 1 11.5 24.5 A 4 4 0 0 0 7.5 20.5 A 4.5 4.5 0 0 1 7.5 11.5 A 4 4 0 0 0 11.5 7.5 Z M 16 13 A 3 3 0 1 0 16 19 A 3 3 0 1 0 16 13 Z"
      />
    </svg>
  );
};

/**
 * Lockup A Brand Identity Component:
 * Unboxed flowing 4-node metaball icon + bold geometric lowercase wordmark "collabex".
 */
export const CollabexLogo: React.FC<CollabexLogoProps> = ({
  variant = "light",
  size = "md",
  iconOnly = false,
  className = "",
  iconClassName = "",
  textClassName = "",
}) => {
  const containerGap = {
    sm: "gap-2",
    md: "gap-2.5",
    lg: "gap-3",
  };

  const textClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
  };

  const textColor =
    variant === "dark" ? "text-white" : "text-[#111827]";

  return (
    <div
      className={`inline-flex items-center ${containerGap[size]} select-none ${className}`}
    >
      <CollabexIcon
        variant={variant}
        size={size}
        className={iconClassName}
      />
      {!iconOnly && (
        <span
          className={`font-heading font-bold lowercase tracking-[-0.04em] leading-none ${textClasses[size]} ${textColor} ${textClassName}`}
        >
          collabex
        </span>
      )}
    </div>
  );
};

export default CollabexLogo;
