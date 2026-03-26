'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Mode = 'beginner' | 'pro';
interface ModeCtx { mode: Mode; setMode: (m: Mode) => void; }

const Ctx = createContext<ModeCtx>({ mode: 'beginner', setMode: () => {} });

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>('beginner');
  useEffect(() => { const s = localStorage.getItem('pa-mode'); if (s === 'pro') setModeState('pro'); }, []);
  const setMode = (m: Mode) => { setModeState(m); localStorage.setItem('pa-mode', m); };
  return <Ctx.Provider value={{ mode, setMode }}>{children}</Ctx.Provider>;
}

export function useMode() { return useContext(Ctx); }
