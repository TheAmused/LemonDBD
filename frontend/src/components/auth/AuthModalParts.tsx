'use client';
import { BloodwebIcon } from '@/components/icons/DbdIcons';
// frontend/src/components/auth/AuthModalParts.tsx
//
// The presentational pieces of the sign-in / sign-up dialog. AuthModal keeps the state and the
// requests; these only render what it hands them.
import React from 'react';
import { Mail, LogIn, UserPlus, ShieldAlert, MailWarning } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { FieldLabel, Input } from '@/components/common/Field';
import { InlineLink } from '@/components/common/InlineLink';
import { Spinner } from '@/components/common/Spinner';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import type { LegalDocId } from '@/components/legal/legalDocs';
import { useDictionary } from '@/context/DictionaryContext';
import type { DemoAccount } from '@/hooks/useDemoAccounts';
import type { Dictionary } from '@/locales/types';
import type { BlockedInfo } from '@/types/moderation';
import { trackEvent } from '@/utils/analytics';

export type AuthMode = 'login' | 'register' | 'forgot';
export type Notice =
  // `token` is set when there is no session yet: the code then finishes the sign-in.
  | { type: 'verify-reminder'; email: string; token?: string }
  | { type: 'register-success'; email: string; token?: string }
  | { type: 'forgot-sent' }
  | { type: 'two-factor'; token: string }
  | { type: 'blocked'; blocked: BlockedInfo };

/** The dialog title: the open notice decides it, else the form mode. */
export function authModalTitle(dict: Dictionary, notice: Notice | null, mode: AuthMode): string {
  switch (notice?.type) {
    case 'verify-reminder':
    case 'register-success':
      return dict.user.authVerifyEmailTitle;
    case 'two-factor':
      return dict.twoFactor.challengeTitle;
    case 'blocked':
      return notice.blocked.code === 'account_banned'
        ? dict.moderation.blocked.bannedTitle
        : dict.moderation.blocked.suspendedTitle;
    case 'forgot-sent':
      return dict.user.resetPassword;
  }
  if (mode === 'login') return dict.user.authSignInTitle;
  return mode === 'register' ? dict.user.authRegisterTitle : dict.user.resetPassword;
}

interface AuthFieldProps {
  label: string;
  type: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  minLength?: number;
  maxLength?: number;
}

/** One required, labelled input of the sign-in / sign-up / reset form. */
export const AuthField: React.FC<AuthFieldProps> = ({ label, type, value, onChange, minLength, maxLength }) => (
  <div>
    {label && <FieldLabel>{label}</FieldLabel>}
    <Input
      type={type}
      required
      minLength={minLength}
      maxLength={maxLength}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-bg-primary px-3.5 shadow-inner"
    />
  </div>
);

/** "Check your inbox" after a reset request. */
export const ForgotSentNotice: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const dict = useDictionary();
  return (
    <output
      className="block mb-4 space-y-3 rounded-card border border-accent-amber/30 bg-accent-amber/10 p-3.5 text-xs text-accent-amber animate-in fade-in duration-150 shadow-xs"
    >
      <div className="flex items-start gap-2.5">
        <MailWarning className="h-4 w-4 shrink-0 mt-0.5" />
        <span>{dict.user.forgotSentNotice}</span>
      </div>
      {dict.modal.close && (
        <Button type="button" onClick={onClose} variant="amberSoft" size="sm" className="block w-full">
          {dict.modal.close}
        </Button>
      )}
    </output>
  );
};

/** Shown in place of the form while the ALTCHA challenge is being solved. */
export const SecurityCheck: React.FC = () => {
  const dict = useDictionary();
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <Spinner tone="accent" className="h-14 w-14 border-4" />
      <output className="block type-body text-text-secondary">{dict.user.authSecurityCheck}</output>
    </div>
  );
};

interface LegalConsentProps {
  accepted: boolean;
  onChange: (accepted: boolean) => void;
  showLegalError: boolean;
  onPreview: (doc: LegalDocId) => void;
  locale: string;
}

