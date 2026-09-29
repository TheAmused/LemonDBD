// frontend/src/app/[locale]/minigames/page.tsx
'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { PageShell } from '@/components/layout/PageShell';
import { MinigamesHub } from '@/components/minigames/MinigamesHub';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const CampfireParticles = dynamic(
  () => import('@/components/common/CampfireParticles').then((m) => m.CampfireParticles),
  { ssr: false }
);

export default function MinigamesPage() {
  const dict = useDictionary();
  const locale = useLocale();

  useDocumentTitle(dict.minigames.pageTitle);

  return (
    <PageShell
      locale={locale}
      dict={dict}
      activeCategory="minigames"
      decoration={<CampfireParticles />}
      mainClassName="relative flex flex-col"
    >
      <MinigamesHub locale={locale} dict={dict} />
    </PageShell>
  );
}
