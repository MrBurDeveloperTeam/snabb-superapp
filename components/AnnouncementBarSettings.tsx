import React from "react";
import {
  useAnnouncementBarStore,
  Audience,
} from "../store/announcementBarStore";

/**
 * Drop this into any admin/settings page.
 * Config auto-saves to Zustand. Wire up handleSave to your API if needed.
 */
export function AnnouncementBarSettings() {
  const { config, setConfig, resetDismiss } = useAnnouncementBarStore();

  function handleSave() {
    // Optional: POST config to your backend here
    // await fetch('/api/announcement-bar', { method: 'POST', body: JSON.stringify(config) })
    resetDismiss(); // reset dismiss state so users see the updated message
    alert("Saved! Visitor dismiss states have been reset.");
  }

  // ── Shared styles ──────────────────────────────────────
  const s: Record<string, React.CSSProperties> = {
    wrap: { maxWidth: 560, fontFamily: "inherit" },
    section: {
      fontSize: 11,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: "#9ca3af",
      marginTop: 20,
      marginBottom: 8,
      paddingBottom: 6,
      borderBottom: "1px solid #f3f4f6",
    },
    field: { display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 },
    label: {
      fontSize: 12,
      fontWeight: 500,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      color: "#6b7280",
    },
    input: {
      padding: "8px 10px",
      borderRadius: 6,
      border: "1px solid #e5e7eb",
      fontSize: 13,
      width: "100%",
      boxSizing: "border-box",
      outline: "none",
    },
    row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    toggleRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
    colorWrap: { display: "flex", gap: 8, alignItems: "center" },
    colorPicker: {
      height: 36,
      width: 48,
      padding: 2,
      border: "1px solid #e5e7eb",
      borderRadius: 6,
      cursor: "pointer",
      flexShrink: 0,
    },
    saveBtn: {
      padding: "9px 20px",
      background: "#2ec4a5",
      color: "#fff",
      border: "none",
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 500,
      cursor: "pointer",
      marginTop: 20,
    },
  };

  return (
    <div style={s.wrap}>
      {/* ── General ── */}
      <p style={s.section}>General</p>
      <div style={s.toggleRow}>
        <input
          type="checkbox"
          id="ab-enabled"
          checked={config.enabled}
          onChange={(e) => setConfig({ enabled: e.target.checked })}
        />
        <label htmlFor="ab-enabled" style={{ fontSize: 14, cursor: "pointer" }}>
          Enable announcement bar
        </label>
      </div>

      {/* ── Appearance ── */}
      <p style={s.section}>Appearance</p>
      <div style={s.row2}>
        <div style={s.field}>
          <label style={s.label}>Background color</label>
          <div style={s.colorWrap}>
            <input
              type="color"
              style={s.colorPicker}
              value={config.bgColor}
              onChange={(e) => setConfig({ bgColor: e.target.value })}
            />
            <input
              type="text"
              style={{ ...s.input, flex: 1, width: "auto" }}
              value={config.bgColor}
              onChange={(e) => setConfig({ bgColor: e.target.value })}
            />
          </div>
        </div>
        <div style={s.field}>
          <label style={s.label}>Text color</label>
          <div style={s.colorWrap}>
            <input
              type="color"
              style={s.colorPicker}
              value={config.textColor}
              onChange={(e) => setConfig({ textColor: e.target.value })}
            />
            <input
              type="text"
              style={{ ...s.input, flex: 1, width: "auto" }}
              value={config.textColor}
              onChange={(e) => setConfig({ textColor: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* ── Default message ── */}
      <p style={s.section}>Default message</p>
      <div style={s.field}>
        <label style={s.label}>Message text</label>
        <input
          type="text"
          style={s.input}
          placeholder="e.g. 🎉 Free shipping on orders over RM100!"
          value={config.text}
          onChange={(e) => setConfig({ text: e.target.value })}
        />
      </div>
      <div style={s.field}>
        <label style={s.label}>Link URL (optional)</label>
        <input
          type="text"
          style={s.input}
          placeholder="/shop"
          value={config.link}
          onChange={(e) => setConfig({ link: e.target.value })}
        />
      </div>

      {/* ── Audience ── */}
      <p style={s.section}>Audience &amp; behaviour</p>
      <div style={s.field}>
        <label style={s.label}>Show to</label>
        <select
          style={s.input}
          value={config.audience}
          onChange={(e) => setConfig({ audience: e.target.value as Audience })}
        >
          <option value="everyone">Everyone</option>
          <option value="logged_in">Logged-in users only</option>
          <option value="logged_out">Logged-out visitors only</option>
        </select>
      </div>
      <div style={s.toggleRow}>
        <input
          type="checkbox"
          id="ab-dismissible"
          checked={config.dismissible}
          onChange={(e) => setConfig({ dismissible: e.target.checked })}
        />
        <label htmlFor="ab-dismissible" style={{ fontSize: 14, cursor: "pointer" }}>
          Allow visitors to dismiss
        </label>
      </div>

      {/* ── Logged-in message ── */}
      <p style={s.section}>Logged-in users (complete profile)</p>
      <div style={s.field}>
        <label style={s.label}>Message (leave blank to use default)</label>
        <input
          type="text"
          style={s.input}
          placeholder="e.g. Welcome back! Check your reward credits."
          value={config.textLoggedIn}
          onChange={(e) => setConfig({ textLoggedIn: e.target.value })}
        />
      </div>
      <div style={s.field}>
        <label style={s.label}>Link URL (optional)</label>
        <input
          type="text"
          style={s.input}
          placeholder="/rewards"
          value={config.linkLoggedIn}
          onChange={(e) => setConfig({ linkLoggedIn: e.target.value })}
        />
      </div>

      {/* ── Incomplete profile ── */}
      <p style={s.section}>Incomplete profile targeting</p>
      <div style={s.toggleRow}>
        <input
          type="checkbox"
          id="ab-target-inc"
          checked={config.targetIncomplete}
          onChange={(e) => setConfig({ targetIncomplete: e.target.checked })}
        />
        <label htmlFor="ab-target-inc" style={{ fontSize: 14, cursor: "pointer" }}>
          Show a special message to users with incomplete profiles
        </label>
      </div>
      {config.targetIncomplete && (
        <>
          <div style={s.field}>
            <label style={s.label}>Incomplete profile message</label>
            <input
              type="text"
              style={s.input}
              value={config.textIncomplete}
              onChange={(e) => setConfig({ textIncomplete: e.target.value })}
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>Link URL</label>
            <input
              type="text"
              style={s.input}
              value={config.linkIncomplete}
              onChange={(e) => setConfig({ linkIncomplete: e.target.value })}
            />
          </div>
        </>
      )}

      <button style={s.saveBtn} onClick={handleSave}>
        Save settings
      </button>
    </div>
  );
}
