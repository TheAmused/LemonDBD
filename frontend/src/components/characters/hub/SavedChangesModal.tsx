'use client';
// frontend/src/components/characters/hub/SavedChangesModal.tsx
import React from 'react';
import { Check } from 'lucide-react';
import { useDictionary } from '@/context/DictionaryContext';
import { Modal } from '@/components/common/Modal';

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
      bodyClassName="flex flex-col items-center justify-center text-center sm:p-8"
    >
      <div
        className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl border border-accent-green/40 bg-accent-green/15 text-accent-green mb-4 ring-4 ring-accent-green/15 shadow-inner"
        aria-hidden="true"
      >
        <Check className="h-8 w-8 sm:h-10 sm:w-10 stroke-[2.5]" />
      </div>

      <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-text-primary">
        {dict.characterDetail.changesSaved}
      </h2>
    </Modal>
  );
}
