'use client';
// frontend/src/app/[locale]/streaks/page.tsx
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSavedStreakRole } from '@/utils/streakDifficultyPrefs';

/** Sends the visitor to the role tab they used last, killer on a first visit. */
export default function StreaksIndexPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';

  useEffect(() => {
    router.replace(`/${locale}/streaks/${getSavedStreakRole() ?? 'killer'}`);
  }, [locale, router]);

  return null;
}
