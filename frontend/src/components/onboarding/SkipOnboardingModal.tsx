// frontend/src/components/onboarding/SkipOnboardingModal.tsx
'use client';
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useDictionary } from "@/context/DictionaryContext";

export interface SkipOnboardingModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const SkipOnboardingModal: React.FC<SkipOnboardingModalProps> = ({ isOpen, onCancel, onConfirm }) => {
  const dict = useDictionary();
  const t = dict.onboarding;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      variant="confirm"
      size="md"
      tone="warning"
      icon={<AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />}
      title={t.skipModalTitle}
      closeButton="none"
      padded
      bodyClassName="text-center"
      footerClassName="flex-col-reverse sm:flex-row sm:justify-stretch p-4 sm:px-6"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} data-autofocus className="w-full sm:flex-1">
            {t.skipModalCancel}
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full sm:flex-1 rounded-xl bg-accent-amber hover:bg-accent-amber-hover py-2.5 type-label-sm text-text-inverted transition-colors cursor-pointer"
          >
            {t.skipModalConfirm}
          </button>
        </>
      }
    >
      <p className="text-xs text-text-secondary">
        {t.skipModalBody}
      </p>
    </Modal>
  );
};
