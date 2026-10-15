'use client';
// frontend/src/components/characters/hub/OwnershipSaveBar.tsx
import { useDictionary } from '@/context/DictionaryContext';
import { ActionBarButton, StickyActionBar } from '@/components/common/StickyActionBar';

interface OwnershipSaveBarProps {
  ownershipSaveError: string | null;
  ownershipSaving: boolean;
  onSave: () => void;
}

/** Bottom bar with Accept while editing ownership (leaving without saving is the toolbar's "Exit selection"). */
export function OwnershipSaveBar({ ownershipSaveError, ownershipSaving, onSave }: OwnershipSaveBarProps) {
  const dict = useDictionary();

  return (
    <StickyActionBar error={ownershipSaveError}>
      <ActionBarButton variant="green" onClick={onSave} disabled={ownershipSaving}>
        {ownershipSaving ? dict.characterDetail.saving : dict.characterDetail.accept}
      </ActionBarButton>
    </StickyActionBar>
  );
}
