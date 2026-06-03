import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In — PaperApe',
  description: 'Sign in or create a free PaperApe account to start paper trading.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
