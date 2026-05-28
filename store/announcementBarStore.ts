import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Audience = "everyone" | "logged_in" | "logged_out";

export interface AnnouncementBarConfig {
  enabled: boolean;
  bgColor: string;
  textColor: string;
  dismissible: boolean;
  audience: Audience;

  // Default / logged-out message
  text: string;
  link: string;

  // Logged-in (complete profile) message
  textLoggedIn: string;
  linkLoggedIn: string;

  // Incomplete profile message
  targetIncomplete: boolean;
  textIncomplete: string;
  linkIncomplete: string;
}

interface AnnouncementBarStore {
  config: AnnouncementBarConfig;
  dismissed: boolean;
  setConfig: (patch: Partial<AnnouncementBarConfig>) => void;
  dismiss: () => void;
  resetDismiss: () => void;
}

const DEFAULT_CONFIG: AnnouncementBarConfig = {
  enabled: true,
  bgColor: "#1a1a2e",
  textColor: "#ffffff",
  dismissible: false,
  audience: "everyone",
  text: "Welcome to Snabbb! Discover our premium collection.",
  link: "",
  textLoggedIn: "",
  linkLoggedIn: "",
  targetIncomplete: true,
  textIncomplete:
    "Please fill up your profile to get a extra coupon from us. Click Here Edit.",
  linkIncomplete: "https://mrbur.shop/my/account",
};

export const useAnnouncementBarStore = create<AnnouncementBarStore>()(
  persist(
    (set) => ({
      config: DEFAULT_CONFIG,
      dismissed: false,
      setConfig: (patch) =>
        set((state) => ({ config: { ...state.config, ...patch } })),
      dismiss: () => set({ dismissed: true }),
      resetDismiss: () => set({ dismissed: false }),
    }),
    {
      name: "snabbb-announcement-bar",
      // Only persist the dismiss flag; config is set programmatically
      partialize: (state) => ({ dismissed: state.dismissed }),
    }
  )
);
