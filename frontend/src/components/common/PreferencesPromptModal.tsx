'use client';
// frontend/src/components/common/PreferencesPromptModal.tsx

import React from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { IconTile } from '@/components/common/IconTile';
import {
  ThunderPulseIcon,
  ChaosSwirlIcon,
  CautionVeilIcon,
} from '@/components/icons/DbdIcons';
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
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 w-full">
          <Button
            variant="secondary"
            onClick={handleContinueDefaults}
            className="w-full sm:w-auto min-h-11 justify-center"
          >
            {text.continueDefaults}
          </Button>
          <Button
            variant="primary"
            onClick={handleGoToSettings}
            className="w-full sm:w-auto min-h-11 justify-center"
          >
            {text.goToSettings}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Intro text */}
        <p className="type-body-fluid text-text-secondary leading-relaxed">
          {text.promptMessage}
        </p>

        {/* DBD Experience categories list */}
        <div className="space-y-2.5">
          {/* Row 1: Audio */}
          <div className="flex items-center gap-3 p-3 rounded-card border border-border-color bg-bg-surface">
            <IconTile size="sm" tone="red" className="shrink-0">
              <ThunderPulseIcon className="h-5 w-5" aria-hidden="true" />
            </IconTile>
            <div className="min-w-0 flex-1">
              <span className="type-strong-fluid text-text-primary block">
                {dict.settings.audio}
              </span>
              <p className="type-body-2xs text-text-secondary">
                {dict.settings.soundEffects} / {dict.settings.music}
              </p>
            </div>
          </div>

          {/* Row 2: Visuals */}
          <div className="flex items-center gap-3 p-3 rounded-card border border-border-color bg-bg-surface">
            <IconTile size="sm" tone="red" className="shrink-0">
              <ChaosSwirlIcon className="h-5 w-5" aria-hidden="true" />
            </IconTile>
            <div className="min-w-0 flex-1">
              <span className="type-strong-fluid text-text-primary block">
                {dict.settings.visuals}
              </span>
              <p className="type-body-2xs text-text-secondary">
                {dict.settings.animations} / {dict.settings.campfire}
              </p>
            </div>
          </div>

          {/* Row 3: Content */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-card border border-border-color bg-bg-surface">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <IconTile size="sm" tone="amber" className="shrink-0">
                <CautionVeilIcon className="h-5 w-5" aria-hidden="true" />
              </IconTile>
              <div className="min-w-0 flex-1">
                <span className="type-strong-fluid text-text-primary block">
                  {dict.settings.content}
                </span>
                <p className="type-body-2xs text-text-secondary">
                  {dict.settings.nsfw}
                </p>
              </div>
            </div>
            <span className="type-label-2xs font-bold text-accent-amber px-2 py-0.5 rounded-full border border-accent-amber/40 bg-accent-amber/10 shrink-0">
              18+
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
