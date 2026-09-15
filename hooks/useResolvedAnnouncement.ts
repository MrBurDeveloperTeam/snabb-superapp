import { useMemo } from "react";
import { AnnouncementBarConfig } from "../store/announcementBarStore";

interface UserState {
  isLoggedIn: boolean;
  profileComplete?: boolean;
}

interface ResolvedMessage {
  text: string;
  link: string;
}

/**
 * Mirrors the Odoo mrbur_announcement_bar priority logic:
 *   Priority 1 → incomplete profile message
 *   Priority 2 → logged-in specific message
 *   Priority 3 → default message
 */
export function useResolvedAnnouncement(
  config: AnnouncementBarConfig,
  user: UserState
): ResolvedMessage | null {
  return useMemo(() => {
    if (!config.enabled) return null;

    const { isLoggedIn, profileComplete } = user;
    const {
      audience,
      text,
      link,
      textLoggedIn,
      linkLoggedIn,
      targetIncomplete,
      textIncomplete,
      linkIncomplete,
    } = config;

    const profileIncomplete = targetIncomplete && profileComplete === false;

    if (isLoggedIn) {
      if (audience !== "everyone" && audience !== "logged_in") return null;

      if (profileIncomplete && textIncomplete) {
        return { text: textIncomplete, link: linkIncomplete };
      }
      if (textLoggedIn) {
        return { text: textLoggedIn, link: linkLoggedIn };
      }
      if (text) {
        return { text, link };
      }
      return null;
    } else {
      if (audience !== "everyone" && audience !== "logged_out") return null;
      if (text) return { text, link };
      return null;
    }
  }, [config, user]);
}
