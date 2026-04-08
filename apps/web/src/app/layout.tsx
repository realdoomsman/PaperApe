import type { Metadata, Viewport } from 'next';
import { ModeProvider } from '@/components/ModeContext';
import { AuthProvider } from '@/components/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import ClientOverlays from '@/components/ClientOverlays';
import './globals.css';

export const metadata: Metadata = {
  title: 'PaperApe — Solana Paper Trading Terminal',
  description: 'Simulate on-chain Solana trades with zero risk. Paper trade inside BullX, Padre, Photon, and Axiom with live market data. 50+ educational lessons included.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PaperApe',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: '#050508',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <AuthProvider>
          <ModeProvider><ErrorBoundary><ClientOverlays />{children}</ErrorBoundary></ModeProvider>
        </AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) { console.log('[PaperApe] SW registered:', reg.scope); })
                    .catch(function(err) { console.log('[PaperApe] SW failed:', err); });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
