'use client';
// frontend/src/components/onboarding/wizard/OnboardingLanguageView.tsx
import React from 'react';
import { Button } from '@/components/common/Button';
import { FlagIcon } from '@/components/sidebar/FlagIcon';
import { LANGUAGES } from '@/components/sidebar/SidebarBottomControls';
import { useDictionary } from '@/context/DictionaryContext';
import { ToggleChip } from '@/components/common/ToggleChip';

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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-card border border-border-color bg-bg-surface p-8 text-center space-y-4 shadow-2xl">
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
              <FlagIcon code={lang.code} className="h-4 w-[22px] rounded-chip shrink-0" />
              <span>{lang.label}</span>
            </ToggleChip>
          ))}
        </div>
        <Button variant="primary" disabled={savingLanguage} onClick={onContinue} className="w-full">
          {savingLanguage
            ? t.savingLabel
            : t.languageContinueButton}
        </Button>
      </div>
    </div>
  );
}
