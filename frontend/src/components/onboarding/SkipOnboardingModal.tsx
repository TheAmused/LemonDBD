// frontend/src/components/onboarding/SkipOnboardingModal.tsx
'use client';
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Dictionary } from '@/locales/types';

export interface SkipOnboardingModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  dict?: Dictionary;
}

export const SkipOnboardingModal: React.FC<SkipOnboardingModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  dict,
}) => {
  if (!isOpen) return null;

  const t = dict?.onboarding;

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skip-onboarding-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl border border-border-color bg-bg-surface shadow-2xl text-text-primary animate-in zoom-in-95 duration-200 cursor-default p-6"
      >
        <div className="flex flex-col items-center text-center gap-3">
          <AlertTriangle className="h-9 w-9 text-accent-amber" />
          <h2 id="skip-onboarding-title" className="text-lg font-black">
            {t?.skipModalTitle || 'Skip character setup?'}
          </h2>
          <p className="text-xs text-text-secondary">
            {t?.skipModalBody ||
              'If you skip, only the free base-game characters will be unlocked for you. Everything else stays locked until you unlock it yourself from your Characters page later.'}
          </p>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border-color bg-bg-elevated py-2.5 text-xs font-black uppercase tracking-wider text-text-secondary hover:bg-bg-elevated/80 transition-colors cursor-pointer"
          >
            {t?.skipModalCancel || 'Go back'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-accent-amber hover:bg-accent-amber-hover py-2.5 text-xs font-black uppercase tracking-wider text-text-inverted transition-colors cursor-pointer"
          >
            {t?.skipModalConfirm || 'Yes, skip for now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SkipOnboardingModal;
