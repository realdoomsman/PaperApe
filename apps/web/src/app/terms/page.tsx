'use client';
import { useState } from 'react';
import AppShell from '@/components/AppShell';

export default function TermsPage() {
  const [tab, setTab] = useState<'terms' | 'privacy'>('terms');

  return (
    <AppShell>
      <div className="page-head an">
        <div>
          <h1>Legal</h1>
          <div className="page-head-sub">Terms of Service and Privacy Policy</div>
        </div>
      </div>

      <div className="tab-bar an an1" style={{ marginBottom: 14 }}>
        <button className={`tab-item ${tab === 'terms' ? 'on' : ''}`} onClick={() => setTab('terms')}>Terms of Service</button>
        <button className={`tab-item ${tab === 'privacy' ? 'on' : ''}`} onClick={() => setTab('privacy')}>Privacy Policy</button>
      </div>

      <div className="card an an2">
        <div className="card-pad" style={{ maxWidth: 800 }}>
          {tab === 'terms' ? (
            <div style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.8 }}>
              <div style={{ padding: '14px 18px', background: 'var(--red-bg)', border: '1px solid var(--red-glow)', borderRadius: 12, marginBottom: 24, fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>
                IMPORTANT DISCLAIMER: PaperApe is a simulated environment for educational purposes only. No real funds are traded. No real cryptocurrency transactions are executed. This platform does not constitute financial advice, investment advice, trading advice, or any other sort of advice. You should not treat any of the platform's content as such.
              </div>

              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--t0)', marginBottom: 12 }}>Terms of Service</h2>
              <p style={{ color: 'var(--t3)', marginBottom: 20 }}>Last updated: March 27, 2026</p>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 8 }}>1. Acceptance of Terms</h3>
              <p style={{ marginBottom: 16 }}>By accessing or using PaperApe ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.</p>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 8 }}>2. Description of Service</h3>
              <p style={{ marginBottom: 16 }}>PaperApe is a simulated cryptocurrency trading platform designed for educational purposes. The Service allows users to practice trading with virtual (fake) currency in a simulated environment. No real money, cryptocurrency, or digital assets are involved in any transaction on this platform.</p>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 8 }}>3. No Financial Advice</h3>
              <p style={{ marginBottom: 16 }}>Nothing on this platform constitutes financial advice, investment advice, or trading advice. All content, features, simulations, and educational materials are provided for informational and educational purposes only. You should consult a qualified financial advisor before making any investment decisions.</p>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 8 }}>4. Simulated Environment</h3>
              <p style={{ marginBottom: 16 }}>All trading on PaperApe is simulated. "SOL" balances, positions, profits, and losses displayed on the platform are entirely virtual and have no real-world monetary value. Past simulated performance does not guarantee future results in real trading.</p>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 8 }}>5. User Accounts</h3>
              <p style={{ marginBottom: 16 }}>You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information during registration. We reserve the right to suspend or terminate accounts that violate these terms.</p>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 8 }}>6. Prohibited Conduct</h3>
              <p style={{ marginBottom: 8 }}>You agree not to:</p>
              <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
                <li style={{ marginBottom: 4 }}>Attempt to manipulate leaderboard rankings through automated means</li>
                <li style={{ marginBottom: 4 }}>Access or attempt to access other users' accounts</li>
                <li style={{ marginBottom: 4 }}>Use the Service for any illegal or unauthorized purpose</li>
                <li style={{ marginBottom: 4 }}>Attempt to exploit bugs or vulnerabilities in the platform</li>
                <li style={{ marginBottom: 4 }}>Reverse engineer any portion of the Service</li>
              </ul>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 8 }}>7. Intellectual Property</h3>
              <p style={{ marginBottom: 16 }}>All content, features, and functionality of PaperApe are owned by PaperApe and are protected by copyright, trademark, and other intellectual property laws.</p>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 8 }}>8. Limitation of Liability</h3>
              <p style={{ marginBottom: 16 }}>PaperApe shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service. This includes, but is not limited to, any financial losses incurred from real trading decisions influenced by simulated results on this platform.</p>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 8 }}>9. Changes to Terms</h3>
              <p style={{ marginBottom: 16 }}>We reserve the right to modify these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms.</p>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 8 }}>10. Age Requirement</h3>
              <p style={{ marginBottom: 16 }}>You must be at least 13 years of age to use the Service. If you are under 18, you must have parental or guardian consent.</p>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.8 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--t0)', marginBottom: 12 }}>Privacy Policy</h2>
              <p style={{ color: 'var(--t3)', marginBottom: 20 }}>Last updated: March 27, 2026</p>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 8 }}>1. Information We Collect</h3>
              <p style={{ marginBottom: 8 }}>We collect the following types of information:</p>
              <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
                <li style={{ marginBottom: 4 }}><strong>Account Information:</strong> Email address, display name (when you sign up)</li>
                <li style={{ marginBottom: 4 }}><strong>Usage Data:</strong> Simulated trade history, virtual portfolio data, lesson progress</li>
                <li style={{ marginBottom: 4 }}><strong>Technical Data:</strong> Browser type, device information, IP address (for security)</li>
              </ul>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 8 }}>2. How We Use Your Information</h3>
              <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
                <li style={{ marginBottom: 4 }}>To provide and maintain the simulated trading service</li>
                <li style={{ marginBottom: 4 }}>To display leaderboard rankings</li>
                <li style={{ marginBottom: 4 }}>To track your educational progress in the Academy</li>
                <li style={{ marginBottom: 4 }}>To improve the Service</li>
                <li style={{ marginBottom: 4 }}>To communicate important service updates</li>
              </ul>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 8 }}>3. Data Storage</h3>
              <p style={{ marginBottom: 16 }}>Your data is stored securely using Firebase (Google Cloud Platform). We implement industry-standard security measures including encryption in transit and at rest. Firestore security rules prevent unauthorized access to other users' data.</p>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 8 }}>4. Third-Party Services</h3>
              <p style={{ marginBottom: 8 }}>We use the following third-party services:</p>
              <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
                <li style={{ marginBottom: 4 }}><strong>Firebase Auth:</strong> For user authentication</li>
                <li style={{ marginBottom: 4 }}><strong>Firestore:</strong> For data storage</li>
                <li style={{ marginBottom: 4 }}><strong>DexScreener:</strong> For real-time token price data (no personally identifiable data is shared)</li>
              </ul>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 8 }}>5. Data Retention</h3>
              <p style={{ marginBottom: 16 }}>We retain your data for as long as your account is active. You may request deletion of your account and associated data at any time by contacting us.</p>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 8 }}>6. Your Rights</h3>
              <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
                <li style={{ marginBottom: 4 }}>Right to access your personal data</li>
                <li style={{ marginBottom: 4 }}>Right to rectify inaccurate data</li>
                <li style={{ marginBottom: 4 }}>Right to erasure ("right to be forgotten")</li>
                <li style={{ marginBottom: 4 }}>Right to data portability</li>
              </ul>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 8 }}>7. Children's Privacy</h3>
              <p style={{ marginBottom: 16 }}>The Service is not intended for children under 13. We do not knowingly collect personal information from children under 13.</p>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--t0)', marginBottom: 8 }}>8. Changes to This Policy</h3>
              <p style={{ marginBottom: 16 }}>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
