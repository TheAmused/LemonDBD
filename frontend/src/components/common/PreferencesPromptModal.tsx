'use client';
// frontend/src/components/common/PreferencesPromptModal.tsx

import React from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { usePreferences } from '@/hooks/usePreferences';

export interface PreferencesPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PreferencesPromptModal({ isOpen, onClose }: PreferencesPromptModalProps) {
  const router = useRouter();
  const locale = useLocale();
  const dict = useDictionary();
  const text = dict.smashOrPass.effectsPrefs;
  const { preferences, updatePreferences, markConfigured } = usePreferences();

  const handleContinueDefaults = () => {
    void updatePreferences(preferences);
    markConfigured();
    onClose();
  };

  const handleGoToSettings = () => {
    markConfigured();
    onClose();
    router.push(`/${locale}/settings`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleContinueDefaults}
      variant="dialog"
      size="md"
      backdrop="blur"
      closeButton="none"
      title={text.promptTitle}
      testId="preferences-prompt-modal"
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 w-full">
          <Button
            variant="secondary"
            onClick={handleContinueDefaults}
            className="w-full sm:w-auto"
          >
            {text.continueDefaults}
          </Button>
          <Button
            variant="primary"
            onClick={handleGoToSettings}
            className="w-full sm:w-auto"
          >
            {text.goToSettings}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="type-body-fluid text-text-secondary leading-relaxed">
          {text.promptMessage}
        </p>
      </div>
    </Modal>
  );
}
