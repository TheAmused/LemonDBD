'use client';
// frontend/src/components/tier-lists/TierListSettingsModal.tsx

import { Modal } from '@/components/common/Modal';
import { AtmospherePreferencesList, type AtmosphereRow } from '@/components/common/AtmospherePreferencesList';
import { useDictionary } from '@/context/DictionaryContext';

/** The site-wide preferences this page reacts to; sound and music play nothing here. */
const ROWS: readonly AtmosphereRow[] = ['nsfw', 'effects', 'campfire'];

interface TierListSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** The hub's settings button opens this dialog instead of leaving the page for /settings. */
export function TierListSettingsModal({ isOpen, onClose }: TierListSettingsModalProps) {
  const dict = useDictionary();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="md"
      backdrop="blur"
      title={dict.sidebar.settings}
      testId="tier-list-settings-modal"
    >
      <div className="flex flex-col py-3 px-3 sm:px-5">
        <AtmospherePreferencesList rows={ROWS} />
      </div>
    </Modal>
  );
}
