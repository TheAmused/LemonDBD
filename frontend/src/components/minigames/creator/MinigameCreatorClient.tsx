'use client';
// frontend/src/components/minigames/creator/MinigameCreatorClient.tsx

import React, { useState, useEffect } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { MinigameCreator } from '@/components/minigames/creator/MinigameCreator';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import type { MinigameCatalog } from '@/types/minigame';
import { fetchMinigameCatalog } from '@/services/minigameApi';
import { ErrorNotice } from '@/components/common/Alert';
import { LoadingState } from '@/components/common/LoadingState';
import { getErrorMessage } from '@/utils/api';

export function MinigameCreatorClient() {
  const dict = useDictionary();
  const locale = useLocale();

  const [catalog, setCatalog] = useState<MinigameCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCatalog() {
      try {
        setLoading(true);
        const cat = await fetchMinigameCatalog(locale);
        if (isMounted) {
          setCatalog(cat);
        }
      } catch (err) {
        if (isMounted) {
          setError(getErrorMessage(err, 'Failed to load catalog.'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      isMounted = false;
    };
  }, [locale]);

  return (
    <PageShell
      locale={locale}
      activeCategory="minigames"
      mainClassName="relative flex flex-col items-center justify-center min-h-vh-70"
    >
      {loading ? (
        <LoadingState label={dict.app.loading} />
      ) : error ? (
        <ErrorNotice title={dict.app.notice}>{error}</ErrorNotice>
      ) : catalog ? (
        <MinigameCreator catalog={catalog} locale={locale} />
      ) : null}
    </PageShell>
  );
}
