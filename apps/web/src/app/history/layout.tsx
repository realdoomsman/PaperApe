import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trade History — PaperApe',
  description: 'View your complete paper trading history with detailed trade logs.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
