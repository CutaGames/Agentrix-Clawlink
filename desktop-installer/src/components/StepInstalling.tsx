import React from 'react';
import { AppStep, OsInfo, ProgressEvent } from '../App';

interface Props {
  className?: string;
  step: AppStep;
  progress: ProgressEvent | null;
  osInfo: OsInfo | null;
}

const STAGE_LABELS: Record<string, string> = {
  checking:    'Checking system…',
  downloading: 'Downloading Ollama…',
  installing:  'Installing Ollama…',
  pulling:     'Pulling OpenClaw model (first run ~2 GB)…',
  starting:    'Starting local agent…',
  ready:       'Agent running!',
};

const STAGE_ICON: Record<string, string> = {
  checking:    '🔍',
  downloading: '⬇️',
  installing:  '📦',
  pulling:     '🤖',
  starting:    '🚀',
  ready:       '✅',
};

export function StepInstalling({ className, step, progress, osInfo }: Props) {
  const percent = progress?.percent ?? (step === 'starting' ? 15 : 0);
  const stageKey = progress?.step ?? (step === 'installing' ? 'installing' : 'starting');
  const label = progress?.message ?? STAGE_LABELS[stageKey] ?? 'Working…';
  const icon = STAGE_ICON[stageKey] ?? '⚙️';

  const os = osInfo?.platform ?? '';

  return (
    <div className={className} style={wrap}>
      <div style={{ fontSize: 36, marginBottom: 4 }}>{icon}</div>
      <p style={title}>{label}</p>

      {/* Progress bar */}
      <div style={barTrack}>
        <div
          style={{
            ...barFill,
            width: `${percent}%`,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
      <p style={pct}>{percent}%</p>

      {/* Step checklist */}
      <div style={checklist}>
        <CheckRow
          done={osInfo !== null}
          active={osInfo === null}
          label="Detect OS"
          detail={os ? `${os} ${osInfo?.arch ?? ''}` : undefined}
        />
        <CheckRow
          done={osInfo?.ollamaInstalled ?? stageKey !== 'downloading' && stageKey !== 'installing'}
          active={stageKey === 'downloading' || stageKey === 'installing'}
          label="Install Ollama runtime"
          detail={osInfo?.ollamaVersion}
        />
        <CheckRow
          done={stageKey === 'starting' || stageKey === 'ready'}
          active={stageKey === 'pulling'}
          label="Pull OpenClaw model"
        />
        <CheckRow
          done={stageKey === 'ready'}
          active={stageKey === 'starting'}
          label="Start local agent"
        />
      </div>
    </div>
  );
}

function CheckRow({
  done, active, label, detail,
}: { done: boolean; active: boolean; label: string; detail?: string }) {
  const color = done ? '#22c55e' : active ? '#3b82f6' : '#374151';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        background: done ? '#22c55e22' : active ? '#3b82f622' : '#1f2937',
        border: `1.5px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: active ? 'pulse 1.4s infinite' : undefined,
        flexShrink: 0,
      }}>
        {done && <span style={{ fontSize: 10, color: '#22c55e' }}>✓</span>}
        {active && <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#3b82f6',
        }} />}
      </div>
      <span style={{ fontSize: 13, color: done ? '#9ca3af' : active ? '#e8ecf4' : '#4b5563', flex: 1 }}>
        {label}
        {detail && <span style={{ color: '#6b7280', marginLeft: 4 }}>({detail})</span>}
      </span>
    </div>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const wrap: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
};

const title: React.CSSProperties = {
  fontSize: 14, fontWeight: 600, color: '#d1d5db', textAlign: 'center',
};

const barTrack: React.CSSProperties = {
  width: '100%', height: 8,
  background: '#1f2937', borderRadius: 4,
  overflow: 'hidden',
};

const barFill: React.CSSProperties = {
  height: '100%',
  background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
  borderRadius: 4,
  boxShadow: '0 0 8px rgba(59,130,246,0.6)',
};

const pct: React.CSSProperties = {
  fontSize: 12, color: '#6b7280', marginTop: -8,
};

const checklist: React.CSSProperties = {
  width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4,
};
