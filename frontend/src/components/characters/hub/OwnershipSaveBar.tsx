'use client';
// frontend/src/components/characters/hub/OwnershipSaveBar.tsx
import React from 'react';
import { useDictionary } from '@/context/DictionaryContext';
import { Button } from '@/components/common/Button';

interface OwnershipSaveBarProps {
  ownershipSaveError: string | null;
  ownershipSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
}

/** Sticky bottom bar with Cancel / Accept while editing ownership. */
export function OwnershipSaveBar({ ownershipSaveError, ownershipSaving, onCancel, onSave }: OwnershipSaveBarProps) {
  const dict = useDictionary();

  return (
    <div
      className="fixed left-[var(--sidebar-width,0rem)] right-0 bottom-0 z-30 border-t border-border-color bg-bg-surface/95 shadow-2xl backdrop-blur-md transition-[left] duration-300"
    >
      {ownershipSaveError && (
        <p
          role="alert"
          className="px-5 sm:px-7 lg:px-9 pt-2 text-center type-strong-xs text-accent-red"
        >
          {ownershipSaveError}
        </p>
      )}
      <div className="flex items-center justify-center gap-3 px-5 sm:px-7 lg:px-9 py-2.5">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={ownershipSaving} className="px-5">
          {dict.admin.cancel}
        </Button>
        <Button variant="success" size="sm" onClick={onSave} disabled={ownershipSaving} className="px-6">
          {ownershipSaving ? dict.characterDetail.saving : dict.characterDetail.accept}
        </Button>
      </div>
    </div>
  );
}
