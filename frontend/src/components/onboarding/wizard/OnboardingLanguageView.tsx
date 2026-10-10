'use client';
// frontend/src/components/onboarding/wizard/OnboardingLanguageView.tsx
import React from 'react';
import { Button } from '@/components/common/Button';
import { FlagIcon } from '@/components/sidebar/FlagIcon';
import { LANGUAGES } from '@/components/sidebar/SidebarBottomControls';
import { useDictionary } from '@/context/DictionaryContext';

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
      <div className="w-full max-w-md rounded-2xl border border-border-color bg-bg-surface p-8 text-center space-y-4 shadow-2xl">
        <h1 className="text-xl font-black">{t.languageStepTitle}</h1>
        <p className="text-sm text-text-secondary">
          {t.languageStepBody}
        </p>
        <div className="grid grid-cols-1 gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => onSelect(lang.code)}
              aria-pressed={selectedLanguage === lang.code}
              className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors cursor-pointer ${
                selectedLanguage === lang.code
                  ? 'border-accent-red bg-accent-red/10 text-accent-red'
                  : 'border-border-color text-text-secondary hover:border-accent-red/50'
              }`}
            >
              <FlagIcon code={lang.code} className="h-4 w-[22px] rounded-sm shrink-0" />
              <span>{lang.label}</span>
            </button>
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
