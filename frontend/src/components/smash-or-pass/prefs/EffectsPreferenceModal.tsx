'use client';
// frontend/src/components/smash-or-pass/prefs/EffectsPreferenceModal.tsx
import { useEffect, useState } from 'react';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Switch } from '@/components/common/Switch';
import { useDictionary } from '@/context/DictionaryContext';
import { prefersReducedMotion, type SmashPrefs } from './smashPrefs';

interface EffectsPreferenceModalProps {
  isOpen: boolean;
  /** First visit: a choice has to be made, so the modal cannot be dismissed without one. */
  mandatory: boolean;
  /** The choice already made, if any; the switches start from it. */
  current: SmashPrefs | null;
  onSave: (choice: { effects: boolean; music: boolean }) => void;
  onClose: () => void;
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

/** The photosensitivity / motion warning, and the viewer's choice of effects and music. */
export function EffectsPreferenceModal({ isOpen, mandatory, current, onSave, onClose }: EffectsPreferenceModalProps) {
  const dict = useDictionary();
  const text = dict.smashOrPass.effectsPrefs;
  const [effects, setEffects] = useState(true);
  const [music, setMusic] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Each time it opens it starts from the saved choice -- or, for a first choice, from "on" unless
  // the device asks for reduced motion.
  useEffect(() => {
    if (!isOpen) return;
    const reduced = prefersReducedMotion();
    setReducedMotion(reduced);
    setEffects(current ? current.effects : !reduced);
    setMusic(current ? current.music : !reduced);
  }, [isOpen, current]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="md"
      layer="top"
      title={text.title}
      centerTitle
      closeButton={mandatory ? 'none' : 'header'}
      closeOnEscape={!mandatory}
      closeOnBackdropClick={!mandatory}
      swipeToClose={!mandatory}
      testId="smash-effects-preferences"
      footerClassName="flex-col-reverse items-stretch gap-2.5 sm:flex-row sm:items-center sm:justify-center"
      footer={
        <>
          {!mandatory && (
            <Button variant="secondary" size="md" onClick={onClose} className="w-full sm:w-auto sm:min-w-32 rounded-xl">
              {text.cancel}
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            data-autofocus
            onClick={() => onSave({ effects, music })}
            className="w-full sm:w-auto sm:min-w-32 rounded-xl"
          >
            {text.continue}
          </Button>
        </>
      }
    >
      <div className="flex flex-col px-5 py-5 sm:px-8 sm:py-6">
        <div role="note" className="text-center">
          <p className="type-label-sm text-accent-amber">{text.warningTitle}</p>
          <p className="mt-2 type-body-fluid text-text-secondary">{text.warning}</p>
        </div>
        <p className="mt-5 text-center type-body-fluid text-text-muted">{text.intro}</p>
        <div className="mt-2 divide-y divide-border-color/60 border-y border-border-color/60">
          <ChoiceRow label={text.effects} description={text.effectsDesc} checked={effects} onChange={setEffects} />
          <ChoiceRow label={text.music} description={text.musicDesc} checked={music} onChange={setMusic} />
        </div>
        {reducedMotion && !current && (
          <p className="mt-4 text-center type-body-fluid text-text-muted">{text.reducedMotion}</p>
        )}
        <p className="mt-4 text-center type-body-fluid text-text-muted">{text.saved}</p>
      </div>
    </Modal>
  );
}
