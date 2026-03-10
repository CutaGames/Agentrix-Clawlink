import { CSSProperties, useState, useCallback, useRef } from "react";
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

  const isLongPress = useRef(false);

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
    if (!isLongPress.current) onTap();
  }, [onTap]);

  const animationStyle: CSSProperties =
    state === "recording"
      ? { animation: "breathe 1.5s ease-in-out infinite" }
      : state === "thinking"
        ? { animation: "spin-slow 2s linear infinite" }
        : state === "speaking"
          ? { animation: "ripple 1.2s ease-out infinite" }
          : {};

  const baseOpacity = hovered ? 1 : 0.85;

  return (
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
      title="Agentrix — Click to chat, hold for voice"
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
  );
}
