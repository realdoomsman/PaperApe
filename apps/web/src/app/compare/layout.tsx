import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Token Compare — PaperApe',
  description: 'Compare two Solana tokens side by side with live price data.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