/** The required "I accept the terms and the rules" box on the sign-up form. */
export const LegalConsentField: React.FC<LegalConsentProps> = ({ accepted, onChange, showLegalError, onPreview, locale }) => {
  const dict = useDictionary();
  // The label holds {terms}, {rules} and {privacy}; each becomes a link.
  const parts = dict.user.acceptLegalLabel.split(/(\{terms\}|\{rules\}|\{privacy\})/);
  return (
    <div>
      <Checkbox
        checked={accepted}
        onChange={onChange}
        invalid={showLegalError}
        ariaDescribedBy={showLegalError ? 'accept-legal-error' : undefined}
        className="items-start"
        boxClassName="mt-0.5"
      >
        <span className="type-body text-text-secondary">
          {parts.map((part, i) =>
            part === '{privacy}' ? (
              // The privacy policy is information, not something to accept: open the page
              // itself in a new tab instead of the accept-terms preview.
              <InlineLink
                key={i}
                onClick={() => {
                  trackEvent('legal_preview_open', { doc: 'privacy' });
                  window.open(`/${locale}/privacy-policy`, '_blank', 'noopener');
                }}
              >
                {dict.user.acceptPrivacyLink}
              </InlineLink>
            ) : part === '{terms}' || part === '{rules}' ? (
              <InlineLink
                key={i}
                onClick={() => {
                  trackEvent('legal_preview_open', { doc: part === '{terms}' ? 'terms' : 'rules' });
                  onPreview(part === '{terms}' ? 'terms' : 'rules');
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
  );
};

/** The submit button's icon and label for the current mode. */
export const SubmitLabel: React.FC<{ mode: AuthMode }> = ({ mode }) => {
  const dict = useDictionary();
  if (mode === 'login') return <><LogIn className="h-4 w-4" /><span>{dict.user.signIn}</span></>;
  if (mode === 'register') return <><UserPlus className="h-4 w-4" /><span>{dict.user.createAccount}</span></>;
  return <><Mail className="h-4 w-4" /><span>{dict.user.sendResetLink}</span></>;
};

/** "or" divider plus the Google button. */
export const GoogleSignInSection: React.FC<{ clientId: string; onCredential: (credential: string) => void }> = ({
  clientId, onCredential,
}) => {
  const dict = useDictionary();
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border-color" aria-hidden="true" />
        <span className="type-label-2xs text-text-muted">{dict.user.googleOrDivider}</span>
        <span className="h-px flex-1 bg-border-color" aria-hidden="true" />
      </div>
      <GoogleSignInButton clientId={clientId} onCredential={onCredential} />
    </div>
  );
};

/** Development-only quick-fill buttons for the demo logins. */
export const DemoAccountButtons: React.FC<{ onFill: (role: DemoAccount['role']) => void }> = ({ onFill }) => {
  const dict = useDictionary();
  return (
    <div className="mt-4 pt-4 border-t border-border-color">
      {dict.user.quickDemoAccounts && (
        <p className="type-label-2xs text-text-muted mb-2 text-center">{dict.user.quickDemoAccounts}</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="soft" size="xs" onClick={() => onFill('admin')} leftIcon={<ShieldAlert className="h-3 w-3" />}>
          <span>{dict.user.adminDemo}</span>
        </Button>
        <Button type="button" onClick={() => onFill('player')} variant="amberSoft" size="sm">
          <BloodwebIcon className="h-3 w-3 text-accent-amber" />
          <span>{dict.user.userDemo}</span>
        </Button>
      </div>
    </div>
  );
};

/** The link under the form that flips between sign-in, sign-up and back from a reset. */
export const ModeSwitchLink: React.FC<{ mode: AuthMode; onSwitch: (next: AuthMode) => void }> = ({ mode, onSwitch }) => {
  const dict = useDictionary();
  return (
    <div className="mt-4 text-center">
      <Button type="button" onClick={() => onSwitch(mode === 'login' ? 'register' : 'login')} variant="linkMuted" size="sm">
        {mode === 'forgot' ? (
          <span className="font-bold text-accent-amber">{dict.user.backToSignIn}</span>
        ) : (
          <>
            {mode === 'register' ? dict.user.alreadyHaveAccount : dict.user.dontHaveAccount}{' '}
            <span className="font-bold text-accent-amber">
              {mode === 'register' ? dict.user.signIn : dict.user.register}
            </span>
          </>
        )}
      </Button>
    </div>
  );
};
