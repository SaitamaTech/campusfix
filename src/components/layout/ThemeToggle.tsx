"use client";

import { useLayoutEffect } from "react";
import { SunMoon } from "lucide-react";
import styles from "./theme-toggle.module.css";

const THEME_STORAGE_KEY = "campusfix-theme";

export function ThemeToggle() {
  useLayoutEffect(() => {
    let savedTheme: string | null = null;

    try {
      savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch (error) {
      console.error("Could not restore the CampusFix theme preference:", error);
    }

    const theme =
      savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, []);

  function toggleTheme() {
    const currentTheme =
      document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (error) {
      console.error("Could not save the CampusFix theme preference:", error);
    }
  }

  return (
    <button
      type="button"
      className={styles.themeToggle}
      onClick={toggleTheme}
      aria-label="Toggle light and dark mode"
      title="Toggle light and dark mode"
    >
      <SunMoon size={18} aria-hidden="true" />
    </button>
  );
}
