import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analytics — PaperApe',
  description: 'Deep dive into your trading performance with charts and statistics.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
