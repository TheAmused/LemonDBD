'use client';
import { PadlockHeartIcon } from '@/components/icons/DbdIcons';
// frontend/src/components/common/AuthRequiredState.tsx

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useDictionary } from '@/context/DictionaryContext';
import { Button } from '@/components/common/Button';
import { IconTile } from '@/components/common/IconTile';

const AuthModal = dynamic(() => import('@/components/AuthModal').then((m) => m.AuthModal), { ssr: false });

export type AuthRequiredVariant = 'solid' | 'dashed' | 'compact';

interface AuthRequiredStateProps {
  title: string;
  subtitle: string;
  variant?: AuthRequiredVariant;
  className?: string;
  buttonLabel?: string;
}

const VARIANT_WRAPPER_CLASSNAME: Record<AuthRequiredVariant, string> = {
  compact:
    'rounded-card border border-dashed border-border-color bg-bg-surface/40 p-6 sm:p-8 text-center flex flex-col items-center justify-center',
  solid:
    'mt-4 sm:mt-6 mb-auto rounded-card bg-bg-surface p-8 sm:p-12 text-center backdrop-blur-sm shadow-sm w-full border border-border-color flex flex-col items-center justify-center',
  dashed:
    'flex flex-col items-center justify-center rounded-card border border-dashed border-border-color bg-bg-surface/60 px-6 py-16 sm:py-20 text-center my-6',
};

export function AuthRequiredState({
  title,
  subtitle,
  variant = 'dashed',
  className,
  buttonLabel,
}: AuthRequiredStateProps) {
  const dict = useDictionary();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const resolvedButtonLabel = buttonLabel ?? dict.streaks.logIn;

  return (
    <div className={className || VARIANT_WRAPPER_CLASSNAME[variant]}>
      <IconTile tone="red" size="md">
        <PadlockHeartIcon className="h-5 w-5 text-accent-red" />
      </IconTile>
      <h2 className="mt-4 text-sm font-extrabold tracking-wide text-text-primary">
        {title}
      </h2>
      <p className="mt-1.5 max-w-sm type-body text-text-muted">
        {subtitle}
      </p>
      <Button variant="primary" size="md" onClick={() => setIsAuthModalOpen(true)} className="mt-5">
        {resolvedButtonLabel}
      </Button>

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}
    </div>
  );
}
