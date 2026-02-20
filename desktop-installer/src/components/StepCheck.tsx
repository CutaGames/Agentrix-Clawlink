export function StepCheck({ className }: { className?: string }) {
  return (
    <div className={className} style={wrap}>
      <div style={spinner} />
      <p style={title}>Checking your system…</p>
      <p style={sub}>Detecting Ollama and local environment</p>
    </div>
  );
}

const wrap: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '8px 0',
};

const spinner: React.CSSProperties = {
  width: 44, height: 44, borderRadius: '50%',
  border: '3px solid #1f2937',
  borderTop: '3px solid #3b82f6',
  animation: 'spin 0.9s linear infinite',
  marginBottom: 4,
};

const title: React.CSSProperties = {
  fontSize: 16, fontWeight: 700, color: '#e8ecf4',
};

const sub: React.CSSProperties = {
  fontSize: 13, color: '#6b7280', textAlign: 'center',
};

// React needs to be imported for JSX even if not used directly
import React from 'react';
