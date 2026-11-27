import React from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import styles from "./ui.module.css";

type AlertVariant = "info" | "success" | "warning" | "danger";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
};

export function Alert({
  variant = "info",
  title,
  children,
  className = "",
}: AlertProps) {
  const Icon = ICONS[variant];
  const variantClass = {
    info: styles.alertInfo,
    success: styles.alertSuccess,
    warning: styles.alertWarning,
    danger: styles.alertDanger,
  }[variant];

  return (
    <div
      className={[styles.alert, variantClass, className].filter(Boolean).join(" ")}
      role={variant === "danger" ? "alert" : "status"}
    >
      <Icon size={18} className={styles.alertIcon} aria-hidden="true" />
      <div>
        {title && <div className={styles.alertTitle}>{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
}
