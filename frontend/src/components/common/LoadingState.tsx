// frontend/src/components/common/LoadingState.tsx
// The page-body placeholder while data loads: the spinner with a line of text under it.
import React from 'react';
import { DbdSpinner } from '@/components/common/DbdSpinner';

export function LoadingState({ label }: { label: string }) {
  return (
    <output className="flex flex-col items-center justify-center gap-4 p-12">
      <DbdSpinner size="lg" />
      <p className="type-card-title text-text-muted">{label}</p>
    </output>
  );
}
