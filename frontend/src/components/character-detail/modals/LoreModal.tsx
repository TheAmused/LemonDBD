// frontend/src/components/character-detail/modals/LoreModal.tsx
import React from 'react';
import { BookOpen } from 'lucide-react';
import { CharacterItem } from '../types';
import { Modal } from '@/components/common/Modal';

interface LoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterItem;
  rawLoreText: string;
  t: Record<string, string>;
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
      icon={<BookOpen className="h-5 w-5" />}
      title={`${character.name} ${t.emDashSeparator || '—'} ${t.loreTitle || 'Lore & Bio'}`}
      subtitle={`${t.entityArchives || "The Entity's Archives"} ${t.bulletSeparator || '•'} ${t.codex || 'Codex'} #${character.id || 1}`}
      closeButtonAriaLabel={t.close || 'Close'}
      padded
      bodyClassName="space-y-4 text-sm leading-relaxed font-sans text-text-secondary"
    >
      <p className="italic text-text-secondary border-l-2 border-border-color pl-4 py-1">
        {t.quoteOpen || '"'}{character.name} {t.emDashSeparator || '—'} {t.enteredTheFog || 'Entered The Fog.'}{t.quoteClose || '"'}
      </p>
      <div className="text-sm leading-relaxed whitespace-pre-line text-justify hyphens-auto text-text-primary font-medium">
        {rawLoreText}
      </div>
    </Modal>
  );
};
