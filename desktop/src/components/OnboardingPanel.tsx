import { useState, useCallback, type CSSProperties } from "react";
import { useAuthStore } from "../services/store";

interface Props {
  onComplete: () => void;
}

type Step = "welcome" | "connect" | "hotkey";

interface InstanceOption {
  type: "cloud" | "local" | "manual";
  label: string;
  desc: string;
  icon: string;
}

const INSTANCE_OPTIONS: InstanceOption[] = [
  { type: "cloud", label: "Cloud Agent", desc: "Instant — hosted for you", icon: "☁️" },
  { type: "local", label: "Local Agent", desc: "Already installed on this PC", icon: "💻" },
  { type: "manual", label: "Manual Connect", desc: "Enter agent URL + token", icon: "🔗" },
];

export default function OnboardingPanel({ onComplete }: Props) {
  const { token, instances } = useAuthStore();
  const [step, setStep] = useState<Step>("welcome");
  const [selectedType, setSelectedType] = useState<string>("");
  const [manualUrl, setManualUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [hotkeys, setHotkeys] = useState({
    voice: "Ctrl+Shift+A",
    panel: "Ctrl+Shift+S",
  });

  const handleConnect = useCallback(
    async (type: string) => {
      setSelectedType(type);
      setConnecting(true);

      if (type === "cloud") {
        // Auto-provision cloud instance
        try {
          const res = await fetch("https://api.agentrix.top/api/openclaw/provision-cloud", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          if (res.ok) {
            // Reload instances
            await useAuthStore.getState().loadToken();
          }
        } catch {}
      } else if (type === "local") {
        // Check local OpenClaw
        try {
          const res = await fetch("http://localhost:7474/health", { signal: AbortSignal.timeout(3000) });
          if (res.ok) {
            // Register local instance with backend
            await fetch("https://api.agentrix.top/api/openclaw/instances", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ url: "http://localhost:7474", type: "LOCAL" }),
            });
            await useAuthStore.getState().loadToken();
          }
        } catch {}
      }

      setConnecting(false);
      setStep("hotkey");
    },
    [token],
  );

  // Step 1: Welcome
  if (step === "welcome") {
    return (
      <div style={container}>
        <div style={card}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={logoBall}>
              <svg width="40" height="40" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="12" stroke="white" strokeWidth="1.5" fill="none" />
                <path d="M14 6 L14 10 M8 10 L11 13 M20 10 L17 13 M10 18 L13 15 M18 18 L15 15 M14 22 L14 18"
                  stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="14" cy="14" r="3" fill="white" opacity="0.95" />
              </svg>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: "12px 0 4px" }}>
              Welcome to Agentrix
            </h1>
            <p style={{ color: "var(--text-dim)", fontSize: 14 }}>
              Your AI Agent is always ready — just click or speak.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Feature icon="💬" text="Click the floating ball to chat" />
            <Feature icon="🎤" text="Hold to speak — voice commands" />
            <Feature icon="⌨️" text="Global hotkeys — works from anywhere" />
            <Feature icon="📱" text="Syncs with your mobile app" />
          </div>

          <button
            onClick={() => {
              if (instances.length > 0) {
                setStep("hotkey"); // Skip connect if already has instances
              } else {
                setStep("connect");
              }
            }}
            style={primaryBtn}
          >
            Get Started →
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Connect Agent
  if (step === "connect") {
    return (
      <div style={container}>
        <div style={card}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Connect Your Agent</h2>
          <p style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 16 }}>
            Choose how to connect to your AI agent
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {INSTANCE_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                onClick={() => handleConnect(opt.type)}
                disabled={connecting}
                style={{
                  ...optionBtn,
                  borderColor: selectedType === opt.type ? "var(--accent)" : "var(--border)",
                }}
              >
                <span style={{ fontSize: 24 }}>{opt.icon}</span>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{opt.desc}</div>
                </div>
                {connecting && selectedType === opt.type && <span>⏳</span>}
              </button>
            ))}
          </div>

          {selectedType === "manual" && (
            <div style={{ marginTop: 12 }}>
              <input
                type="url"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="http://your-agent:7474"
                style={inputStyle}
              />
              <button onClick={() => handleConnect("manual")} style={{ ...primaryBtn, marginTop: 8 }}>
                Connect
              </button>
            </div>
          )}

          <button onClick={() => setStep("hotkey")} style={skipBtn}>
            Skip for now →
          </button>
        </div>
      </div>
    );
  }

  // Step 3: Hotkey setup
  return (
    <div style={container}>
      <div style={card}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Set Your Hotkeys</h2>
        <p style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 16 }}>
          Access Agentrix from anywhere with global shortcuts
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={hotkeyRow}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>🎤 Voice Activation</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Hold to record, release to send</div>
            </div>
            <kbd style={kbdStyle}>{hotkeys.voice}</kbd>
          </div>
          <div style={hotkeyRow}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>💬 Open Chat Panel</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Toggle the conversation panel</div>
            </div>
            <kbd style={kbdStyle}>{hotkeys.panel}</kbd>
          </div>
        </div>

        <button onClick={onComplete} style={{ ...primaryBtn, marginTop: 20 }}>
          Done — Start Using Agentrix ✨
        </button>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 13, color: "var(--text)" }}>{text}</span>
    </div>
  );
}

const container: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--bg-dark)",
};

const card: CSSProperties = {
  width: 400,
  padding: "32px 28px",
  background: "var(--bg-panel)",
  borderRadius: "var(--radius)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
};

const logoBall: CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: "50%",
  background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 4px 24px rgba(108, 92, 231, 0.5)",
};

const primaryBtn: CSSProperties = {
  width: "100%",
  padding: "12px",
  background: "var(--accent)",
  color: "white",
  border: "none",
  borderRadius: "var(--radius-sm)",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  marginTop: 20,
};

const skipBtn: CSSProperties = {
  width: "100%",
  padding: "8px",
  background: "transparent",
  color: "var(--text-dim)",
  border: "none",
  cursor: "pointer",
  fontSize: 12,
  marginTop: 8,
};

const optionBtn: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "14px 16px",
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  color: "var(--text)",
  transition: "border-color 0.2s",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: "var(--bg-input)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  fontSize: 14,
  outline: "none",
};

const hotkeyRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 14px",
  background: "var(--bg-input)",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border)",
};

const kbdStyle: CSSProperties = {
  background: "var(--bg-dark)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "4px 10px",
  fontSize: 12,
  fontFamily: "monospace",
  color: "var(--accent-light)",
};
