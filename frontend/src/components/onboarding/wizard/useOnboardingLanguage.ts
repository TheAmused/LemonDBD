'use client';
// frontend/src/components/onboarding/wizard/useOnboardingLanguage.ts
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { loadOnboardingStep, saveOnboardingStep } from '@/utils/onboardingStorage';
import { type OnboardingView, resolveOnboardingView } from '../CharacterOnboardingWizardParts';

/** The wizard's step (intro / language / roster) and the language picker behind the middle step.
 * The step lives in localStorage, per user, so a refresh, a new tab or a locale redirect (the
 * dictionary comes from the `[locale]` segment, so picking a language remounts the wizard)
 * resumes where the user was instead of falling back to the intro. */
export function useOnboardingLanguage(locale: string) {
  const { user, setPreferredLanguage } = useAuth();
  const router = useRouter();
  const userId = user?.id;

  const [pickedView, setPickedView] = useState<OnboardingView | null>(null);
  const storedView = useMemo(() => resolveOnboardingView(loadOnboardingStep(userId)), [userId]);
  const view = pickedView ?? storedView;

  const setView = (next: OnboardingView) => {
    saveOnboardingStep(userId, next);
    setPickedView(next);
  };

  // The locale in the URL is the language the site is already being read in,
  // and after a flag redirect it is the one just picked -- right in both cases.
  const [selectedLanguage, setSelectedLanguage] = useState<string>(locale);
  const [savingLanguage, setSavingLanguage] = useState(false);

  /** Switches the whole wizard into the picked language right away: the
   * dictionary comes from the `[locale]` segment, so the only way to
   * re-translate what is on screen is to navigate there. */
  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language);
    if (language !== locale) {
      saveOnboardingStep(userId, 'language');
      router.push(`/${language}/welcome`);
    }
  };

  const handleLanguageContinue = async () => {
    setSavingLanguage(true);
    // Saved before awaiting: a redirect from a flag picked moments ago may still
    // be in flight, and whichever mount wins has to land on the roster rather
    // than bounce back to the language step.
    saveOnboardingStep(userId, 'roster');
    await setPreferredLanguage(selectedLanguage);
    if (selectedLanguage !== locale) {
      router.push(`/${selectedLanguage}/welcome`);
    }
    setSavingLanguage(false);
    setView('roster');
  };

  return {
    view,
    setView,
    selectedLanguage,
    savingLanguage,
    handleLanguageSelect,
    handleLanguageContinue,
  };
}
