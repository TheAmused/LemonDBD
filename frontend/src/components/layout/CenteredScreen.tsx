// frontend/src/components/layout/CenteredScreen.tsx
// A full-height screen with one card in the middle: password reset, the onboarding steps.
import React from 'react';
import { Surface } from '@/components/common/Surface';
import { cn } from '@/utils/cn';

export interface CenteredScreenProps {
  /** Classes for the card (text alignment, spacing between its rows). */
  className?: string;
  children: React.ReactNode;
}

export function CenteredScreen({ className, children }: CenteredScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Surface padding="none" className={cn('w-full max-w-md p-8 shadow-2xl', className)}>
        {children}
      </Surface>
    </div>
  );
}
