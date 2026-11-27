"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Compass,
  MapPin,
  FileText,
  Bell,
  UserCheck,
  Shield,
  Building2,
  Users,
  Settings,
  Globe,
  Megaphone,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { ThemeToggle } from "./ThemeToggle";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { logoutAction } from "@/app/actions/auth";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import type { Profile, UserRole } from "@/types/database";
import styles from "./layout.module.css";

interface NavLinkItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

function getNavItemsForRole(role: UserRole): NavLinkItem[] {
  if (role === "super_admin") {
    return [
      { href: "/super-admin", label: "Platform Dashboard", icon: Globe },
      { href: "/super-admin/accounts", label: "Manage Accounts", icon: Users },
      { href: "/super-admin/announcements", label: "Post Announcements", icon: Megaphone },
      { href: "/admin", label: "Campus Operations", icon: Shield },
      { href: "/admin/departments", label: "Departments", icon: Building2 },
      { href: "/admin/locations", label: "Campus Locations", icon: MapPin },
      { href: "/admin/settings", label: "Campus Settings", icon: Settings },
      { href: "/dashboard", label: "Student View", icon: LayoutDashboard },
      { href: "/map", label: "Campus Map", icon: MapPin },
      { href: "/announcements", label: "Announcements", icon: Megaphone },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/profile", label: "Profile & Security", icon: Settings },
    ];
  }

  if (role === "campus_admin") {
    return [
      { href: "/admin", label: "Admin Dashboard", icon: Shield },
      { href: "/admin/reports", label: "Manage Reports", icon: FileText },
      { href: "/admin/departments", label: "Departments", icon: Building2 },
      { href: "/admin/locations", label: "Campus Locations", icon: MapPin },
      { href: "/admin/settings", label: "Campus Settings", icon: Settings },
      { href: "/map", label: "Campus Map", icon: MapPin },
      { href: "/announcements", label: "Announcements", icon: Megaphone },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/profile", label: "Profile & Settings", icon: Settings },
    ];
  }

  return [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/report", label: "Report a Problem", icon: PlusCircle },
    { href: "/explore", label: "Explore Reports", icon: Compass },
    { href: "/map", label: "Campus Map", icon: MapPin },
    { href: "/my-reports", label: "My Reports", icon: FileText },
    { href: "/announcements", label: "Announcements", icon: Megaphone },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/profile", label: "Profile & Settings", icon: UserCheck },
  ];
}

interface AppShellProps {
  profile: Profile;
  institutionName: string | null;
  pageTitle: string;
  children: React.ReactNode;
}

export function AppShell({
  profile,
  institutionName,
  pageTitle,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = getNavItemsForRole(profile.role);

  const renderSidebarBody = (onNavigate?: () => void) => (
    <>
      <div>
        <div className={styles.sidebarBrand}>
          <BrandLogo href={profile.role === "student" ? "/dashboard" : "/admin"} />
          <div className={styles.sidebarUnivPill}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {institutionName ?? "Your workspace"}
            </span>
            <Badge tone={profile.role === "student" ? "neutral" : "orange"}>
              {ROLE_LABELS[profile.role]}
            </Badge>
          </div>
        </div>

        <nav className={styles.navGroup} aria-label="Workspace navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                item.href !== "/admin" &&
                item.href !== "/super-admin" &&
                pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={[styles.navItem, isActive ? styles.navItemActive : ""]
                  .filter(Boolean)
                  .join(" ")}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={styles.sidebarFooter}>
        <div className={styles.userCard}>
          <span className={styles.userName}>{profile.full_name}</span>
          <span className={styles.userMeta}>{profile.email}</span>
        </div>

        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm" fullWidth>
            <LogOut size={15} />
            Sign Out
          </Button>
        </form>
      </div>
    </>
  );

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>{renderSidebarBody()}</aside>

      {mobileOpen && (
        <div
          className={styles.mobileSidebarOverlay}
          onClick={() => setMobileOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <div
            className={styles.mobileSidebarPanel}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
              <button
                type="button"
                className={styles.mobileSidebarTrigger}
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>
            {renderSidebarBody(() => setMobileOpen(false))}
          </div>
        </div>
      )}

      <div className={styles.shellMain}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              type="button"
              className={styles.mobileSidebarTrigger}
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
            <h1 className={styles.topbarTitle}>{pageTitle}</h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ThemeToggle />
            {profile.role === "student" && (
              <Button href="/report" variant="primary" size="sm">
                <PlusCircle size={15} />
                Report Problem
              </Button>
            )}
          </div>
        </header>

        <main className={styles.shellContent}>{children}</main>
      </div>
    </div>
  );
}
