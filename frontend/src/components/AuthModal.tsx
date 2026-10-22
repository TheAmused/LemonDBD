'use client';
// frontend/src/components/AuthModal.tsx

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useAltcha } from '@/hooks/useAltcha';
import { useDemoAccounts, type DemoAccount } from '@/hooks/useDemoAccounts';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { useGoogleClientId } from '@/hooks/useGoogleConfig';
import { AltchaWidget } from '@/components/common/AltchaWidget';
import { AlertCircle } from 'lucide-react';
import { EmailVerificationForm } from '@/components/EmailVerificationForm';
import { TwoFactorChallengeForm } from '@/components/auth/TwoFactorChallengeForm';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { LegalDocModal } from '@/components/legal/LegalDocModal';
import type { LegalDocId } from '@/components/legal/legalDocs';
import { useDictionary } from "@/context/DictionaryContext";
import { trackEvent } from '@/utils/analytics';
import { AccountBlockedNotice } from '@/components/moderation/AccountBlockedNotice';
import type { UserProfile } from '@/context/AuthContext';
import {
  AuthField, authModalTitle, DemoAccountButtons, ForgotSentNotice, GoogleSignInSection, LegalConsentField, ModeSwitchLink,
  SecurityCheck, SubmitLabel, type AuthMode, type Notice,
} from '@/components/auth/AuthModalParts';
import { useOnValueChange } from '@/hooks/useOnValueChange';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  verifyEmailFor?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login', verifyEmailFor }) => {
  const dict = useDictionary();
  const { login, loginWithGoogle, register, forgotPassword } = useAuth();
  const { features, limits } = useSiteConfig();
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
  } = useAltcha(isOpen);

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [loginName, setLoginName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [notice, setNotice] = useState<Notice | null>(() =>
    isOpen && verifyEmailFor ? { type: 'verify-reminder', email: verifyEmailFor } : null
  );
  const [acceptedLegal, setAcceptedLegal] = useState<boolean>(false);
  // Which document the read-only preview shows (null: closed).
  const [legalDoc, setLegalDoc] = useState<LegalDocId | null>(null);
  // Set by a submit with the box unticked, so the field error only shows after an attempt.
  const [legalAttempted, setLegalAttempted] = useState<boolean>(false);

  // Opening, closing or a new starting point clears the password; an opening starts the form afresh.
  useOnValueChange(`${isOpen}|${initialMode}|${verifyEmailFor ?? ''}`, () => {
    setPassword('');
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setAcceptedLegal(false);
      setLegalAttempted(false);
      setLegalDoc(null);
      setNotice(verifyEmailFor ? { type: 'verify-reminder', email: verifyEmailFor } : null);
    }
  });

  const locale = pathname?.split('/')[1] || 'en';

  // Signed in with a confirmed address: close, and send an account that has not finished
  // onboarding to the welcome page.
  const closeSignedIn = (signedIn?: Pick<UserProfile, 'onboarding_completed_at'> | null) => {
    onClose();
    if (signedIn && !signedIn.onboarding_completed_at) router.push(`/${locale}/welcome`);
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  // A completed sign-in: unverified accounts are asked for their email code, everyone else is in.
  const finishSignIn = (signedIn?: { is_verified: boolean; email: string }) => {
    setPassword('');
    if (signedIn && !signedIn.is_verified) {
      setNotice({ type: 'verify-reminder', email: signedIn.email });
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // Each solved ALTCHA challenge is single-use: after a request goes out, fetch and solve a fresh one.
    let requestSent = false;

    try {
      if (mode === 'forgot') {
        requestSent = true;
        const res = await forgotPassword(email, {
          website_trap: honeypotValue,
          altcha: altchaPayload,
        });
        if (res.success) {
          trackEvent('forgot_password_request');
          setNotice({ type: 'forgot-sent' });
        } else {
          setError(res.error || dict.user.failedToRequestPasswordReset);
        }
      } else if (mode === 'login') {
        requestSent = true;
        const res = await login(loginName, password, {
          website_trap: honeypotValue,
          altcha: altchaPayload,
        });
        if (res.twoFactorToken) {
          setPassword('');
          setNotice({ type: 'two-factor', token: res.twoFactorToken });
        } else if (res.verification) {
          setPassword('');
          setNotice({ type: 'verify-reminder', email: res.verification.email, token: res.verification.token });
        } else if (res.blocked) {
          setPassword('');
          setNotice({ type: 'blocked', blocked: res.blocked });
        } else if (res.success) {
          finishSignIn(res.user);
        } else {
          setError(res.error || dict.user.invalidCredentials);
        }
      } else {
        if (!acceptedLegal) {
          setLegalAttempted(true);
          return;
        }
        requestSent = true;
        const res = await register(loginName, username, email, password, {
          website_trap: honeypotValue,
          altcha: altchaPayload,
        });
        if (res.success) {
          setPassword('');
          if (res.verification) {
            setNotice({ type: 'register-success', email: res.verification.email, token: res.verification.token });
          } else if (res.user && !res.user.is_verified) {
            setNotice({ type: 'register-success', email: res.user?.email || email });
          } else {
            closeSignedIn(res.user);
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
      if (requestSent) void refreshChallenge();
    }
  };

  const googleClientId = useGoogleClientId(isOpen);
  const handleGoogleCredential = async (credential: string) => {
    if (mode === 'register' && !acceptedLegal) {
      setLegalAttempted(true);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await loginWithGoogle(credential);
      if (res.twoFactorToken) {
        setNotice({ type: 'two-factor', token: res.twoFactorToken });
      } else if (res.blocked) {
        setNotice({ type: 'blocked', blocked: res.blocked });
      } else if (res.success) {
        closeSignedIn(res.user);
      } else {
        setError(res.error || dict.user.googleSignInFailed);
      }
    } finally {
      setLoading(false);
    }
  };

  // Development only: the backend lists the demo logins when FLASK_ENV=development, else nothing.
  const demoAccounts = useDemoAccounts(isOpen);
  const handleFillDemo = (role: DemoAccount['role']) => {
    const account = demoAccounts.find((a) => a.role === role);
    if (!account) return;
    switchMode('login');
    setLoginName(account.login);
    setPassword(account.password);
  };

  const showLegalError = legalAttempted && !acceptedLegal;
  // While the ALTCHA challenge is being solved the form can't be submitted, so the whole body gives way to the loader.
  const showSecurityCheck = !notice && isAltchaVerifying;
  const showAuthBody = !notice && !isAltchaVerifying;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="md"
      title={authModalTitle(dict, notice, mode)}
      ariaLabel="Authentication"
      closeButtonAriaLabel={dict.modal.close}
      padded
    >
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2.5 rounded-card border border-accent-red/30 bg-accent-red/10 p-3 type-strong text-accent-red animate-in fade-in duration-150 shadow-xs"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-accent-red" />
          <span>{error}</span>
        </div>
      )}

      {notice && (notice.type === 'verify-reminder' || notice.type === 'register-success') && (
        <div className="animate-in fade-in duration-150">
          <EmailVerificationForm
            email={notice.email}
            verificationToken={notice.token}
            onTwoFactor={(token) => setNotice({ type: 'two-factor', token })}
            onBlocked={(blocked) => setNotice({ type: 'blocked', blocked })}
            onVerified={closeSignedIn}
          />
        </div>
      )}

      {notice && notice.type === 'two-factor' && (
        <div className="animate-in fade-in duration-150">
          <TwoFactorChallengeForm
            twoFactorToken={notice.token}
            onSuccess={finishSignIn}
            onBlocked={(blocked) => setNotice({ type: 'blocked', blocked })}
            onBack={() => {
              setNotice(null);
              setPassword('');
            }}
          />
        </div>
      )}

      {notice && notice.type === 'blocked' && (
        <AccountBlockedNotice blocked={notice.blocked} onClose={onClose} />
      )}

      {notice && notice.type === 'forgot-sent' && <ForgotSentNotice onClose={onClose} />}

      {showSecurityCheck && <SecurityCheck />}

      {showAuthBody && (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'forgot' && (
            <p className="type-body-lg text-text-secondary">{dict.user.authResetSubtitle}</p>
          )}

          {mode !== 'forgot' && (
            <AuthField
              label={mode === 'register' ? dict.user.loginLabel : dict.user.loginOrEmailLabel}
              type="text" value={loginName} onChange={setLoginName}
            />
          )}
          {mode === 'register' && (
            <AuthField label={dict.user.usernameLabel} type="text" minLength={3} maxLength={50} value={username} onChange={setUsername} />
          )}
          {(mode === 'register' || mode === 'forgot') && (
            <AuthField label={dict.user.emailLabel} type="email" value={email} onChange={setEmail} />
          )}
          {mode !== 'forgot' && (
            <AuthField
              label={dict.user.passwordLabel} type="password" value={password} onChange={setPassword}
              minLength={mode === 'register' ? limits.passwordMinLength : undefined}
            />
          )}

          {mode === 'login' && dict.user.forgotPasswordLink && (
            <div className="text-right -mt-1.5">
              <Button
                type="button"
                onClick={() => switchMode('forgot')}
                variant="linkMuted" size="xs"
              >
                {dict.user.forgotPasswordLink}
              </Button>
            </div>
          )}

          {mode === 'register' && (
            <LegalConsentField
              accepted={acceptedLegal}
              onChange={setAcceptedLegal}
              showLegalError={showLegalError}
              onPreview={setLegalDoc}
              locale={locale}
            />
          )}

          <AltchaWidget
            isVerifying={isAltchaVerifying}
            isVerified={isAltchaVerified}
            error={altchaError}
            onRetry={refreshChallenge}
            honeypotProps={honeypotProps}
          />

          {mode === 'register' && !features.registrationOpen ? (
            <output className="block type-body font-medium text-accent-amber">
              {dict.user.registrationClosedNotice}
            </output>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={!isAltchaVerified || (mode === 'register' && !features.registrationOpen)}
            className="w-full mt-2 min-h-10"
          >
            {loading ? null : <SubmitLabel mode={mode} />}
          </Button>
        </form>
      )}

      {showAuthBody && mode !== 'forgot' && googleClientId && (
        <GoogleSignInSection clientId={googleClientId} onCredential={handleGoogleCredential} />
      )}

      {showAuthBody && mode !== 'forgot' && demoAccounts.length > 0 && <DemoAccountButtons onFill={handleFillDemo} />}

      {showAuthBody && <ModeSwitchLink mode={mode} onSwitch={switchMode} />}

      <LegalDocModal doc={legalDoc} onClose={() => setLegalDoc(null)} />
    </Modal>
  );
};
