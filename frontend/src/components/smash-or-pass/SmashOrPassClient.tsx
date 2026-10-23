'use client';
// frontend/src/components/smash-or-pass/SmashOrPassClient.tsx

import React from 'react';
import { SmashOrPassHub } from '@/components/smash-or-pass/SmashOrPassHub';
import { SmashHubSkeleton } from '@/components/smash-or-pass/SmashOrPassSkeleton';
import { useDictionary, useLocale } from '@/context/DictionaryContext';

export function SmashOrPassClient() {
  const locale = useLocale();
  const dict = useDictionary();

  return (
    <React.Suspense fallback={<SmashHubSkeleton />}>
      {dict ? (
        <SmashOrPassHub locale={locale} />
      ) : (
        <SmashHubSkeleton />
      )}
    </React.Suspense>
  );
}
