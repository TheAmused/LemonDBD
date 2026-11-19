'use client';
// frontend/src/components/common/PreferencesPromptModal.tsx

import React from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { WarningIcon } from '@/components/icons/DbdIcons';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { usePreferences } from '@/hooks/usePreferences';
import { AtmospherePreferencesList } from '@/components/common/AtmospherePreferencesList';

export const SMASH_ENTRY_ACK_KEY = 'lemondbd_smash_entry_acknowledged_v1';

export function markSmashEntryAcknowledged(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SMASH_ENTRY_ACK_KEY, 'true');
  } catch {}
}

export function isSmashEntryAcknowledged(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(SMASH_ENTRY_ACK_KEY) === 'true';
  } catch {
    return false;
  }
}

export interface PreferencesPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'smash' | 'general';
}

export function PreferencesPromptModal({
  isOpen,
  onClose,
  mode = 'general',
}: PreferencesPromptModalProps) {
  const router = useRouter();
  const locale = useLocale();
  const dict = useDictionary();
  const text = dict.smashOrPass.effectsPrefs;
  const { preferences, updatePreferences, markConfigured } = usePreferences();

  const isSmash = mode === 'smash';

  const handleContinueDefaults = () => {
    if (isSmash) {
      markSmashEntryAcknowledged();
    }
    void updatePreferences(preferences);
    markConfigured();
    onClose();
  };

  const handleGoToSettings = () => {
    if (isSmash) {
      markSmashEntryAcknowledged();
    }
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
      title={isSmash ? text.smashPromptTitle : text.promptTitle}
      testId="preferences-prompt-modal"
    >
      <div className="flex flex-col py-3 px-3 sm:px-5">
        {/* Epilepsy / Photosensitivity Warning (Specific to Smash or Pass) */}
        {isSmash && (
          <div className="flex items-start gap-3 p-3.5 rounded-card border border-accent-amber/40 bg-accent-amber/10 text-left mb-3">
            <WarningIcon className="icon-lg text-accent-amber shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1 min-w-0 flex-1">
              <span className="type-strong-fluid text-accent-amber block font-bold">
                {text.epilepsyWarningTitle}
              </span>
              <p className="type-body-2xs text-text-secondary leading-relaxed">
                {text.epilepsyWarningBody}
              </p>
            </div>
          </div>
        )}

        <div className="mb-4">
          <AtmospherePreferencesList />
        </div>

        {/* Action buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-2.5 sm:gap-3 w-full pt-1 pb-1">
          <Button
            variant="secondary"
            onClick={isSmash ? handleGoToSettings : handleContinueDefaults}
            className="w-full sm:w-auto min-h-11 justify-center px-6"
          >
            {isSmash ? text.goToSettings : text.continueDefaults}
          </Button>
          <Button
            variant="primary"
            onClick={isSmash ? handleContinueDefaults : handleGoToSettings}
            className="w-full sm:w-auto min-h-11 justify-center px-6"
          >
            {isSmash ? text.continueTrial : text.goToSettings}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
