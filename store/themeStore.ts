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

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: "light",
      setTheme: (theme) => set({ theme }),
      toggle: () => {
        const order: ThemeMode[] = ["light", "dark", "system"];
        const next = order[(order.indexOf(get().theme) + 1) % order.length];
        set({ theme: next });
      },
    }),
    {
      name: "snabbb-theme",
    }
  )
);