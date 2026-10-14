'use client';
// frontend/src/components/characters/hub/SavedChangesModal.tsx
import React from 'react';
import { useDictionary } from '@/context/DictionaryContext';
import { Modal } from '@/components/common/Modal';
import { SuccessState } from '@/components/common/SuccessState';

/** The brief "changes saved" confirmation. */
export function SavedChangesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dict = useDictionary();

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      variant="confirm"
      size="sm"
      layer="top"
      ariaLabel={dict.characterDetail.changesSaved}
      closeButton="floating"
      closeButtonAriaLabel={dict.characterDetail.dismiss}
      padded
    >
      <SuccessState title={dict.characterDetail.changesSaved} />
    </Modal>
  );
}
