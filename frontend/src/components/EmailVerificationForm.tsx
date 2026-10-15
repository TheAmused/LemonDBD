'use client';
// frontend/src/components/EmailVerificationForm.tsx

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { UserProfile } from '@/context/AuthContext';
import { Button } from '@/components/common/Button';
import { CODE_LENGTH, CodeInput } from '@/components/auth/CodeInput';
import { formatMessage } from '@/utils/i18nFormat';
import { useDictionary } from "@/context/DictionaryContext";

interface EmailVerificationFormProps {
  email: string;
  onVerified?: (user?: UserProfile) => void;
}

const RESEND_COOLDOWN_SECONDS = 60;

export const EmailVerificationForm: React.FC<EmailVerificationFormProps> = ({ email, onVerified }) => {
  const dict = useDictionary();
  const t = dict.user;
  const { verifyEmail, resendVerification, refreshUser } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setVerifying(true);
    const res = await verifyEmail(email, code);
    setVerifying(false);

    if (res.success) {
      await refreshUser();
      onVerified?.(res.user);
    } else {
      setError(res.error || t.invalidVerificationCode);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError(null);
    const res = await resendVerification(email);
    if (!res.success) {
      setError(res.error || t.failedToResendCode);
    }
    setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col items-center gap-5">
      <p className="w-full text-center type-body-lg text-text-secondary">
        {formatMessage(t.authVerifySubtitle, { email })}
      </p>
      {error && (
        <p role="alert" className="type-strong-xs text-accent-red">
          {error}
        </p>
      )}
      <CodeInput value={code} onChange={setCode} autoFocus />
      <Button
        type="submit"
        variant="primary"
        disabled={verifying || code.length !== CODE_LENGTH}
        className="w-full"
      >
        {verifying ? t.verifying : t.verifyEmailAction}
      </Button>
      {(t.resendCodeIn) && (
        <Button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0}
          variant="link" size="sm"
        >
          {cooldown > 0
            ? formatMessage(t.resendCodeIn, { seconds: cooldown })
            : t.resendCode}
        </Button>
      )}
    </form>
  );
};

