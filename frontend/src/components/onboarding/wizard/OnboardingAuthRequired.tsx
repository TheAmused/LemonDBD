'use client';
// frontend/src/components/onboarding/wizard/OnboardingAuthRequired.tsx
import React, { useState } from 'react';
import Link from 'next/link';
import { User as UserIcon } from 'lucide-react';
import { LemonIcon } from '@/components/LemonIcon';
import { Button } from '@/components/common/Button';
import { useDictionary } from '@/context/DictionaryContext';
import { AuthModal } from '../CharacterOnboardingWizardParts';
import { Surface } from '@/components/common/Surface';
import { IconTile } from '@/components/common/IconTile';

/** Shown when auth resolved with no session: the roster can't load without one. */
export function OnboardingAuthRequired({ locale }: { locale: string }) {
  const dict = useDictionary();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <Surface padding="none" className="w-full max-w-md space-y-4 p-8 shadow-xl">
        <IconTile tone="red" size="lg" className="mx-auto">
          <LemonIcon className="h-10 w-10 text-accent-red" />
        </IconTile>
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
            className="py-1 text-xs text-text-muted transition-colors hover:text-accent-red pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center"
          >
            {dict.user.returnToHome}
          </Link>
        </div>
      </Surface>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
