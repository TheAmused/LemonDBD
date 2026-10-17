'use client';
// frontend/src/components/onboarding/wizard/OnboardingLanguageView.tsx
import React from 'react';
import { Button } from '@/components/common/Button';
import { FlagIcon } from '@/components/sidebar/FlagIcon';
import { LANGUAGES } from '@/components/sidebar/SidebarBottomControls';
import { useDictionary } from '@/context/DictionaryContext';
import { ToggleChip } from '@/components/common/ToggleChip';
import { CenteredScreen } from '@/components/layout/CenteredScreen';

interface OnboardingLanguageViewProps {
  selectedLanguage: string;
  savingLanguage: boolean;
  onSelect: (language: string) => void;
  onContinue: () => void;
}

export function OnboardingLanguageView({
  selectedLanguage,
  savingLanguage,
  onSelect,
  onContinue,
}: OnboardingLanguageViewProps) {
  const t = useDictionary().onboarding;

  return (
    <CenteredScreen className="text-center space-y-4">
      <h1 className="text-xl font-black">{t.languageStepTitle}</h1>
      <p className="text-sm text-text-secondary">
        {t.languageStepBody}
      </p>
      <div className="grid grid-cols-1 gap-2">
        {LANGUAGES.map((lang) => (
          <ToggleChip pressed={selectedLanguage === lang.code} size="md" className="justify-start gap-3"
            key={lang.code}
            onClick={() => onSelect(lang.code)}
          >
            <FlagIcon code={lang.code} className="h-4 w-5.5 rounded-chip shrink-0" />
            <span>{lang.label}</span>
          </ToggleChip>
        ))}
      </div>
      <Button variant="primary" disabled={savingLanguage} onClick={onContinue} className="w-full">
        {savingLanguage
          ? t.savingLabel
          : t.languageContinueButton}
      </Button>
    </CenteredScreen>
  );
}
