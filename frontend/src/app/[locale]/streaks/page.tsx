'use client';
// frontend/src/app/[locale]/streaks/page.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/context/DictionaryContext';
import { getSavedStreakRole } from '@/utils/streakDifficultyPrefs';

/** Sends the visitor to the role tab they used last, killer on a first visit. */
export default function StreaksIndexPage() {
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    router.replace(`/${locale}/streaks/${getSavedStreakRole() ?? 'killer'}`);
  }, [locale, router]);

  return null;
}
