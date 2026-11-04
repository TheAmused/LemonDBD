'use client';
// frontend/src/components/smash-or-pass/hub/HubSettingsModal.tsx
import { CampfireIcon, ClapperboardIcon, MatureIcon, MusicIcon, VolumeIcon } from '@/components/icons/DbdIcons';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { SettingRow } from '@/components/common/SettingRow';
import { Switch } from '@/components/common/Switch';
import { useDictionary } from '@/context/DictionaryContext';
import { usePreferences, type BackgroundAnimationMode } from '@/hooks/usePreferences';

interface HubSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The settings that matter on this page (sound, music, effects, the campfire behind the cards, mature
 * content), in a small dialog so changing one does not mean leaving the game. They are the site-wide
 * preferences, the same ones the settings page edits.
 */
export function HubSettingsModal({ isOpen, onClose }: HubSettingsModalProps) {
  const dict = useDictionary();
  const text = dict.settings;
  const { preferences, updatePreferences } = usePreferences();

  const campfireModes: Array<{ mode: BackgroundAnimationMode; label: string }> = [
    { mode: 'on', label: text.campfireOn },
    { mode: 'eco', label: text.campfireEco },
    { mode: 'off', label: text.campfireOff },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="md"
      backdrop="blur"
      title={dict.smashOrPass.effectsPrefs.button}
      testId="smash-settings-modal"
      bodyClassName="p-5 sm:p-6"
    >
      <div className="divide-y divide-border-subtle/60">
        <SettingRow icon={VolumeIcon} title={text.soundEffects}>
          <Switch
            checked={preferences.sounds}
            onChange={(checked) => void updatePreferences({ sounds: checked })}
            ariaLabel={text.soundEffects}
          />
        </SettingRow>

        <SettingRow icon={MusicIcon} title={text.music}>
          <Switch
            checked={preferences.music}
            onChange={(checked) => void updatePreferences({ music: checked })}
            ariaLabel={text.music}
          />
        </SettingRow>

        <SettingRow icon={ClapperboardIcon} title={text.animations}>
          <Switch
            checked={preferences.effects}
            onChange={(checked) => void updatePreferences({ effects: checked })}
            ariaLabel={text.animations}
          />
        </SettingRow>

        <SettingRow icon={MatureIcon} title={text.nsfw}>
          <Switch
            checked={preferences.nsfw}
            onChange={(checked) => void updatePreferences({ nsfw: checked })}
            ariaLabel={text.nsfw}
          />
        </SettingRow>

        <SettingRow icon={CampfireIcon} title={text.campfire}>
          <fieldset aria-label={text.campfire} className="flex shrink-0 items-center gap-2 border-0 p-0 m-0">
            {campfireModes.map(({ mode, label }) => (
              <Button
                key={mode}
                variant={preferences.backgroundAnimation === mode ? 'primary' : 'secondary'}
                size="sm"
                aria-pressed={preferences.backgroundAnimation === mode}
                onClick={() => void updatePreferences({ backgroundAnimation: mode })}
                className="min-h-11 min-w-16"
              >
                {label}
              </Button>
            ))}
          </fieldset>
        </SettingRow>
      </div>
    </Modal>
  );
}
