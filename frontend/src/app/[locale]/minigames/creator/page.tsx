// frontend/src/app/[locale]/minigames/creator/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { PageShell } from '@/components/layout/PageShell';
import { MinigameCreator } from '@/components/minigames/creator/MinigameCreator';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { MinigameCatalog } from '@/types/minigame';
import { fetchMinigameCatalog } from '@/services/minigameApi';
import { DbdSpinner } from '@/components/common/DbdSpinner';

const CampfireParticles = dynamic(
  () => import('@/components/common/CampfireParticles').then((m) => m.CampfireParticles),
  { ssr: false }
);

export default function MinigameCreatorPage() {
  const dict = useDictionary();
  const locale = useLocale();

  const [catalog, setCatalog] = useState<MinigameCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useDocumentTitle('Trial Challenge Creator - LemonDBD');

  useEffect(() => {
    let isMounted = true;

    async function loadCatalog() {
      try {
        setLoading(true);
        const cat = await fetchMinigameCatalog(locale);
        if (isMounted) {
          setCatalog(cat);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load catalog.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCatalog();

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
          <p className="text-sm font-semibold text-text-muted">{dict.app.loading}</p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-accent-red/10 border border-accent-red/30 text-center max-w-md mx-auto my-12">
          <h2 className="text-lg font-bold text-accent-red mb-2">{dict.app.notice}</h2>
          <p className="text-xs text-text-muted">{error}</p>
        </div>
      ) : catalog ? (
        <MinigameCreator catalog={catalog} dict={dict} locale={locale} />
      ) : null}
    </PageShell>
  );
}
