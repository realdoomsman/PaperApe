import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leaderboard — PaperApe',
  description: 'Compete with other paper traders. Weekly, monthly, and all-time rankings.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
