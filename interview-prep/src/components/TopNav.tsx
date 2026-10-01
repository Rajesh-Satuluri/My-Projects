"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useData } from "./DataProvider";
import ThemeToggle from "./ThemeToggle";

const nav = [
  { href: "/", label: "Dashboard", icon: "▤" },
  { href: "/questions", label: "Questions", icon: "❯" },
  { href: "/categories", label: "Categories", icon: "▦" },
  { href: "/practice", label: "Practice", icon: "◐" },
  { href: "/notes", label: "Notes", icon: "✎" },
  { href: "/checklists", label: "Checklists", icon: "☑" },
];

export default function TopNav() {
  const pathname = usePathname();
  const { session, signOut } = useData();
  const [open, setOpen] = useState(false); // mobile menu

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const brand = (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-sm font-bold text-[var(--accent-fg)]">
        IP
      </span>
      <span className="text-[15px] font-semibold tracking-[-0.01em]">Interview Prep</span>
    </Link>
  );

  const links = (onClick?: () => void) =>
    nav.map((item) => {
      const active = isActive(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClick}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
            active
              ? "bg-[var(--panel-2)] font-medium text-fg"
              : "text-muted hover:bg-[var(--panel-2)] hover:text-fg"
          }`}
        >
          <span className="w-4 text-center text-[13px] opacity-70">{item.icon}</span>
          {item.label}
        </Link>
      );
    });

  return (
    <header className="sticky top-0 z-30 border-b bg-panel">
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-4 px-5 py-2.5 md:px-8">
        {brand}

        {/* Desktop links */}
        <nav className="hidden flex-1 items-center gap-0.5 md:flex">{links()}</nav>

        {/* Right cluster (desktop) */}
        <div className="ml-auto hidden items-center gap-2 md:flex [&>button]:w-auto [&>button]:px-2.5">
          <ThemeToggle />
          {session?.user?.email && (
            <span className="max-w-[180px] truncate text-xs text-muted" title={session.user.email}>
              {session.user.email}
            </span>
          )}
          {session && (
            <button onClick={() => signOut()} className="btn btn-ghost px-2.5 py-1.5 text-sm">
              Log out
            </button>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          aria-label="Toggle navigation"
          onClick={() => setOpen((v) => !v)}
          className="btn btn-outline ml-auto px-2.5 py-1.5 md:hidden"
        >
          ☰
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="border-t bg-panel px-3 py-3 md:hidden">
          <nav className="flex flex-col gap-0.5">{links(() => setOpen(false))}</nav>
          <div className="mt-2 border-t pt-2">
            <ThemeToggle />
            {session && (
              <button
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
                className="btn btn-ghost mt-1 w-full justify-start"
              >
                Log out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
