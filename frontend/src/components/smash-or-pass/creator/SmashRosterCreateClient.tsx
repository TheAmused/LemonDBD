'use client';
// frontend/src/components/smash-or-pass/creator/SmashRosterCreateClient.tsx

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SmashRosterCreator } from '@/components/smash-or-pass/creator/SmashRosterCreator';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import type { Locale } from '@/i18n/config';

function SmashRosterCreateContent({ locale }: { locale: Locale }) {
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit') ?? undefined;
  const officialSlug = searchParams.get('official') ?? undefined;
  return <SmashRosterCreator locale={locale} editId={editId} officialSlug={officialSlug} />;
}

export function SmashRosterCreateClient() {
  const locale = useLocale();
  const dict = useDictionary();

  if (!dict) return null;

  return (
    <Suspense fallback={null}>
      <SmashRosterCreateContent locale={locale} />
    </Suspense>
  );
}
