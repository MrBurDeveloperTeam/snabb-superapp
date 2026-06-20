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
 * - Reflects it onto <html> (`.dark` + `color-scheme`).
 * - When set to "system", keeps the UI in sync with OS changes.
 *
 * Also exposes a transient `resolvedTheme` for components that need
 * to branch on the *effective* mode (e.g. for inline styles).
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

  // Reflect the resolved theme onto <html>.
  useEffect(() => {
    applyThemeClass(resolvedTheme);
  }, [resolvedTheme]);

  return { theme, resolvedTheme, setTheme, toggle };
}
