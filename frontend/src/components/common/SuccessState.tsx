// frontend/src/components/common/SuccessState.tsx
// Body of a success confirmation modal: green check, short title, optional small note.
// Pair with <Modal size="sm" closeButton="floating" padded> and no footer.

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface SuccessStateProps {
  title: React.ReactNode;
  description?: React.ReactNode;
}

export function SuccessState({ title, description }: SuccessStateProps) {
  return (
    <output className="flex flex-col items-center py-4 text-center">
      <CheckCircle2 className="mb-3 h-10 w-10 text-accent-green" aria-hidden="true" />
      <h2 className="text-lg font-extrabold tracking-tight text-text-primary">{title}</h2>
      {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
    </output>
  );
}
