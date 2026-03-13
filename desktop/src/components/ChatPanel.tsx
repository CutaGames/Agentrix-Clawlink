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
import {
  getWorkspaceDir,
  listWorkspaceDir,
  readWorkspaceFile,
  writeWorkspaceFile,
} from "../services/workspace";

// Send desktop notification when app is in background
async function notifyIfBackground(title: string, body: string) {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    const focused = await win.isFocused();
    if (!focused) {
      const { sendNotification, isPermissionGranted, requestPermission } =
        await import("@tauri-apps/plugin-notification");
      let permitted = await isPermissionGranted();
      if (!permitted) permitted = (await requestPermission()) === "granted";
      if (permitted) sendNotification({ title, body: body.slice(0, 100) });
    }
  } catch {}
}

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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [models, setModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [workspaceDir, setWorkspaceDirState] = useState<string | null>(null);
  const sessionIdRef = useRef(`session-${Date.now()}`);
  const abortRef = useRef<AbortController | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioPlayerRef = useRef<AudioQueuePlayer | null>(null);
  const sentenceAccRef = useRef<SentenceAccumulator | null>(null);
  // Track whether the current send was voice-initiated for auto-TTS
  const voiceInitiatedRef = useRef(false);

  // Load workspace directory
  useEffect(() => {
    getWorkspaceDir().then(setWorkspaceDirState).catch(() => {});
    const onSettings = () => getWorkspaceDir().then(setWorkspaceDirState).catch(() => {});
    window.addEventListener("agentrix:workspace-changed", onSettings);
    return () => window.removeEventListener("agentrix:workspace-changed", onSettings);
  }, []);

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

  // Persist current session to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(
        `chat_session_${sessionIdRef.current}`,
        JSON.stringify(messages.slice(-80)),
      );
      // Update session index
      saveSessionToIndex(sessionIdRef.current, messages);
    }
  }, [messages]);

  // Load persisted messages for current session
  useEffect(() => {
    const stored = localStorage.getItem(`chat_session_${sessionIdRef.current}`);
    if (stored) {
      try {
        setMessages(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const serializeMessageForModel = useCallback(
    (content: string, attachments: ChatAttachment[] = []) => {
      const trimmed = content.trim();
      let result = trimmed;
      if (attachments.length > 0) {
        const attachmentLines = attachments.map((attachment, index) => {
          const label = attachment.kind === "image" ? "Image" : "File";
          return `${index + 1}. ${label}: ${attachment.originalName} (${attachment.mimetype}, ${formatBytes(attachment.size)})\nURL: ${attachment.publicUrl}`;
        });
        const prefix = trimmed ? `${trimmed}\n\n` : "";
        result = `${prefix}[User Attachments]\n${attachmentLines.join("\n\n")}\nUse the attachment URLs when relevant.`;
      }
      // Add workspace context for coding tasks
      if (workspaceDir) {
        result += `\n\n[Desktop Workspace: ${workspaceDir}]\nYou have access to read and write files in this workspace. When performing coding tasks, reference files by relative path. Use code blocks with file paths to suggest edits.`;
      }
      return result;
    },
    [workspaceDir],
  );

  const appendChunk = useCallback((msgId: string, chunk: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, content: m.content + chunk } : m,
      ),
    );
  }, []);

  const finalizeMessage = useCallback((msgId: string) => {
    setMessages((prev) => {
      const updated = prev.map((m) =>
        m.id === msgId ? { ...m, streaming: false } : m,
      );
      // Notify if window not focused
      const msg = updated.find((m) => m.id === msgId);
      if (msg) {
        notifyIfBackground("Agentrix", msg.content.slice(0, 100));
      }
      return updated;
    });
  }, []);

  // Handle slash commands locally
  const handleSlashCommand = useCallback(async (text: string): Promise<boolean> => {
    const trimmed = text.trim();

    // /new — new chat
    if (trimmed === "/new" || trimmed === "/clear") {
      abortRef.current?.abort();
      audioPlayerRef.current?.stopAll();
      sentenceAccRef.current?.reset();
      sessionIdRef.current = `session-${Date.now()}`;
      setMessages([]);
      setPendingAttachments([]);
      setBallState("idle");
      return true;
    }

    // /ls [path] — list workspace directory
    if (trimmed.startsWith("/ls")) {
      const relPath = trimmed.slice(3).trim();
      try {
        const entries = await listWorkspaceDir(relPath);
        const listing = entries.map(e => `${e.is_dir ? "📁" : "📄"} ${e.name}${e.is_dir ? "/" : ` (${formatBytes(e.size)})`}`).join("\n");
        addSystemMessage(`📂 ${relPath || "."}\n\n${listing || "(empty)"}`);
      } catch (err: any) {
        addSystemMessage(`❌ ${err?.message || err}`);
      }
      return true;
    }

    // /read <path> — read file content
    if (trimmed.startsWith("/read ")) {
      const relPath = trimmed.slice(6).trim();
      try {
        const content = await readWorkspaceFile(relPath);
        const ext = relPath.split(".").pop() || "";
        addSystemMessage(`📄 ${relPath}\n\n\`\`\`${ext}\n${content}\n\`\`\``);
      } catch (err: any) {
        addSystemMessage(`❌ ${err?.message || err}`);
      }
      return true;
    }

    // /write <path> <content> — write file (content after first space of path)
    if (trimmed.startsWith("/write ")) {
      const rest = trimmed.slice(7).trim();
      const spaceIdx = rest.indexOf(" ");
      if (spaceIdx < 0) {
        addSystemMessage("Usage: /write <path> <content>");
        return true;
      }
      const relPath = rest.slice(0, spaceIdx);
      const content = rest.slice(spaceIdx + 1);
      try {
        await writeWorkspaceFile(relPath, content);
        addSystemMessage(`✅ Written to ${relPath}`);
      } catch (err: any) {
        addSystemMessage(`❌ ${err?.message || err}`);
      }
      return true;
    }

    // /model <name> — switch model
    if (trimmed.startsWith("/model ")) {
      const modelArg = trimmed.slice(7).trim();
      const match = models.find(m => m.id === modelArg || m.label?.toLowerCase().includes(modelArg.toLowerCase()));
      if (match) {
        setSelectedModel(match.id);
        addSystemMessage(`✅ Switched to model: ${match.label || match.id}`);
      } else {
        addSystemMessage(`❌ Model not found. Available: ${models.map(m => m.id).join(", ")}`);
      }
      return true;
    }

    // /search <query> — web search via backend
    if (trimmed.startsWith("/search ")) {
      const query = trimmed.slice(8).trim();
      if (!query) { addSystemMessage("Usage: /search <query>"); return true; }
      addSystemMessage(`🔍 Searching: "${query}"...`);
      try {
        const { apiFetch, API_BASE } = await import("../services/store");
        const res = await apiFetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const results = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);
        if (results.length === 0) {
          addSystemMessage(`🔍 No results found for "${query}"`);
        } else {
          const formatted = results.slice(0, 5).map((r: any, i: number) =>
            `${i + 1}. **${r.title || r.name || "Result"}**\n   ${r.snippet || r.description || r.url || ""}`
          ).join("\n\n");
          addSystemMessage(`🔍 Search results for "${query}":\n\n${formatted}`);
        }
      } catch (err: any) {
        addSystemMessage(`❌ Search error: ${err?.message || err}`);
      }
      return true;
    }

    // /skill [name] — list or use marketplace skills
    if (trimmed === "/skill" || trimmed.startsWith("/skill ")) {
      const skillArg = trimmed.slice(6).trim();
      try {
        const { apiFetch, API_BASE } = await import("../services/store");
        if (!skillArg) {
          // List available skills
          const res = await apiFetch(`${API_BASE}/skills`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          const skills = Array.isArray(data.skills) ? data.skills : (Array.isArray(data) ? data : []);
          if (skills.length === 0) {
            addSystemMessage("🧩 No skills available. Visit the marketplace to install skills.");
          } else {
            const list = skills.slice(0, 10).map((s: any) =>
              `• **${s.name || s.id}** — ${s.description || "No description"}`
            ).join("\n");
            addSystemMessage(`🧩 Available Skills:\n\n${list}\n\nUse \`/skill <name>\` to activate.`);
          }
        } else {
          // Activate a specific skill
          addSystemMessage(`🧩 Activating skill: "${skillArg}"...`);
          const res = await apiFetch(`${API_BASE}/skills/${encodeURIComponent(skillArg)}/activate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          addSystemMessage(`✅ Skill "${skillArg}" activated. ${data.message || ""}`);
        }
      } catch (err: any) {
        addSystemMessage(`❌ Skill error: ${err?.message || err}`);
      }
      return true;
    }

    // /help — show available commands
    if (trimmed === "/help") {
      addSystemMessage(
        "📖 **Available Commands:**\n\n" +
        "• `/new` or `/clear` — Start new chat\n" +
        "• `/ls [path]` — List workspace directory\n" +
        "• `/read <path>` — Read file content\n" +
        "• `/write <path> <content>` — Write to file\n" +
        "• `/model <name>` — Switch AI model\n" +
        "• `/search <query>` — Web search\n" +
        "• `/skill [name]` — List or activate skills\n" +
        "• `/history` — Show session info\n" +
        "• `/help` — Show this help"
      );
      return true;
    }

    // /history — show session info
    if (trimmed === "/history") {
      addSystemMessage(`Session: ${sessionIdRef.current}\nMessages: ${messages.length}\nInstance: ${activeInstanceId || "none"}`);
      return true;
    }

    return false;
  }, [models, messages, activeInstanceId]);

  const addSystemMessage = useCallback((content: string) => {
    setMessages(prev => [...prev, {
      id: `sys-${Date.now()}`,
      role: "assistant" as const,
      content,
      createdAt: Date.now(),
    }]);
  }, []);

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText || input).trim();
      if ((!text && pendingAttachments.length === 0) || sending || uploadingAttachments) return;
      if (!overrideText) setInput("");

      // Handle slash commands locally
      if (text.startsWith("/") && pendingAttachments.length === 0) {
        const handled = await handleSlashCommand(text);
        if (handled) return;
      }

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
      handleSlashCommand,
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

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only hide overlay when leaving the panel itself
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
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
    setHistoryOpen(false);
  };

  const loadSession = useCallback((sid: string) => {
    const stored = localStorage.getItem(`chat_session_${sid}`);
    if (stored) {
      try {
        abortRef.current?.abort();
        audioPlayerRef.current?.stopAll();
        sentenceAccRef.current?.reset();
        sessionIdRef.current = sid;
        setMessages(JSON.parse(stored));
        setPendingAttachments([]);
        setBallState("idle");
        setHistoryOpen(false);
      } catch {}
    }
  }, []);

  const deleteSession = useCallback((sid: string) => {
    localStorage.removeItem(`chat_session_${sid}`);
    removeSessionFromIndex(sid);
    // Force re-render by closing and reopening history
    setHistoryOpen(false);
    setTimeout(() => setHistoryOpen(true), 0);
  }, []);

  // Listen for custom events from tray / floating ball context menu
  useEffect(() => {
    const onNewChat = () => handleNewChat();
    const onOpenSettings = () => setSettingsOpen(true);
    window.addEventListener("agentrix:new-chat", onNewChat);
    window.addEventListener("agentrix:open-settings", onOpenSettings);
    return () => {
      window.removeEventListener("agentrix:new-chat", onNewChat);
      window.removeEventListener("agentrix:open-settings", onOpenSettings);
    };
  }, []);

  // Auto-close chat-panel window when it loses focus (click outside)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        if (win.label === "chat-panel") {
          unlisten = await win.onFocusChanged(({ payload: focused }) => {
            if (!focused) {
              onClose();
            }
          });
        }
      } catch {
        // Not in Tauri — no-op
      }
    })();
    return () => unlisten?.();
  }, [onClose]);

  const panel: CSSProperties = {
    position: "relative",
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
    <div
      style={panel}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag-and-drop overlay */}
      {isDragOver && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(99, 102, 241, 0.15)",
            border: "2px dashed var(--accent)",
            borderRadius: "inherit",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--accent)" }}>
            Drop files here to attach
          </div>
        </div>
      )}

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
        <button onClick={() => setHistoryOpen(!historyOpen)} style={iconBtnStyle} title="Chat History">
          📋
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

      {/* History sidebar */}
      {historyOpen && (
        <div style={{
          position: "absolute",
          top: 52,
          left: 0,
          right: 0,
          bottom: 0,
          background: "var(--bg-panel)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          borderTop: "1px solid var(--border)",
        }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Chat History</span>
            <button onClick={() => setHistoryOpen(false)} style={iconBtnStyle}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {getSessionIndex().length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-dim)", padding: 40, fontSize: 13 }}>
                No saved conversations yet
              </div>
            ) : (
              getSessionIndex()
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((s) => (
                <div
                  key={s.id}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: s.id === sessionIdRef.current ? "rgba(108,92,231,0.15)" : "transparent",
                    border: s.id === sessionIdRef.current ? "1px solid rgba(108,92,231,0.3)" : "1px solid transparent",
                    marginBottom: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "background 0.15s",
                  }}
                  onClick={() => loadSession(s.id)}
                  onMouseEnter={(e) => { if (s.id !== sessionIdRef.current) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(e) => { if (s.id !== sessionIdRef.current) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                      {s.messageCount} messages · {new Date(s.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                    style={{ ...iconBtnStyle, width: 20, height: 20, fontSize: 10, opacity: 0.5 }}
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
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
              Ctrl+Shift+A for voice · Type / for commands
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
          placeholder="Type a message... (/ for commands)"
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

// ─── Session history index (localStorage) ───────────────
interface SessionEntry {
  id: string;
  title: string;
  updatedAt: number;
  messageCount: number;
}

const SESSION_INDEX_KEY = "agentrix_sessions";

function getSessionIndex(): SessionEntry[] {
  try {
    return JSON.parse(localStorage.getItem(SESSION_INDEX_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveSessionToIndex(sessionId: string, messages: ChatMessage[]) {
  const index = getSessionIndex();
  const firstUserMsg = messages.find((m) => m.role === "user");
  const title = firstUserMsg
    ? firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? "..." : "")
    : "New Chat";
  const existing = index.findIndex((s) => s.id === sessionId);
  const entry: SessionEntry = {
    id: sessionId,
    title,
    updatedAt: Date.now(),
    messageCount: messages.length,
  };
  if (existing >= 0) {
    index[existing] = entry;
  } else {
    index.unshift(entry);
  }
  // Keep at most 50 sessions
  const trimmed = index.slice(0, 50);
  localStorage.setItem(SESSION_INDEX_KEY, JSON.stringify(trimmed));
}

function removeSessionFromIndex(sessionId: string) {
  const index = getSessionIndex().filter((s) => s.id !== sessionId);
  localStorage.setItem(SESSION_INDEX_KEY, JSON.stringify(index));
}
// ──────────────────────────────────────────────────────

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
