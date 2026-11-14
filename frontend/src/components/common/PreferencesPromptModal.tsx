'use client';
// frontend/src/components/common/PreferencesPromptModal.tsx

import React from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Switch } from '@/components/common/Switch';
import {
  ClapperboardIcon,
  MatureIcon,
  WarningIcon,
  VolumeIcon,
} from '@/components/icons/DbdIcons';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { usePreferences } from '@/hooks/usePreferences';

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

  const audioEnabled = preferences.sounds || preferences.music;

  const handleToggleAudio = (checked: boolean) => {
    void updatePreferences({ sounds: checked, music: checked });
  };

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
      <div className="space-y-4 py-0.5">
        {/* Intro text */}
        <p className="type-body-fluid text-text-secondary leading-relaxed text-center max-w-md mx-auto px-2">
          {isSmash ? text.smashPromptDesc : text.promptMessage}
        </p>

        {/* Epilepsy / Photosensitivity Warning (Specific to Smash or Pass) */}
        {isSmash && (
          <div className="flex items-start gap-3 p-3.5 rounded-card border border-accent-amber/40 bg-accent-amber/10 text-left mx-1">
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

        {/* DBD Experience categories list with dividers and no background */}
        <div className="divide-y divide-border-color/60 border-y border-border-color/60 my-4">
          {/* Row 1: Audio */}
          <div className="flex items-center justify-between gap-3 px-2 sm:px-3 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <VolumeIcon className="icon-lg text-accent-red shrink-0" aria-hidden="true" />
              <span className="type-strong-fluid text-text-primary">
                {dict.settings.audio}
              </span>
            </div>
            <Switch
              checked={audioEnabled}
              onChange={handleToggleAudio}
              ariaLabel={dict.settings.audio}
            />
          </div>

          {/* Row 2: Visuals */}
          <div className="flex items-center justify-between gap-3 px-2 sm:px-3 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <ClapperboardIcon className="icon-lg text-accent-red shrink-0" aria-hidden="true" />
              <span className="type-strong-fluid text-text-primary">
                {dict.settings.visuals}
              </span>
            </div>
            <Switch
              checked={preferences.effects}
              onChange={(checked) => void updatePreferences({ effects: checked })}
              ariaLabel={dict.settings.visuals}
            />
          </div>

          {/* Row 3: Content */}
          <div className="flex items-center justify-between gap-3 px-2 sm:px-3 py-3.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <MatureIcon className="icon-lg text-accent-amber shrink-0" aria-hidden="true" />
              <span className="type-strong-fluid text-text-primary">
                {dict.settings.content}
              </span>
              <span className="type-label-2xs font-bold text-accent-amber px-2 py-0.5 rounded-full border border-accent-amber/40 bg-accent-amber/10 shrink-0">
                18+
              </span>
            </div>
            <Switch
              checked={preferences.nsfw}
              onChange={(checked) => void updatePreferences({ nsfw: checked })}
              ariaLabel={dict.settings.content}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="pt-2">
          <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-2.5 sm:gap-3 w-full">
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
              {isSmash ? text.enterTrial : text.goToSettings}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
