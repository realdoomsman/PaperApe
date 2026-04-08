'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  auth, db,
  onAuthStateChanged,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getIdToken,
  sendVerificationEmail,
  sendPasswordReset,
  type User,
} from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  emailVerified: boolean;
  serverBalance: number;
  serverPositions: any[];
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resendVerification: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  token: null,
  emailVerified: false,
  serverBalance: 100,
  serverPositions: [],
  loginWithGoogle: async () => {},
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  logout: async () => {},
  resendVerification: async () => {},
  resetPassword: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [serverBalance, setServerBalance] = useState(100);
  const [serverPositions, setServerPositions] = useState<any[]>([]);

  // Broadcast to extension via bridge content script
  const notifyExtension = (type: string, payload?: any) => {
    if (typeof window === 'undefined') return;
    window.postMessage({ source: 'paperape-web', type, ...payload }, window.location.origin);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const t = await firebaseUser.getIdToken();
        setToken(t);
        // Push token to extension
        notifyExtension('AUTH_TOKEN', {
          token: t,
          user: {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName,
          },
        });
      } else {
        setToken(null);
        notifyExtension('AUTH_LOGOUT');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Refresh token every 50 minutes (tokens expire in 60 min)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      const t = await getIdToken();
      setToken(t);
      // Push refreshed token to extension
      if (t) notifyExtension('TOKEN_REFRESH', { token: t });
    }, 50 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  // ─── Realtime Firestore Listeners ─────────────────────
  // Syncs balance across web + extension whenever Firestore user doc changes
  useEffect(() => {
    if (!user?.uid) {
      setServerBalance(100);
      setServerPositions([]);
      return;
    }

    // Listen to user document for balance changes
    const userDocRef = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data?.paper_balance === 'number') {
          setServerBalance(data.paper_balance);
        }
      }
    }, (err) => {
      console.warn('[PaperApe] User doc listener error:', err);
    });

    return () => {
      unsubUser();
    };
  }, [user?.uid]);

  const loginWithGoogle = async () => {
    await signInWithGoogle();
  };

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmail(email, password);
  };

  const registerWithEmail = async (email: string, password: string) => {
    await signUpWithEmail(email, password);
    // signUpWithEmail auto-sends verification email
  };

  const logout = async () => {
    notifyExtension('AUTH_LOGOUT');
    await signOut();
  };

  const resendVerification = async () => {
    await sendVerificationEmail();
  };

  const resetPassword = async (email: string) => {
    await sendPasswordReset(email);
  };

  const refreshUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser({ ...auth.currentUser } as User);
    }
  };

  const emailVerified = user?.emailVerified ?? false;

  return (
    <AuthContext.Provider
      value={{
        user, loading, token, emailVerified,
        serverBalance, serverPositions,
        loginWithGoogle, loginWithEmail, registerWithEmail,
        logout, resendVerification, resetPassword, refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
