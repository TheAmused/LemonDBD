'use client';
// frontend/src/components/onboarding/wizard/OnboardingIntroView.tsx
import React from 'react';
import { Button } from '@/components/common/Button';
import { useDictionary } from '@/context/DictionaryContext';
import { CenteredScreen } from '@/components/layout/CenteredScreen';

export function OnboardingIntroView({ onContinue }: { onContinue: () => void }) {
  const t = useDictionary().onboarding;

  return (
    <CenteredScreen className="text-center space-y-4">
      <h1 className="text-xl font-black">{t.introTitle}</h1>
      <p className="text-sm text-text-secondary">
        {t.introBody}
      </p>
      <Button variant="primary" onClick={onContinue} className="w-full">
        {t.introContinueButton}
      </Button>
    </CenteredScreen>
  );
}
