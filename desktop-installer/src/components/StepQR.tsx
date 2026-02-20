import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { QrData } from '../App';

interface Props {
  className?: string;
  qrData: QrData;
  port: number;
}

export function StepQR({ className, qrData, port }: Props) {
  const [copied, setCopied] = useState(false);
  const [healthy, setHealthy] = useState(true);

  // Poll health every 10s
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const status = await invoke<{ running: boolean }>('get_openclaw_status', { port });
        setHealthy(status.running);
      } catch {
        setHealthy(false);
      }
    }, 10_000);
    return () => clearInterval(id);
  }, [port]);

  function copyUrl() {
    navigator.clipboard.writeText(qrData.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className={className} style={wrap}>
      {/* Status pill */}
      <div style={{ ...pill, background: healthy ? '#052e1622' : '#4b1022' }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: healthy ? '#22c55e' : '#ef4444',
          display: 'inline-block',
          animation: healthy ? 'pulse 2s infinite' : undefined,
        }} />
        <span style={{ fontSize: 12, color: healthy ? '#22c55e' : '#ef4444' }}>
          {healthy ? 'Agent Running' : 'Agent Offline'}
        </span>
      </div>

      <p style={title}>Scan to connect your phone</p>
      <p style={sub}>Open the Agentrix app and tap <strong style={{ color: '#e8ecf4' }}>Local Deploy</strong> → Scan QR</p>

      {/* QR Code — glowing border */}
      <div style={{
        ...qrBox,
        animation: 'glow 3s ease-in-out infinite',
      }}>
        {qrData.qrBase64 ? (
          <img
            src={qrData.qrBase64}
            alt="Agentrix connect QR"
            style={{ width: '100%', height: '100%', borderRadius: 10, imageRendering: 'pixelated' }}
          />
        ) : (
          <div style={{ color: '#6b7280', fontSize: 12 }}>Generating QR…</div>
        )}
      </div>

      {/* URL display + copy */}
      <div style={urlRow}>
        <span style={{ fontSize: 12, color: '#6b7280', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {qrData.url}
        </span>
        <button onClick={copyUrl} style={copyBtn}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      <p style={hint}>
        Keep this window open while using Agentrix. Your agent runs locally on this PC.
      </p>
    </div>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const wrap: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
};

const pill: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '4px 12px', borderRadius: 20,
  border: '1px solid #1f2937',
};

const title: React.CSSProperties = {
  fontSize: 17, fontWeight: 800, color: '#e8ecf4', textAlign: 'center', marginTop: 2,
};

const sub: React.CSSProperties = {
  fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 1.5, marginTop: -4,
};

const qrBox: React.CSSProperties = {
  width: 220, height: 220,
  background: '#fff',
  borderRadius: 14,
  padding: 8,
  border: '2px solid #3b82f6',
  marginTop: 4,
};

const urlRow: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
  background: '#1f2937', borderRadius: 8, padding: '8px 12px',
};

const copyBtn: React.CSSProperties = {
  background: '#3b82f6', color: '#fff', border: 'none',
  borderRadius: 6, padding: '4px 10px', fontSize: 11,
  fontWeight: 700, cursor: 'pointer', flexShrink: 0,
};

const hint: React.CSSProperties = {
  fontSize: 11, color: '#4b5563', textAlign: 'center', lineHeight: 1.5,
};
