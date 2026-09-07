'use client';
// frontend/src/app/[locale]/swf/page.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { SwfPlanner } from '@/components/swf/SwfPlanner';
import { QuestsModal } from '@/components/QuestsModal';
import { Locale } from '@/i18n/config';
import { useDictionary } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getBackendBaseUrl } from '@/utils/api';

export default function SwfPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';

  const dict = useDictionary();
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);


  const backendBase = getBackendBaseUrl();

  useDocumentTitle(dict?.app?.swfPageTitle || 'LemonDBD - SWF Team Planner');

  const handleSelectCategory = (cat: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `/${locale}`;
    }
  };

  return (
    <PageShell
      locale={locale}
      dict={dict}
      activeCategory="swf"
      onSelectCategory={handleSelectCategory}
      onOpenQuests={() => setIsQuestsOpen(true)}
      padding="spacious"
      mainClassName="overflow-y-auto"
    >
      <Suspense fallback={<div className="p-8 text-center text-slate-400">{dict?.swf?.loadingSwf || dict?.characterDetail?.loading || 'Loading...'}</div>}>
        <SwfPlanner dict={dict} />
      </Suspense>
      <QuestsModal isOpen={isQuestsOpen} onClose={() => setIsQuestsOpen(false)} dict={dict} />
    </PageShell>
  );
}
