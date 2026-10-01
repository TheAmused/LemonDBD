// frontend/src/app/[locale]/minigames/play/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PageShell } from '@/components/layout/PageShell';
import { ChallengeRunner } from '@/components/minigames/ChallengeRunner';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { ChallengeDefinition, MinigameCatalog } from '@/types/minigame';
import {
  fetchMinigameCatalog,
  fetchDailyChallenge,
  fetchRepeatableChallenge,
} from '@/services/minigameApi';
import { getCustomChallenges } from '@/utils/minigames/storage';
import { decodeChallengeShare, readChallengeFragment } from '@/utils/minigames/shareLink';
import { DbdSpinner } from '@/components/common/DbdSpinner';

const CampfireParticles = dynamic(
  () => import('@/components/common/CampfireParticles').then((m) => m.CampfireParticles),
  { ssr: false }
);

function PlayTrialContent() {
  const dict = useDictionary();
  const locale = useLocale();
  const searchParams = useSearchParams();

  const type = searchParams.get('type');
  const mode = searchParams.get('mode');
  const customId = searchParams.get('id');

  const [challenge, setChallenge] = useState<ChallengeDefinition | null>(null);
  const [catalog, setCatalog] = useState<MinigameCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch catalog
        const cat = await fetchMinigameCatalog(locale);
        if (!isMounted) return;
        setCatalog(cat);

        // Fetch challenge
        let loadedChallenge: ChallengeDefinition | null = null;

        // A shared challenge lives in the URL fragment, so it never reaches a server.
        const sharedPayload = readChallengeFragment(window.location.hash);
        if (sharedPayload) {
          loadedChallenge = await decodeChallengeShare(sharedPayload);
        } else if (customId) {
          const list = getCustomChallenges();
          loadedChallenge = list.find((c) => String(c.id) === String(customId)) || null;
          if (!loadedChallenge) {
            throw new Error('Custom trial not found in this browser.');
          }
        } else if (type === 'daily') {
          loadedChallenge = await fetchDailyChallenge(mode || 'fog_trial');
        } else if (type === 'repeatable' || mode) {
          loadedChallenge = await fetchRepeatableChallenge(mode || 'classic');
        } else {
          // Default: daily fog gauntlet
          loadedChallenge = await fetchDailyChallenge('fog_trial');
        }

        if (isMounted) {
          setChallenge(loadedChallenge);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load challenge.');
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
  }, [type, mode, customId, locale]);


  useDocumentTitle(challenge ? `${challenge.title} - LemonDBD` : dict.minigames.pageTitle);

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

export default function PlayTrialPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <DbdSpinner size="lg" />
        </div>
      }
    >
      <PlayTrialContent />
    </Suspense>
  );
}
