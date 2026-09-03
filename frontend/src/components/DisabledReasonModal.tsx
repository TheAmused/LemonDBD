'use client';
// frontend/src/components/DisabledReasonModal.tsx

import React from 'react';
import type { Dictionary } from '@/locales/types';
import { AlertTriangle, X } from 'lucide-react';

interface DisabledReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  label: string;
  reason?: string | null;
  dict?: Dictionary;
  t?: Record<string, string>;
}

export const DisabledReasonModal: React.FC<DisabledReasonModalProps> = ({
  isOpen,
  onClose,
  label,
  reason,
  dict,
  t: propT,
}) => {
  if (!isOpen) return null;

  const t: Record<string, string> | undefined = propT || dict?.modal;
  const wasDisabledText = t?.wasDisabledTemporarily
    ? t.wasDisabledTemporarily.replace('{item}', label)
    : label;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-sm bg-bg-surface border border-border-color rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-text-primary transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-5 border-b border-border-color">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-amber/15 border border-accent-amber/30 text-accent-amber shadow-xs">
            <AlertTriangle className="h-5 w-5" />
          </div>
          {t?.temporarilyDisabled && (
            <h2 className="text-sm font-black text-text-primary">
              {t.temporarilyDisabled}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer"
            aria-label={t?.close}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 text-sm text-text-secondary leading-relaxed">
          <p>
            {wasDisabledText}
            {reason && (
              <>
                {' '}{t?.reasonLabel}: <span className="font-semibold text-text-primary">{reason}</span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

