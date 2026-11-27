import React from "react";
import styles from "./ui.module.css";

type BadgeTone =
  | "neutral"
  | "red"
  | "orange"
  | "success"
  | "warning"
  | "info"
  | "violet";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
  children: React.ReactNode;
}

export function Badge({
  tone = "neutral",
  dot = false,
  children,
  className = "",
  ...rest
}: BadgeProps) {
  const toneClass = {
    neutral: styles.badgeNeutral,
    red: styles.badgeRed,
    orange: styles.badgeOrange,
    success: styles.badgeSuccess,
    warning: styles.badgeWarning,
    info: styles.badgeInfo,
    violet: styles.badgeViolet,
  }[tone];

  return (
    <span className={[styles.badge, toneClass, className].filter(Boolean).join(" ")} {...rest}>
      {dot && <span className={styles.badgeDot} aria-hidden="true" />}
      {children}
    </span>
  );
}
