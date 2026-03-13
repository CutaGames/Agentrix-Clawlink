import { CSSProperties, useState, useCallback, useRef, useEffect } from "react";
import agentrixLogo from "../assets/agentrix-logo.png";

type BallState = "idle" | "recording" | "thinking" | "speaking";

interface Props {
  onTap: () => void;
  state?: BallState;
}

export default function FloatingBall({ onTap, state = "idle" }: Props) {
  const [hovered, setHovered] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressing, setPressing] = useState(false);
  const [idleFaded, setIdleFaded] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showGuide, setShowGuide] = useState(() => localStorage.getItem("agentrix_guided") !== "1");
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLongPress = useRef(false);

  // Idle auto-transparency: fade to 40% after 30s of idle state
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
      // Long-press → voice activation (emit event)
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
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  // Close context menu on any outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [contextMenu]);

  const animationStyle: CSSProperties =
    state === "recording"
      ? { animation: "breathe 1.5s ease-in-out infinite" }
      : state === "thinking"
        ? { animation: "spin-slow 2s linear infinite" }
        : state === "speaking"
          ? { animation: "ripple 1.2s ease-out infinite" }
          : {};

  const baseOpacity = hovered ? 1 : idleFaded ? 0.4 : 0.85;

  return (
    <>
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: `linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        opacity: baseOpacity,
        transition: "opacity 0.2s, transform 0.15s",
        transform: pressing ? "scale(0.92)" : "scale(1)",
        boxShadow: "0 4px 20px rgba(108, 92, 231, 0.5)",
        userSelect: "none",
        WebkitAppRegion: "no-drag",
        ...animationStyle,
      }}
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
        width={40}
        height={40}
        style={{ borderRadius: "50%", pointerEvents: "none" }}
      />

      {/* State indicator dot */}
      {state !== "idle" && (
        <div
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background:
              state === "recording"
                ? "#FF6B6B"
                : state === "thinking"
                  ? "#FECA57"
                  : "#48DBFB",
            border: "2px solid #1a1a2e",
          }}
        />
      )}
    </div>

    {/* Right-click context menu */}
    {contextMenu && (
      <div
        style={{
          position: "fixed",
          top: contextMenu.y,
          left: contextMenu.x,
          background: "var(--bg-panel, #1e1e2e)",
          border: "1px solid var(--border, #333)",
          borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
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
    {showGuide && state === "idle" && (
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
        {/* Arrow pointing down */}
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
