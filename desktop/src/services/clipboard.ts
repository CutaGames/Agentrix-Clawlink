/**
 * Clipboard intelligence service.
 *
 * Polls the system clipboard every 2 seconds. When new text is detected,
 * fires a custom event so the FloatingBall can show quick-action options
 * (translate, summarize, explain, rewrite).
 */

let _polling = false;
let _pollTimer: ReturnType<typeof setInterval> | null = null;
let _lastClipText = "";

export interface ClipboardCapture {
  text: string;
  timestamp: number;
}

/** Start watching clipboard for changes */
export function startClipboardWatch() {
  if (_polling) return;
  _polling = true;

  // Seed with current clipboard if available
  readClipboard().then(t => { _lastClipText = t; }).catch(() => {});

  _pollTimer = setInterval(async () => {
    try {
      const text = await readClipboard();
      if (text && text !== _lastClipText && text.trim().length >= 2) {
        _lastClipText = text;
        window.dispatchEvent(
          new CustomEvent<ClipboardCapture>("agentrix:clipboard-capture", {
            detail: { text: text.slice(0, 2000), timestamp: Date.now() },
          }),
        );
      }
    } catch { /* clipboard read failed, skip */ }
  }, 2000);
}

/** Stop watching clipboard */
export function stopClipboardWatch() {
  _polling = false;
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
}

async function readClipboard(): Promise<string> {
  // Prefer Tauri clipboard plugin if available
  try {
    const { readText } = await import("@tauri-apps/plugin-clipboard-manager");
    const t = await readText();
    return t ?? "";
  } catch { /* not in Tauri or plugin not loaded */ }

  // Fallback to browser Clipboard API (requires focus)
  try {
    return await navigator.clipboard.readText();
  } catch {
    return "";
  }
}

/** Quick-action types the user can pick from the clipboard badge */
export type ClipboardAction = "translate" | "summarize" | "explain" | "rewrite" | "ask";

/** Build the prompt for a clipboard quick-action */
export function buildClipboardPrompt(action: ClipboardAction, text: string): string {
  const truncated = text.slice(0, 1500);
  switch (action) {
    case "translate":
      return `Translate the following text. If it's in Chinese, translate to English; if in English, translate to Chinese. Keep formatting.\n\n${truncated}`;
    case "summarize":
      return `Summarize the following text concisely:\n\n${truncated}`;
    case "explain":
      return `Explain the following text in simple terms:\n\n${truncated}`;
    case "rewrite":
      return `Rewrite the following text to be clearer and more polished:\n\n${truncated}`;
    case "ask":
      return truncated;
  }
}
