'use client';
// frontend/src/app/[locale]/settings/SettingsClient.tsx

import React from 'react';
import {
  CampfireIcon,
  ClapperboardIcon,
  ImageIcon,
  MatureIcon,
  MusicIcon,
  VolumeIcon,
} from '@/components/icons/DbdIcons';
import { Surface } from '@/components/common/Surface';
import { Switch } from '@/components/common/Switch';
import { Button } from '@/components/common/Button';
import { usePreferences, type BackgroundAnimationMode } from '@/hooks/usePreferences';
import { useDictionary } from '@/context/DictionaryContext';

interface SettingRowProps {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  title: string;
  description: string;
  children: React.ReactNode;
}

/** One setting: icon, name and explanation on the left, its control on the right (wrapping below when narrow). */
function SettingRow({ icon: Icon, title, description, children }: SettingRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1 basis-60 space-y-1">
        <div className="flex items-center gap-2">
          <Icon className="icon-md text-accent-red" aria-hidden="true" />
          <span className="type-strong-fluid text-text-primary">{title}</span>
        </div>
        <p className="type-body-fluid text-text-secondary">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function SettingsClient() {
  const dict = useDictionary();
  const { preferences, updatePreferences } = usePreferences();

  const campfireModes: Array<{ mode: BackgroundAnimationMode; label: string }> = [
    { mode: 'on', label: dict.settings.campfireOn },
    { mode: 'eco', label: dict.settings.campfireEco },
    { mode: 'off', label: dict.settings.campfireOff },
  ];

  return (
    <div className="relative z-10 mx-auto my-auto flex w-full max-w-4xl flex-col gap-6 py-6 sm:py-8">
      <Surface tone="flat" padding="lg" className="divide-y divide-border-subtle/60">
        <SettingRow icon={CampfireIcon} title={dict.settings.campfire} description={dict.settings.campfireDesc}>
          <fieldset
            aria-label={dict.settings.campfire}
            className="flex shrink-0 items-center gap-2 border-0 p-0 m-0"
          >
            {campfireModes.map(({ mode, label }) => (
              <Button
                key={mode}
                variant={preferences.backgroundAnimation === mode ? 'primary' : 'secondary'}
                size="sm"
                aria-pressed={preferences.backgroundAnimation === mode}
                onClick={() => void updatePreferences({ backgroundAnimation: mode })}
                className="min-h-11 min-w-18"
              >
                {label}
              </Button>
            ))}
          </fieldset>
        </SettingRow>

        <SettingRow icon={ImageIcon} title={dict.settings.gifs} description={dict.settings.gifsDesc}>
          <Switch
            checked={preferences.gifs}
            onChange={(checked) => void updatePreferences({ gifs: checked })}
            ariaLabel={dict.settings.gifs}
          />
        </SettingRow>

        <SettingRow icon={MatureIcon} title={dict.settings.nsfw} description={dict.settings.nsfwDesc}>
          <Switch
            checked={preferences.nsfw}
            onChange={(checked) => void updatePreferences({ nsfw: checked })}
            ariaLabel={dict.settings.nsfw}
          />
        </SettingRow>

        <SettingRow icon={VolumeIcon} title={dict.settings.soundEffects} description={dict.settings.soundEffectsDesc}>
          <Switch
            checked={preferences.sounds}
            onChange={(checked) => void updatePreferences({ sounds: checked })}
            ariaLabel={dict.settings.soundEffects}
          />
        </SettingRow>

        <SettingRow icon={MusicIcon} title={dict.settings.music} description={dict.settings.musicDesc}>
          <Switch
            checked={preferences.music}
            onChange={(checked) => void updatePreferences({ music: checked })}
            ariaLabel={dict.settings.music}
          />
        </SettingRow>

        <SettingRow icon={ClapperboardIcon} title={dict.settings.animations} description={dict.settings.animationsDesc}>
          <Switch
            checked={preferences.effects}
            onChange={(checked) => void updatePreferences({ effects: checked })}
            ariaLabel={dict.settings.animations}
          />
        </SettingRow>
      </Surface>
    </div>
  );
}
