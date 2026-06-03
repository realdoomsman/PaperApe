import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Position Calculator — PaperApe',
  description: 'Calculate position sizes, PnL targets, and risk-reward ratios.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
