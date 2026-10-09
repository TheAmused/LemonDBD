'use client';
// frontend/src/components/AuthModal.tsx

import React, { useEffect, useState } from 'react';
import type { Dictionary } from '@/locales/types';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useAltcha } from '@/hooks/useAltcha';
import { AltchaWidget } from '@/components/common/AltchaWidget';
import {
  Mail,
  LogIn,
  UserPlus,
  AlertCircle,
  ShieldAlert,
  Sparkles,
  MailWarning,
} from 'lucide-react';
import { EmailVerificationForm } from '@/components/EmailVerificationForm';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { Input } from '@/components/common/Field';
import { RulesModal } from '@/components/rules/RulesModal';
import { useDictionary } from "@/context/DictionaryContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  verifyEmailFor?: string;
}

type AuthMode = 'login' | 'register' | 'forgot';
type Notice =
  | { type: 'verify-reminder'; email: string }
  | { type: 'register-success'; email: string }
  | { type: 'forgot-sent' };

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login', verifyEmailFor }) => {
  const dict = useDictionary();
  const { login, register, forgotPassword } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
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
  const [acceptedRules, setAcceptedRules] = useState<boolean>(false);
  const [rulesOpen, setRulesOpen] = useState<boolean>(false);
  // Set by a submit with the box unticked, so the field error only shows after an attempt.
  const [rulesAttempted, setRulesAttempted] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setAcceptedRules(false);
      setRulesAttempted(false);
      setRulesOpen(false);
      setNotice(verifyEmailFor ? { type: 'verify-reminder', email: verifyEmailFor } : null);
    }
  }, [isOpen, initialMode, verifyEmailFor]);

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
          setError(res.error || dict.user.failedToRequestPasswordReset);
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
          setError(res.error || dict.user.invalidCredentials);
        }
      } else {
        if (!acceptedRules) {
          setRulesAttempted(true);
          return;
        }
        const res = await register(username, email, password, {
          website_trap: honeypotValue,
          altcha: altchaPayload,
        });
        if (res.success) {
          if (res.user && !res.user.is_verified) {
            setNotice({ type: 'register-success', email: res.user?.email || email });
          } else {
            onClose();
            if (res.user && !res.user.onboarding_completed_at) {
              const locale = pathname?.split('/')[1] || 'en';
              router.push(`/${locale}/welcome`);
            }
          }
        } else {
          setError(res.error || dict.user.registrationFailed);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : dict.user.unexpectedError;
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

  const [rulesLabelBefore, rulesLabelAfter = ''] = dict.user.acceptRulesLabel.split('{rules}');
  const showRulesError = rulesAttempted && !acceptedRules;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="md"
      centerTitle
      title={
        notice?.type === 'verify-reminder' || notice?.type === 'register-success'
          ? dict.user.authVerifyEmailTitle
          : notice?.type === 'forgot-sent'
            ? dict.user.resetPassword
            : mode === 'login'
              ? dict.user.authSignInTitle
              : mode === 'register'
                ? dict.user.authRegisterTitle
                : dict.user.resetPassword
      }
      ariaLabel="Authentication"
      closeButtonAriaLabel={dict.modal.close}
      padded
    >
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2.5 rounded-xl border border-accent-red/30 bg-accent-red/10 p-3 type-strong text-accent-red animate-in fade-in duration-150 shadow-xs"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-accent-red" />
          <span>{error}</span>
        </div>
      )}

      {notice && (notice.type === 'verify-reminder' || notice.type === 'register-success') && (
        <div className="animate-in fade-in duration-150">
          <EmailVerificationForm
            email={notice.email}
            onVerified={(verifiedUser) => {
              onClose();
              if (verifiedUser && !verifiedUser.onboarding_completed_at) {
                const locale = pathname?.split('/')[1] || 'en';
                router.push(`/${locale}/welcome`);
              }
            }}
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
            <span>{dict.user.forgotSentNotice}</span>
          </div>
          {dict.modal.close && (
            <button
              type="button"
              onClick={onClose}
              className="block w-full rounded-lg bg-accent-amber/20 py-1.5 type-label-xs text-accent-amber hover:bg-accent-amber/30 transition-colors cursor-pointer"
            >
              {dict.modal.close}
            </button>
          )}
        </div>
      )}

      {!notice && (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'forgot' && (
            <p className="type-body-lg text-text-secondary">{dict.user.authResetSubtitle}</p>
          )}

          {mode !== 'forgot' && (
            <div>
              <label className="block type-label-xs text-text-secondary mb-1">
                {mode === 'register' ? dict.user.usernameLabel : dict.user.usernameOrEmailLabel}
              </label>
              <Input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-bg-primary px-3.5 shadow-inner"
              />
            </div>
          )}

          {(mode === 'register' || mode === 'forgot') && (
            <div>
              {(dict.user.emailLabel) && (
                <label className="block type-label-xs text-text-secondary mb-1">
                  {dict.user.emailLabel}
                </label>
              )}
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-bg-primary px-3.5 shadow-inner"
              />
            </div>
          )}

          {mode !== 'forgot' && (
            <div>
              {(dict.user.passwordLabel) && (
                <label className="block type-label-xs text-text-secondary mb-1">
                  {dict.user.passwordLabel}
                </label>
              )}
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-bg-primary px-3.5 shadow-inner"
              />
            </div>
          )}

          {mode === 'login' && dict.user.forgotPasswordLink && (
            <div className="text-right -mt-1.5">
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="type-caption text-text-muted hover:text-accent-amber transition-colors cursor-pointer"
              >
                {dict.user.forgotPasswordLink}
              </button>
            </div>
          )}

          {mode === 'register' && (
            <div>
              <Checkbox
                checked={acceptedRules}
                onChange={setAcceptedRules}
                invalid={showRulesError}
                ariaDescribedBy={showRulesError ? 'accept-rules-error' : undefined}
                className="items-start"
                boxClassName="mt-0.5"
              >
                <span className="type-body text-text-secondary">
                  {rulesLabelBefore}
                  <button
                    type="button"
                    onClick={() => setRulesOpen(true)}
                    className="cursor-pointer font-bold text-accent-red underline underline-offset-2 hover:opacity-80"
                  >
                    {dict.user.acceptRulesLink}
                  </button>
                  {rulesLabelAfter}
                </span>
              </Checkbox>
              {showRulesError ? (
                <p id="accept-rules-error" role="alert" className="mt-1.5 pl-6 text-xs font-medium text-accent-red">
                  {dict.user.rulesNotAccepted}
                </p>
              ) : null}
            </div>
          )}

          <AltchaWidget
            isVerifying={isAltchaVerifying}
            isVerified={isAltchaVerified}
            error={altchaError}
            onRetry={refreshChallenge}
            honeypotProps={honeypotProps}
          />

          <Button type="submit" variant="primary" loading={loading} className="w-full mt-2">
            {mode === 'login' ? (
              <>
                <LogIn className="h-4 w-4" />
                <span>{dict.user.signIn}</span>
              </>
            ) : mode === 'register' ? (
              <>
                <UserPlus className="h-4 w-4" />
                <span>{dict.user.createAccount}</span>
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                <span>{dict.user.sendResetLink}</span>
              </>
            )}
          </Button>
        </form>
      )}

      {!notice && mode !== 'forgot' && (
        <div className="mt-4 pt-4 border-t border-border-color">
          {dict.user.quickDemoAccounts && (
            <p className="type-label-2xs text-text-muted mb-2 text-center">
              {dict.user.quickDemoAccounts}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="soft" size="xs" onClick={() => handleFillDemo('admin')} leftIcon={<ShieldAlert className="h-3 w-3" />}>
              <span>{dict.user.adminDemo}</span>
            </Button>
            <button
              type="button"
              onClick={() => handleFillDemo('player')}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-accent-amber/30 bg-accent-amber/10 px-2.5 py-1.5 type-strong-xs text-accent-amber hover:bg-accent-amber/20 transition-colors shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
            >
              <Sparkles className="h-3 w-3 text-accent-amber" />
              <span>{dict.user.userDemo}</span>
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
              <span className="font-bold text-accent-amber">
                {dict.user.backToSignIn}
              </span>
            ) : mode === 'register' ? (
              <>
                {dict.user.alreadyHaveAccount}{' '}
                <span className="font-bold text-accent-amber">
                  {dict.user.signIn}
                </span>
              </>
            ) : (
              <>
                {dict.user.dontHaveAccount}{' '}
                <span className="font-bold text-accent-amber">
                  {dict.user.register}
                </span>
              </>
            )}
          </button>
        </div>
      )}

      <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} onAccept={() => setAcceptedRules(true)} />
    </Modal>
  );
};
