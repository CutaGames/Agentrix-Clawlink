import { useState, type CSSProperties } from "react";
import { useAuthStore } from "../services/store";

interface Props {
  ttsEnabled: boolean;
  onTtsToggle: (v: boolean) => void;
  onClose: () => void;
}

export default function SettingsPanel({ ttsEnabled, onTtsToggle, onClose }: Props) {
  const { user, logout } = useAuthStore();
  const [autoStart, setAutoStart] = useState(true);

  const handleToggleAutoStart = async (enabled: boolean) => {
    setAutoStart(enabled);
    try {
      const { enable, disable } = await import("@tauri-apps/plugin-autostart");
      if (enabled) await enable();
      else await disable();
    } catch {
      // Not in Tauri
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Settings</h3>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {/* User info */}
        {user && (
          <div style={section}>
            <div style={sectionTitle}>Account</div>
            <div style={{ fontSize: 13, color: "var(--text)" }}>
              {user.email || user.username || "User"}
            </div>
          </div>
        )}

        {/* Voice settings */}
        <div style={section}>
          <div style={sectionTitle}>Voice</div>
          <ToggleRow
            label="Auto-play TTS responses"
            value={ttsEnabled}
            onChange={onTtsToggle}
          />
        </div>

        {/* System settings */}
        <div style={section}>
          <div style={sectionTitle}>System</div>
          <ToggleRow
            label="Start on login"
            value={autoStart}
            onChange={handleToggleAutoStart}
          />
        </div>

        {/* Hotkeys */}
        <div style={section}>
          <div style={sectionTitle}>Shortcuts</div>
          <div style={hotkeyRow}>
            <span>Voice</span>
            <kbd style={kbdStyle}>Ctrl+Shift+A</kbd>
          </div>
          <div style={hotkeyRow}>
            <span>Panel</span>
            <kbd style={kbdStyle}>Ctrl+Shift+S</kbd>
          </div>
        </div>

        {/* Version */}
        <div style={{ ...section, borderBottom: "none" }}>
          <div style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center" }}>
            Agentrix Desktop v0.1.0
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => {
            logout();
            onClose();
          }}
          style={logoutBtn}
        >
          Log Out
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
      <span style={{ fontSize: 13 }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          border: "none",
          background: value ? "var(--accent)" : "rgba(255,255,255,0.12)",
          position: "relative",
          cursor: "pointer",
          transition: "background 0.2s",
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "white",
            position: "absolute",
            top: 3,
            left: value ? 21 : 3,
            transition: "left 0.2s",
          }}
        />
      </button>
    </div>
  );
}

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
};

const panel: CSSProperties = {
  width: 320,
  maxHeight: "80vh",
  background: "var(--bg-panel)",
  borderRadius: "var(--radius)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
  padding: "20px 24px",
  overflowY: "auto",
};

const closeBtn: CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: "50%",
  background: "transparent",
  color: "var(--text-dim)",
  border: "none",
  cursor: "pointer",
  fontSize: 13,
};

const section: CSSProperties = {
  padding: "10px 0",
  borderBottom: "1px solid var(--border)",
};

const sectionTitle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-dim)",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 8,
};

const hotkeyRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "4px 0",
  fontSize: 13,
};

const kbdStyle: CSSProperties = {
  background: "var(--bg-dark)",
  border: "1px solid var(--border)",
  borderRadius: 4,
  padding: "2px 8px",
  fontSize: 11,
  fontFamily: "monospace",
  color: "var(--accent-light)",
};

const logoutBtn: CSSProperties = {
  width: "100%",
  padding: "10px",
  background: "rgba(239, 68, 68, 0.1)",
  color: "#f87171",
  border: "1px solid rgba(239, 68, 68, 0.2)",
  borderRadius: "var(--radius-sm)",
  fontSize: 13,
  cursor: "pointer",
  marginTop: 8,
};
