// frontend/src/components/character-detail/modals/Model3DModal.tsx
import React from 'react';
import { X } from 'lucide-react';
import { CharacterItem, getAvatarUrl } from '../types';
import { Modal, useModal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';

interface Model3DModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: CharacterItem;
  isSurvivor: boolean;
  backendBase: string;
  t: Record<string, string>;
}

const Model3DContent: React.FC<{ src: string; closeLabel: string }> = ({ src, closeLabel }) => {
  const { close } = useModal();
  return (
    <div className="relative mx-auto w-fit max-w-full rounded-3xl border-2 border-accent-red/60 bg-bg-surface/95 shadow-2xl p-4 sm:p-6 flex items-center justify-center">
      <Button
        icon
        variant="secondary"
        data-modal-close
        onClick={close}
        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 shadow-md"
        aria-label={closeLabel}
      >
        <X className="w-5 h-5" />
      </Button>
      <img
        src={src}
        alt=""
        className="max-h-[72dvh] w-auto max-w-full object-contain rounded-2xl select-none"
      />
    </div>
  );
};

export const Model3DModal: React.FC<Model3DModalProps> = ({
  isOpen,
  onClose,
  character,
  isSurvivor,
  backendBase,
  t,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant="lightbox"
      size="3xl"
      backdrop="blur"
      ariaLabel={character.name}
    >
      <Model3DContent
        src={getAvatarUrl(backendBase, character, isSurvivor)}
        closeLabel={t.close || 'Close'}
      />
    </Modal>
  );
};
