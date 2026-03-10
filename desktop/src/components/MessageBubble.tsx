import { type CSSProperties, useState } from "react";
import type { ChatMessage } from "../services/store";

interface Props {
  message: ChatMessage;
  onRetry?: () => void;
}

export default function MessageBubble({ message, onRetry }: Props) {
  const [hovering, setHovering] = useState(false);
  const isUser = message.role === "user";
  const isError = message.error;

  const bubble: CSSProperties = {
    maxWidth: "85%",
    padding: "10px 14px",
    borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
    background: isError
      ? "rgba(239, 68, 68, 0.15)"
      : isUser
        ? "var(--accent)"
        : "rgba(255,255,255,0.06)",
    color: isError ? "#f87171" : "var(--text)",
    alignSelf: isUser ? "flex-end" : "flex-start",
    fontSize: 14,
    lineHeight: 1.55,
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    animation: "fadeInUp 0.2s ease-out",
    position: "relative",
    border: isError ? "1px solid rgba(239, 68, 68, 0.3)" : "none",
  };

  return (
    <div
      style={bubble}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {renderContent(message.content, message.streaming)}

      {/* Retry button for error messages */}
      {isError && onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: 6,
            padding: "4px 10px",
            borderRadius: 6,
            background: "rgba(239, 68, 68, 0.2)",
            color: "#f87171",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          ↻ Retry
        </button>
      )}

      {/* Streaming cursor */}
      {message.streaming && (
        <span style={{ display: "inline-block", animation: "dotPulse 1.2s infinite" }}>
          ▋
        </span>
      )}

      {/* Copy button on hover */}
      {hovering && !isError && !message.streaming && message.content && (
        <button
          onClick={() => navigator.clipboard.writeText(message.content)}
          style={{
            position: "absolute",
            top: -8,
            right: isUser ? "auto" : -8,
            left: isUser ? -8 : "auto",
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "var(--bg-dark)",
            color: "var(--text-dim)",
            border: "1px solid var(--border)",
            cursor: "pointer",
            fontSize: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Copy"
        >
          📋
        </button>
      )}
    </div>
  );
}

/**
 * Simple markdown-like rendering for code blocks and bold.
 * Keeps it lightweight without pulling in a large markdown lib for the MVP.
 */
function renderContent(text: string, streaming?: boolean) {
  if (!text) return null;

  // Split by code blocks
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, i) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const inner = part.slice(3, -3);
      const newlineIdx = inner.indexOf("\n");
      const lang = newlineIdx > 0 ? inner.slice(0, newlineIdx).trim() : "";
      const code = newlineIdx > 0 ? inner.slice(newlineIdx + 1) : inner;

      return (
        <pre
          key={i}
          style={{
            background: "rgba(0,0,0,0.3)",
            borderRadius: 8,
            padding: "10px 12px",
            margin: "6px 0",
            overflowX: "auto",
            fontSize: 12,
            fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace',
            lineHeight: 1.5,
          }}
        >
          {lang && (
            <div
              style={{
                fontSize: 10,
                color: "var(--text-dim)",
                marginBottom: 4,
                textTransform: "uppercase",
              }}
            >
              {lang}
            </div>
          )}
          <code>{code}</code>
        </pre>
      );
    }

    // Inline code
    const inlineParts = part.split(/(`[^`]+`)/g);
    return (
      <span key={i}>
        {inlineParts.map((ip, j) => {
          if (ip.startsWith("`") && ip.endsWith("`")) {
            return (
              <code
                key={j}
                style={{
                  background: "rgba(0,0,0,0.25)",
                  borderRadius: 4,
                  padding: "1px 5px",
                  fontSize: 12,
                  fontFamily: '"Fira Code", "Cascadia Code", monospace',
                }}
              >
                {ip.slice(1, -1)}
              </code>
            );
          }
          // Bold
          const boldParts = ip.split(/(\*\*[^*]+\*\*)/g);
          return boldParts.map((bp, k) => {
            if (bp.startsWith("**") && bp.endsWith("**")) {
              return (
                <strong key={`${j}-${k}`}>{bp.slice(2, -2)}</strong>
              );
            }
            return <span key={`${j}-${k}`}>{bp}</span>;
          });
        })}
      </span>
    );
  });
}
