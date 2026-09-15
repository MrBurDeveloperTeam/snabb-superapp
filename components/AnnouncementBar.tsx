import React, { CSSProperties } from "react";
import { useAnnouncementBarStore } from "../store/announcementBarStore";
import { useResolvedAnnouncement } from "../hooks/useResolvedAnnouncement";

interface AnnouncementBarProps {
  /** Is the current user authenticated? */
  isLoggedIn?: boolean;
  /**
   * Is their profile complete?
   * Pass false to trigger the incomplete-profile message.
   * Pass undefined to skip the check.
   */
  profileComplete?: boolean;
}

export function AnnouncementBar({
  isLoggedIn = false,
  profileComplete,
}: AnnouncementBarProps) {
  const { config, dismissed, dismiss } = useAnnouncementBarStore();

  const resolved = useResolvedAnnouncement(config, {
    isLoggedIn,
    profileComplete,
  });

  if (!resolved || dismissed) return null;

  const barStyle: CSSProperties = {
    backgroundColor: config.bgColor,
    color: config.textColor,
    textAlign: "center",
    padding: "9px 40px",
    fontSize: "13px",
    fontWeight: 500,
    letterSpacing: "0.01em",
    width: "100%",
    boxSizing: "border-box",
    position: "relative",
    zIndex: 1000,
  };

  const linkStyle: CSSProperties = {
    color: config.textColor,
    textDecoration: "underline",
    textUnderlineOffset: "3px",
  };

  const dismissStyle: CSSProperties = {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: config.textColor,
    fontSize: "16px",
    lineHeight: 1,
    opacity: 0.7,
    padding: "0 4px",
  };

  return (
    <div id="snabbb-announcement-bar" style={barStyle} role="banner">
      {resolved.link ? (
        <a href={resolved.link} style={linkStyle}>
          {resolved.text}
        </a>
      ) : (
        <span>{resolved.text}</span>
      )}

      {config.dismissible && (
        <button
          onClick={dismiss}
          style={dismissStyle}
          aria-label="Dismiss announcement"
        >
          &#x2715;
        </button>
      )}
    </div>
  );
}
