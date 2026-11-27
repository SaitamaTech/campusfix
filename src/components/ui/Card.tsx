import React from "react";
import styles from "./ui.module.css";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  highlighted?: boolean;
  glass?: boolean;
}

export function Card({
  interactive = false,
  highlighted = false,
  glass = false,
  className = "",
  children,
  ...rest
}: CardProps) {
  const classes = [
    styles.card,
    interactive ? styles.cardInteractive : "",
    highlighted ? styles.cardHighlighted : "",
    glass ? styles.cardGlass : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
