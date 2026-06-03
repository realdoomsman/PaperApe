import type { Metadata, Viewport } from 'next';
import { ModeProvider } from '@/components/ModeContext';
import { AuthProvider } from '@/components/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import ClientOverlays from '@/components/ClientOverlays';
import './globals.css';

export const metadata: Metadata = {
  title: 'PaperApe - Paper Trade Solana Memecoins Risk-Free',
  description: 'Practice trading Solana memecoins with simulated SOL. Real prices, zero risk. Track PnL, compete on leaderboards, and learn crypto trading strategies.',
  keywords: ['paper trading', 'solana', 'memecoin', 'crypto trading simulator', 'paper trading app', 'solana trading'],
  openGraph: {
    title: 'PaperApe - Paper Trade Solana Memecoins',
    description: 'Practice trading Solana memecoins with simulated SOL. Real prices, zero risk.',
    siteName: 'PaperApe',
    url: 'https://paperape.fun',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PaperApe - Paper Trade Solana Memecoins',
    description: 'Practice trading Solana memecoins with simulated SOL. Real prices, zero risk.',
  },
  robots: 'index, follow',
  metadataBase: new URL('https://paperape.fun'),
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
  const serviceWorkerScript = process.env.NODE_ENV === 'production'
    ? `
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('/sw.js')
            .then(function(reg) { console.log('[PaperApe] SW registered:', reg.scope); })
            .catch(function(err) { console.log('[PaperApe] SW failed:', err); });
        });
      }
    `
    : `
      if ('serviceWorker' in navigator && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        navigator.serviceWorker.getRegistrations()
          .then(function(registrations) { registrations.forEach(function(reg) { reg.unregister(); }); })
          .catch(function() {});
        if (window.caches) {
          caches.keys()
            .then(function(keys) { keys.filter(function(key) { return key.indexOf('paperape-') === 0; }).forEach(function(key) { caches.delete(key); }); })
            .catch(function() {});
        }
      }
    `;

  return (
    <html lang="en">
      <head>
        <link rel="dns-prefetch" href="https://paperape-api.onrender.com" />
        <link rel="preconnect" href="https://paperape-api.onrender.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://firestore.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://identitytoolkit.googleapis.com" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
      </head>
      <body>
        <AuthProvider>
          <ModeProvider><ErrorBoundary><ClientOverlays />{children}</ErrorBoundary></ModeProvider>
        </AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: serviceWorkerScript,
          }}
        />
      </body>
    </html>
  );
}
