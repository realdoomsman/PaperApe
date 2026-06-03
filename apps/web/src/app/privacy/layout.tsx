import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — PaperApe',
  description: 'PaperApe privacy policy and data handling practices.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
