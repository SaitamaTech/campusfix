import React from "react";
import styles from "./ui.module.css";

interface BaseFieldProps {
  label: string;
  htmlFor: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  optional = false,
  hint,
  error,
  children,
}: BaseFieldProps) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldLabelRow}>
        <label htmlFor={htmlFor} className={styles.fieldLabel}>
          {label}
        </label>
        {optional && <span className={styles.fieldOptional}>Optional</span>}
      </div>
      {children}
      {error ? (
        <span className={styles.fieldError} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className={styles.fieldHint}>{hint}</span>
      ) : null}
    </div>
  );
}

export function Input({
  hasError = false,
  className = "",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  return (
    <input
      className={[styles.input, hasError ? styles.inputError : "", className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}

export function Select({
  hasError = false,
  className = "",
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }) {
  return (
    <select
      className={[styles.select, hasError ? styles.inputError : "", className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Textarea({
  hasError = false,
  className = "",
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }) {
  return (
    <textarea
      className={[styles.textarea, hasError ? styles.inputError : "", className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}
