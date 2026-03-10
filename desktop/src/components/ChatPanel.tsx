import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type CSSProperties,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import {
  useAuthStore,
  streamChat,
  streamDirectChat,
  fetchModels,
  type ChatMessage,
  type ChatAttachment,
  uploadChatAttachment,
} from "../services/store";
import MessageBubble from "./MessageBubble";
import VoiceButton from "./VoiceButton";
import FloatingBall from "./FloatingBall";
import SettingsPanel from "./SettingsPanel";
import { type VoiceState } from "../services/voice";
import {
  AudioQueuePlayer,
  SentenceAccumulator,
  detectLang,
} from "../services/AudioQueuePlayer";

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
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [models, setModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const sessionIdRef = useRef(`session-${Date.now()}`);
  const abortRef = useRef<AbortController | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioPlayerRef = useRef<AudioQueuePlayer | null>(null);
  const sentenceAccRef = useRef<SentenceAccumulator | null>(null);
  // Track whether the current send was voice-initiated for auto-TTS
  const voiceInitiatedRef = useRef(false);

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

  const serializeMessageForModel = useCallback(
    (content: string, attachments: ChatAttachment[] = []) => {
      const trimmed = content.trim();
      if (attachments.length === 0) return trimmed;
      const attachmentLines = attachments.map((attachment, index) => {
        const label = attachment.kind === "image" ? "Image" : "File";
        return `${index + 1}. ${label}: ${attachment.originalName} (${attachment.mimetype}, ${formatBytes(attachment.size)})\nURL: ${attachment.publicUrl}`;
      });
      const prefix = trimmed ? `${trimmed}\n\n` : "";
      return `${prefix}[User Attachments]\n${attachmentLines.join("\n\n")}\nUse the attachment URLs when relevant.`;
    },
    [],
  );

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
      if ((!text && pendingAttachments.length === 0) || sending || uploadingAttachments) return;
      if (!overrideText) setInput("");

      const outboundText = serializeMessageForModel(text, pendingAttachments);

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text || `Sent ${pendingAttachments.length} attachment${pendingAttachments.length > 1 ? "s" : ""}`,
        attachments: pendingAttachments,
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
      setPendingAttachments([]);
      setSending(true);
      setBallState("thinking");

      // Set up streaming TTS if enabled and voice-initiated
      const shouldStreamTTS = ttsEnabled && token && voiceInitiatedRef.current;
      let audioPlayer: AudioQueuePlayer | null = null;
      let sentenceAcc: SentenceAccumulator | null = null;

      if (shouldStreamTTS) {
        audioPlayer = new AudioQueuePlayer(
          token!,
          () => setBallState("idle"),
          (playing) => { if (playing) setBallState("speaking"); },
        );
        audioPlayerRef.current = audioPlayer;
        sentenceAcc = new SentenceAccumulator((sentence) => {
          audioPlayer!.enqueue(sentence, detectLang(sentence));
        });
        sentenceAccRef.current = sentenceAcc;
      }

      let succeeded = false;

      if (activeInstanceId && token) {
        try {
          await new Promise<void>((resolve) => {
            const ac = streamChat({
              instanceId: activeInstanceId,
              message: outboundText,
              sessionId: sessionIdRef.current,
              token,
              model: selectedModel,
              onChunk: (chunk) => {
                succeeded = true;
                if (!audioPlayer?.playing) setBallState("speaking");
                appendChunk(assistantId, chunk);
                sentenceAcc?.push(chunk);
              },
              onDone: () => {
                finalizeMessage(assistantId);
                sentenceAcc?.flush();
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
          content: serializeMessageForModel(m.content, m.attachments || []),
        }));
        history.push({ role: "user", content: outboundText });

        await new Promise<void>((resolve) => {
          const ac = streamDirectChat({
            messages: history,
            sessionId: sessionIdRef.current,
            token,
            onChunk: (chunk) => {
              if (!audioPlayer?.playing) setBallState("speaking");
              appendChunk(assistantId, chunk);
              sentenceAcc?.push(chunk);
            },
            onDone: () => {
              finalizeMessage(assistantId);
              sentenceAcc?.flush();
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
      voiceInitiatedRef.current = false;
      // If no audio queued, reset ball state immediately
      if (!audioPlayer?.playing) {
        setBallState("idle");
      }
    },
    [
      input,
      sending,
      activeInstanceId,
      token,
      selectedModel,
      messages,
      pendingAttachments,
      appendChunk,
      finalizeMessage,
      ttsEnabled,
      serializeMessageForModel,
      uploadingAttachments,
    ],
  );

  const pendingAttachmentSummary = useMemo(
    () => pendingAttachments.map((attachment) => attachment.originalName).join(", "),
    [pendingAttachments],
  );

  const handleAttachmentChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      event.target.value = "";
      if (!files.length || !token) return;

      try {
        setUploadingAttachments(true);
        const uploaded = await Promise.all(files.map((file) => uploadChatAttachment(file, token)));
        setPendingAttachments((prev) => [...prev, ...uploaded]);
      } catch (error: any) {
        window.alert(error?.message || "Failed to upload attachment");
      } finally {
        setUploadingAttachments(false);
      }
    },
    [token],
  );

  const removePendingAttachment = useCallback((fileName: string) => {
    setPendingAttachments((prev) => prev.filter((attachment) => attachment.fileName !== fileName));
  }, []);

  // Sync voiceState with ballState
  useEffect(() => {
    if (voiceState === "recording") setBallState("recording");
    else if (voiceState === "processing") setBallState("thinking");
  }, [voiceState]);

  // Handle voice transcript — auto-send with TTS
  const handleVoiceTranscript = useCallback(
    (text: string) => {
      voiceInitiatedRef.current = true;
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
    audioPlayerRef.current?.stopAll();
    sentenceAccRef.current?.reset();
    sessionIdRef.current = `session-${Date.now()}`;
    setMessages([]);
    setPendingAttachments([]);
    setBallState("idle");
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
          flexDirection: "column",
          gap: 8,
        }}
      >
        {!!pendingAttachments.length && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} title={pendingAttachmentSummary}>
            {pendingAttachments.map((attachment) => (
              <div
                key={attachment.fileName}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid var(--border)",
                  maxWidth: 260,
                }}
              >
                <span style={{ fontSize: 14 }}>{attachment.isImage ? "🖼️" : "📎"}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {attachment.originalName}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{formatBytes(attachment.size)}</div>
                </div>
                <button onClick={() => removePendingAttachment(attachment.fileName)} style={chipCloseBtnStyle}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div
          style={{
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
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleAttachmentChange}
          style={{ display: "none" }}
          accept="image/*,.pdf,.txt,.md,.csv,.json,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!token || uploadingAttachments}
          style={{
            ...iconBtnStyle,
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
            opacity: !token || uploadingAttachments ? 0.5 : 1,
          }}
          title="Attach image or file"
        >
          {uploadingAttachments ? "⏳" : "📎"}
        </button>
        <VoiceButton
          onTranscript={handleVoiceTranscript}
          voiceState={voiceState}
          onStateChange={setVoiceState}
        />
        <button
          onClick={() => handleSend()}
          disabled={(!input.trim() && pendingAttachments.length === 0) || sending || uploadingAttachments}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background:
              (input.trim() || pendingAttachments.length > 0) && !sending && !uploadingAttachments ? "var(--accent)" : "var(--bg-input)",
            color: "white",
            border: "none",
            cursor: (input.trim() || pendingAttachments.length > 0) && !sending && !uploadingAttachments ? "pointer" : "default",
            fontSize: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s",
            flexShrink: 0,
          }}
        >
          {sending || uploadingAttachments ? "⏳" : "➤"}
        </button>
        </div>
      </div>
    </div>
  );
}

function formatBytes(size: number) {
  if (!size) return "Unknown size";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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

const chipCloseBtnStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--text-dim)",
  cursor: "pointer",
  fontSize: 12,
  padding: 0,
};
