'use client';
// frontend/src/components/common/NsfwOnboardingModal.tsx

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Switch } from '@/components/common/Switch';
import { useDictionary } from '@/context/DictionaryContext';
import { useGlobalNsfwPreference, markNsfwOnboardingComplete } from '@/utils/nsfwAck';
import { defaultPrefs, prefersReducedMotion, readLocalPrefs, writeLocalPrefs, type SmashPrefs } from '@/components/smash-or-pass/prefs/smashPrefs';

interface NsfwOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Whether to display the photosensitivity / motion warning block.
   * Defaults to false on pages like Tier Lists, and can be set to true on interactive game pages.
   */
  showWarning?: boolean;
}

interface ChoiceRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ChoiceRow({ label, description, checked, onChange }: ChoiceRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 sm:gap-6">
      <div className="min-w-0 text-left">
        <p className="type-card-title text-text-primary">{label}</p>
        <p className="mt-0.5 type-body-fluid text-text-muted">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} ariaLabel={label} />
    </div>
  );
}

export function NsfwOnboardingModal({ isOpen, onClose, showWarning = false }: NsfwOnboardingModalProps) {
  const dict = useDictionary();
  const text = dict.smashOrPass.effectsPrefs;
  const [nsfw, setNsfw] = useGlobalNsfwPreference();
  const [prefs, setPrefs] = useState<Omit<SmashPrefs, 'chosenAt'>>(() => readLocalPrefs() ?? defaultPrefs());

  useEffect(() => {
    if (isOpen) {
      setPrefs(readLocalPrefs() ?? defaultPrefs());
    }
  }, [isOpen]);

  const updatePrefs = (change: Partial<Omit<SmashPrefs, 'chosenAt'>>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...change };
      writeLocalPrefs({ ...next, chosenAt: Date.now() });
      return next;
    });
  };

  const handleContinue = () => {
    markNsfwOnboardingComplete();
    writeLocalPrefs({ ...prefs, chosenAt: Date.now() });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleContinue}
      variant="dialog"
      size="md"
      layer="top"
      title={text.title}
      closeButton="none"
      closeOnEscape
      closeOnBackdropClick
      swipeToClose
      testId="nsfw-onboarding-modal"
      footerClassName="justify-center"
      footer={
        <Button
          variant="primary"
          size="md"
          data-autofocus
          onClick={handleContinue}
          className="w-full sm:w-auto sm:min-w-40"
        >
          {text.continue}
        </Button>
      }
    >
      <div className="flex flex-col px-5 py-5 sm:px-8 sm:py-6">
        {showWarning && (
          <div role="note" className="text-center">
            <p className="type-label-sm text-accent-amber">{text.warningTitle}</p>
            <p className="mt-2 type-body-fluid text-text-secondary">{text.warning}</p>
          </div>
        )}
        <p className={`${showWarning ? 'mt-5' : 'mt-1'} text-center type-body-fluid text-text-muted`}>{text.intro}</p>
        <div className="mt-2 divide-y divide-border-color/60 border-y border-border-color/60">
          <ChoiceRow
            label={text.effects}
            description={text.effectsDesc}
            checked={prefs.effects}
            onChange={(effects) => updatePrefs({ effects })}
          />
          <ChoiceRow
            label={text.sounds}
            description={text.soundsDesc}
            checked={prefs.sounds}
            onChange={(sounds) => updatePrefs({ sounds })}
          />
          <ChoiceRow
            label={text.music}
            description={text.musicDesc}
            checked={prefs.music}
            onChange={(music) => updatePrefs({ music })}
          />
          <ChoiceRow
            label={text.nsfw ?? dict.tierLists.nsfw.label}
            description={text.nsfwDesc ?? dict.tierLists.nsfw.hint}
            checked={nsfw}
            onChange={setNsfw}
          />
        </div>
        {prefersReducedMotion() && (
          <p className="mt-4 text-center type-body-fluid text-text-muted">{text.reducedMotion}</p>
        )}
        <p className="mt-4 text-center type-body-fluid text-text-muted">{text.saved}</p>
      </div>
    </Modal>
  );
}
