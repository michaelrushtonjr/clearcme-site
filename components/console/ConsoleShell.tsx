"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOutAndClear } from "@/lib/client-sign-out";
import { BrandLockup } from "@/components/BrandLockup";

interface ShellUser {
  name?: string | null;
  email?: string | null;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/compliance", label: "Compliance" },
  { href: "/dashboard/certificates", label: "Certificates" },
  { href: "/dashboard/profile", label: "Licenses" },
  { href: "/dashboard/upload", label: "Upload" },
  { href: "/dashboard/settings", label: "Settings" },
];

// Mobile 3-tab bar per the 1b prototype's 390px layouts.
const TAB_ITEMS = [
  { href: "/dashboard", label: "Status" },
  { href: "/dashboard/compliance", label: "Detail" },
  { href: "/dashboard/upload", label: "Add" },
];

function initials(user: ShellUser) {
  const source = user.name ?? user.email ?? "?";
  const parts = source.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export default function ConsoleShell({
  user,
  demoMode = false,
  children,
}: {
  user: ShellUser;
  demoMode?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <div className="c1b c1b-shell">
      <header className="c1b-topbar">
        <BrandLockup href="/dashboard" size="sm" dark />
        <nav className="nav" aria-label="Console navigation">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={isActive(item.href) ? "active" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="right">
          {demoMode && <span className="demo-pill">Demo data</span>}
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              className="avatar"
              aria-label="Account menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {initials(user)}
            </button>
            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  minWidth: 200,
                  background: "var(--c1b-card)",
                  border: "1px solid var(--c1b-border-card)",
                  borderRadius: 10,
                  boxShadow: "0 24px 60px -30px rgba(22,32,26,.45)",
                  padding: 6,
                  zIndex: 50,
                }}
              >
                <p
                  style={{
                    padding: "8px 12px 6px",
                    fontSize: 12,
                    color: "var(--c1b-muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.name ?? user.email}
                </p>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: "block",
                    padding: "8px 12px",
                    borderRadius: 7,
                    fontSize: 13.5,
                    color: "var(--c1b-ink)",
                    textDecoration: "none",
                  }}
                >
                  Settings
                </Link>
                <button
                  onClick={() => signOutAndClear({ callbackUrl: "/" })}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    border: "none",
                    background: "none",
                    borderRadius: 7,
                    fontSize: 13.5,
                    fontFamily: "inherit",
                    color: "var(--c1b-ink)",
                    cursor: "pointer",
                  }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="c1b-main">{children}</main>

      <nav className="c1b-tabbar" aria-label="Console navigation">
        {TAB_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className={isActive(item.href) ? "active" : undefined}>
            <span className="bar" aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
