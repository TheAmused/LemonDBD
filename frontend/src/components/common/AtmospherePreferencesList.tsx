'use client';
// frontend/src/components/common/AtmospherePreferencesList.tsx

import React from 'react';
import {
  VolumeIcon,
  MusicIcon,
  ClapperboardIcon,
  MatureIcon,
  CampfireIcon,
} from '@/components/icons/DbdIcons';
import { Switch } from '@/components/common/Switch';
import { Button } from '@/components/common/Button';
import { useDictionary } from '@/context/DictionaryContext';
import { usePreferences, type BackgroundAnimationMode } from '@/hooks/usePreferences';

export function AtmospherePreferencesList() {
  const dict = useDictionary();
  const text = dict.settings;
  const { preferences, updatePreferences } = usePreferences();

  const campfireModes: Array<{ mode: BackgroundAnimationMode; label: string }> = [
    { mode: 'on', label: text.campfireOn },
    { mode: 'eco', label: text.campfireEco },
    { mode: 'off', label: text.campfireOff },
  ];

  return (
    <div className="divide-y divide-border-color/60 border-y border-border-color/60">
      {/* 1. Efekty dźwiękowe */}
      <div className="flex items-center justify-between gap-3 px-2 sm:px-3 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <VolumeIcon className="icon-lg text-accent-red shrink-0" aria-hidden="true" />
          <span className="type-strong-fluid text-text-primary">
            {text.soundEffects}
          </span>
        </div>
        <Switch
          checked={preferences.sounds}
          onChange={(checked) => void updatePreferences({ sounds: checked })}
          ariaLabel={text.soundEffects}
        />
      </div>

      {/* 2. Muzyka */}
      <div className="flex items-center justify-between gap-3 px-2 sm:px-3 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <MusicIcon className="icon-lg text-accent-red shrink-0" aria-hidden="true" />
          <span className="type-strong-fluid text-text-primary">
            {text.music}
          </span>
        </div>
        <Switch
          checked={preferences.music}
          onChange={(checked) => void updatePreferences({ music: checked })}
          ariaLabel={text.music}
        />
      </div>

      {/* 3. Animacje */}
      <div className="flex items-center justify-between gap-3 px-2 sm:px-3 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <ClapperboardIcon className="icon-lg text-accent-red shrink-0" aria-hidden="true" />
          <span className="type-strong-fluid text-text-primary">
            {text.animations}
          </span>
        </div>
        <Switch
          checked={preferences.effects}
          onChange={(checked) => void updatePreferences({ effects: checked })}
          ariaLabel={text.animations}
        />
      </div>

      {/* 4. NSFW / 18+ */}
      <div className="flex items-center justify-between gap-3 px-2 sm:px-3 py-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <MatureIcon className="icon-lg text-accent-amber shrink-0" aria-hidden="true" />
          <span className="type-strong-fluid text-text-primary">
            {text.nsfw}
          </span>
          <span className="type-label-2xs font-bold text-accent-amber px-2 py-0.5 rounded-full border border-accent-amber/40 bg-accent-amber/10 shrink-0">
            18+
          </span>
        </div>
        <Switch
          checked={preferences.nsfw}
          onChange={(checked) => void updatePreferences({ nsfw: checked })}
          ariaLabel={text.nsfw}
        />
      </div>

      {/* 5. Cząsteczki ogniska - centered */}
      <div className="flex flex-col items-center justify-center gap-2.5 py-3.5 px-2 sm:px-3 text-center">
        <div className="flex items-center justify-center gap-2.5">
          <CampfireIcon className="icon-lg text-accent-red shrink-0" aria-hidden="true" />
          <span className="type-strong-fluid text-text-primary">{text.campfire}</span>
        </div>
        <fieldset aria-label={text.campfire} className="flex flex-wrap items-center justify-center gap-2 border-0 p-0 m-0">
          {campfireModes.map(({ mode, label }) => (
            <Button
              key={mode}
              variant={preferences.backgroundAnimation === mode ? 'primary' : 'secondary'}
              size="sm"
              aria-pressed={preferences.backgroundAnimation === mode}
              onClick={() => void updatePreferences({ backgroundAnimation: mode })}
              className="min-h-10 min-w-20 justify-center px-4"
            >
              {label}
            </Button>
          ))}
        </fieldset>
      </div>
    </div>
  );
}
