'use client';
// frontend/src/components/common/AuthRequiredState.tsx

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Lock } from 'lucide-react';
import { useDictionary } from '@/context/DictionaryContext';

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
    'rounded-2xl border border-dashed border-border-color bg-bg-surface/40 p-6 sm:p-8 text-center flex flex-col items-center justify-center',
  solid:
    'mt-4 sm:mt-6 mb-auto rounded-3xl bg-bg-surface p-8 sm:p-12 text-center backdrop-blur-sm shadow-sm w-full border border-border-color flex flex-col items-center justify-center',
  dashed:
    'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-color bg-bg-surface/60 px-6 py-16 sm:py-20 text-center my-6',
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
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-accent-red/20 bg-accent-red/10">
        <Lock className="h-5 w-5 text-accent-red" />
      </div>
      <h2 className="mt-4 text-sm font-extrabold tracking-wide text-text-primary">
        {title}
      </h2>
      <p className="mt-1.5 max-w-sm type-body text-text-muted">
        {subtitle}
      </p>
      <button
        type="button"
        onClick={() => setIsAuthModalOpen(true)}
        className="mt-5 rounded-xl bg-accent-red px-5 py-2.5 type-strong text-text-inverted shadow-xs hover:bg-accent-red-hover transition-colors cursor-pointer"
      >
        {resolvedButtonLabel}
      </button>

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}
    </div>
  );
}
