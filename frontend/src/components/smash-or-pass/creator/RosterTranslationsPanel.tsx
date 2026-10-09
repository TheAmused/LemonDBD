'use client';
// frontend/src/components/smash-or-pass/creator/RosterTranslationsPanel.tsx
import { Tabs } from '@/components/common/Tabs';
import { Input } from '@/components/common/Field';
import { useDictionary } from '@/context/DictionaryContext';
import { SMASH_ROSTER_LIMITS, TRANSLATABLE_LOCALES } from '@/utils/smashOrPass/constants';
import type { Dispatch, SetStateAction } from 'react';
import type { RosterTranslations } from './SmashRosterCreatorParts';
import { LABEL } from './styles';

interface RosterTranslationsPanelProps {
  activeLocale: string;
  onLocaleChange: (locale: string) => void;
  translations: RosterTranslations;
  setTranslations: Dispatch<SetStateAction<RosterTranslations>>;
}

/** An admin publishing an official roster can give its name and description per language. */
export function RosterTranslationsPanel({
  activeLocale: activeTranslationLocale,
  onLocaleChange,
  translations: rosterTranslations,
  setTranslations: setRosterTranslations,
}: RosterTranslationsPanelProps) {
  const dict = useDictionary();
  const c = dict.smashOrPass.creator;

  return (
    <div className="mt-4 flex flex-col gap-2 rounded-xl border border-accent-amber/30 bg-accent-amber/5 p-3">
      <span className={LABEL}>{c.translationsHeading || 'Translations'}</span>
      <p className="text-xs text-text-muted -mt-1">
        {c.translationsHint || 'Optional overrides shown to players using these languages. Anything left blank falls back to the default text above.'}
      </p>
      <Tabs
        ariaLabel={c.translationsHeading || 'Translations'}
        value={activeTranslationLocale}
        onChange={onLocaleChange}
        panels={false}
        variant="boxed"
        size="sm"
        wrap
        tabs={TRANSLATABLE_LOCALES.map((loc) => ({ value: loc, label: loc }))}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <label>
          <span className={LABEL}>{c.translationsRosterName || 'Roster name'}</span>
          <Input
            fieldSize="md"
            value={rosterTranslations[activeTranslationLocale]?.name || ''}
            maxLength={SMASH_ROSTER_LIMITS.maxRosterName}
            onChange={(e) =>
              setRosterTranslations((prev) => ({
                ...prev,
                [activeTranslationLocale]: { ...prev[activeTranslationLocale], name: e.target.value, description: prev[activeTranslationLocale]?.description || '' },
              }))
            }
          />
        </label>
        <label>
          <span className={LABEL}>{c.translationsRosterDescription || 'Description'}</span>
          <Input
            fieldSize="md"
            value={rosterTranslations[activeTranslationLocale]?.description || ''}
            maxLength={SMASH_ROSTER_LIMITS.maxRosterDescription}
            onChange={(e) =>
              setRosterTranslations((prev) => ({
                ...prev,
                [activeTranslationLocale]: { ...prev[activeTranslationLocale], description: e.target.value, name: prev[activeTranslationLocale]?.name || '' },
              }))
            }
          />
        </label>
      </div>
    </div>
  );
}
