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
 * Write the shared cross-subdomain cookie so all *.snabbb.com mini-apps
 * (appointment, inventory, etc.) pick up the theme instantly without
 * having to parse the Zustand JSON from localStorage.
 *
 * Uses Domain=.snabbb.com so it is readable by every subdomain.
 * Falls back to no Domain attribute on localhost for dev convenience.
 */
function writeSharedThemeCookie(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const hostname = window.location.hostname;
  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local");
  const domainPart = isLocal ? "" : "; Domain=.snabbb.com";
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  document.cookie = `snabbb-theme=${encodeURIComponent(theme)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${domainPart}`;
}

/**
 * Global theme hook.
 *
 * - Reads the persisted preference from the Zustand store.
 * - Reflects it onto <html> (`.dark` + `color-scheme`).
 * - Writes the shared `.snabbb.com` cookie so mini-apps sync instantly.
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

  // Reflect the resolved theme onto <html> AND write the shared cookie.
  useEffect(() => {
    applyThemeClass(resolvedTheme);
    writeSharedThemeCookie(theme); // plain value e.g. "dark", not resolved
  }, [theme, resolvedTheme]);

  return { theme, resolvedTheme, setTheme, toggle };
}