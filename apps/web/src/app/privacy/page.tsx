import type { CSSProperties, ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { IconCheck, IconShield } from '@/components/Icons';

export const metadata: Metadata = {
  title: 'Privacy Policy - PaperApe',
  description: 'How PaperApe collects, uses, and protects data for the simulated paper trading website and Chrome extension.',
};

const sectionTitle: CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
  color: 'var(--t0)',
  marginBottom: 8,
  marginTop: 22,
};

const paragraph: CSSProperties = {
  marginBottom: 14,
};

const list: CSSProperties = {
  paddingLeft: 20,
  marginBottom: 14,
};

const item: CSSProperties = {
  marginBottom: 5,
};

function PrivacySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 style={sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <AppShell>
      <div className="page-head an">
        <div>
          <h1>Privacy Policy</h1>
          <div className="page-head-sub">How PaperApe handles website and extension data</div>
        </div>
        <Link href="/extension" className="btn haptic" style={{ fontSize: 11, padding: '7px 12px', textDecoration: 'none' }}>
          <IconShield /> Extension Details
        </Link>
      </div>

      <div className="card an an1">
        <div className="card-pad" style={{ maxWidth: 860, fontSize: 13, color: 'var(--t1)', lineHeight: 1.8 }}>
          <p style={{ color: 'var(--t3)', marginBottom: 20 }}>Effective date: June 1, 2026</p>

          <div style={{
            display: 'flex',
            gap: 12,
            padding: '14px 16px',
            border: '2px dashed var(--green)',
            background: 'var(--green-bg)',
            borderRadius: 8,
            marginBottom: 22,
          }}>
            <div style={{ color: 'var(--green)', flexShrink: 0, marginTop: 2 }}><IconCheck /></div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)', marginBottom: 4 }}>PaperApe is simulated.</div>
              <div style={{ fontSize: 12, color: 'var(--t1)' }}>
                PaperApe does not execute real crypto trades, does not ask for wallet seed phrases, and does not control real trading funds.
              </div>
            </div>
          </div>

          <p style={paragraph}>
            PaperApe operates a simulated paper-trading website and Chrome extension for Solana token education. This policy explains what we collect, why we collect it, and how the extension behaves on supported platforms.
          </p>

          <PrivacySection title="1. Information We Collect">
            <ul style={list}>
              <li style={item}><strong>Account information:</strong> name, email address, and profile image provided by your sign-in provider.</li>
              <li style={item}><strong>Authentication state:</strong> Firebase auth tokens used to keep the website and extension signed in.</li>
              <li style={item}><strong>Simulated trading data:</strong> paper balances, virtual positions, trade history, alerts, DCA orders, and analytics.</li>
              <li style={item}><strong>Preferences:</strong> settings such as display mode, widget options, and local watchlists.</li>
              <li style={item}><strong>Technical data:</strong> basic request metadata needed for security, debugging, and service reliability.</li>
            </ul>
          </PrivacySection>

          <PrivacySection title="2. What We Do Not Collect">
            <ul style={list}>
              <li style={item}>Real wallet private keys or seed phrases.</li>
              <li style={item}>Real cryptocurrency balances or bank account information.</li>
              <li style={item}>Keystrokes, screen recordings, or general browsing history.</li>
              <li style={item}>Data from websites outside PaperApe and the supported extension host platforms.</li>
            </ul>
          </PrivacySection>

          <PrivacySection title="3. How We Use Information">
            <p style={paragraph}>
              We use your data to run the paper-trading simulator, sync positions between the website and extension, display saved history and analytics, provide educational features, and maintain the reliability and security of the service.
            </p>
          </PrivacySection>

          <PrivacySection title="4. Chrome Extension Permissions">
            <p style={paragraph}>
              The Chrome extension activates only on supported trading platforms such as BullX, Axiom, Padre, Photon, and GMGN, plus PaperApe pages used for auth handoff. It detects Solana token addresses, displays the PaperApe widget, and sends simulated trade requests to the PaperApe API.
            </p>
            <p style={paragraph}>
              The extension stores auth and preferences in <code style={{ fontFamily: 'var(--mono)', background: 'var(--bg-2)', padding: '1px 5px', borderRadius: 2 }}>chrome.storage.local</code>. It does not monitor unrelated websites.
            </p>
          </PrivacySection>

          <PrivacySection title="5. Data Storage And Security">
            <p style={paragraph}>
              Account and simulated trading data are stored with Firebase / Firestore. The API is hosted separately and communicates over HTTPS. Access is scoped so users can only access their own account data.
            </p>
          </PrivacySection>

          <PrivacySection title="6. Third-Party Services">
            <ul style={list}>
              <li style={item}><strong>Firebase Authentication and Firestore:</strong> account auth and data storage.</li>
              <li style={item}><strong>Render and Vercel:</strong> backend and frontend hosting.</li>
              <li style={item}><strong>DexScreener, Jupiter, Birdeye, or similar market-data providers:</strong> token price and market metadata.</li>
            </ul>
          </PrivacySection>

          <PrivacySection title="7. Data Sharing">
            <p style={paragraph}>
              We do not sell personal data. We may disclose information only when required by law, to protect the service, or to operate infrastructure providers that process data on our behalf.
            </p>
          </PrivacySection>

          <PrivacySection title="8. Your Choices">
            <p style={paragraph}>
              You may request access, correction, export, or deletion of your account data. If you uninstall the extension, local extension storage is removed by Chrome.
            </p>
          </PrivacySection>

          <PrivacySection title="9. Data Retention">
            <p style={paragraph}>
              We keep account and simulated trading data while your account remains active. If you request account deletion, we will delete or anonymize associated personal data where legally and technically possible.
            </p>
          </PrivacySection>

          <PrivacySection title="10. Updates">
            <p style={paragraph}>
              We may update this policy as PaperApe changes. The effective date at the top of this page will reflect the latest version.
            </p>
          </PrivacySection>

          <div style={{ marginTop: 26, paddingTop: 18, borderTop: '1px dashed var(--border-1)', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Link href="/terms" className="btn haptic" style={{ textDecoration: 'none', fontSize: 11 }}>Terms Of Service</Link>
            <Link href="/extension" className="btn haptic" style={{ textDecoration: 'none', fontSize: 11 }}>Extension Page</Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
