'use client';
// frontend/src/components/smash-or-pass/hub/HubSettingsModal.tsx
import { Modal } from '@/components/common/Modal';
import { useDictionary } from '@/context/DictionaryContext';
import { AtmospherePreferencesList } from '@/components/common/AtmospherePreferencesList';

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="md"
      backdrop="blur"
      title={dict.smashOrPass.effectsPrefs.button}
      testId="smash-settings-modal"
    >
      <div className="flex flex-col py-3 px-3 sm:px-5">
        <AtmospherePreferencesList />
      </div>
    </Modal>
  );
}
