import React from "react";
import Link from "next/link";
import styles from "./ui.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "highlight";
type ButtonSize = "sm" | "md" | "lg";

interface SharedProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}

type ButtonAsButton = SharedProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ButtonAsLink = SharedProps & {
  href: string;
  target?: string;
  rel?: string;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink;

function getClassName({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
}: SharedProps) {
  const variantClass = {
    primary: styles.btnPrimary,
    secondary: styles.btnSecondary,
    ghost: styles.btnGhost,
    highlight: styles.btnHighlight,
  }[variant];

  const sizeClass = {
    sm: styles.btnSm,
    md: styles.btnMd,
    lg: styles.btnLg,
  }[size];

  return [
    styles.btn,
    variantClass,
    sizeClass,
    fullWidth ? styles.btnFull : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button(props: ButtonProps) {
  const classes = getClassName(props);

  if ("href" in props && props.href !== undefined) {
    const { href, target, rel, children } = props;
    return (
      <Link href={href} target={target} rel={rel} className={classes}>
        {children}
      </Link>
    );
  }

  const {
    variant: _v,
    size: _s,
    fullWidth: _f,
    className: _c,
    children,
    ...rest
  } = props;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
