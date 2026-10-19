'use client';
// frontend/src/components/minigames/DbdIdleClient.tsx

import React, { useState, useEffect } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { ChallengeRunner } from '@/components/minigames/ChallengeRunner';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import type { ChallengeDefinition, MinigameCatalog } from '@/types/minigame';
import { fetchMinigameCatalog, fetchDailyChallenge } from '@/services/minigameApi';
import { ErrorNotice } from '@/components/common/Alert';
import { LoadingState } from '@/components/common/LoadingState';
import { getErrorMessage } from '@/utils/api';

export function DbdIdleClient() {
  const dict = useDictionary();
  const locale = useLocale();

  const [challenge, setChallenge] = useState<ChallengeDefinition | null>(null);
  const [catalog, setCatalog] = useState<MinigameCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const [cat, chal] = await Promise.all([
          fetchMinigameCatalog(locale),
          fetchDailyChallenge(),
        ]);
        if (isMounted) {
          setCatalog(cat);
          setChallenge(chal);
        }
      } catch (err) {
        if (isMounted) {
          setError(getErrorMessage(err, 'Failed to load classic idle challenge.'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

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
      ) : challenge && catalog ? (
        <ChallengeRunner
          challenge={challenge}
          catalog={catalog}
          locale={locale}
          source="daily"
        />
      ) : null}
    </PageShell>
  );
}
