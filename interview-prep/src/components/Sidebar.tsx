"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useData } from "./DataProvider";

const nav = [
  { href: "/", label: "Dashboard", icon: "▤" },
  { href: "/questions", label: "Questions", icon: "❯" },
  { href: "/categories", label: "Categories", icon: "▦" },
  { href: "/practice", label: "Practice", icon: "◐" },
  { href: "/checklists", label: "Checklists", icon: "☑" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { session, signOut } = useData();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const NavLinks = () => (
    <nav className="flex flex-col gap-0.5">
      {nav.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-[var(--panel-2)] font-medium text-fg"
                : "text-muted hover:bg-[var(--panel-2)] hover:text-fg"
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
            )}
            <span className="w-4 text-center text-[13px] opacity-70">{item.icon}</span>
            {item.label}
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
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-panel px-3 py-5 md:flex">
        <div className="mb-7">{brand}</div>
        <NavLinks />

        <div className="mt-auto border-t pt-3">
          {session?.user?.email && (
            <div className="mb-1 flex items-center gap-2.5 px-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--panel-2)] text-xs font-semibold uppercase text-muted">
                {session.user.email[0]}
              </span>
              <span className="min-w-0 truncate text-xs text-muted">{session.user.email}</span>
            </div>
          )}
          {session && (
            <button onClick={() => signOut()} className="btn btn-ghost w-full justify-start">
              Log out
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
