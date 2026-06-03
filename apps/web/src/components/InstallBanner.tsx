'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Check iOS
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    // Check if previously dismissed
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) setDismissed(true);

    // Listen for install prompt (Android/Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if already installed, dismissed, or desktop with no prompt
  if (isStandalone || dismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 80,
      left: 16,
      right: 16,
      zIndex: 1000,
      backgroundColor: '#ede5cd',
      border: '2px solid rgba(90,70,40,0.35)',
      borderRadius: 6,
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      boxShadow: '3px 4px 12px rgba(60,40,10,0.2)',
      fontFamily: "'Special Elite', 'Courier Prime', monospace",
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: '#1a1207', fontWeight: 700, marginBottom: 2 }}>
          Install PaperApe
        </div>
        <div style={{ fontSize: 12, color: '#6b5d45' }}>
          {isIOS
            ? 'Tap the share button, then "Add to Home Screen"'
            : 'Add to your home screen for the full app experience'
          }
        </div>
      </div>
      {deferredPrompt && (
        <button
          onClick={handleInstall}
          style={{
            backgroundColor: '#2d6b3f',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '8px 16px',
            fontFamily: "'Special Elite', monospace",
            fontSize: 13,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          INSTALL
        </button>
      )}
      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: '#9a8b6e',
          fontSize: 18,
          cursor: 'pointer',
          padding: '0 4px',
          lineHeight: 1,
        }}
      >
        x
      </button>
    </div>
  );
}
