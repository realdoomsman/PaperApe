import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Academy — PaperApe',
  description: 'Learn crypto trading with interactive lessons on scam detection, chart analysis, and risk management.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
