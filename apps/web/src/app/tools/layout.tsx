import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trading Tools — PaperApe',
  description: 'Position sizer, PnL calculator, and risk score checker for Solana tokens.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
