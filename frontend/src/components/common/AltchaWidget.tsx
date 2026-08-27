'use client';
// frontend/src/components/common/AltchaWidget.tsx

import React from 'react';
import { ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';

export interface AltchaWidgetProps {
  isVerifying: boolean;
  isVerified: boolean;
  error?: string | null;
  onRetry?: () => void;
  honeypotProps: React.InputHTMLAttributes<HTMLInputElement>;
  showIndicator?: boolean;
  className?: string;
}

export const AltchaWidget: React.FC<AltchaWidgetProps> = ({
  isVerifying,
  isVerified,
  error,
  onRetry,
  honeypotProps,
  showIndicator = false,
  className = '',
}) => {
  return (
    <div className={className}>
      {/* Invisible honeypot trap field for bots */}
      <input type="text" {...honeypotProps} aria-hidden="true" />

      {/* Dynamic visual indicator shown when requested, verifying, or on error */}
      {(showIndicator || error || isVerifying) && (
        <div className="flex items-center gap-2 text-xs py-1 px-2.5 rounded-md bg-slate-800/40 border border-slate-700/50 text-slate-300">
          {isVerifying ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
              <span>Verifying secure session...</span>
            </>
          ) : isVerified ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-emerald-400">Security check passed</span>
            </>
          ) : error ? (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="text-rose-400">Security check failed</span>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="ml-auto underline text-amber-400 hover:text-amber-300 text-xs cursor-pointer focus:outline-none"
                >
                  Retry
                </button>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};
