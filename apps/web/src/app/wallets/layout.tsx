import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wallets — PaperApe',
  description: 'Manage your paper wallets. Create burner wallets, transfer SOL, and track smart money.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
