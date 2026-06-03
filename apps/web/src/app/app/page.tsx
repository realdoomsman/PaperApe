'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AppPage() {
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPhone|iPad|iPod/.test(ua));
    setIsAndroid(/Android/.test(ua));
    setIsMobile(/iPhone|iPad|iPod|Android/.test(ua));
  }, []);

  return (
    <div className="app-download-page">
      <style>{`
        .app-download-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
        }
        .app-download-page h1 {
          font-size: 32px;
          margin-bottom: 8px;
          color: var(--t0);
        }
        .app-download-page .subtitle {
          font-size: 15px;
          color: var(--t2);
          margin-bottom: 40px;
          max-width: 400px;
        }
        .download-options {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          max-width: 360px;
        }
        .download-card {
          background: var(--bg-1);
          border: 2px solid var(--border-1);
          border-radius: 6px;
          padding: 20px;
          text-align: left;
        }
        .download-card h3 {
          font-size: 16px;
          color: var(--t0);
          margin-bottom: 4px;
        }
        .download-card p {
          font-size: 13px;
          color: var(--t2);
          margin-bottom: 12px;
          line-height: 1.5;
        }
        .download-btn {
          display: inline-block;
          background: var(--green);
          color: #fff;
          padding: 10px 20px;
          border-radius: 4px;
          font-family: var(--font);
          font-size: 14px;
          text-decoration: none;
          transition: opacity 0.15s;
        }
        .download-btn:hover {
          opacity: 0.9;
        }
        .download-btn.secondary {
          background: var(--bg-2);
          color: var(--t0);
          border: 1px solid var(--border-1);
        }
        .badge {
          display: inline-block;
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 3px;
          margin-left: 8px;
          vertical-align: middle;
        }
        .badge.recommended {
          background: var(--green-bg);
          color: var(--green);
          border: 1px solid var(--green);
        }
        .badge.android {
          background: var(--accent-bg);
          color: var(--accent);
          border: 1px solid var(--accent);
        }
        .steps {
          margin-top: 8px;
          padding: 0;
          list-style: none;
        }
        .steps li {
          font-size: 13px;
          color: var(--t2);
          padding: 4px 0;
          padding-left: 20px;
          position: relative;
        }
        .steps li::before {
          content: attr(data-step);
          position: absolute;
          left: 0;
          color: var(--green);
          font-weight: 700;
        }
        .back-link {
          margin-top: 32px;
          font-size: 14px;
          color: var(--t3);
        }
        .back-link a {
          color: var(--accent);
          text-decoration: underline;
        }
      `}</style>

      <h1>GET PAPERAPE</h1>
      <p className="subtitle">
        Install PaperApe on your phone for the full trading experience
      </p>

      <div className="download-options">
        {/* PWA Option */}
        <div className="download-card">
          <h3>
            Install as App
            <span className="badge recommended">RECOMMENDED</span>
          </h3>
          <p>Works on iPhone & Android. No download needed — installs directly from your browser.</p>

          {isIOS ? (
            <ol className="steps">
              <li data-step="1.">Tap the Share button (bottom of Safari)</li>
              <li data-step="2.">Scroll down and tap "Add to Home Screen"</li>
              <li data-step="3.">Tap "Add" — done</li>
            </ol>
          ) : (
            <ol className="steps">
              <li data-step="1.">Tap the menu (3 dots) in Chrome</li>
              <li data-step="2.">Tap "Add to Home Screen" or "Install App"</li>
              <li data-step="3.">Tap "Install" — done</li>
            </ol>
          )}
        </div>

        {/* Android APK Option */}
        <div className="download-card">
          <h3>
            Android APK
            <span className="badge android">ANDROID</span>
          </h3>
          <p>Download the APK directly. You may need to enable "Install from unknown sources" in your settings.</p>
          <a href="https://expo.dev/artifacts/eas/imhHo4upaCezG3NaZmFf6Z.apk" className="download-btn secondary" download>
            DOWNLOAD APK
          </a>
        </div>

        {/* Web Option */}
        <div className="download-card">
          <h3>Use on Web</h3>
          <p>Already works great on desktop and mobile browsers.</p>
          <Link href="/dashboard" className="download-btn secondary">
            OPEN WEB APP
          </Link>
        </div>
      </div>

      <p className="back-link">
        <Link href="/">Back to home</Link>
      </p>
    </div>
  );
}
