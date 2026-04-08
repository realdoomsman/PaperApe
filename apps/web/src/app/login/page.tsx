'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { IconLogo } from '@/components/Icons';

export default function LoginPage() {
  const {
    loginWithGoogle, loginWithEmail, registerWithEmail,
    resetPassword, user, loading,
  } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [loading, user, router]);

  if (!loading && user) return null;

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      if (mode === 'reset') {
        await resetPassword(email);
        setInfo('Password reset email sent! Check your inbox.');
        setSubmitting(false);
        return;
      }
      if (mode === 'register') {
        if (password !== confirmPw) {
          setError('Passwords do not match');
          setSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setSubmitting(false);
          return;
        }
        await registerWithEmail(email, password);
        setInfo('Account created! Verification email sent — check your inbox.');
      } else {
        await loginWithEmail(email, password);
      }
      router.push('/dashboard');
    } catch (err: any) {
      const code = err.code || '';
      const msg = code === 'auth/user-not-found' ? 'No account found with that email'
        : code === 'auth/wrong-password' || code === 'auth/invalid-credential' ? 'Incorrect email or password'
        : code === 'auth/email-already-in-use' ? 'Email already registered — try signing in'
        : code === 'auth/weak-password' ? 'Password must be at least 6 characters'
        : code === 'auth/invalid-email' ? 'Invalid email address'
        : code === 'auth/too-many-requests' ? 'Too many attempts — try again later'
        : err.message || 'Something went wrong';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setInfo('');
    try {
      await loginWithGoogle();
      router.push('/dashboard');
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google sign-in failed');
      }
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon"><IconLogo /></div>
          <span className="login-logo-text">PaperApe</span>
        </div>

        <h1 className="login-title">
          {mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create account' : 'Reset password'}
        </h1>
        <p className="login-subtitle">
          {mode === 'login' ? 'Sign in to your paper trading dashboard'
            : mode === 'register' ? 'Start paper trading with zero risk'
            : 'Enter your email and we\'ll send a reset link'}
        </p>

        {mode !== 'reset' && (
          <>
            <button className="login-google-btn" onClick={handleGoogle} type="button">
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>

            <div className="login-divider"><span>or</span></div>
          </>
        )}

        <form onSubmit={handleEmail} className="login-form">
          <div className="login-field">
            <label htmlFor="email">Email</label>
            <input
              id="email" type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              required autoComplete="email"
            />
          </div>

          {mode !== 'reset' && (
            <div className="login-field">
              <label htmlFor="password">Password</label>
              <input
                id="password" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                required minLength={6}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
            </div>
          )}

          {mode === 'register' && (
            <div className="login-field">
              <label htmlFor="confirmPw">Confirm Password</label>
              <input
                id="confirmPw" type="password" placeholder="••••••••"
                value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                required minLength={6} autoComplete="new-password"
              />
            </div>
          )}

          {mode === 'login' && (
            <div style={{ textAlign: 'right', marginTop: -8 }}>
              <button type="button" className="login-forgot" onClick={() => { setMode('reset'); setError(''); setInfo(''); }}>
                Forgot password?
              </button>
            </div>
          )}

          {error && <div className="login-error">{error}</div>}
          {info && <div className="login-info">{info}</div>}

          <button className="login-submit-btn" type="submit" disabled={submitting}>
            {submitting ? 'Please wait...'
              : mode === 'login' ? 'Sign In'
              : mode === 'register' ? 'Create Account'
              : 'Send Reset Link'}
          </button>
        </form>

        <div className="login-toggle">
          {mode === 'login' ? (
            <>Don&apos;t have an account? <button onClick={() => { setMode('register'); setError(''); setInfo(''); }}>Sign up</button></>
          ) : mode === 'register' ? (
            <>Already have an account? <button onClick={() => { setMode('login'); setError(''); setInfo(''); }}>Sign in</button></>
          ) : (
            <>Remember your password? <button onClick={() => { setMode('login'); setError(''); setInfo(''); }}>Sign in</button></>
          )}
        </div>
      </div>
    </div>
  );
}
