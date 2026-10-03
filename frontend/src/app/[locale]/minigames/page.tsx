// frontend/src/app/[locale]/minigames/page.tsx
'use client';

import React from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { MinigamesHub } from '@/components/minigames/MinigamesHub';
import { useDictionary, useLocale } from '@/context/DictionaryContext';


export default function MinigamesPage() {
  const dict = useDictionary();
  const locale = useLocale();


  return (
    <PageShell
      locale={locale}
      dict={dict}
      activeCategory="minigames"
      mainClassName="relative flex flex-col"
    >
      <MinigamesHub locale={locale} dict={dict} />
    </PageShell>
  );
}
