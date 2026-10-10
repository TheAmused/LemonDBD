// frontend/src/components/onboarding/wizard/useOnboardingLanguage.ts
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { type OnboardingView, resolveOnboardingView, RESUME_VIEW_KEY } from '../CharacterOnboardingWizardParts';

/** The wizard's step (intro / language / roster) and the language picker behind the middle step. */
export function useOnboardingLanguage(locale: string) {
  const { setPreferredLanguage } = useAuth();
  const router = useRouter();

  const [view, setView] = useState<OnboardingView>(() =>
    resolveOnboardingView(typeof window !== 'undefined' ? sessionStorage.getItem(RESUME_VIEW_KEY) : null)
  );
  // The locale in the URL is the language the site is already being read in,
  // and after a flag redirect it is the one just picked -- right in both cases.
  const [selectedLanguage, setSelectedLanguage] = useState<string>(locale);
  const [savingLanguage, setSavingLanguage] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem(RESUME_VIEW_KEY);
  }, []);

  /** Switches the whole wizard into the picked language right away: the
   * dictionary comes from the `[locale]` segment, so the only way to
   * re-translate what is on screen is to navigate there. */
  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language);
    if (language !== locale) {
      sessionStorage.setItem(RESUME_VIEW_KEY, 'language');
      router.push(`/${language}/welcome`);
    }
  };

  const handleLanguageContinue = async () => {
    setSavingLanguage(true);
    // Set before awaiting: a redirect from a flag picked moments ago may still
    // be in flight, and whichever mount wins has to land on the roster rather
    // than bounce back to the language step.
    sessionStorage.setItem(RESUME_VIEW_KEY, 'roster');
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
