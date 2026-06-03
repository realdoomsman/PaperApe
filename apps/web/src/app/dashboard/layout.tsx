import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard — PaperApe',
  description: 'Your paper trading dashboard. Track positions, PnL, and portfolio performance.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
