import { CSSProperties, useState, useCallback, useRef, useEffect } from "react";
import agentrixLogo from "../assets/agentrix-logo.png";
import { type ClipboardCapture, type ClipboardAction, buildClipboardPrompt } from "../services/clipboard";

type BallState = "idle" | "recording" | "thinking" | "speaking";

interface Props {
  onTap: () => void;
  state?: BallState;
  /** Compact mode — no clipboard/context menus, used inside ChatPanel header */
  compact?: boolean;
  /** Live transcript text for capsule display */
  transcript?: string;
  /** Audio volume 0-1 for waveform bars */
  volume?: number;
  /** Result text snippet from agent reply */
  resultText?: string;
}

// ── Color palette per state ──────────────────────────────
const STATE_COLORS: Record<BallState, { from: string; to: string; glow: string }> = {
  idle:      { from: "#6C5CE7", to: "#a78bfa", glow: "rgba(108,92,231,0.45)" },
  recording: { from: "#10B981", to: "#34d399", glow: "rgba(16,185,129,0.5)" },
  thinking:  { from: "#F59E0B", to: "#fbbf24", glow: "rgba(245,158,11,0.5)" },
  speaking:  { from: "#3b82f6", to: "#60a5fa", glow: "rgba(59,130,246,0.5)" },
};

const BALL_SIZE = 52;
const CAPSULE_WIDTH = 230;

