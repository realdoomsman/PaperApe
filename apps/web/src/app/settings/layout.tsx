import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings — PaperApe',
  description: 'Manage your PaperApe account settings and preferences.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
