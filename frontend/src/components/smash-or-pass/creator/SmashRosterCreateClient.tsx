'use client';
// frontend/src/components/smash-or-pass/creator/SmashRosterCreateClient.tsx

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { SmashRosterCreator } from '@/components/smash-or-pass/creator/SmashRosterCreator';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import type { Locale } from '@/i18n/config';

function SmashRosterCreateContent({ locale }: { locale: Locale }) {
  const editId = useSearchParams().get('edit') ?? undefined;
  return <SmashRosterCreator locale={locale} editId={editId} />;
}

export function SmashRosterCreateClient() {
  const locale = useLocale();
  const dict = useDictionary();

  if (!dict) return null;

  return (
    <PageShell
      locale={locale}
      activeCategory="smash-or-pass"
      padding="tight"
      mainClassName="relative flex flex-col"
    >
      <Suspense fallback={null}>
        <SmashRosterCreateContent locale={locale} />
      </Suspense>
    </PageShell>
  );
}
