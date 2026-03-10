"use client";

import { useCallback, useEffect, useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Theme = "system" | "dark" | "light";

interface UseThemeReturn {
  /** Current theme preference (what the user chose) */
  theme: Theme;
  /** Update theme preference — writes to localStorage and applies dark class */
  setTheme: (theme: Theme) => void;
  /** Actual applied theme after system resolution — always 'dark' or 'light' */
  resolvedTheme: "dark" | "light";
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "monitoring-ui-theme";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getSystemPreference(): "dark" | "light" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(theme: Theme): "dark" | "light" {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  return getSystemPreference();
}

function applyTheme(resolved: "dark" | "light") {
  if (resolved === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("light");

  // Read from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const initial: Theme =
      stored === "dark" || stored === "light" || stored === "system"
        ? stored
        : "system";
    setThemeState(initial);
    const resolved = resolveTheme(initial);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  // Listen to OS preference changes (matchMedia)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    function handleChange() {
      // Read current preference from localStorage to avoid stale closures
      const stored = localStorage.getItem(STORAGE_KEY);
      const currentTheme: Theme =
        stored === "dark" || stored === "light" ? stored : "system";

      if (currentTheme === "system") {
        const resolved = mq.matches ? "dark" : "light";
        setResolvedTheme(resolved);
        applyTheme(resolved);
      }
    }

    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    const resolved = resolveTheme(newTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  return { theme, setTheme, resolvedTheme };
}
