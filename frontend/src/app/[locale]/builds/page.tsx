'use client';
// frontend/src/app/[locale]/builds/page.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { BuildVault } from '@/components/builds/BuildVault';
import { QuestsModal } from '@/components/QuestsModal';
import { Locale } from '@/i18n/config';
import { useDictionary } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getBackendBaseUrl } from '@/utils/api';

export default function BuildsPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';

  const dict = useDictionary();
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);


  const backendBase = getBackendBaseUrl();

  useDocumentTitle(dict?.app?.buildsPageTitle || 'LemonDBD - Community Builds');

  const handleSelectCategory = (cat: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `/${locale}`;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory="builds"
        onSelectCategory={handleSelectCategory}
        onOpenQuests={() => setIsQuestsOpen(true)}
      />

      <main
        className="flex-1 w-full overflow-y-auto transition-[padding] duration-300 p-5 sm:p-7 lg:p-9 lemon-shell-main"
      >
        <Suspense fallback={<div className="p-8 text-center text-slate-400">{dict?.characterDetail?.loading || 'Loading...'}</div>}>
          <BuildVault dict={dict} currentLocale={locale} />
        </Suspense>
        <QuestsModal isOpen={isQuestsOpen} onClose={() => setIsQuestsOpen(false)} dict={dict} />
      </main>
    </div>
  );
}
