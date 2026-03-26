import type { Metadata } from 'next';
import { ModeProvider } from '@/components/ModeContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'PaperApe — Solana Paper Trading Terminal',
  description: 'Simulate on-chain Solana trades with zero risk. Paper trade inside BullX, Padre, Photon, and Axiom with live market data.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><ModeProvider>{children}</ModeProvider></body>
    </html>
  );
}
