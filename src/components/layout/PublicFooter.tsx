import React from "react";
import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import styles from "./layout.module.css";

export function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerGrid}>
          <div>
            <BrandLogo />
            <p
              style={{
                marginTop: "12px",
                color: "var(--text-secondary)",
                fontSize: "14px",
                maxWidth: "340px",
              }}
            >
              A smarter campus starts with you. Built for transparent campus issue
              reporting, community verification, and accountable maintenance workflows
              for every community.
            </p>
          </div>

          <div>
            <div className={styles.footerColTitle}>Platform</div>
            <ul className={styles.footerList}>
              <li>
                <Link href="/about">About CampusFix</Link>
              </li>
              <li>
                <Link href="/how-it-works">How It Works</Link>
              </li>
              <li>
                <Link href="/#features">Core Capabilities</Link>
              </li>
              <li>
                <Link href="/#stats">Live Statistics</Link>
              </li>
            </ul>
          </div>

          <div>
            <div className={styles.footerColTitle}>Students</div>
            <ul className={styles.footerList}>
              <li>
                <Link href="/register">Create Account</Link>
              </li>
              <li>
                <Link href="/login">Student Sign In</Link>
              </li>
              <li>
                <Link href="/report">Report a Problem</Link>
              </li>
              <li>
                <Link href="/map">Explore Campus Map</Link>
              </li>
            </ul>
          </div>

          <div>
            <div className={styles.footerColTitle}>Governance</div>
            <ul className={styles.footerList}>
              <li>
                <Link href="/admin">Campus Admin Portal</Link>
              </li>
              <li>
                <Link href="/super-admin">Platform Console</Link>
              </li>
              <li>
                <Link href="/profile">Account &amp; Security</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <span>
            &copy; {new Date().getFullYear()} CampusFix. Civic &amp; Campus Infrastructure
            Platform.
          </span>
          <span>
            Prototype platform — not an official university endorsement unless formally
            adopted.
          </span>
        </div>
      </div>
    </footer>
  );
}
