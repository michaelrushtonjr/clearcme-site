"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLockup } from "@/components/BrandLockup";

// Demo-mode shell: same 1b chrome as ConsoleShell, no session. The screens
// that exist in demo link within /demo; everything else funnels to signup.
const NAV_ITEMS = [
  { href: "/demo", label: "Dashboard", exact: true },
  { href: "/demo/compliance", label: "Compliance", exact: false },
  { href: "/login", label: "Certificates", exact: false },
  { href: "/login", label: "Licenses", exact: false },
  { href: "/login", label: "Upload", exact: false },
  { href: "/login", label: "Settings", exact: false },
];

export default function DemoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="c1b c1b-shell">
      <header className="c1b-topbar">
        <BrandLockup href="/" size="sm" dark />
        <nav className="nav" aria-label="Demo navigation">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={
                (item.exact ? pathname === item.href : item.href !== "/login" && pathname.startsWith(item.href))
                  ? "active"
                  : undefined
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="right">
          <span className="demo-pill">Demo data</span>
          <Link
            href="/login"
            className="btn-outline"
            style={{
              padding: "7px 14px",
              background: "transparent",
              borderColor: "rgba(255,255,255,.35)",
              color: "#F6F5F0",
            }}
          >
            Start free →
          </Link>
        </div>
      </header>

      <main className="c1b-main">{children}</main>

      <nav className="c1b-tabbar" aria-label="Demo navigation">
        <Link href="/demo" className={pathname === "/demo" ? "active" : undefined}>
          <span className="bar" aria-hidden="true" />
          Status
        </Link>
        <Link href="/demo/compliance" className={pathname.startsWith("/demo/compliance") ? "active" : undefined}>
          <span className="bar" aria-hidden="true" />
          Detail
        </Link>
        <Link href="/login">
          <span className="bar" aria-hidden="true" />
          Add
        </Link>
      </nav>
    </div>
  );
}
