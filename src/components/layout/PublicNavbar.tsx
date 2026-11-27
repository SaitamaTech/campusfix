"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/Button";
import styles from "./layout.module.css";

interface PublicNavbarProps {
  isAuthenticated?: boolean;
  dashboardHref?: string;
}

export function PublicNavbar({
  isAuthenticated = false,
  dashboardHref = "/dashboard",
}: PublicNavbarProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className={styles.publicHeader}>
      <div className={`container ${styles.publicHeaderInner}`}>
        <BrandLogo />

        <nav className={styles.publicNavLinks} aria-label="Main navigation">
          <Link href="/about" className={styles.publicNavLink}>
            About CampusFix
          </Link>
          <Link href="/how-it-works" className={styles.publicNavLink}>
            How It Works
          </Link>
          <Link href="/#features" className={styles.publicNavLink}>
            Features
          </Link>
          <Link href="/#stats" className={styles.publicNavLink}>
            Campus Stats
          </Link>
        </nav>

        <div className={styles.publicNavActions}>
          {isAuthenticated ? (
            <Button href={dashboardHref} variant="primary" size="sm">
              Open Dashboard
            </Button>
          ) : (
            <>
              <Button href="/login" variant="ghost" size="sm">
                Sign In
              </Button>
              <Button href="/register" variant="primary" size="sm">
                Get Started
              </Button>
            </>
          )}
        </div>

        <ThemeToggle />

        <button
          type="button"
          className={styles.mobileMenuBtn}
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className={styles.mobileDrawer}>
          <Link href="/about" className={styles.publicNavLink} onClick={() => setOpen(false)}>
            About CampusFix
          </Link>
          <Link
            href="/how-it-works"
            className={styles.publicNavLink}
            onClick={() => setOpen(false)}
          >
            How It Works
          </Link>
          <Link href="/#features" className={styles.publicNavLink} onClick={() => setOpen(false)}>
            Features
          </Link>
          <div style={{ display: "flex", gap: "10px", paddingTop: "8px" }}>
            {isAuthenticated ? (
              <Button href={dashboardHref} variant="primary" fullWidth>
                Open Dashboard
              </Button>
            ) : (
              <>
                <Button href="/login" variant="secondary" fullWidth>
                  Sign In
                </Button>
                <Button href="/register" variant="primary" fullWidth>
                  Register
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
