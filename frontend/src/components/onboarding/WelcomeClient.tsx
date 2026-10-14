'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/context/DictionaryContext';
import { CharacterOnboardingWizard } from '@/components/onboarding/CharacterOnboardingWizard';

export function WelcomeClient() {
  const router = useRouter();
  const locale = useLocale();

  return (
    <CharacterOnboardingWizard
      locale={locale}
      onFinished={() => router.push(`/${locale}`)}
    />
  );
}
