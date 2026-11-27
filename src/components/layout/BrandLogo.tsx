import React from "react";
import Link from "next/link";

interface BrandLogoProps {
  href?: string;
  compact?: boolean;
}

export function BrandLogo({ href = "/", compact = false }: BrandLogoProps) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        fontWeight: 800,
        letterSpacing: "-0.02em",
        fontSize: "18px",
        color: "var(--text-primary)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "10px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #e11d48 0%, #f97316 100%)",
          boxShadow: "0 4px 18px rgba(225, 29, 72, 0.35)",
          flexShrink: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L4 6.5V12.5C4 17.5 7.4 21.8 12 23C16.6 21.8 20 17.5 20 12.5V6.5L12 2Z"
            stroke="white"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M9.5 12.5L11.5 14.5L15 10"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {!compact && (
        <span>
          CAMPUS<span style={{ color: "var(--accent-primary-hover)" }}>FIX</span>
        </span>
      )}
    </Link>
  );
}
