// frontend/src/components/common/SuccessState.tsx
// Body of a success confirmation modal: a mark (green check unless told otherwise), short title, optional small note.
// Pair with <Modal size="sm" closeButton="floating" padded> and no footer.

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SuccessStateProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** The mark above the title. Default: a check. */
  icon?: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
}

export function SuccessState({ title, description, icon: Icon = CheckCircle2, iconClassName = 'text-accent-green' }: SuccessStateProps) {
  return (
    <output className="flex flex-col items-center py-4 text-center">
      <Icon className={cn('mb-3 h-10 w-10', iconClassName)} aria-hidden="true" />
      <h2 className="text-lg font-extrabold tracking-tight text-text-primary">{title}</h2>
      {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
    </output>
  );
}
