'use client';
// frontend/src/components/minigames/MinigamesHubClient.tsx

import React from 'react';
import { MinigamesHub } from '@/components/minigames/MinigamesHub';
import { useLocale } from '@/context/DictionaryContext';

export function MinigamesHubClient() {
  const locale = useLocale();

  return (
    <MinigamesHub locale={locale} />
  );
}
