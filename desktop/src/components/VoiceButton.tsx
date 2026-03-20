import { useState, useCallback, useEffect, useRef, type CSSProperties } from "react";
import {
  startRecording,
  stopRecording,
  cancelRecording,
  speechToText,
  type VoiceState,
} from "../services/voice";
import {
  isLiveSpeechAvailable,
  requestLiveSpeechPermissions,
  startLiveSpeechRecognition,
  type LiveSpeechController,
} from "../services/liveSpeech";
import { useAuthStore } from "../services/store";

interface Props {
  onTranscript: (text: string) => void;
  voiceState: VoiceState;
  onStateChange: (state: VoiceState) => void;
  /** When true, stop any current TTS playback (barge-in) */
  onBargeIn?: () => void;
}

export default function VoiceButton({ onTranscript, voiceState, onStateChange, onBargeIn }: Props) {
  const { token } = useAuthStore();
  const [error, setError] = useState("");
  const [duplexMode, setDuplexMode] = useState(false);
  const [liveAvailable] = useState(isLiveSpeechAvailable);
  const [liveListening, setLiveListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const liveSpeechRef = useRef<LiveSpeechController | null>(null);
  const manualStopRef = useRef(false);

  // Listen for global voice events (from FloatingBall long-press / hotkey)
  useEffect(() => {
    const handleStart = () => {
      if (duplexMode) {
        startLiveSpeechSession();
      } else {
        handleRecordStart();
      }
    };
    const handleStop = () => {
      if (duplexMode) {
        stopLiveSpeechSession(true);
      } else {
        handleRecordStop();
      }
    };

    window.addEventListener("agentrix:voice-start", handleStart);
    window.addEventListener("agentrix:voice-stop", handleStop);
    return () => {
      window.removeEventListener("agentrix:voice-start", handleStart);
      window.removeEventListener("agentrix:voice-stop", handleStop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, duplexMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLiveSpeechSession(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Legacy hold-to-talk ──────────────────────────────────

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
    if (duplexMode) {
      stopLiveSpeechSession(true);
    } else {
      cancelRecording();
    }
    onStateChange("idle");
    setInterimTranscript("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onStateChange, duplexMode]);

  // ── Duplex mode: real-time speech recognition ────────────

  const stopLiveSpeechSession = useCallback((manual = false) => {
    manualStopRef.current = manual;
    const ctrl = liveSpeechRef.current;
    liveSpeechRef.current = null;
    setLiveListening(false);
    setInterimTranscript("");
    if (ctrl) {
      try { if (manual) ctrl.abort(); else ctrl.stop(); } catch {}
    }
  }, []);

  const startLiveSpeechSession = useCallback(async () => {
    if (liveSpeechRef.current || !liveAvailable) return;

    const perm = await requestLiveSpeechPermissions();
    if (!perm.granted) {
      setError("Microphone permission denied");
      return;
    }

    setError("");
    manualStopRef.current = false;

    const lang = navigator.language?.startsWith("zh") ? "zh" : "en";

    liveSpeechRef.current = startLiveSpeechRecognition(lang, {
      onStart: () => {
        setLiveListening(true);
        onStateChange("recording");
        setInterimTranscript("");
      },
      onEnd: () => {
        liveSpeechRef.current = null;
        setLiveListening(false);
        if (!manualStopRef.current && duplexMode) {
          // Auto-restart after a brief pause
          setTimeout(() => {
            if (duplexMode) startLiveSpeechSession();
          }, 300);
        } else {
          onStateChange("idle");
        }
      },
      onSpeechStart: () => {
        // Barge-in: stop TTS when user starts speaking
        onBargeIn?.();
      },
      onInterimResult: (transcript) => {
        setInterimTranscript(transcript);
      },
      onFinalResult: (transcript) => {
        const normalized = transcript.trim();
        if (!normalized) return;
        setInterimTranscript("");
        stopLiveSpeechSession(false);
        onBargeIn?.();
        onStateChange("processing");
        onTranscript(normalized);
        // Will auto-restart via onEnd → setTimeout if duplexMode
      },
      onError: (err) => {
        if (err.error === "aborted" || err.error === "no-speech") return;
        setError(err.message || "Speech recognition error");
        setLiveListening(false);
        onStateChange("idle");
      },
    });
  }, [liveAvailable, duplexMode, onStateChange, onTranscript, onBargeIn, stopLiveSpeechSession]);

  // Toggle duplex mode
  const toggleDuplex = useCallback(() => {
    if (duplexMode) {
      stopLiveSpeechSession(true);
      setDuplexMode(false);
      onStateChange("idle");
    } else {
      setDuplexMode(true);
      startLiveSpeechSession();
    }
  }, [duplexMode, startLiveSpeechSession, stopLiveSpeechSession, onStateChange]);

  // Start/stop duplex when mode changes
  useEffect(() => {
    if (duplexMode && !liveSpeechRef.current) {
      startLiveSpeechSession();
    }
  }, [duplexMode, startLiveSpeechSession]);

  // ── Interaction handlers ─────────────────────────────────

  const handlePointerDown = useCallback(() => {
    if (duplexMode) return; // duplex uses tap toggle, not hold
    handleRecordStart();
  }, [handleRecordStart, duplexMode]);

  const handlePointerUp = useCallback(() => {
    if (duplexMode) return;
    if (voiceState === "recording") {
      handleRecordStop();
    }
  }, [voiceState, handleRecordStop, duplexMode]);

  const handleClick = useCallback(() => {
    if (!duplexMode) return;
    if (liveListening) {
      stopLiveSpeechSession(true);
      onStateChange("idle");
    } else {
      startLiveSpeechSession();
    }
  }, [duplexMode, liveListening, startLiveSpeechSession, stopLiveSpeechSession, onStateChange]);

  const isActive = voiceState === "recording" || liveListening;
  const isProcessing = voiceState === "processing";

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 4 }}>
      {/* Duplex toggle (only show if Web Speech API available) */}
      {liveAvailable && (
        <button
          onClick={toggleDuplex}
          style={{
            ...toggleBtn,
            background: duplexMode ? "rgba(34,197,94,0.2)" : "transparent",
            border: duplexMode ? "1px solid rgba(34,197,94,0.5)" : "1px solid var(--border)",
            color: duplexMode ? "#22c55e" : "var(--text-muted)",
          }}
          title={duplexMode ? "Duplex ON — click to disable" : "Enable duplex (hands-free) mode"}
        >
          {duplexMode ? "🔄" : "⇄"}
        </button>
      )}

      {/* Main voice button */}
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={duplexMode ? handleClick : undefined}
        onContextMenu={(e) => e.preventDefault()}
        disabled={isProcessing}
        style={{
          ...btnBase,
          background: isActive
            ? duplexMode
              ? "rgba(34, 197, 94, 0.3)"
              : "rgba(239, 68, 68, 0.3)"
            : isProcessing
              ? "rgba(254, 202, 87, 0.2)"
              : "var(--bg-input)",
          border: isActive
            ? duplexMode
              ? "1px solid rgba(34, 197, 94, 0.5)"
              : "1px solid rgba(239, 68, 68, 0.5)"
            : "1px solid var(--border)",
          animation: isActive ? "breathe 1.5s ease-in-out infinite" : "none",
        }}
        title={
          duplexMode
            ? liveListening ? "Listening... click to pause" : "Click to start listening"
            : isActive ? "Release to send" : "Hold to talk"
        }
      >
        {isProcessing ? "⏳" : isActive ? (duplexMode ? "�" : "�🔴") : "🎤"}
      </button>

      {/* Interim transcript preview */}
      {interimTranscript && (
        <div style={transcriptPreviewStyle}>
          {interimTranscript}
        </div>
      )}

      {/* Cancel button while recording (hold mode only) */}
      {isActive && !duplexMode && (
        <button
          onClick={handleCancel}
          onKeyDown={(e) => e.key === "Escape" && handleCancel()}
          style={cancelBtnStyle}
        >
          ✕ Cancel (Esc)
        </button>
      )}

      {error && (
        <div style={errorStyle}>
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

const toggleBtn: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  cursor: "pointer",
  fontSize: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s",
  flexShrink: 0,
};

const transcriptPreviewStyle: CSSProperties = {
  position: "absolute",
  bottom: 48,
  left: "50%",
  transform: "translateX(-50%)",
  background: "rgba(0,0,0,0.8)",
  color: "#e5e7eb",
  borderRadius: 8,
  padding: "4px 10px",
  fontSize: 11,
  maxWidth: 280,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  pointerEvents: "none",
};

const cancelBtnStyle: CSSProperties = {
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
};

const errorStyle: CSSProperties = {
  position: "absolute",
  bottom: -20,
  left: "50%",
  transform: "translateX(-50%)",
  fontSize: 10,
  color: "#f87171",
  whiteSpace: "nowrap",
};
