// frontend/src/components/character-detail/modals/LoreModal.tsx
import React from 'react';
import { CharacterItem, CharacterDetailDictionary } from '../types';
import { Modal } from '@/components/common/Modal';

interface LoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterItem;
  rawLoreText: string;
  t: CharacterDetailDictionary;
}

export const LoreModal: React.FC<LoreModalProps> = ({
  isOpen,
  onClose,
  character,
  rawLoreText,
  t,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="dialog"
      size="2xl"
      title={t.loreTitle}
      closeButtonAriaLabel={t.close}
      padded
      bodyClassName="space-y-4 text-sm leading-relaxed text-text-secondary"
    >
      <p className="italic text-text-secondary border-l-2 border-border-color pl-4 py-1">
        {t.quoteOpen || '"'}{character.name} {t.emDashSeparator || '—'} {t.enteredTheFog}{t.quoteClose || '"'}
      </p>
      <div className="text-sm leading-relaxed whitespace-pre-line text-justify hyphens-auto text-text-primary font-medium">
        {rawLoreText}
      </div>
    </Modal>
  );
};
