"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { BrandLockup } from "@/components/BrandLockup";

interface NavUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export default function DashboardNav({ user }: { user: NavUser }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/upload", label: "Upload" },
    { href: "/dashboard/compliance", label: "Compliance" },
  ];

  return (
    <header className="bg-[rgba(244,239,227,0.94)] border-b border-[var(--line)] backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <BrandLockup href="/dashboard" size="md" />

          {/* Nav links */}
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-[var(--radius)] text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-[var(--paper)] text-[var(--primary)] border border-[var(--line)]"
                    : "text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--bg-2)]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User menu */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-[var(--ink-3)] truncate max-w-[180px]">
              {user.name ?? user.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-sm text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors px-3 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-2)]"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="sm:hidden flex gap-1 pb-3 overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-shrink-0 px-4 py-2 rounded-[var(--radius)] text-sm font-medium transition-colors ${
                pathname === item.href
                  ? "bg-[var(--paper)] text-[var(--primary)] border border-[var(--line)]"
                  : "text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--bg-2)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
