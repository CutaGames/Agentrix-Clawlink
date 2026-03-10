import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import {
  useAuthStore,
  streamChat,
  streamDirectChat,
  fetchModels,
  type ChatMessage,
} from "../services/store";
import MessageBubble from "./MessageBubble";
import VoiceButton from "./VoiceButton";
import FloatingBall from "./FloatingBall";
import SettingsPanel from "./SettingsPanel";
import { playTTS, stopTTS, type VoiceState } from "../services/voice";

interface Props {
  onClose: () => void;
}

type BallState = "idle" | "recording" | "thinking" | "speaking";

export default function ChatPanel({ onClose }: Props) {
  const { token, activeInstanceId, instances, setActiveInstance } =
    useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ballState, setBallState] = useState<BallState>("idle");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [models, setModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const sessionIdRef = useRef(`session-${Date.now()}`);
  const abortRef = useRef<AbortController | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token) {
      fetchModels(token).then((m) => {
        if (Array.isArray(m) && m.length) {
          setModels(m);
          setSelectedModel(m[0]?.id || "");
        }
      });
    }
  }, [token]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Persist to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(
        `chat_${activeInstanceId}`,
        JSON.stringify(messages.slice(-80)),
      );
    }
  }, [messages, activeInstanceId]);

  // Load persisted messages
  useEffect(() => {
    const stored = localStorage.getItem(`chat_${activeInstanceId}`);
    if (stored) {
      try {
        setMessages(JSON.parse(stored));
      } catch {}
    } else {
      setMessages([]);
    }
  }, [activeInstanceId]);

  const appendChunk = useCallback((msgId: string, chunk: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, content: m.content + chunk } : m,
      ),
    );
  }, []);

  const finalizeMessage = useCallback((msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, streaming: false } : m,
      ),
    );
  }, []);

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText || input).trim();
      if (!text || sending) return;
      if (!overrideText) setInput("");

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text,
        createdAt: Date.now(),
      };
      const assistantId = `a-${Date.now()}`;
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true,
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setSending(true);
      setBallState("thinking");

      let succeeded = false;

      if (activeInstanceId && token) {
        try {
          await new Promise<void>((resolve) => {
            const ac = streamChat({
              instanceId: activeInstanceId,
              message: text,
              sessionId: sessionIdRef.current,
              token,
              model: selectedModel,
              onChunk: (chunk) => {
                succeeded = true;
                setBallState("speaking");
                appendChunk(assistantId, chunk);
              },
              onDone: () => {
                finalizeMessage(assistantId);
                resolve();
              },
              onError: () => resolve(),
            });
            abortRef.current = ac;
          });
        } catch {}
      }

      // Fallback to direct Claude
      if (!succeeded && token) {
        const history = messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        }));
        history.push({ role: "user", content: text });

        await new Promise<void>((resolve) => {
          const ac = streamDirectChat({
            messages: history,
            sessionId: sessionIdRef.current,
            token,
            onChunk: (chunk) => {
              setBallState("speaking");
              appendChunk(assistantId, chunk);
            },
            onDone: () => {
              finalizeMessage(assistantId);
              resolve();
            },
            onError: (err) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: `Error: ${err}`, error: true, streaming: false }
                    : m,
                ),
              );
              resolve();
            },
          });
          abortRef.current = ac;
        });
      }

      setSending(false);
      setBallState("idle");

      // Auto-play TTS for voice-initiated messages
      if (ttsEnabled && token) {
        const lastMsg = messages[messages.length - 1];
        // Get the final assistant content after streaming is done
        setMessages((prev) => {
          const assistant = prev.find((m) => m.id === assistantId);
          if (assistant?.content && !assistant.error) {
            setBallState("speaking");
            playTTS(assistant.content.slice(0, 500), token).then(() => {
              setBallState("idle");
            });
          }
          return prev;
        });
      }
    },
    [
      input,
      sending,
      activeInstanceId,
      token,
      selectedModel,
      messages,
      appendChunk,
      finalizeMessage,
      ttsEnabled,
    ],
  );

  // Sync voiceState with ballState
  useEffect(() => {
    if (voiceState === "recording") setBallState("recording");
    else if (voiceState === "processing") setBallState("thinking");
  }, [voiceState]);

  // Handle voice transcript — auto-send
  const handleVoiceTranscript = useCallback(
    (text: string) => {
      setInput(text);
      handleSend(text);
    },
    [handleSend],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  const handleNewChat = () => {
    abortRef.current?.abort();
    sessionIdRef.current = `session-${Date.now()}`;
    setMessages([]);
  };

  const panel: CSSProperties = {
    width: "100%",
    maxWidth: 480,
    height: "100%",
    maxHeight: 640,
    background: "var(--bg-panel)",
    borderRadius: "var(--radius)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "var(--shadow)",
    border: "1px solid var(--border)",
    animation: "slideIn 0.2s ease-out",
  };

  return (
    <div style={panel}>
      {/* Title bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          gap: 10,
          WebkitAppRegion: "drag",
        }}
      >
        <FloatingBall onTap={onClose} state={ballState} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Instance selector */}
          <select
            value={activeInstanceId || ""}
            onChange={(e) => setActiveInstance(e.target.value)}
            style={{
              background: "transparent",
              color: "var(--text)",
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              maxWidth: 160,
              WebkitAppRegion: "no-drag",
            }}
          >
            {instances.map((inst: any) => (
              <option key={inst.id} value={inst.id}>
                {inst.name || inst.id.slice(0, 8)}
              </option>
            ))}
          </select>
          {/* Model selector */}
          {models.length > 0 && (
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                background: "transparent",
                color: "var(--text-dim)",
                border: "none",
                fontSize: 11,
                cursor: "pointer",
                marginLeft: 8,
                WebkitAppRegion: "no-drag",
              }}
            >
              {models.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.label || m.id}
                </option>
              ))}
            </select>
          )}
        </div>
        <button onClick={handleNewChat} style={iconBtnStyle} title="New Chat">
          ＋
        </button>
        <button onClick={() => setSettingsOpen(true)} style={iconBtnStyle} title="Settings">
          ⚙
        </button>
        <button onClick={onClose} style={iconBtnStyle} title="Close (Esc)">
          ✕
        </button>
      </div>

      {/* Settings overlay */}
      {settingsOpen && (
        <SettingsPanel
          ttsEnabled={ttsEnabled}
          onTtsToggle={setTtsEnabled}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: "var(--text-dim)",
              marginTop: 80,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
            <div>Ask me anything</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>
              Ctrl+Shift+A for voice
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onRetry={() => {
            if (msg.error) {
              // Remove error message and re-send the last user message
              const lastUserMsg = messages.filter(m => m.role === 'user').pop();
              if (lastUserMsg) {
                setMessages(prev => prev.filter(m => m.id !== msg.id));
                handleSend(lastUserMsg.content);
              }
            }
          }} />
        ))}
        <div ref={listEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Shift+Enter for new line)"
          rows={1}
          style={{
            flex: 1,
            background: "var(--bg-input)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 14px",
            fontSize: 14,
            resize: "none",
            outline: "none",
            minHeight: 40,
            maxHeight: 120,
            fontFamily: "inherit",
          }}
        />
        <VoiceButton
          onTranscript={handleVoiceTranscript}
          voiceState={voiceState}
          onStateChange={setVoiceState}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || sending}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background:
              input.trim() && !sending ? "var(--accent)" : "var(--bg-input)",
            color: "white",
            border: "none",
            cursor: input.trim() && !sending ? "pointer" : "default",
            fontSize: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s",
            flexShrink: 0,
          }}
        >
          {sending ? "⏳" : "➤"}
        </button>
      </div>
    </div>
  );
}

const iconBtnStyle: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "50%",
  background: "transparent",
  color: "var(--text-dim)",
  border: "none",
  cursor: "pointer",
  fontSize: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  WebkitAppRegion: "no-drag",
};
