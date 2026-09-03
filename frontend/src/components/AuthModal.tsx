'use client';
// frontend/src/components/AuthModal.tsx

import React, { useEffect, useState } from 'react';
import type { Dictionary } from '@/locales/types';
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
  verifyEmailFor?: string;
  dict?: Dictionary;
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
          setError(res.error || dict?.user?.failedToRequestPasswordReset || null);
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
          setError(res.error || dict?.user?.invalidCredentials || null);
        }
      } else {
        const res = await register(username, email, password, {
          website_trap: honeypotValue,
          altcha: altchaPayload,
        });
        if (res.success) {
          setNotice({ type: 'register-success', email: res.user?.email || email });
        } else {
          setError(res.error || dict?.user?.registrationFailed || null);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : dict?.user?.unexpectedError || null;
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

      <div className="relative w-full max-w-md rounded-2xl border border-border-color bg-bg-surface p-6 text-text-primary shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200 transition-colors">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber"
          aria-label={dict?.modal?.close}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-amber/15 p-2.5 border border-accent-amber/30 text-accent-amber shadow-xs">
            <LemonIcon className="h-9 w-9 animate-pulse" />
          </div>
          <h2
            id="auth-modal-title"
            className="text-xl font-black tracking-wider text-text-primary font-mono"
          >
            {notice?.type === 'verify-reminder' || notice?.type === 'register-success'
              ? dict?.user?.authVerifyEmailTitle
              : notice?.type === 'forgot-sent'
                ? dict?.user?.resetPassword
                : mode === 'login'
                  ? dict?.user?.authSignInTitle
                  : mode === 'register'
                    ? dict?.user?.authRegisterTitle
                    : dict?.user?.resetPassword}
          </h2>
          {(notice?.type === 'verify-reminder' ||
            notice?.type === 'register-success' ||
            notice?.type === 'forgot-sent' ||
            mode === 'forgot') && (
            <p className="text-xs text-text-secondary mt-1">
              {notice?.type === 'verify-reminder' || notice?.type === 'register-success'
                ? dict?.user?.authVerifySubtitle
                : dict?.user?.authResetSubtitle}
            </p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2.5 rounded-xl border border-accent-red/30 bg-accent-red/10 p-3 text-xs text-accent-red animate-in fade-in duration-150 shadow-xs font-semibold"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-accent-red" />
            <span>{error}</span>
          </div>
        )}

        {notice && (notice.type === 'verify-reminder' || notice.type === 'register-success') && (
          <div className="mb-4 flex flex-col items-center gap-4 text-center animate-in fade-in duration-150">
            <p className="text-xs text-text-secondary">
              {notice.type === 'verify-reminder' ? (
                <>
                  {dict?.user?.signedInButPrefix} <strong>{notice.email}</strong>{' '}
                  {dict?.user?.notVerifiedYetNotice}
                </>
              ) : (
                dict?.user?.accountCreatedVerificationSent?.replace('{email}', notice.email)
              )}
            </p>

            <EmailVerificationForm
              email={notice.email}
              onVerified={onClose}
              submitLabel={
                notice.type === 'register-success'
                  ? dict?.user?.verifyAndContinue
                  : dict?.user?.verifyEmailAction
              }
              dict={dict}
            />
          </div>
        )}

        {notice && notice.type === 'forgot-sent' && (
          <div
            role="status"
            className="mb-4 space-y-3 rounded-xl border border-accent-amber/30 bg-accent-amber/10 p-3.5 text-xs text-accent-amber animate-in fade-in duration-150 shadow-xs"
          >
            <div className="flex items-start gap-2.5">
              <MailWarning className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{dict?.user?.forgotSentNotice}</span>
            </div>
            {dict?.modal?.close && (
              <button
                type="button"
                onClick={onClose}
                className="block w-full rounded-lg bg-accent-amber/20 py-1.5 text-[11px] font-black uppercase tracking-wider text-accent-amber hover:bg-accent-amber/30 transition-colors cursor-pointer"
              >
                {dict.modal.close}
              </button>
            )}
          </div>
        )}

        {!notice && (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode !== 'forgot' && (
              <div>
                {dict?.user?.usernameOrEmailLabel && (
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                    {dict.user.usernameOrEmailLabel}
                  </label>
                )}
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={dict?.user?.usernameOrEmailPlaceholder}
                    className="w-full rounded-xl border border-border-color bg-bg-primary py-2.5 pl-10 pr-3.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-amber focus:outline-none focus:ring-1 focus:ring-accent-amber transition-all shadow-inner"
                  />
                </div>
              </div>
            )}

            {(mode === 'register' || mode === 'forgot') && (
              <div>
                {(dict?.user?.emailLabel || dict?.admin?.thEmail) && (
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                    {dict?.user?.emailLabel || dict?.admin?.thEmail}
                  </label>
                )}
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={dict?.user?.emailPlaceholder}
                    className="w-full rounded-xl border border-border-color bg-bg-primary py-2.5 pl-10 pr-3.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-amber focus:outline-none focus:ring-1 focus:ring-accent-amber transition-all shadow-inner"
                  />
                </div>
              </div>
            )}

            {mode !== 'forgot' && (
              <div>
                {(dict?.user?.passwordLabel || dict?.admin?.thPassword) && (
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                    {dict?.user?.passwordLabel || dict?.admin?.thPassword}
                  </label>
                )}
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-border-color bg-bg-primary py-2.5 pl-10 pr-3.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-amber focus:outline-none focus:ring-1 focus:ring-accent-amber transition-all shadow-inner"
                  />
                </div>
              </div>
            )}

            {mode === 'login' && dict?.user?.forgotPasswordLink && (
              <div className="text-right -mt-1.5">
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-[11px] text-text-muted hover:text-accent-amber transition-colors cursor-pointer"
                >
                  {dict.user.forgotPasswordLink}
                </button>
              </div>
            )}

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
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-amber to-accent-amber-hover py-2.5 text-xs font-black uppercase tracking-wider text-text-inverted shadow-md shadow-accent-amber/20 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-amber disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-text-inverted border-t-transparent" />
              ) : mode === 'login' ? (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>{dict?.user?.signIn}</span>
                </>
              ) : mode === 'register' ? (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>{dict?.user?.createAccount}</span>
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  <span>{dict?.user?.sendResetLink}</span>
                </>
              )}
            </button>
          </form>
        )}

        {!notice && mode !== 'forgot' && (
          <div className="mt-4 pt-4 border-t border-border-color">
            {dict?.user?.quickDemoAccounts && (
              <p className="text-[10px] uppercase font-bold text-text-muted mb-2 text-center tracking-wider">
                {dict.user.quickDemoAccounts}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('admin')}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-accent-red/30 bg-accent-red/10 px-2.5 py-1.5 text-[11px] font-semibold text-accent-red hover:bg-accent-red/20 transition-colors shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
              >
                <ShieldAlert className="h-3 w-3 text-accent-red" />
                <span>{dict?.user?.adminDemo}</span>
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('player')}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-accent-amber/30 bg-accent-amber/10 px-2.5 py-1.5 text-[11px] font-semibold text-accent-amber hover:bg-accent-amber/20 transition-colors shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber"
              >
                <Sparkles className="h-3 w-3 text-accent-amber" />
                <span>{dict?.user?.userDemo}</span>
              </button>
            </div>
          </div>
        )}

        {!notice && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => switchMode(mode === 'register' ? 'login' : mode === 'forgot' ? 'login' : 'register')}
              className="text-xs text-text-muted hover:text-accent-amber transition-colors cursor-pointer"
            >
              {mode === 'forgot' ? (
                <span className="font-bold text-accent-amber underline">
                  {dict?.user?.backToSignIn}
                </span>
              ) : mode === 'register' ? (
                <>
                  {dict?.user?.alreadyHaveAccount}{' '}
                  <span className="font-bold text-accent-amber underline">
                    {dict?.user?.signIn}
                  </span>
                </>
              ) : (
                <>
                  {dict?.user?.dontHaveAccount}{' '}
                  <span className="font-bold text-accent-amber underline">
                    {dict?.user?.register}
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

