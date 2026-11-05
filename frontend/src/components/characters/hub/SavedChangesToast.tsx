'use client';
// frontend/src/components/characters/hub/SavedChangesToast.tsx
import React from 'react';
import { CheckIcon } from '@/components/icons/DbdIcons';
import { useDictionary } from '@/context/DictionaryContext';
import { Toast } from '@/components/common/Toast';
import { TOAST_DURATION_MS } from '@/constants/timing';

/** The "changes saved" confirmation: the same top right toast the admin panel uses, with nothing dimmed behind it. */
export function SavedChangesToast({ open, onDismiss }: { open: boolean; onDismiss: () => void }) {
  const dict = useDictionary();
  if (!open) return null;

  return (
    <Toast
      tone="green"
      icon={<CheckIcon className="icon-md" aria-hidden="true" />}
      message={dict.characterDetail.changesSaved}
      onDismiss={onDismiss}
      autoDismissMs={TOAST_DURATION_MS.success}
      dismissLabel={dict.characterDetail.dismiss}
    />
  );
}
