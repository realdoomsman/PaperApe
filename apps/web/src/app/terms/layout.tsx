import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — PaperApe',
  description: 'PaperApe terms of service and usage agreement.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
