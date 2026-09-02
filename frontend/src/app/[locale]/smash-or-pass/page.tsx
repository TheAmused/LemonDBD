'use client';
// frontend/src/app/[locale]/smash-or-pass/page.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
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
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
      <Sidebar
        currentLocale={locale}
        dict={dict || ({} as Dictionary)}
        activeCategory="smash-or-pass"
        onOpenQuests={() => setIsQuestsOpen(true)}
      />

      <main
        className="flex-1 w-full overflow-y-auto transition-[padding] duration-300 p-4 sm:p-6 lg:p-8 lemon-shell-main"
      >
        <React.Suspense fallback={<SmashHubSkeleton />}>
          {dict ? (
            <SmashOrPassHub dict={dict} locale={locale} />
          ) : (
            <SmashHubSkeleton />
          )}
        </React.Suspense>
        {dict && <QuestsModal isOpen={isQuestsOpen} onClose={() => setIsQuestsOpen(false)} dict={dict} />}
      </main>
    </div>
  );
}
