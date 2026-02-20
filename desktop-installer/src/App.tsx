import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { StepCheck } from './components/StepCheck';
import { StepInstalling } from './components/StepInstalling';
import { StepQR } from './components/StepQR';

export type AppStep = 'checking' | 'installing' | 'starting' | 'ready' | 'error';

export interface ProgressEvent {
  step: string;
  message: string;
  percent: number;
  error?: string;
}

export interface OsInfo {
  platform: 'windows' | 'macos' | 'linux';
  arch: string;
  ollamaInstalled: boolean;
  ollamaVersion?: string;
}

export interface QrData {
  url: string;
  token: string;
  qrBase64: string;
}

const css = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
  @keyframes glow {
    0%,100% { box-shadow: 0 0 18px rgba(99,179,237,0.3); }
    50% { box-shadow: 0 0 36px rgba(99,179,237,0.65); }
  }
  .screen { animation: fadeIn 0.35s ease both; }
`;

export default function App() {
  const [step, setStep] = useState<AppStep>('checking');
  const [osInfo, setOsInfo] = useState<OsInfo | null>(null);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [qrData, setQrData] = useState<QrData | null>(null);
  const [runningPort, setRunningPort] = useState<number>(11434);
  const [errorMsg, setErrorMsg] = useState('');

  // Listen for progress events from the Rust backend
  useEffect(() => {
    const unlisten = listen<ProgressEvent>('install-progress', (e) => {
      setProgress(e.payload);
      if (e.payload.step === 'ready') {
        setStep('ready');
      } else if (e.payload.error) {
        setErrorMsg(e.payload.error);
        setStep('error');
      }
    });
    return () => { unlisten.then(fn => fn()); };
  }, []);

  // On mount: detect OS + check Ollama
  useEffect(() => {
    (async () => {
      try {
        const info = await invoke<OsInfo>('get_os_info');
        setOsInfo(info);

        if (info.ollamaInstalled) {
          // Ollama is already installed — skip to starting
          setStep('starting');
          await launchOpenClaw();
        } else {
          // Need to install Ollama first
          setStep('installing');
          await invoke('install_ollama');
          setStep('starting');
          await launchOpenClaw();
        }
      } catch (err: any) {
        setErrorMsg(String(err));
        setStep('error');
      }
    })();
  }, []);

  async function launchOpenClaw() {
    try {
      const status = await invoke<{ running: boolean; port?: number; url?: string }>(
        'start_openclaw',
      );
      const port = status.port ?? 11434;
      setRunningPort(port);

      // Fetch QR
      const qr = await invoke<QrData>('get_qr_data', { port });
      setQrData(qr);
      setStep('ready');
    } catch (err: any) {
      setErrorMsg(String(err));
      setStep('error');
    }
  }

  async function handleRetry() {
    setStep('checking');
    setErrorMsg('');
    setProgress(null);
    // Re-run the full flow
    try {
      const info = await invoke<OsInfo>('get_os_info');
      setOsInfo(info);
      setStep('starting');
      await launchOpenClaw();
    } catch (err: any) {
      setErrorMsg(String(err));
      setStep('error');
    }
  }

  const isLoading = step === 'checking' || step === 'installing' || step === 'starting';

  return (
    <>
      <style>{css}</style>
      <div style={{
        width: '100%', height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 32, gap: 0,
        background: 'linear-gradient(160deg, #0d0f14 0%, #111827 100%)',
      }}>
        {/* Logo / brand */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⚡</div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1, color: '#e8ecf4' }}>
            AGENTRIX
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Local Agent Setup</div>
        </div>

        {/* Main card */}
        <div style={{
          width: '100%', maxWidth: 380,
          background: '#171b24',
          borderRadius: 20,
          border: '1px solid #1f2937',
          padding: 28,
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        }}>
          {step === 'checking' && (
            <StepCheck className="screen" />
          )}
          {(step === 'installing' || step === 'starting') && (
            <StepInstalling
              className="screen"
              step={step}
              progress={progress}
              osInfo={osInfo}
            />
          )}
          {step === 'ready' && qrData && (
            <StepQR
              className="screen"
              qrData={qrData}
              port={runningPort}
            />
          )}
          {step === 'error' && (
            <div className="screen" style={{ textAlign: 'center', gap: 16, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 40 }}>⚠️</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#f87171' }}>Setup Failed</p>
              <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.6 }}>{errorMsg}</p>
              <button onClick={handleRetry} style={btn}>Retry</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const btn: React.CSSProperties = {
  background: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: '11px 24px',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  marginTop: 8,
};
