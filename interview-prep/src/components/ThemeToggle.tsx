"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme") as Theme | null;
      if (saved) setTheme(saved);
    } catch {}
  }, []);

  const cycle = () => {
    const next: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
    apply(next);
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {}
  };

  const icon = theme === "light" ? "☀︎" : theme === "dark" ? "☾" : "◐";
  const label = theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System";

  return (
    <button onClick={cycle} className="btn btn-ghost w-full justify-start" title="Toggle theme">
      <span className="w-4 text-center">{icon}</span>
      {label} theme
    </button>
  );
}
