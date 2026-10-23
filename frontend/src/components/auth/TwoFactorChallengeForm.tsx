'use client';
// frontend/src/components/auth/TwoFactorChallengeForm.tsx
//
// Second step of a sign-in for accounts that turned two-factor on: the password was accepted, now
// the person proves they hold the authenticator app (or spends a recovery code).

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { UserProfile } from '@/context/AuthContext';
import { useDictionary } from '@/context/DictionaryContext';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { CODE_LENGTH, CodeInput } from '@/components/auth/CodeInput';
import { useFocusWhen } from '@/hooks/useFocusWhen';
import { twoFactorErrorMessage } from '@/utils/twoFactorErrors';
import type { BlockedInfo } from '@/types/moderation';

interface TwoFactorChallengeFormProps {
  twoFactorToken: string;
  onSuccess: (user?: UserProfile) => void;
  /** The second factor was right but the account is banned or suspended: show why. */
  onBlocked?: (blocked: BlockedInfo) => void;
  onBack: () => void;
}

export const TwoFactorChallengeForm: React.FC<TwoFactorChallengeFormProps> = ({ twoFactorToken, onSuccess, onBlocked, onBack }) => {
  const t = useDictionary().twoFactor;
  const { completeTwoFactorLogin } = useAuth();
  const [useRecovery, setUseRecovery] = useState(false);
  const recoveryInputRef = useFocusWhen<HTMLInputElement>(useRecovery);
  const [appCode, setAppCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);

  const code = useRecovery ? recoveryCode.trim() : appCode;
  const ready = useRecovery ? code.length >= 10 : code.length === CODE_LENGTH;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    const res = await completeTwoFactorLogin(twoFactorToken, code);
    setBusy(false);
    if (res.success) {
      onSuccess(res.user);
      return;
    }
    if (res.blocked && onBlocked) {
      onBlocked(res.blocked);
      return;
    }
    setExpired(res.errorCode === 'two_factor_challenge_invalid');
    setError(twoFactorErrorMessage(t, res.errorCode));
    if (!useRecovery) setAppCode('');
  };

  const switchMethod = () => {
    setUseRecovery((v) => !v);
    setError(null);
  };

  return (
    <form onSubmit={(e) => { void submit(e); }} className="flex w-full flex-col items-center gap-5">
      <p className="w-full text-center type-body-lg text-text-secondary">
        {useRecovery ? t.challengeRecoverySubtitle : t.challengeSubtitle}
      </p>
      {error && (
        <p role="alert" className="type-strong-xs text-accent-red text-center">
          {error}
        </p>
      )}
      {useRecovery ? (
        <Input
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          ref={recoveryInputRef}
          aria-label={t.recoveryCodeLabel}
          placeholder={t.recoveryCodePlaceholder}
          value={recoveryCode}
          onChange={(e) => setRecoveryCode(e.target.value)}
          invalid={!!error}
          className="bg-bg-primary px-3.5 text-center tracking-widest shadow-inner"
        />
      ) : (
        <CodeInput value={appCode} onChange={setAppCode} disabled={busy} invalid={!!error} focusOnMount />
      )}
      <Button type="submit" variant="primary" disabled={!ready || busy || expired} loading={busy} spinnerOnly className="w-full">
        {t.challengeSubmit}
      </Button>
      <div className="flex w-full flex-col items-center gap-2">
        <Button
          type="button"
          onClick={switchMethod}
          aria-label={useRecovery ? t.useAppCode : t.useRecoveryCode}
          variant="link" size="sm"
        >
          {useRecovery ? t.useAppCode : t.useRecoveryCode}
        </Button>
        <Button
          type="button"
          onClick={onBack}
          variant="linkMuted" size="xs"
        >
          {t.backToSignIn}
        </Button>
      </div>
    </form>
  );
};
