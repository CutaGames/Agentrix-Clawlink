import { useState, useCallback, useEffect, type CSSProperties } from "react";
import {
  startRecording,
  stopRecording,
  cancelRecording,
  speechToText,
  type VoiceState,
} from "../services/voice";
import { useAuthStore } from "../services/store";

interface Props {
  onTranscript: (text: string) => void;
  voiceState: VoiceState;
  onStateChange: (state: VoiceState) => void;
}

export default function VoiceButton({ onTranscript, voiceState, onStateChange }: Props) {
  const { token } = useAuthStore();
  const [error, setError] = useState("");

  // Listen for global voice events (from FloatingBall long-press / hotkey)
  useEffect(() => {
    const handleStart = () => handleRecordStart();
    const handleStop = () => handleRecordStop();

    window.addEventListener("agentrix:voice-start", handleStart);
    window.addEventListener("agentrix:voice-stop", handleStop);
    return () => {
      window.removeEventListener("agentrix:voice-start", handleStart);
      window.removeEventListener("agentrix:voice-stop", handleStop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleRecordStart = useCallback(async () => {
    if (voiceState !== "idle") return;
    setError("");
    try {
      await startRecording();
      onStateChange("recording");
    } catch (err) {
      setError("Microphone access denied");
    }
  }, [voiceState, onStateChange]);

  const handleRecordStop = useCallback(async () => {
    if (voiceState !== "recording") return;
    onStateChange("processing");
    try {
      const blob = await stopRecording();
      if (!token) {
        setError("Not logged in");
        onStateChange("idle");
        return;
      }
      const text = await speechToText(blob, token);
      if (text.trim()) {
        onTranscript(text.trim());
      }
    } catch (err) {
      setError("Voice recognition failed");
    }
    onStateChange("idle");
  }, [voiceState, token, onTranscript, onStateChange]);

  const handleCancel = useCallback(() => {
    cancelRecording();
    onStateChange("idle");
  }, [onStateChange]);

  // Press-and-hold interaction
  const handlePointerDown = useCallback(() => {
    handleRecordStart();
  }, [handleRecordStart]);

  const handlePointerUp = useCallback(() => {
    if (voiceState === "recording") {
      handleRecordStop();
    }
  }, [voiceState, handleRecordStop]);

  const isActive = voiceState === "recording";
  const isProcessing = voiceState === "processing";

  return (
    <div style={{ position: "relative" }}>
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
        disabled={isProcessing}
        style={{
          ...btnBase,
          background: isActive
            ? "rgba(239, 68, 68, 0.3)"
            : isProcessing
              ? "rgba(254, 202, 87, 0.2)"
              : "var(--bg-input)",
          border: isActive
            ? "1px solid rgba(239, 68, 68, 0.5)"
            : "1px solid var(--border)",
          animation: isActive ? "breathe 1.5s ease-in-out infinite" : "none",
        }}
        title={isActive ? "Release to send" : "Hold to talk"}
      >
        {isProcessing ? "⏳" : isActive ? "🔴" : "🎤"}
      </button>

      {/* Cancel button while recording */}
      {isActive && (
        <button
          onClick={handleCancel}
          onKeyDown={(e) => e.key === "Escape" && handleCancel()}
          style={{
            position: "absolute",
            top: -28,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.7)",
            color: "#f87171",
            border: "none",
            borderRadius: 12,
            padding: "2px 8px",
            fontSize: 10,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          ✕ Cancel (Esc)
        </button>
      )}

      {error && (
        <div
          style={{
            position: "absolute",
            bottom: -20,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 10,
            color: "#f87171",
            whiteSpace: "nowrap",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

const btnBase: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: "50%",
  color: "var(--text)",
  cursor: "pointer",
  fontSize: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background 0.2s",
  flexShrink: 0,
};
