'use client';
// frontend/src/app/[locale]/settings/SettingsClient.tsx

import {
  CampfireIcon,
  ClapperboardIcon,
  ImageIcon,
  MatureIcon,
  MusicIcon,
  VolumeIcon,
} from '@/components/icons/DbdIcons';
import { SettingRow } from '@/components/common/SettingRow';
import { Surface } from '@/components/common/Surface';
import { Switch } from '@/components/common/Switch';
import { Button } from '@/components/common/Button';
import { usePreferences, type BackgroundAnimationMode } from '@/hooks/usePreferences';
import { useDictionary } from '@/context/DictionaryContext';
import { trackEvent, type SettingName } from '@/utils/analytics';

const onOff = (checked: boolean): 'on' | 'off' => (checked ? 'on' : 'off');

export function SettingsClient() {
  const dict = useDictionary();
  const { preferences, updatePreferences } = usePreferences();

  /** Reports a setting the visitor changed. The campfire buttons skip a click on the mode already selected. */
  const reportChange = (setting: SettingName, value: 'on' | 'off' | 'eco') => trackEvent('setting_change', { setting, value });

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
                onClick={() => {
                  if (mode !== preferences.backgroundAnimation) reportChange('campfire', mode);
                  void updatePreferences({ backgroundAnimation: mode });
                }}
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
            onChange={(checked) => {
              reportChange('gifs', onOff(checked));
              void updatePreferences({ gifs: checked });
            }}
            ariaLabel={dict.settings.gifs}
          />
        </SettingRow>

        <SettingRow icon={MatureIcon} title={dict.settings.nsfw} description={dict.settings.nsfwDesc}>
          <Switch
            checked={preferences.nsfw}
            onChange={(checked) => {
              reportChange('nsfw', onOff(checked));
              void updatePreferences({ nsfw: checked });
            }}
            ariaLabel={dict.settings.nsfw}
          />
        </SettingRow>

        <SettingRow icon={VolumeIcon} title={dict.settings.soundEffects} description={dict.settings.soundEffectsDesc}>
          <Switch
            checked={preferences.sounds}
            onChange={(checked) => {
              reportChange('sounds', onOff(checked));
              void updatePreferences({ sounds: checked });
            }}
            ariaLabel={dict.settings.soundEffects}
          />
        </SettingRow>

        <SettingRow icon={MusicIcon} title={dict.settings.music} description={dict.settings.musicDesc}>
          <Switch
            checked={preferences.music}
            onChange={(checked) => {
              reportChange('music', onOff(checked));
              void updatePreferences({ music: checked });
            }}
            ariaLabel={dict.settings.music}
          />
        </SettingRow>

        <SettingRow icon={ClapperboardIcon} title={dict.settings.animations} description={dict.settings.animationsDesc}>
          <Switch
            checked={preferences.effects}
            onChange={(checked) => {
              reportChange('animations', onOff(checked));
              void updatePreferences({ effects: checked });
            }}
            ariaLabel={dict.settings.animations}
          />
        </SettingRow>
      </Surface>
    </div>
  );
}
