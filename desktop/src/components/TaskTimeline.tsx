import { type CSSProperties } from "react";
import type { ApprovalRiskLevel } from "../services/desktop";

export type TaskRunState = "idle" | "executing" | "need-approve" | "completed" | "failed";
export type TaskTimelineStatus = "running" | "waiting-approval" | "completed" | "failed" | "rejected";

export interface TaskTimelineEntry {
  id: string;
  title: string;
  detail?: string;
  kind: string;
  riskLevel: ApprovalRiskLevel;
  status: TaskTimelineStatus;
  startedAt: number;
  finishedAt?: number;
  output?: string;
}

interface Props {
  status: TaskRunState;
  entries: TaskTimelineEntry[];
}

const statusLabel: Record<TaskRunState, string> = {
  idle: "Idle",
  executing: "Executing",
  "need-approve": "Need Approval",
  completed: "Completed",
  failed: "Failed",
};

const statusColor: Record<TaskRunState, string> = {
  idle: "var(--text-dim)",
  executing: "#7dd3fc",
  "need-approve": "#fbbf24",
  completed: "#86efac",
  failed: "#fca5a5",
};

const stepColor: Record<TaskTimelineStatus, string> = {
  running: "#7dd3fc",
  "waiting-approval": "#fbbf24",
  completed: "#86efac",
  failed: "#fca5a5",
  rejected: "#fda4af",
};

export default function TaskTimeline({ status, entries }: Props) {
  return (
    <div style={container}>
      <div style={headerRow}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 0.6 }}>
            Desktop Task
          </div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Runtime Timeline</div>
        </div>
        <div style={{ ...statusBadge, color: statusColor[status], borderColor: `${statusColor[status]}55` }}>
          {statusLabel[status]}
        </div>
      </div>

      {entries.length === 0 ? (
        <div style={emptyState}>
          Desktop actions, approvals, and command output will appear here.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {entries.slice(-6).reverse().map((entry) => (
            <div key={entry.id} style={stepCard}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ ...dot, background: stepColor[entry.status] }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{entry.title}</div>
                  {entry.detail && (
                    <div style={{ fontSize: 11, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.detail}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 3 }}>
                    {formatTimelineMeta(entry)}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{entry.riskLevel}</div>
              </div>
              {entry.output && (
                <div style={outputPreview}>{entry.output}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTimelineMeta(entry: TaskTimelineEntry) {
  const started = new Date(entry.startedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const durationMs = (entry.finishedAt || Date.now()) - entry.startedAt;
  if (durationMs < 1000) return `${started} · ${durationMs}ms`;
  if (durationMs < 60_000) return `${started} · ${(durationMs / 1000).toFixed(1)}s`;
  return `${started} · ${(durationMs / 60_000).toFixed(1)}m`;
}

const container: CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid var(--border)",
  background: "rgba(255,255,255,0.03)",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const headerRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const statusBadge: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  padding: "4px 8px",
  borderRadius: 999,
  border: "1px solid var(--border)",
  background: "rgba(255,255,255,0.03)",
};

const emptyState: CSSProperties = {
  fontSize: 12,
  color: "var(--text-dim)",
  lineHeight: 1.5,
};

const stepCard: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "8px 10px",
  background: "rgba(255,255,255,0.03)",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const dot: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  flexShrink: 0,
};

const outputPreview: CSSProperties = {
  whiteSpace: "pre-wrap",
  fontSize: 11,
  color: "var(--text-dim)",
  background: "rgba(0,0,0,0.18)",
  borderRadius: 8,
  padding: "6px 8px",
  maxHeight: 88,
  overflow: "auto",
};