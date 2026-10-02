'use client';
// frontend/src/components/common/AltchaWidget.tsx

import React from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { Spinner } from '@/components/common/Spinner';

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
  retryLabel?: string;
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
  retryLabel,
}) => {
  return (
    <div className={className}>
      <input type="text" {...honeypotProps} aria-hidden="true" />

      {(showIndicator || error || isVerifying) && (
        <div
          role="status"
          className="flex items-center gap-2 text-xs py-1.5 px-3 rounded-xl bg-bg-surface border border-border-color text-text-secondary shadow-xs"
        >
          {isVerifying ? (
            <>
              <Spinner size="xs" tone="amber" />
              {verifyingText && <span>{verifyingText}</span>}
            </>
          ) : isVerified ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-accent-green shrink-0" />
              {verifiedText && (
                <span className="text-accent-green font-bold">{verifiedText}</span>
              )}
            </>
          ) : error ? (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-accent-red shrink-0" />
              {failedText && (
                <span className="text-accent-red font-bold">{failedText}</span>
              )}
              {onRetry && retryLabel && (
                <button
                  type="button"
                  onClick={onRetry}
                  aria-label={retryLabel}
                  className="ml-auto underline text-accent-amber hover:opacity-80 type-strong cursor-pointer focus:outline-none"
                >
                  {retryLabel}
                </button>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

