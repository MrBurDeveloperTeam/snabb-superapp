import { useEffect, useState } from "react";
import { useThemeStore, type ThemeMode } from "../store/themeStore";

export type ResolvedTheme = "light" | "dark";

/** Read the OS-level color scheme preference (SSR-safe). */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Resolve a user preference to a concrete theme. */
export function resolveTheme(theme: ThemeMode): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme;
}

/** Apply the `.dark` class + `color-scheme` to <html>. */
function applyThemeClass(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

/**
 * Global theme hook.
 *
 * - Reads the persisted preference from the Zustand store.
 * - Reflects it onto <html> immediately (single DOM write per change).
 * - Cookie writing is handled by themeStore.ts — not duplicated here.
 * - When set to "system", keeps the UI in sync with OS changes.
 */
export function useTheme() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const toggle = useThemeStore((s) => s.toggle);

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  // Track OS preference so "system" mode stays live.
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) =>
      setSystemTheme(e.matches ? "dark" : "light");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme: ResolvedTheme =
    theme === "system" ? systemTheme : theme;

  // Single effect, single dependency — fires exactly once per theme change.
  // Cookie is already written synchronously by themeStore before this runs.
  useEffect(() => {
    applyThemeClass(resolvedTheme);
  }, [resolvedTheme]);

  return { theme, resolvedTheme, setTheme, toggle };
}