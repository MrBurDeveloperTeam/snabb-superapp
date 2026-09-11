import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeStore {
  /** User's selected preference (persisted). */
  theme: ThemeMode;
  /** Explicitly set the theme preference. */
  setTheme: (theme: ThemeMode) => void;
  /** Cycle light -> dark -> system -> light. */
  toggle: () => void;
}

/**
 * Write the shared .snabbb.com cookie immediately.
 * The cookie is the only reliable cross-subdomain bridge —
 * localStorage is origin-scoped and not shared across subdomains.
 */
function writeThemeCookie(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local");
  const domain = isLocal ? "" : "; Domain=.snabbb.com";
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  document.cookie = `snabbb-theme=${encodeURIComponent(theme)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${domain}`;
}

/**
 * Push the theme to Odoo so it persists cross-device.
 * Fire and forget — cookie is already written so failure is silent.
 * All mini-apps reading GET /api/user/theme will get this value.
 */
async function pushThemeToOdoo(theme: ThemeMode) {
  try {
    await fetch("/api/user/theme", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    });
  } catch {
    // Odoo unreachable — cookie already written, next load will re-sync.
  }
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: "light",

      setTheme: (theme) => {
        set({ theme });
        writeThemeCookie(theme);
        pushThemeToOdoo(theme); // save to Odoo — all mini-apps pick this up
      },

      toggle: () => {
        const order: ThemeMode[] = ["light", "dark", "system"];
        const next = order[(order.indexOf(get().theme) + 1) % order.length];
        set({ theme: next });
        writeThemeCookie(next);
        pushThemeToOdoo(next); // save to Odoo — all mini-apps pick this up
      },
    }),
    {
      name: "snabbb-theme",
      // After Zustand rehydrates from localStorage on page load,
      // write cookie immediately (before any component mounts) so
      // appointment.snabbb.com can read it on the very next request.
      onRehydrateStorage: () => (state) => {
        if (state?.theme) writeThemeCookie(state.theme);
        // Note: we do NOT push to Odoo here — rehydration fires on every
        // page load and we don't want to spam the API. Only explicit user
        // actions (setTheme / toggle) should write to Odoo.
      },
    }
  )
);