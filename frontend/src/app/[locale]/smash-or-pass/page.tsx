'use client';
// frontend/src/app/[locale]/smash-or-pass/page.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { SmashOrPassHub } from '@/components/smash-or-pass/SmashOrPassHub';
import { QuestsModal } from '@/components/QuestsModal';
import { Locale } from '@/i18n/config';
import { PerkItem, CharacterItem } from '@/components/character-detail/types';
import { getBackendBaseUrl } from '@/utils/perkUtils';

import { SmashHubSkeleton } from '@/components/smash-or-pass/SmashOrPassSkeleton';
import { useDictionary } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function SmashOrPassPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';

  const dict = useDictionary();
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);


  const backendBase = getBackendBaseUrl();

  useDocumentTitle(dict?.app?.smashOrPassPageTitle || 'LemonDBD - Smash or Pass | Dead by Daylight Romance');

  return (
    <PageShell
      locale={locale}
      dict={dict || ({} as Dictionary)}
      activeCategory="smash-or-pass"
      onOpenQuests={() => setIsQuestsOpen(true)}
      mainClassName="overflow-y-auto"
    >
      <React.Suspense fallback={<SmashHubSkeleton />}>
        {dict ? (
          <SmashOrPassHub dict={dict} locale={locale} />
        ) : (
          <SmashHubSkeleton />
        )}
      </React.Suspense>
      {dict && <QuestsModal isOpen={isQuestsOpen} onClose={() => setIsQuestsOpen(false)} dict={dict} />}
    </PageShell>
  );
}
