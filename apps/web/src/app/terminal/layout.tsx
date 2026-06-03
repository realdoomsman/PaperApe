import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trading Terminal — PaperApe',
  description: 'Trade any Solana token with live prices. Simulated buys and sells with realistic execution.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
