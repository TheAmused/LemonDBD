'use client';
// frontend/src/components/AuthModal.tsx

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LemonIcon } from '@/components/LemonIcon';
import { useAltcha } from '@/hooks/useAltcha';
import { AltchaWidget } from '@/components/common/AltchaWidget';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  LogIn,
  UserPlus,
  AlertCircle,
  ShieldAlert,
  Sparkles,
  MailWarning,
} from 'lucide-react';
import { EmailVerificationForm } from '@/components/EmailVerificationForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  /** When set, the modal opens straight into the verification-code screen for this email, skipping login/register. */
  verifyEmailFor?: string;
  dict?: any;
}

type AuthMode = 'login' | 'register' | 'forgot';
type Notice =
  | { type: 'verify-reminder'; email: string }
  | { type: 'register-success'; email: string }
  | { type: 'forgot-sent' };

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  verifyEmailFor,
  dict,
}) => {
  const { login, register, forgotPassword } = useAuth();
  const {
    altchaPayload,
    isVerifying: isAltchaVerifying,
    isVerified: isAltchaVerified,
    error: altchaError,
    refreshChallenge,
    honeypotValue,
    honeypotProps,
  } = useAltcha();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setNotice(verifyEmailFor ? { type: 'verify-reminder', email: verifyEmailFor } : null);
    }
  }, [isOpen, initialMode, verifyEmailFor]);

  if (!isOpen) return null;

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const res = await forgotPassword(email, {
          website_trap: honeypotValue,
          altcha: altchaPayload,
        });
        if (res.success) {
          setNotice({ type: 'forgot-sent' });
        } else {
          setError(res.error || 'Failed to request password reset');
        }
      } else if (mode === 'login') {
        const res = await login(username, password, {
          website_trap: honeypotValue,
          altcha: altchaPayload,
        });
        if (res.success) {
          if (res.user && !res.user.is_verified) {
            setNotice({ type: 'verify-reminder', email: res.user.email });
          } else {
            onClose();
          }
        } else {
          setError(res.error || 'Invalid credentials');
        }
      } else {
        const res = await register(username, email, password, {
          website_trap: honeypotValue,
          altcha: altchaPayload,
        });
        if (res.success) {
          setNotice({ type: 'register-success', email: res.user?.email || email });
        } else {
          setError(res.error || 'Registration failed');
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (role: 'admin' | 'player') => {
    switchMode('login');
    if (role === 'admin') {
      setUsername('lemon');
      setPassword('lemon');
    } else {
      setUsername('user');
      setPassword('user');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/95 p-6 text-slate-900 dark:text-slate-100 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          aria-label={dict?.modal?.close || 'Close auth dialog'}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-100 to-slate-100 dark:from-amber-500/20 dark:via-red-900/40 dark:to-slate-950 p-2.5 border border-amber-500/30 shadow-sm dark:shadow-lg dark:shadow-amber-900/20">
            <LemonIcon className="h-9 w-9 animate-pulse" />
          </div>
          <h2
            id="auth-modal-title"
            className="text-xl font-black tracking-wider text-slate-900 dark:text-slate-100 font-mono"
          >
            {notice?.type === 'verify-reminder' || notice?.type === 'register-success'
              ? 'Verify Your Email'
              : notice?.type === 'forgot-sent'
                ? 'Reset Your Password'
                : mode === 'login'
                  ? 'Sign In to LemonDBD'
                  : mode === 'register'
                    ? 'Create LemonDBD Account'
                    : 'Reset Your Password'}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {notice?.type === 'verify-reminder' || notice?.type === 'register-success'
              ? "Check your inbox for the code we sent you."
              : notice?.type === 'forgot-sent'
                ? "Enter your email and we'll send you a reset link."
                : mode === 'login'
                  ? 'Access your owned characters, perk unlocks, and personal builds.'
                  : mode === 'register'
                    ? 'Join the community to track streaks, teachables, and game stats.'
                    : "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-400 animate-in fade-in duration-150 shadow-sm"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {notice && (notice.type === 'verify-reminder' || notice.type === 'register-success') && (
          <div className="mb-4 flex flex-col items-center gap-4 text-center animate-in fade-in duration-150">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {notice.type === 'verify-reminder' ? (
                <>
                  You&apos;re signed in, but <strong>{notice.email}</strong> isn&apos;t verified yet.
                  Enter the code we emailed you below.
                </>
              ) : (
                <>
                  Account created! We sent a verification code to <strong>{notice.email}</strong>.
                </>
              )}
            </p>
            <EmailVerificationForm
              email={notice.email}
              onVerified={onClose}
              submitLabel={notice.type === 'register-success' ? 'Verify & Continue' : 'Verify'}
            />
          </div>
        )}

        {notice && notice.type === 'forgot-sent' && (
          <div
            role="status"
            className="mb-4 space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300 animate-in fade-in duration-150 shadow-sm"
          >
            <div className="flex items-start gap-2.5">
              <MailWarning className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{dict?.user?.forgotSentNotice || 'If that email is registered, a password reset link is on its way.'}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="block w-full rounded-lg bg-amber-500/20 py-1.5 text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer"
            >
              {dict?.modal?.close || 'Close'}
            </button>
          </div>
        )}

        {!notice && (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode !== 'forgot' && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Username or Email
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={dict?.user?.usernameOrEmailPlaceholder || 'Enter username or email'}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 py-2.5 pl-10 pr-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all shadow-sm"
                  />
                </div>
              </div>
            )}

            {(mode === 'register' || mode === 'forgot') && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={dict?.user?.emailPlaceholder || 'yourname@domain.com'}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 py-2.5 pl-10 pr-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all shadow-sm"
                  />
                </div>
              </div>
            )}

            {mode !== 'forgot' && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 py-2.5 pl-10 pr-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all shadow-sm"
                  />
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="text-right -mt-1.5">
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* ALTCHA PoW Security & Honeypot Trap */}
            <AltchaWidget
              isVerifying={isAltchaVerifying}
              isVerified={isAltchaVerified}
              error={altchaError}
              onRetry={refreshChallenge}
              honeypotProps={honeypotProps}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-red-600 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-amber-900/30 hover:from-amber-500 hover:to-red-500 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : mode === 'login' ? (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>{dict?.user?.signIn || 'Sign In'}</span>
                </>
              ) : mode === 'register' ? (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>{dict?.user?.createAccount || 'Create Account'}</span>
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  <span>{dict?.user?.sendResetLink || 'Send Reset Link'}</span>
                </>
              )}
            </button>
          </form>
        )}

        {!notice && mode !== 'forgot' && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/80">
            <p className="text-[10px] uppercase font-bold text-slate-500 mb-2 text-center tracking-wider">
              Quick Demo Accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('admin')}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/20 bg-red-50 dark:bg-red-950/20 px-2.5 py-1.5 text-[11px] font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <ShieldAlert className="h-3 w-3 text-red-500 dark:text-red-400" />
                <span>{dict?.user?.adminDemo || 'Admin (lemon)'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('player')}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <Sparkles className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span>{dict?.user?.userDemo || 'User (user)'}</span>
              </button>
            </div>
          </div>
        )}

        {!notice && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => switchMode(mode === 'register' ? 'login' : mode === 'forgot' ? 'login' : 'register')}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
            >
              {mode === 'forgot' ? (
                <span className="font-bold text-amber-600 dark:text-amber-400 underline">
                  Back to Sign In
                </span>
              ) : mode === 'register' ? (
                <>
                  Already have an account?{' '}
                  <span className="font-bold text-amber-600 dark:text-amber-400 underline">
                    Sign In
                  </span>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{' '}
                  <span className="font-bold text-amber-600 dark:text-amber-400 underline">
                    Register
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
