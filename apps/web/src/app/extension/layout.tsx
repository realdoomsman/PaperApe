import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chrome Extension — PaperApe',
  description: 'Paper trade directly inside BullX, Axiom, Photon, Padre, and GMGN.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
