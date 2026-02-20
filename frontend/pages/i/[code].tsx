import { GetServerSideProps, NextPage } from 'next';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

interface Props {
  code: string;
  skillName?: string;
  inviterName?: string;
  type?: 'invite' | 'skill' | 'agent_result' | 'install_success';
  resolved?: boolean;
}

const DOWNLOAD_LINKS = {
  ios: 'https://apps.apple.com/app/clawlink/id0000000000',
  android: 'https://play.google.com/store/apps/details?id=app.clawlink.mobile',
  apk: 'https://dl.clawlink.app/clawlink-latest.apk',
};

function getOS(): 'ios' | 'android' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

const ShareLandingPage: NextPage<Props> = ({ code, skillName, inviterName, type }) => {
  const router = useRouter();
  const [os, setOs] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [deepLinkTried, setDeepLinkTried] = useState(false);

  useEffect(() => {
    setOs(getOS());
  }, []);

  useEffect(() => {
    if (!deepLinkTried) {
      // Try to open app via deep link
      const deepLink = `clawlink://i/${code}`;
      window.location.href = deepLink;
      setDeepLinkTried(true);
    }
  }, [code, deepLinkTried]);

  const title = type === 'skill' && skillName
    ? `${skillName} — Install to your AI Agent`
    : inviterName
    ? `${inviterName} invites you to ClawLink`
    : 'ClawLink — Your AI Agent Companion';

  const description = type === 'skill' && skillName
    ? `One-tap install "${skillName}" to your OpenClaw agent with ClawLink.`
    : `Get your own AI agent powered by OpenClaw in 30 seconds, for free. No credit card needed.`;

  const downloadLink =
    os === 'ios' ? DOWNLOAD_LINKS.ios :
    os === 'android' ? DOWNLOAD_LINKS.android :
    DOWNLOAD_LINKS.apk;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="https://clawlink.app/og-image.png" />
        <meta property="og:url" content={`https://clawlink.app/i/${code}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* App-specific meta */}
        <meta name="apple-itunes-app" content="app-id=0000000000" />
        <meta name="google-play-app" content="app-id=app.clawlink.mobile" />
      </Head>

      <div style={styles.page}>
        <div style={styles.card}>
          {/* Logo */}
          <div style={styles.logo}>🦀</div>
          <h1 style={styles.title}>ClawLink</h1>
          <p style={styles.tagline}>Your OpenClaw AI Agent Companion</p>

          {inviterName && (
            <div style={styles.inviteBanner}>
              <span style={styles.inviteEmoji}>👋</span>
              <p style={styles.inviteText}>
                <strong>{inviterName}</strong> invited you to ClawLink
              </p>
            </div>
          )}

          {skillName && type === 'skill' && (
            <div style={styles.skillBanner}>
              <span style={styles.skillEmoji}>⚡</span>
              <p style={styles.skillText}>
                Install skill: <strong>{skillName}</strong>
              </p>
            </div>
          )}

          {/* Value Props */}
          <div style={styles.features}>
            {[
              { icon: '🚀', text: 'Cloud agent ready in 30 seconds' },
              { icon: '🆓', text: 'Free forever, no credit card' },
              { icon: '⚡', text: '1-tap skill install from market' },
              { icon: '🔗', text: 'Works with existing OpenClaw' },
            ].map((f, i) => (
              <div key={i} style={styles.featureRow}>
                <span style={styles.featureIcon}>{f.icon}</span>
                <span style={styles.featureText}>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Download CTAs */}
          <div style={styles.ctaSection}>
            {os === 'ios' ? (
              <a href={DOWNLOAD_LINKS.ios} style={{ ...styles.btn, ...styles.btnPrimary }}>
                📱 Download on App Store
              </a>
            ) : os === 'android' ? (
              <>
                <a href={DOWNLOAD_LINKS.android} style={{ ...styles.btn, ...styles.btnPrimary }}>
                  🤖 Get on Google Play
                </a>
                <a href={DOWNLOAD_LINKS.apk} style={{ ...styles.btn, ...styles.btnSecondary }}>
                  📦 Download APK
                </a>
              </>
            ) : (
              <a href="https://clawlink.app" style={{ ...styles.btn, ...styles.btnPrimary }}>
                🌐 Open ClawLink Web
              </a>
            )}
          </div>

          <p style={styles.ref}>
            Referral code: <code style={styles.code}>{code}</code>
          </p>
        </div>
      </div>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0B1220 0%, #111827 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  card: {
    background: '#1a2235',
    border: '1px solid #2a3a52',
    borderRadius: '24px',
    padding: '40px 32px',
    maxWidth: '420px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  logo: { fontSize: '56px', marginBottom: '8px' },
  title: { color: '#f0f6ff', fontSize: '28px', fontWeight: 800, margin: '0 0 6px' },
  tagline: { color: '#8ba3be', fontSize: '15px', margin: '0 0 24px' },
  inviteBanner: {
    background: 'rgba(26, 119, 224, 0.15)',
    border: '1px solid rgba(26, 119, 224, 0.4)',
    borderRadius: '12px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    textAlign: 'left',
  },
  inviteEmoji: { fontSize: '20px' },
  inviteText: { color: '#f0f6ff', fontSize: '14px', margin: 0 },
  skillBanner: {
    background: 'rgba(0, 212, 255, 0.12)',
    border: '1px solid rgba(0, 212, 255, 0.35)',
    borderRadius: '12px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    textAlign: 'left',
  },
  skillEmoji: { fontSize: '20px' },
  skillText: { color: '#f0f6ff', fontSize: '14px', margin: 0 },
  features: { marginBottom: '28px', gap: '10px', display: 'flex', flexDirection: 'column', textAlign: 'left' },
  featureRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' },
  featureIcon: { fontSize: '18px', width: '26px', textAlign: 'center' },
  featureText: { color: '#8ba3be', fontSize: '14px' },
  ctaSection: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' },
  btn: {
    display: 'block',
    padding: '16px',
    borderRadius: '14px',
    textDecoration: 'none',
    fontWeight: 700,
    fontSize: '16px',
    textAlign: 'center',
  },
  btnPrimary: { background: '#1a77e0', color: '#fff' },
  btnSecondary: {
    background: 'transparent',
    color: '#00d4ff',
    border: '1px solid #2a3a52',
  },
  ref: { color: '#4d6278', fontSize: '12px', margin: 0 },
  code: { color: '#00d4ff', fontFamily: 'monospace', background: '#0B1220', padding: '2px 6px', borderRadius: '4px' },
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const code = Array.isArray(ctx.params?.code) ? ctx.params!.code[0] : ctx.params?.code || '';
  
  // Resolve the short link from backend
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://api.agentrix.top/api';
    const resp = await fetch(`${apiBase}/referral/r/${code}/resolve`, { method: 'GET' });
    if (resp.ok) {
      const data = await resp.json();
      return {
        props: {
          code,
          type: data.type?.toLowerCase() || 'invite',
          skillName: data.skillName || null,
          inviterName: data.inviterName || data.referrerName || null,
          resolved: true,
        },
      };
    }
  } catch {
    // Resolve failed, use minimal props
  }

  return { props: { code, resolved: false } };
};

export default ShareLandingPage;
