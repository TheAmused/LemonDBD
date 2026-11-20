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

export type AtmosphereRow = 'sounds' | 'music' | 'effects' | 'nsfw' | 'campfire';

const ALL_ROWS: readonly AtmosphereRow[] = ['sounds', 'music', 'effects', 'nsfw', 'campfire'];

/** `rows` limits the list to the preferences a page actually uses; every row shows by default. */
export function AtmospherePreferencesList({ rows = ALL_ROWS }: { rows?: readonly AtmosphereRow[] }) {
  const dict = useDictionary();
  const text = dict.settings;
  const { preferences, updatePreferences } = usePreferences();

  const campfireModes: Array<{ mode: BackgroundAnimationMode; label: string }> = [
    { mode: 'on', label: text.campfireOn },
    { mode: 'eco', label: text.campfireEco },
    { mode: 'off', label: text.campfireOff },
  ];

  return (
    <div className="divide-y divide-border-color/60">
      {/* 1. Efekty dźwiękowe */}
      {rows.includes('sounds') && <div className="flex items-center justify-between gap-3 px-2 sm:px-3 py-3.5">
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
      </div>}

      {/* 2. Muzyka */}
      {rows.includes('music') && <div className="flex items-center justify-between gap-3 px-2 sm:px-3 py-3.5">
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
      </div>}

      {/* 3. Animacje */}
      {rows.includes('effects') && <div className="flex items-center justify-between gap-3 px-2 sm:px-3 py-3.5">
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
      </div>}

      {/* 4. NSFW / 18+ */}
      {rows.includes('nsfw') && <div className="flex items-center justify-between gap-3 px-2 sm:px-3 py-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <MatureIcon className="icon-lg text-accent-red shrink-0" aria-hidden="true" />
          <span className="type-strong-fluid text-text-primary">
            {text.nsfw}
          </span>
        </div>
        <Switch
          checked={preferences.nsfw}
          onChange={(checked) => void updatePreferences({ nsfw: checked })}
          ariaLabel={text.nsfw}
        />
      </div>}

      {/* 5. Cząsteczki ogniska: label left (may wrap onto two lines), the three small mode buttons always right */}
      {rows.includes('campfire') && <div className="flex items-center justify-between gap-3 px-2 sm:px-3 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <CampfireIcon className="icon-lg text-accent-red shrink-0" aria-hidden="true" />
          <span className="type-strong-fluid text-text-primary">
            {text.campfire}
          </span>
        </div>
        <fieldset aria-label={text.campfire} className="flex shrink-0 items-center gap-1.5 border-0 p-0 m-0">
          {campfireModes.map(({ mode, label }) => (
            <Button
              key={mode}
              variant={preferences.backgroundAnimation === mode ? 'primary' : 'secondary'}
              size="xs"
              aria-pressed={preferences.backgroundAnimation === mode}
              onClick={() => void updatePreferences({ backgroundAnimation: mode })}
            >
              {label}
            </Button>
          ))}
        </fieldset>
      </div>}
    </div>
  );
}
