// frontend/src/components/onboarding/SkipOnboardingModal.tsx
'use client';
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import { Modal } from '@/components/common/Modal';

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
  const t = dict?.onboarding;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      variant="confirm"
      size="md"
      tone="warning"
      icon={<AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />}
      title={t?.skipModalTitle || 'Skip character setup?'}
      closeButton="none"
      padded
      bodyClassName="text-center"
      footerClassName="flex-col-reverse sm:flex-row sm:justify-stretch p-4 sm:px-6"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            data-autofocus
            className="w-full sm:flex-1 rounded-xl border border-border-color bg-bg-elevated py-2.5 text-xs font-black uppercase tracking-wider text-text-secondary hover:bg-bg-elevated/80 transition-colors cursor-pointer"
          >
            {t?.skipModalCancel || 'Go back'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full sm:flex-1 rounded-xl bg-accent-amber hover:bg-accent-amber-hover py-2.5 text-xs font-black uppercase tracking-wider text-text-inverted transition-colors cursor-pointer"
          >
            {t?.skipModalConfirm || 'Yes, skip for now'}
          </button>
        </>
      }
    >
      <p className="text-xs text-text-secondary">
        {t?.skipModalBody ||
          'If you skip, only the free base-game characters will be unlocked for you. Everything else stays locked until you unlock it yourself from your Characters page later.'}
      </p>
    </Modal>
  );
};

export default SkipOnboardingModal;
