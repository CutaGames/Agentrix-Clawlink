import { type CSSProperties, useState, useCallback, useMemo, type ReactNode } from "react";
import type { ChatMessage } from "../services/store";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

function extractTextFromChildren(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(extractTextFromChildren).join("");
  if (children && typeof children === "object" && "props" in children) {
    return extractTextFromChildren((children as any).props?.children ?? "");
  }
  return "";
}

interface Props {
  message: ChatMessage;
  onRetry?: () => void;
}

export default function MessageBubble({ message, onRetry }: Props) {
  const [hovering, setHovering] = useState(false);
  const isUser = message.role === "user";
  const isError = message.error;

  // Extract <think>...</think> blocks for collapsible thinking display
  const { thinkContent, displayContent } = useMemo(() => {
    const text = message.content;
    const thinkMatch = text.match(/^<think>([\s\S]*?)<\/think>\s*/);
    if (thinkMatch) {
      return {
        thinkContent: thinkMatch[1].trim(),
        displayContent: text.slice(thinkMatch[0].length),
      };
    }
    return { thinkContent: null, displayContent: text };
  }, [message.content]);

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
      {/* Collapsible thinking block */}
      {thinkContent && <ThinkBlock content={thinkContent} />}

      {/* Markdown content — user messages render as plain text, assistant uses full markdown */}
      {displayContent && (
        isUser ? (
          <span style={{ whiteSpace: "pre-wrap" }}>{displayContent}</span>
        ) : (
          <div className="md-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                pre({ children, ...props }) {
                  // Extract code text for copy button
                  const codeText = extractTextFromChildren(children);
                  return (
                    <pre style={preStyle} {...props}>
                      {children}
                      {codeText && <CopyCodeButton code={codeText} />}
                    </pre>
                  );
                },
                code({ children, className, ...props }) {
                  const isInline = !className;
                  if (isInline) {
                    return <code style={inlineCodeStyle} {...props}>{children}</code>;
                  }
                  // Extract language label from className
                  const lang = className?.replace("language-", "") || "";
                  return (
                    <>
                      {lang && (
                        <div style={codeLangLabelStyle}>{lang}</div>
                      )}
                      <code {...props} className={className}>{children}</code>
                    </>
                  );
                },
                a({ children, href, ...props }) {
                  return <a href={href} target="_blank" rel="noreferrer" style={{ color: "var(--accent-light)" }} {...props}>{children}</a>;
                },
                table({ children, ...props }) {
                  return <table style={tableStyle} {...props}>{children}</table>;
                },
                th({ children, ...props }) {
                  return <th style={thStyle} {...props}>{children}</th>;
                },
                td({ children, ...props }) {
                  return <td style={tdStyle} {...props}>{children}</td>;
                },
              }}
            >
              {displayContent}
            </ReactMarkdown>
          </div>
        )
      )}

      {!!message.attachments?.length && (
        <div
          style={{
            marginTop: message.content ? 10 : 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {message.attachments.map((attachment) => (
            <a
              key={`${message.id}-${attachment.fileName}`}
              href={attachment.publicUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: 8,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "inherit",
                textDecoration: "none",
              }}
            >
              {attachment.isImage ? (
                <img
                  src={attachment.publicUrl}
                  alt={attachment.originalName}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 8,
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,0,0,0.24)",
                    flexShrink: 0,
                    fontSize: 22,
                  }}
                >
                  📎
                </div>
              )}
              <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {attachment.originalName}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-dim)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {attachment.mimetype} · {formatBytes(attachment.size)}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}

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

function formatBytes(size: number) {
  if (!size) return "Unknown size";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function ThinkBlock({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      style={{
        marginBottom: 8,
        padding: "6px 10px",
        borderRadius: 8,
        background: "rgba(108,92,231,0.06)",
        border: "1px solid rgba(108,92,231,0.15)",
        fontSize: 12,
        color: "var(--text-dim)",
        backgroundImage: open ? "none" : "linear-gradient(90deg, transparent, rgba(108,92,231,0.08), transparent)",
        backgroundSize: "200% 100%",
        animation: open ? "none" : "shimmerRibbon 2s linear infinite",
      }}
    >
      <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--accent-light, #A29BFE)" }}>
        💭 Thinking{open ? "" : "..."}
      </summary>
      <div style={{ marginTop: 6, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
        {content}
      </div>
    </details>
  );
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);
  return (
    <button onClick={handleCopy} style={copyCodeBtnStyle} title="Copy code">
      {copied ? "✓" : "📋"}
    </button>
  );
}

const preStyle: CSSProperties = {
  background: "rgba(13, 17, 23, 0.85)",
  backdropFilter: "blur(8px)",
  borderRadius: 8,
  padding: "32px 14px 12px 14px",
  margin: "6px 0",
  overflowX: "auto",
  fontSize: 12,
  fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace',
  lineHeight: 1.6,
  position: "relative",
  border: "1px solid rgba(255,255,255,0.06)",
};

const codeLangLabelStyle: CSSProperties = {
  position: "absolute",
  top: 6,
  left: 12,
  fontSize: 10,
  fontWeight: 600,
  color: "rgba(255,255,255,0.35)",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  fontFamily: '"Fira Code", monospace',
  pointerEvents: "none",
};

const inlineCodeStyle: CSSProperties = {
  background: "rgba(0,0,0,0.25)",
  borderRadius: 4,
  padding: "1px 5px",
  fontSize: 12,
  fontFamily: '"Fira Code", "Cascadia Code", monospace',
};

const tableStyle: CSSProperties = {
  borderCollapse: "collapse",
  width: "100%",
  margin: "8px 0",
  fontSize: 12,
};

const thStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.15)",
  padding: "6px 8px",
  textAlign: "left",
  background: "rgba(255,255,255,0.05)",
  fontWeight: 600,
};

const tdStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.1)",
  padding: "5px 8px",
};

const copyCodeBtnStyle: CSSProperties = {
  position: "absolute",
  top: 4,
  right: 4,
  width: 24,
  height: 24,
  borderRadius: 4,
  background: "rgba(255,255,255,0.08)",
  color: "var(--text-dim)",
  border: "none",
  cursor: "pointer",
  fontSize: 11,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
