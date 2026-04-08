'use client';
import dynamic from 'next/dynamic';

const CommandPalette = dynamic(() => import('./CommandPalette'), { ssr: false });
const OnboardingModal = dynamic(() => import('./OnboardingModal'), { ssr: false });

export default function ClientOverlays() {
  return (
    <>
      <CommandPalette />
      <OnboardingModal />
    </>
  );
}
