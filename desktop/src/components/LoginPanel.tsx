import { useState, useEffect, useRef, type CSSProperties } from "react";
import { QRCodeSVG } from "qrcode.react";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import agentrixLogo from "../assets/agentrix-logo.png";
import { useAuthStore } from "../services/store";

const API_BASE = "https://api.agentrix.top/api";
const PAIR_POLL_INTERVAL = 2000;
const PAIR_TTL = 300_000; // 5 min

// Use Tauri HTTP plugin to bypass CORS in WebView2
async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await tauriFetch(url, init as any);
  } catch {
    return await fetch(url, init);
  }
}

interface Props {
  onSuccess: () => void;
  onGuest: () => void;
}

export default function LoginPanel({ onSuccess, onGuest }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Generate a pairing session ID, register with backend, and start polling
  const startPairSession = async () => {
    const id = `desktop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setSessionId(id);
    setExpired(false);

    // Clear previous timers
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);

    // Register session with backend (must use apiFetch for CORS bypass in Tauri)
    try {
      const createRes = await apiFetch(`${API_BASE}/auth/desktop-pair/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
      });
      if (!createRes.ok) console.warn('Desktop pair create failed:', createRes.status);
    } catch (e) {
      console.warn('Desktop pair create error:', e);
    }

    // Poll for token
    pollRef.current = setInterval(async () => {
      try {
        const res = await apiFetch(`${API_BASE}/auth/desktop-pair/poll?session=${encodeURIComponent(id)}`);
        if (!res.ok) return;
        const text = await res.text();
        if (!text) return;
        let data: any;
        try { data = JSON.parse(text); } catch { return; }
        if (data.token) {
          // Save token and directly update store (don't rely on loadToken roundtrip)
          localStorage.setItem("agentrix_token", data.token);
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearTimeout(timerRef.current);
          // Directly set token in auth store for immediate UI transition
          useAuthStore.setState({ token: data.token });
          onSuccess();
          // Then async load user info in background
          useAuthStore.getState().loadToken();
        }
      } catch {
        // API not ready yet — silently continue polling
      }
    }, PAIR_POLL_INTERVAL);

    // Expire after TTL
    timerRef.current = setTimeout(() => {
      if (pollRef.current) clearInterval(pollRef.current);
      setExpired(true);
    }, PAIR_TTL);
  };

  useEffect(() => {
    startPairSession();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // QR code value: deep link for mobile app to scan
  const qrValue = sessionId
    ? `https://agentrix.top/pair?session=${sessionId}&platform=desktop`
    : "";

  return (
    <div style={container}>
      <div style={card}>
        {/* Logo + Title */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={logoWrap}>
            <img src={agentrixLogo} alt="Agentrix" width={56} height={56} style={{ display: "block" }} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0 }}>
            Agentrix Desktop
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>
            Your AI Agent, always ready
          </p>
        </div>

        {/* QR Code */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <p style={{ fontSize: 14, color: "var(--text)", marginBottom: 12, fontWeight: 500 }}>
            使用 Agentrix Claw App 扫码登录
          </p>
          <div style={qrContainer}>
            {expired ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "var(--text-dim)" }}>二维码已过期</span>
                <button onClick={startPairSession} style={refreshBtn}>
                  刷新二维码
                </button>
              </div>
            ) : qrValue ? (
              <QRCodeSVG
                value={qrValue}
                size={160}
                bgColor="#ffffff"
                fgColor="#1a1a2e"
                level="M"
                imageSettings={{
                  src: agentrixLogo,
                  width: 32,
                  height: 32,
                  excavate: true,
                }}
              />
            ) : null}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 8 }}>
            打开 App → 扫一扫 → 确认登录
          </p>
        </div>

        {/* Download prompt */}
        <div style={{ textAlign: "center", paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "0 0 8px", lineHeight: 1.6 }}>
            还没有 App？
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 16 }}>
            <a
              href="https://api.agentrix.top/downloads/clawlink-agent.apk"
              target="_blank"
              rel="noopener noreferrer"
              style={downloadBtn}
            >
              Android 下载
            </a>
            <a
              href="https://testflight.apple.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={downloadBtn}
            >
              iOS TestFlight
            </a>
          </div>

          {/* Skip as Guest */}
          <button onClick={onGuest} style={guestBtn}>
            Skip as Guest →
          </button>
        </div>
      </div>
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
  width: 380,
  padding: "28px 24px",
  background: "var(--bg-panel)",
  borderRadius: "var(--radius)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow)",
};

const logoWrap: CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: "50%",
  display: "inline-block",
  marginBottom: 10,
  boxShadow: "0 4px 20px rgba(108, 92, 231, 0.4)",
  overflow: "hidden",
};

const qrContainer: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 12,
  background: "#ffffff",
  borderRadius: 12,
  minWidth: 184,
  minHeight: 184,
};

const refreshBtn: CSSProperties = {
  padding: "6px 16px",
  background: "var(--accent)",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontSize: 13,
  cursor: "pointer",
};

const downloadBtn: CSSProperties = {
  padding: "6px 14px",
  background: "transparent",
  color: "var(--accent-light)",
  border: "1px solid var(--accent-light)",
  borderRadius: 8,
  fontSize: 12,
  textDecoration: "none",
  cursor: "pointer",
  transition: "background 0.2s",
};

const guestBtn: CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--text-dim)",
  fontSize: 12,
  cursor: "pointer",
  padding: "4px 0",
  opacity: 0.7,
  transition: "opacity 0.2s",
};
