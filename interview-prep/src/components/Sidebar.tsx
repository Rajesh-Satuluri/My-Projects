"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useData } from "./DataProvider";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/questions", label: "Questions" },
  { href: "/categories", label: "Categories" },
  { href: "/practice", label: "Practice" },
  { href: "/checklists", label: "Checklists" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { session, signOut } = useData();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const links = (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setOpen(false)}
          className={`rounded-md px-3 py-2 text-sm transition-colors ${
            isActive(item.href)
              ? "bg-accent text-white"
              : "text-fg hover:bg-[var(--bg)]"
          }`}
        >
          {item.label}
        </Link>
      ))}
      <Link
        href="/settings"
        onClick={() => setOpen(false)}
        className={`mt-4 rounded-md px-3 py-2 text-sm transition-colors ${
          isActive("/settings") ? "bg-accent text-white" : "text-muted hover:bg-[var(--bg)]"
        }`}
      >
        Settings
      </Link>
      {session && (
        <button
          onClick={() => {
            setOpen(false);
            signOut();
          }}
          className="mt-1 rounded-md px-3 py-2 text-left text-sm text-muted hover:bg-[var(--bg)]"
        >
          Log out
        </button>
      )}
      {session?.user?.email && (
        <div className="mt-2 truncate px-3 text-xs text-muted">{session.user.email}</div>
      )}
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b bg-panel px-4 py-3 md:hidden">
        <span className="font-semibold">Interview Prep</span>
        <button
          aria-label="Toggle navigation"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border px-3 py-1 text-sm"
        >
          Menu
        </button>
      </div>
      {open && (
        <div className="border-b bg-panel px-4 py-3 md:hidden">{links}</div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r bg-panel p-4 md:block">
        <div className="mb-6 px-3 text-lg font-semibold">Interview Prep</div>
        {links}
      </aside>
    </>
  );
}
