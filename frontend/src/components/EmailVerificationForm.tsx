'use client';
// frontend/src/components/EmailVerificationForm.tsx

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { Dictionary } from '@/locales/types';

interface EmailVerificationFormProps {
  email: string;
  onVerified?: () => void;
  submitLabel?: string;
  dict?: Dictionary;
}

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export const EmailVerificationForm: React.FC<EmailVerificationFormProps> = ({
  email,
  onVerified,
  submitLabel,
  dict,
}) => {
  const t = dict?.user;
  const resolvedSubmitLabel = submitLabel || t?.verifyEmailAction;
  const { verifyEmail, resendVerification, refreshUser } = useAuth();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const setDigitAt = (index: number, value: string) => {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setDigitAt(index, digit);
    if (digit && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = Array(CODE_LENGTH).fill('');
    pasted.split('').forEach((d, i) => {
      next[i] = d;
    });
    setDigits(next);
    inputsRef.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setVerifying(true);
    const res = await verifyEmail(email, code);
    setVerifying(false);

    if (res.success) {
      await refreshUser();
      onVerified?.();
    } else {
      setError(res.error || t?.invalidVerificationCode || null);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError(null);
    const res = await resendVerification(email);
    if (!res.success) {
      setError(res.error || t?.failedToResendCode || null);
    }
    setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3">
      {error && (
        <p role="alert" className="text-[11px] font-semibold text-accent-red">
          {error}
        </p>
      )}
      <div className="flex items-center justify-center gap-1.5" onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            aria-label={t?.digitAriaLabel?.replace('{n}', String(index + 1))}
            className="h-11 w-9 rounded-lg border border-border-color bg-bg-primary text-center font-mono text-base text-text-primary focus:border-accent-amber focus:outline-none focus:ring-1 focus:ring-accent-amber shadow-inner transition-colors"
          />
        ))}
      </div>
      {resolvedSubmitLabel && (
        <button
          type="submit"
          disabled={verifying || code.length !== CODE_LENGTH}
          className="w-full max-w-xs rounded-xl bg-accent-amber hover:bg-accent-amber-hover py-2.5 text-xs font-black uppercase tracking-wider text-text-inverted disabled:opacity-50 transition-all cursor-pointer shadow-xs"
        >
          {verifying ? t?.verifying : resolvedSubmitLabel}
        </button>
      )}
      {(t?.resendCodeIn || t?.resendCode) && (
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0}
          className="text-[11px] font-bold underline text-accent-amber hover:opacity-80 disabled:opacity-60 cursor-pointer"
        >
          {cooldown > 0
            ? t?.resendCodeIn?.replace('{seconds}', String(cooldown))
            : t?.resendCode}
        </button>
      )}
    </form>
  );
};

