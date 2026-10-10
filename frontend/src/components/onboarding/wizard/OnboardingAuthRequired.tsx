'use client';
// frontend/src/components/onboarding/wizard/OnboardingAuthRequired.tsx
import React, { useState } from 'react';
import Link from 'next/link';
import { User as UserIcon } from 'lucide-react';
import { LemonIcon } from '@/components/LemonIcon';
import { Button } from '@/components/common/Button';
import { useDictionary } from '@/context/DictionaryContext';
import { AuthModal } from '../CharacterOnboardingWizardParts';

/** Shown when auth resolved with no session: the roster can't load without one. */
export function OnboardingAuthRequired({ locale }: { locale: string }) {
  const dict = useDictionary();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md space-y-4 rounded-3xl border border-border-color bg-bg-surface p-8 shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-accent-red/30 bg-accent-red/15">
          <LemonIcon className="h-10 w-10 text-accent-red" />
        </div>
        <h1 className="text-xl font-black tracking-wider text-text-primary">
          {dict.user.authRequiredTitle}
        </h1>
        <p className="type-body text-text-secondary">
          {dict.user.authRequiredDesc}
        </p>
        <div className="flex flex-col gap-3 pt-2">
          <Button
            variant="primary"
            onClick={() => setIsAuthModalOpen(true)}
            leftIcon={<UserIcon className="h-4 w-4" />}
            className="w-full"
          >
            <span>{dict.user.signIn}</span>
          </Button>
          <Link
            href={`/${locale}`}
            className="py-1 text-xs text-text-muted transition-colors hover:text-accent-red"
          >
            {dict.user.returnToHome}
          </Link>
        </div>
      </div>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
