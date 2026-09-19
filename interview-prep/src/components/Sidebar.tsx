"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

export default function Sidebar() {
  const pathname = usePathname();
  const { session, signOut } = useData();
  const [open, setOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // desktop rail

  // Remember the desktop collapsed state across visits.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("sidebarCollapsed") === "1");
    } catch {}
  }, []);
  const toggleCollapsed = () => {
    setCollapsed((v) => {
      try {
        localStorage.setItem("sidebarCollapsed", v ? "0" : "1");
      } catch {}
      return !v;
    });
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const NavLinks = ({ compact = false }: { compact?: boolean }) => (
    <nav className="flex flex-col gap-0.5">
      {nav.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            title={compact ? item.label : undefined}
            className={`group relative flex items-center gap-3 rounded-lg py-2 text-sm transition-colors ${
              compact ? "justify-center px-0" : "px-3"
            } ${
              active
                ? "bg-[var(--panel-2)] font-medium text-fg"
                : "text-muted hover:bg-[var(--panel-2)] hover:text-fg"
            }`}
          >
            {active && !compact && (
              <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
            )}
            <span className="w-4 text-center text-[13px] opacity-70">{item.icon}</span>
            {!compact && item.label}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2.5 px-1">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-sm font-bold text-[var(--accent-fg)]">
        IP
      </span>
      <span className="text-[15px] font-semibold tracking-[-0.01em]">Interview Prep</span>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b bg-panel px-4 py-3 md:hidden">
        {brand}
        <button
          aria-label="Toggle navigation"
          onClick={() => setOpen((v) => !v)}
          className="btn btn-outline px-2.5 py-1.5"
        >
          ☰
        </button>
      </div>
      {open && (
        <div className="border-b bg-panel px-3 py-3 md:hidden">
          <NavLinks />
          {session && (
            <button onClick={() => { setOpen(false); signOut(); }} className="btn btn-ghost mt-1 w-full justify-start">
              Log out
            </button>
          )}
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-panel py-5 transition-[width] duration-200 md:flex ${
          collapsed ? "w-16 px-2 items-center" : "w-64 px-3"
        }`}
      >
        <div className={`mb-7 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && brand}
          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggleCollapsed}
            className="icon-btn text-muted hover:text-fg"
            title={collapsed ? "Expand" : "Collapse"}
          >
            ☰
          </button>
        </div>

        <NavLinks compact={collapsed} />

        <div className={`mt-auto border-t pt-3 ${collapsed ? "w-full" : ""}`}>
          {!collapsed && <ThemeToggle />}
          {!collapsed && session?.user?.email && (
            <div className="mb-1 flex items-center gap-2.5 px-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--panel-2)] text-xs font-semibold uppercase text-muted">
                {session.user.email[0]}
              </span>
              <span className="min-w-0 truncate text-xs text-muted">{session.user.email}</span>
            </div>
          )}
          {session && (
            <button
              onClick={() => signOut()}
              title={collapsed ? "Log out" : undefined}
              className={`btn btn-ghost w-full ${collapsed ? "justify-center px-0" : "justify-start"}`}
            >
              {collapsed ? "⎋" : "Log out"}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
