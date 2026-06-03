import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getMode, setMode as persistMode } from '../lib/storage';

type Mode = 'beginner' | 'pro';

interface ModeContextType {
  mode: Mode;
  setMode: (m: Mode) => void;
}

const ModeContext = createContext<ModeContextType>({
  mode: 'beginner',
  setMode: () => {},
});

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>('beginner');

  useEffect(() => {
    getMode().then(setModeState);
  }, []);

  const setMode = (m: Mode) => {
    setModeState(m);
    persistMode(m);
  };

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
