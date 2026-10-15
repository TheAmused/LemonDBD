// frontend/src/components/onboarding/SkipOnboardingModal.tsx
'use client';
import React from 'react';
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
          <Button
            type="button"
            onClick={onConfirm}
            variant="amber" size="md" className="w-full sm:flex-1"
          >
            {t.skipModalConfirm}
          </Button>
        </>
      }
    >
      <p className="text-xs text-text-secondary">
        {t.skipModalBody}
      </p>
    </Modal>
  );
};
