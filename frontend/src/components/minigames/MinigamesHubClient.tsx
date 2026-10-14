'use client';
// frontend/src/components/minigames/MinigamesHubClient.tsx

import React from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { MinigamesHub } from '@/components/minigames/MinigamesHub';
import { useLocale } from '@/context/DictionaryContext';

export function MinigamesHubClient() {
  const locale = useLocale();

  return (
    <PageShell
      locale={locale}
      activeCategory="minigames"
      mainClassName="relative flex flex-col"
    >
      <MinigamesHub locale={locale} />
    </PageShell>
  );
}
