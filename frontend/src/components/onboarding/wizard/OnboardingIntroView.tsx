'use client';
// frontend/src/components/onboarding/wizard/OnboardingIntroView.tsx
import React from 'react';
import { Button } from '@/components/common/Button';
import { useDictionary } from '@/context/DictionaryContext';

export function OnboardingIntroView({ onContinue }: { onContinue: () => void }) {
  const t = useDictionary().onboarding;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border-color bg-bg-surface p-8 text-center space-y-4 shadow-2xl">
        <h1 className="text-xl font-black">{t.introTitle}</h1>
        <p className="text-sm text-text-secondary">
          {t.introBody}
        </p>
        <Button variant="primary" onClick={onContinue} className="w-full">
          {t.introContinueButton}
        </Button>
      </div>
    </div>
  );
}
