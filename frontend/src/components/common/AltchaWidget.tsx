'use client';
// frontend/src/components/common/AltchaWidget.tsx

import React from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { Spinner } from '@/components/common/Spinner';
import { useDictionary } from '@/context/DictionaryContext';

export interface AltchaWidgetProps {
  isVerifying: boolean;
  isVerified: boolean;
  error?: string | null;
  onRetry?: () => void;
  honeypotProps: React.InputHTMLAttributes<HTMLInputElement>;
  showIndicator?: boolean;
  className?: string;
  verifyingText?: string;
  verifiedText?: string;
  failedText?: string;
}

export const AltchaWidget: React.FC<AltchaWidgetProps> = ({
  isVerifying,
  isVerified,
  error,
  onRetry,
  honeypotProps,
  showIndicator = false,
  className = '',
  verifyingText,
  verifiedText,
  failedText,
}) => {
  const dict = useDictionary();
  return (
    <div className={className}>
      {/* Bot trap: hidden from people, keyboard and assistive tech alike. */}
      <input type="text" {...honeypotProps} tabIndex={-1} aria-hidden="true" />

      {(showIndicator || error || isVerifying) && (
        <output
          className="flex items-center gap-2 text-xs py-1.5 px-3 rounded-card bg-bg-surface border border-border-color text-text-secondary shadow-xs"
        >
          {isVerifying ? (
            <>
              <Spinner size="xs" tone="amber" />
              {verifyingText && <span>{verifyingText}</span>}
            </>
          ) : isVerified ? (
            <>
              <ShieldCheck className="icon-sm text-accent-green shrink-0" />
              {verifiedText && (
                <span className="text-accent-green font-bold">{verifiedText}</span>
              )}
            </>
          ) : error ? (
            <>
              <ShieldAlert className="icon-sm text-accent-red shrink-0" />
              <span className="text-accent-red font-bold">{failedText || error}</span>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  aria-label={dict.modal.retry}
                  className="ml-auto underline text-accent-amber hover:opacity-80 type-strong cursor-pointer focus:outline-none"
                >
                  {dict.modal.retry}
                </button>
              )}
            </>
          ) : null}
        </output>
      )}
    </div>
  );
};