export default function FloatingBall({
  onTap,
  state = "idle",
  compact = false,
  transcript,
  volume = 0,
  resultText,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressing, setPressing] = useState(false);
  const [idleFaded, setIdleFaded] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showGuide, setShowGuide] = useState(() => localStorage.getItem("agentrix_guided") !== "1");
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [clipboardText, setClipboardText] = useState<string | null>(null);
  const [clipboardMenu, setClipboardMenu] = useState(false);
  const clipboardFadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [resultVisible, setResultVisible] = useState(false);
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLongPress = useRef(false);

  // Whether to morph into capsule shape
  const isCapsule = state === "recording" || state === "speaking";

  // Show result card briefly when resultText changes
  useEffect(() => {
    if (resultText) {
      setResultVisible(true);
      if (resultTimer.current) clearTimeout(resultTimer.current);
      resultTimer.current = setTimeout(() => setResultVisible(false), 4000);
    } else {
      setResultVisible(false);
    }
    return () => { if (resultTimer.current) clearTimeout(resultTimer.current); };
  }, [resultText]);

  // Listen for clipboard captures
  useEffect(() => {
    if (compact) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ClipboardCapture>).detail;
      if (detail?.text) {
        setClipboardText(detail.text);
        setClipboardMenu(false);
        if (clipboardFadeTimer.current) clearTimeout(clipboardFadeTimer.current);
        clipboardFadeTimer.current = setTimeout(() => setClipboardText(null), 8000);
      }
    };
    window.addEventListener("agentrix:clipboard-capture", handler);
    return () => {
      window.removeEventListener("agentrix:clipboard-capture", handler);
      if (clipboardFadeTimer.current) clearTimeout(clipboardFadeTimer.current);
    };
  }, [compact]);

  const handleClipboardAction = useCallback((action: ClipboardAction) => {
    if (!clipboardText) return;
    const prompt = buildClipboardPrompt(action, clipboardText);
    onTap();
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("agentrix:clipboard-send", { detail: { prompt } }));
    }, 150);
    setClipboardText(null);
    setClipboardMenu(false);
  }, [clipboardText, onTap]);

  // Idle auto-transparency
  useEffect(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (state === "idle" && !hovered) {
      idleTimer.current = setTimeout(() => setIdleFaded(true), 30000);
    } else {
      setIdleFaded(false);
    }
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, [state, hovered]);

  const handlePointerDown = useCallback(() => {
    setPressing(true);
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      window.dispatchEvent(new CustomEvent("agentrix:voice-start"));
    }, 400);
  }, []);

  const handlePointerUp = useCallback(() => {
    setPressing(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isLongPress.current) {
      window.dispatchEvent(new CustomEvent("agentrix:voice-stop"));
    }
  }, []);

  const handleClick = useCallback(() => {
    if (!isLongPress.current) {
      if (showGuide) {
        setShowGuide(false);
        localStorage.setItem("agentrix_guided", "1");
      }
      onTap();
    }
  }, [onTap, showGuide]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!compact) setContextMenu({ x: e.clientX, y: e.clientY });
  }, [compact]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenu]);

  const colors = STATE_COLORS[state];

  // Hover-through: when idle+hovered, become transparent & click-through
  const isPassThrough = state === "idle" && hovered && idleFaded;
  const baseOpacity = isPassThrough ? 0.15 : hovered ? 1 : idleFaded ? 0.4 : 0.9;

  return (
    <>
    {/* ── Main Orbis Container ─────────────────────────── */}
    <div
      style={{
        position: "relative",
        width: isCapsule ? CAPSULE_WIDTH : BALL_SIZE,
        height: BALL_SIZE,
        borderRadius: isCapsule ? BALL_SIZE / 2 : "50%",
        background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: isCapsule ? "flex-start" : "center",
        gap: isCapsule ? 8 : 0,
        paddingLeft: isCapsule ? 6 : 0,
        cursor: isPassThrough ? "default" : "pointer",
        pointerEvents: isPassThrough ? "none" : "auto",
        opacity: baseOpacity,
        transition: "width 0.35s cubic-bezier(.4,0,.2,1), border-radius 0.35s cubic-bezier(.4,0,.2,1), opacity 0.25s, transform 0.15s, background 0.4s, box-shadow 0.4s",
        transform: pressing ? "scale(0.92)" : "scale(1)",
        boxShadow: `0 4px 24px ${colors.glow}, inset 0 0 0 1px rgba(255,255,255,0.12)`,
        userSelect: "none",
        WebkitAppRegion: "no-drag",
        animation: state === "idle" ? "orbisBreathe 3.6s ease-in-out infinite" : state === "recording" || state === "speaking" ? "orbisPulse 1.8s ease-in-out infinite" : "none",
        overflow: "hidden",
      } as CSSProperties}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      title="Agentrix — Click to chat, hold for voice, right-click for menu"
    >
      {/* Logo */}
      <img
        src={agentrixLogo}
        alt="Agentrix"
        width={compact ? 32 : 36}
        height={compact ? 32 : 36}
        style={{ borderRadius: "50%", pointerEvents: "none", flexShrink: 0 }}
      />

      {/* ── Capsule waveform bars ───────────────────── */}
      {isCapsule && (
        <div style={{ display: "flex", alignItems: "center", gap: 2, height: 28, flexShrink: 0 }}>
          {Array.from({ length: 7 }).map((_, i) => {
            const h = Math.max(4, Math.min(26, (volume * 26) * (0.4 + 0.6 * Math.sin((i + Date.now() / 200) * 0.8))));
            return (
              <div
                key={i}
                style={{
                  width: 3,
                  height: h,
                  borderRadius: 2,
                  background: "rgba(255,255,255,0.85)",
                  transition: "height 0.08s ease-out",
                }}
              />
            );
          })}
        </div>
      )}

      {/* ── Capsule transcript text ─────────────────── */}
      {isCapsule && transcript && (
        <div
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 12,
            color: "rgba(255,255,255,0.9)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            paddingRight: 10,
          }}
        >
          {transcript}
        </div>
      )}

      {/* ── Orbiting particles (thinking) ──────────── */}
      {state === "thinking" && !compact && (
        <svg
          style={{ position: "absolute", inset: -8, width: BALL_SIZE + 16, height: BALL_SIZE + 16, pointerEvents: "none", animation: "orbisOrbit 2.4s linear infinite" }}
          viewBox={`0 0 ${BALL_SIZE + 16} ${BALL_SIZE + 16}`}
        >
          {[0, 90, 180, 270].map((deg, i) => {
            const cx = (BALL_SIZE + 16) / 2;
            const r = BALL_SIZE / 2 + 4;
            const rad = (deg * Math.PI) / 180;
            return (
              <circle
                key={i}
                cx={cx + r * Math.cos(rad)}
                cy={cx + r * Math.sin(rad)}
                r={2.5}
                fill={i % 2 === 0 ? "#F59E0B" : "#fbbf24"}
                opacity={0.85}
              />
            );
          })}
        </svg>
      )}
    </div>

    {/* ── Result card ──────────────────────────────────── */}
    {resultVisible && resultText && !compact && (
      <div
        onClick={() => { setResultVisible(false); onTap(); }}
        style={{
          position: "absolute",
          bottom: BALL_SIZE + 10,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(22,33,62,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          padding: "10px 14px",
          maxWidth: 260,
          fontSize: 12,
          color: "var(--text, #eee)",
          lineHeight: 1.5,
          cursor: "pointer",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          animation: "fadeInUp 0.25s ease-out",
          zIndex: 10,
        }}
      >
        {resultText.length > 120 ? resultText.slice(0, 120) + "…" : resultText}
        <div style={{ fontSize: 10, color: "var(--text-dim, #888)", marginTop: 4 }}>Click to expand</div>
      </div>
    )}

    {/* Clipboard quick-action menu */}
    {!compact && clipboardMenu && clipboardText && (
      <div
        style={{
          position: "absolute",
          bottom: 64,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(22,33,62,0.95)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          zIndex: 10001,
          padding: "6px 0",
          minWidth: 150,
          fontSize: 13,
        }}
      >
        <div style={{ padding: "6px 14px", fontSize: 11, color: "var(--text-dim, #888)", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 2 }}>
          {clipboardText.slice(0, 40)}{clipboardText.length > 40 ? "..." : ""}
        </div>
        {([
          { action: "translate" as ClipboardAction, label: "🌐 Translate" },
          { action: "summarize" as ClipboardAction, label: "📝 Summarize" },
          { action: "explain" as ClipboardAction, label: "💡 Explain" },
          { action: "rewrite" as ClipboardAction, label: "✏️ Rewrite" },
          { action: "ask" as ClipboardAction, label: "💬 Ask about this" },
        ]).map((item) => (
          <div
            key={item.action}
            onClick={(e) => { e.stopPropagation(); handleClipboardAction(item.action); }}
            style={{
              padding: "8px 14px",
              cursor: "pointer",
              color: "var(--text, #eee)",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {item.label}
          </div>
        ))}
      </div>
    )}

    {/* Clipboard badge */}
    {!compact && clipboardText && state === "idle" && (
      <div
        onClick={(e) => { e.stopPropagation(); setClipboardMenu(!clipboardMenu); }}
        style={{
          position: "absolute",
          bottom: -4,
          right: -4,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#00D2D3",
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          border: "2px solid rgba(22,33,62,0.9)",
          animation: "guideFloat 1.5s ease-in-out infinite",
          zIndex: 10,
        }}
        title="Clipboard actions"
      >
        📋
      </div>
    )}

    {/* Right-click context menu */}
    {!compact && contextMenu && (
      <div
        style={{
          position: "fixed",
          top: contextMenu.y,
          left: contextMenu.x,
          background: "rgba(22,33,62,0.95)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          zIndex: 10000,
          minWidth: 160,
          padding: "4px 0",
          fontSize: 13,
        }}
        onClick={closeContextMenu}
      >
        {[
          { label: "💬 Open Chat", action: () => onTap() },
          { label: "🆕 New Chat", action: () => window.dispatchEvent(new CustomEvent("agentrix:new-chat")) },
          { label: "🎤 Voice Input", action: () => { onTap(); setTimeout(() => window.dispatchEvent(new CustomEvent("agentrix:voice-start")), 200); } },
          { label: "⚙️ Settings", action: () => { onTap(); setTimeout(() => window.dispatchEvent(new CustomEvent("agentrix:open-settings")), 200); } },
        ].map((item) => (
          <div
            key={item.label}
            onClick={item.action}
            style={{
              padding: "8px 16px",
              cursor: "pointer",
              color: "var(--text, #eee)",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {item.label}
          </div>
        ))}
      </div>
    )}

    {/* First-use guide bubble */}
    {!compact && showGuide && state === "idle" && (
      <div
        onClick={() => { setShowGuide(false); localStorage.setItem("agentrix_guided", "1"); onTap(); }}
        style={{
          position: "absolute",
          top: -48,
          left: "50%",
          transform: "translateX(-50%)",
          background: "var(--accent, #6C5CE7)",
          color: "white",
          padding: "8px 14px",
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 500,
          whiteSpace: "nowrap",
          boxShadow: "0 4px 16px rgba(108, 92, 231, 0.5)",
          cursor: "pointer",
          animation: "guideFloat 2s ease-in-out infinite",
          zIndex: 100,
          pointerEvents: "auto",
        }}
      >
        点击我开始对话 👋
        <div
          style={{
            position: "absolute",
            bottom: -6,
            left: "50%",
            transform: "translateX(-50%) rotate(45deg)",
            width: 12,
            height: 12,
            background: "var(--accent, #6C5CE7)",
          }}
        />
      </div>
    )}
    </>
  );
}
