'use client';
// frontend/src/components/auth/CodeInput.tsx
//
// Six single-digit boxes for a one-time code (authenticator app). Controlled: `value` is the digits
// typed so far. Pasting a whole code fills every box; Backspace on an empty box steps back.

import React, { useRef } from 'react';
import { useDictionary } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';

export const CODE_LENGTH = 6;

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  invalid?: boolean;
}

export const CodeInput: React.FC<CodeInputProps> = ({ value, onChange, disabled, autoFocus, invalid }) => {
  const dict = useDictionary();
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: CODE_LENGTH }, (_, i) => value[i] ?? '');

  const setDigitAt = (index: number, digit: string) => {
    const next = [...digits];
    next[index] = digit;
    onChange(next.join('').slice(0, CODE_LENGTH));
  };

  const handleChange = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, '');
    if (!cleaned) {
      setDigitAt(index, '');
      return;
    }
    if (cleaned.length > 1) {
      const next = [...digits];
      for (let i = 0; i < cleaned.length && index + i < CODE_LENGTH; i += 1) {
        next[index + i] = cleaned[i];
      }
      onChange(next.join('').slice(0, CODE_LENGTH));
      inputsRef.current[Math.min(index + cleaned.length, CODE_LENGTH - 1)]?.focus();
      return;
    }
    setDigitAt(index, cleaned);
    if (index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    } else if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1 && !/\d/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    onChange(pasted);
    inputsRef.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  };

  return (
    <div className="flex w-full items-center justify-center gap-1.5" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          autoFocus={autoFocus && index === 0}
          maxLength={CODE_LENGTH}
          value={digit}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          aria-label={formatMessage(dict.user.digitAriaLabel, { n: index + 1 })}
          className={`h-11 w-9 rounded-control border bg-bg-primary text-center text-base text-text-primary shadow-inner transition-colors focus:outline-none focus:ring-1 disabled:opacity-60 ${
            invalid
              ? 'border-accent-red focus:border-accent-red focus:ring-accent-red'
              : 'border-border-color focus:border-accent-red focus:ring-accent-red'
          }`}
        />
      ))}
    </div>
  );
};
