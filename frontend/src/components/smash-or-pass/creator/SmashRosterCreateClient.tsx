'use client';
// frontend/src/components/smash-or-pass/creator/SmashRosterCreateClient.tsx

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SmashRosterCreator } from '@/components/smash-or-pass/creator/SmashRosterCreator';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { Locale } from '@/i18n/config';

/** The creator is for desktop screens (the add and edit buttons are hidden below the same width). */
const CREATOR_MIN_WIDTH = '(min-width: 1024px)';

function SmashRosterCreateContent({ locale }: { locale: Locale }) {
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit') ?? undefined;
  const officialSlug = searchParams.get('official') ?? undefined;
  return <SmashRosterCreator locale={locale} editId={editId} officialSlug={officialSlug} />;
}

export function SmashRosterCreateClient() {
  const locale = useLocale();
  const dict = useDictionary();
  const router = useRouter();
  const wideEnough = useMediaQuery(CREATOR_MIN_WIDTH);

  useEffect(() => {
    if (wideEnough === false) router.replace(`/${locale}/smash-or-pass`);
  }, [wideEnough, router, locale]);

  if (!dict || !wideEnough) return null;

  return (
    <Suspense fallback={null}>
      <SmashRosterCreateContent locale={locale} />
    </Suspense>
  );
}
