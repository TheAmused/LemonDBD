'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/DictionaryContext';
import { Spinner } from '@/components/common/Spinner';
import { CharacterOnboardingWizard } from '@/components/onboarding/CharacterOnboardingWizard';

export function WelcomeClient() {
  const router = useRouter();
  const locale = useLocale();
  const { user, isAuthenticated, isLoading } = useAuth();

  // The wizard is a one-time setup: someone who has been through it (typed the address, followed an
  // old link, pressed Back) is sent home instead of being shown it again. Finishing the wizard sets
  // the same flag, so it lands here too.
  const onboardingDone = !isLoading && isAuthenticated && !!user?.onboarding_completed_at;

  useEffect(() => {
    if (onboardingDone) router.replace(`/${locale}`);
  }, [onboardingDone, router, locale]);

  if (onboardingDone) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" tone="accent" />
      </div>
    );
  }

  return (
    <CharacterOnboardingWizard
      locale={locale}
      onFinished={() => router.replace(`/${locale}`)}
    />
  );
}
