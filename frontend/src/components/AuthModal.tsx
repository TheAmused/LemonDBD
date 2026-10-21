'use client';
// frontend/src/components/AuthModal.tsx

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useAltcha } from '@/hooks/useAltcha';
import { useDemoAccounts, type DemoAccount } from '@/hooks/useDemoAccounts';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { useGoogleClientId } from '@/hooks/useGoogleConfig';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { AltchaWidget } from '@/components/common/AltchaWidget';
import { Spinner } from '@/components/common/Spinner';
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
import { TwoFactorChallengeForm } from '@/components/auth/TwoFactorChallengeForm';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { FieldLabel, Input } from '@/components/common/Field';
import { LegalDocModal } from '@/components/legal/LegalDocModal';
import type { LegalDocId } from '@/components/legal/legalDocs';
import { useDictionary } from "@/context/DictionaryContext";
import { trackEvent } from '@/utils/analytics';
import { InlineLink } from '@/components/common/InlineLink';
import { AccountBlockedNotice } from '@/components/moderation/AccountBlockedNotice';
import type { BlockedInfo } from '@/types/moderation';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  verifyEmailFor?: string;
}

type AuthMode = 'login' | 'register' | 'forgot';
type Notice =
  // `token` is set when there is no session yet: the code then finishes the sign-in.
  | { type: 'verify-reminder'; email: string; token?: string }
  | { type: 'register-success'; email: string; token?: string }
  | { type: 'forgot-sent' }
  | { type: 'two-factor'; token: string }
  | { type: 'blocked'; blocked: BlockedInfo };

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
  const [notice, setNotice] = useState<Notice | null>(null);
  const [acceptedLegal, setAcceptedLegal] = useState<boolean>(false);
  // Which document the read-only preview shows (null: closed).
  const [legalDoc, setLegalDoc] = useState<LegalDocId | null>(null);
  // Set by a submit with the box unticked, so the field error only shows after an attempt.
  const [legalAttempted, setLegalAttempted] = useState<boolean>(false);

  useEffect(() => {
    setPassword('');
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setAcceptedLegal(false);
      setLegalAttempted(false);
      setLegalDoc(null);
      setNotice(verifyEmailFor ? { type: 'verify-reminder', email: verifyEmailFor } : null);
    }
  }, [isOpen, initialMode, verifyEmailFor]);

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
        onClose();
        if (res.user && !res.user.onboarding_completed_at) {
          const locale = pathname?.split('/')[1] || 'en';
          router.push(`/${locale}/welcome`);
        }
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

  // The label holds {terms} and {rules}; each becomes a link that previews that document.
  const legalLabelParts = dict.user.acceptLegalLabel.split(/(\{terms\}|\{rules\}|\{privacy\})/);
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
      title={
        notice?.type === 'verify-reminder' || notice?.type === 'register-success'
          ? dict.user.authVerifyEmailTitle
          : notice?.type === 'two-factor'
            ? dict.twoFactor.challengeTitle
          : notice?.type === 'blocked'
            ? notice.blocked.code === 'account_banned'
              ? dict.moderation.blocked.bannedTitle
              : dict.moderation.blocked.suspendedTitle
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

      {notice && notice.type === 'forgot-sent' && (
        <div
          role="status"
          className="mb-4 space-y-3 rounded-card border border-accent-amber/30 bg-accent-amber/10 p-3.5 text-xs text-accent-amber animate-in fade-in duration-150 shadow-xs"
        >
          <div className="flex items-start gap-2.5">
            <MailWarning className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{dict.user.forgotSentNotice}</span>
          </div>
          {dict.modal.close && (
            <Button
              type="button"
              onClick={onClose}
              variant="amberSoft" size="sm" className="block w-full"
            >
              {dict.modal.close}
            </Button>
          )}
        </div>
      )}

      {showSecurityCheck && (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Spinner tone="accent" className="h-14 w-14 border-4" />
          <p role="status" className="type-body text-text-secondary">{dict.user.authSecurityCheck}</p>
        </div>
      )}

      {showAuthBody && (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'forgot' && (
            <p className="type-body-lg text-text-secondary">{dict.user.authResetSubtitle}</p>
          )}

          {mode !== 'forgot' && (
            <div>
              <FieldLabel>
                {mode === 'register' ? dict.user.loginLabel : dict.user.loginOrEmailLabel}
              </FieldLabel>
              <Input
                type="text"
                required
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                className="bg-bg-primary px-3.5 shadow-inner"
              />
            </div>
          )}

          {mode === 'register' && (
            <div>
              <FieldLabel>
                {dict.user.usernameLabel}
              </FieldLabel>
              <Input
                type="text"
                required
                minLength={3}
                maxLength={50}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-bg-primary px-3.5 shadow-inner"
              />
            </div>
          )}

          {(mode === 'register' || mode === 'forgot') && (
            <div>
              {(dict.user.emailLabel) && (
                <FieldLabel>
                  {dict.user.emailLabel}
                </FieldLabel>
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
                <FieldLabel>
                  {dict.user.passwordLabel}
                </FieldLabel>
              )}
              <Input
                type="password"
                required
                minLength={mode === 'register' ? limits.passwordMinLength : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-bg-primary px-3.5 shadow-inner"
              />
            </div>
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
            <div>
              <Checkbox
                checked={acceptedLegal}
                onChange={setAcceptedLegal}
                invalid={showLegalError}
                ariaDescribedBy={showLegalError ? 'accept-legal-error' : undefined}
                className="items-start"
                boxClassName="mt-0.5"
              >
                <span className="type-body text-text-secondary">
                  {legalLabelParts.map((part, i) =>
                    part === '{privacy}' ? (
                      // The privacy policy is information, not something to accept: open the page
                      // itself in a new tab instead of the accept-terms preview.
                      <InlineLink
                        key={i}
                        onClick={() => {
                          trackEvent('legal_preview_open', { doc: 'privacy' });
                          window.open(`/${pathname?.split('/')[1] || 'en'}/privacy-policy`, '_blank', 'noopener');
                        }}
                      >
                        {dict.user.acceptPrivacyLink}
                      </InlineLink>
                    ) : part === '{terms}' || part === '{rules}' ? (
                      <InlineLink
                        key={i}
                        onClick={() => {
                          trackEvent('legal_preview_open', { doc: part === '{terms}' ? 'terms' : 'rules' });
                          setLegalDoc(part === '{terms}' ? 'terms' : 'rules');
                        }}
                      >
                        {part === '{terms}' ? dict.user.acceptTermsLink : dict.user.acceptRulesLink}
                      </InlineLink>
                    ) : (
                      <React.Fragment key={i}>{part}</React.Fragment>
                    )
                  )}
                </span>
              </Checkbox>
              {showLegalError ? (
                <p id="accept-legal-error" role="alert" className="mt-1.5 pl-6 text-xs font-medium text-accent-red">
                  {dict.user.legalNotAccepted}
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

          {mode === 'register' && !features.registrationOpen ? (
            <p role="status" className="type-body font-medium text-accent-amber">
              {dict.user.registrationClosedNotice}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={!isAltchaVerified || (mode === 'register' && !features.registrationOpen)}
            className="w-full mt-2 min-h-10"
          >
            {loading ? null : mode === 'login' ? (
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

      {showAuthBody && mode !== 'forgot' && googleClientId && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3" role="separator">
            <span className="h-px flex-1 bg-border-color" />
            <span className="type-label-2xs text-text-muted">{dict.user.googleOrDivider}</span>
            <span className="h-px flex-1 bg-border-color" />
          </div>
          <GoogleSignInButton
            clientId={googleClientId}
            onCredential={handleGoogleCredential}
          />
        </div>
      )}

      {showAuthBody && mode !== 'forgot' && demoAccounts.length > 0 && (
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
            <Button
              type="button"
              onClick={() => handleFillDemo('player')}
              variant="amberSoft" size="sm"
            >
              <Sparkles className="h-3 w-3 text-accent-amber" />
              <span>{dict.user.userDemo}</span>
            </Button>
          </div>
        </div>
      )}

      {showAuthBody && (
        <div className="mt-4 text-center">
          <Button
            type="button"
            onClick={() => switchMode(mode === 'register' ? 'login' : mode === 'forgot' ? 'login' : 'register')}
            variant="linkMuted" size="sm"
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
          </Button>
        </div>
      )}

      <LegalDocModal doc={legalDoc} onClose={() => setLegalDoc(null)} />
    </Modal>
  );
};
