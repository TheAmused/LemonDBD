// frontend/src/app/[locale]/minigames/idle/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { PageShell } from '@/components/layout/PageShell';
import { ChallengeRunner } from '@/components/minigames/ChallengeRunner';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { ChallengeDefinition, MinigameCatalog } from '@/types/minigame';
import { fetchMinigameCatalog, fetchDailyChallenge } from '@/services/minigameApi';
import { DbdSpinner } from '@/components/DbdSpinner';

const CampfireParticles = dynamic(
  () => import('@/components/common/CampfireParticles').then((m) => m.CampfireParticles),
  { ssr: false }
);

export default function DbdIdlePage() {
  const dict = useDictionary();
  const locale = useLocale();

  const [challenge, setChallenge] = useState<ChallengeDefinition | null>(null);
  const [catalog, setCatalog] = useState<MinigameCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useDocumentTitle('DBD Idle - Classic Fog Guesser');

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
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load classic idle challenge.');
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
      dict={dict}
      activeCategory="minigames"
      decoration={<CampfireParticles />}
      mainClassName="relative flex flex-col items-center justify-center min-h-[70vh]"
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 gap-4">
          <DbdSpinner size="lg" />
          <p className="text-sm font-semibold text-zinc-400">Loading DBD Idle...</p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-red-950/40 border border-red-800 text-center max-w-md mx-auto my-12">
          <h2 className="text-lg font-bold text-red-300 mb-2">Error</h2>
          <p className="text-xs text-red-400">{error}</p>
        </div>
      ) : challenge && catalog ? (
        <ChallengeRunner
          challenge={challenge}
          catalog={catalog}
          dict={dict}
          locale={locale}
        />
      ) : null}
    </PageShell>
  );
}
