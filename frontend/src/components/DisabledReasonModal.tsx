'use client';
// frontend/src/components/DisabledReasonModal.tsx

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DisabledReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  label: string;
  reason?: string | null;
  dict?: any;
  t?: Record<string, string>;
}

/** Shared modal shown when clicking a disabled-badge or a disabled challenge
 * panel: explains what's disabled and, if the admin gave one, why. */
export const DisabledReasonModal: React.FC<DisabledReasonModalProps> = ({
  isOpen,
  onClose,
  label,
  reason,
  dict,
  t: propT,
}) => {
  if (!isOpen) return null;

  const t: Record<string, string> = propT || dict?.modal || {};

  const wasDisabledTemplate = t.wasDisabledTemporarily || '{item} was disabled temporarily.';
  const wasDisabledText = wasDisabledTemplate.replace('{item}', label);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-sm bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-5 border-b border-slate-800">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h2 className="text-sm font-black text-slate-100">
            {t.temporarilyDisabled || 'Temporarily disabled'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={t.close || 'Close'}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 text-sm text-slate-300">
          <p>
            {wasDisabledText}
            {reason && (
              <>
                {' '}{t.reasonLabel || 'Reason'}: <span className="font-semibold text-slate-100">{reason}</span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};
