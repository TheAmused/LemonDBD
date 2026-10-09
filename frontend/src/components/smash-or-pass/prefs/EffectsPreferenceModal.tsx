'use client';
// frontend/src/components/smash-or-pass/prefs/EffectsPreferenceModal.tsx
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Switch } from '@/components/common/Switch';
import { useDictionary } from '@/context/DictionaryContext';
import { prefersReducedMotion, type SmashPrefs } from './smashPrefs';

type Choice = Omit<SmashPrefs, 'chosenAt'>;

interface EffectsPreferenceModalProps {
  isOpen: boolean;
  /** No choice has been made yet: only the button (or flipping a switch) lets the viewer past it. */
  mandatory: boolean;
  /** What the switches show. */
  values: Choice;
  /** A switch was flipped: it is applied and saved right away. */
  onChange: (change: Partial<Choice>) => void;
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

/** The photosensitivity / motion warning, and the viewer's choice of effects, sounds and music. */
export function EffectsPreferenceModal({ isOpen, mandatory, values, onChange, onClose }: EffectsPreferenceModalProps) {
  const dict = useDictionary();
  const text = dict.smashOrPass.effectsPrefs;

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
      footerClassName="justify-center"
      footer={
        <Button variant="primary" size="md" data-autofocus onClick={onClose} className="w-full sm:w-auto sm:min-w-40 rounded-xl">
          {text.continue}
        </Button>
      }
    >
      <div className="flex flex-col px-5 py-5 sm:px-8 sm:py-6">
        <div role="note" className="text-center">
          <p className="type-label-sm text-accent-amber">{text.warningTitle}</p>
          <p className="mt-2 type-body-fluid text-text-secondary">{text.warning}</p>
        </div>
        <p className="mt-5 text-center type-body-fluid text-text-muted">{text.intro}</p>
        <div className="mt-2 divide-y divide-border-color/60 border-y border-border-color/60">
          <ChoiceRow
            label={text.effects}
            description={text.effectsDesc}
            checked={values.effects}
            onChange={(effects) => onChange({ effects })}
          />
          <ChoiceRow
            label={text.sounds}
            description={text.soundsDesc}
            checked={values.sounds}
            onChange={(sounds) => onChange({ sounds })}
          />
          <ChoiceRow
            label={text.music}
            description={text.musicDesc}
            checked={values.music}
            onChange={(music) => onChange({ music })}
          />
        </div>
        {mandatory && prefersReducedMotion() && (
          <p className="mt-4 text-center type-body-fluid text-text-muted">{text.reducedMotion}</p>
        )}
        <p className="mt-4 text-center type-body-fluid text-text-muted">{text.saved}</p>
      </div>
    </Modal>
  );
}
