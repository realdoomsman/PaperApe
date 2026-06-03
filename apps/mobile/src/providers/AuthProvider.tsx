import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  auth,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getIdToken,
  sendVerificationEmail,
  sendPasswordReset,
  subscribeToUserDoc,
  subscribeToPositions,
  onAuthStateChanged,
  type User,
} from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  emailVerified: boolean;
  serverBalance: number | null;
  serverPositions: any[];
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
  serverBalance: null,
  serverPositions: [],
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
  const [serverBalance, setServerBalance] = useState<number | null>(null);
  const [serverPositions, setServerPositions] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const t = await firebaseUser.getIdToken();
        setToken(t);
      } else {
        setToken(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Refresh token every 50 minutes
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      const t = await getIdToken();
      setToken(t);
    }, 50 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  // Realtime Firestore listeners
  useEffect(() => {
    if (!user?.uid) {
      setServerBalance(null);
      setServerPositions([]);
      return;
    }

    const unsubUser = subscribeToUserDoc(user.uid, (data) => {
      if (typeof data?.paper_balance === 'number') {
        setServerBalance(data.paper_balance);
      }
    });

    const unsubPositions = subscribeToPositions(user.uid, (payload) => {
      const position = payload.new;
      const id = String(position?.id ?? '');
      if (!id) return;

      setServerPositions(prev => {
        if (payload.event === 'REMOVED' || position.status !== 'open') {
          return prev.filter((p: any) => p.id !== id);
        }
        const idx = prev.findIndex((p: any) => p.id === id);
        if (idx === -1) return [position, ...prev];
        const next = [...prev];
        next[idx] = position;
        return next;
      });
    });

    return () => {
      unsubUser();
      unsubPositions();
    };
  }, [user?.uid]);

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmail(email, password);
  };

  const registerWithEmail = async (email: string, password: string) => {
    await signUpWithEmail(email, password);
  };

  const logout = async () => {
    await signOut();
  };

  const resendVerification = async () => {
    await sendVerificationEmail();
  };

  const resetPassword = async (email: string) => {
    await sendPasswordReset(email);
  };

  const refreshUser = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      await currentUser.reload();
      setUser({ ...currentUser } as User);
    }
  }, []);

  const emailVerified = user?.emailVerified ?? false;

  return (
    <AuthContext.Provider
      value={{
        user, loading, token, emailVerified,
        serverBalance, serverPositions,
        loginWithEmail, registerWithEmail,
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
