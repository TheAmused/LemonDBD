'use client';
// frontend/src/app/[locale]/welcome/page.tsx
import React, { Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Locale } from '@/i18n/config';
import { useDictionary } from '@/context/DictionaryContext';
import { CharacterOnboardingWizard } from '@/components/onboarding/CharacterOnboardingWizard';

export default function WelcomePage() {
  return (
    <Suspense fallback={null}>
      <WelcomeContent />
    </Suspense>
  );
}

function WelcomeContent() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as Locale) || 'en';
  const dict = useDictionary();


  return (
    <CharacterOnboardingWizard
      locale={locale}
      dict={dict}
      onFinished={() => router.push(`/${locale}`)}
    />
  );
}
