'use client';
// frontend/src/components/minigames/PlayTrialClient.tsx

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { ChallengeRunner } from '@/components/minigames/ChallengeRunner';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNsfwGate } from '@/hooks/useNsfwGate';
import { NsfwContentGate } from '@/components/common/NsfwContentGate';
import type { ChallengeDefinition, MinigameCatalog } from '@/types/minigame';
import {
  fetchMinigameCatalog,
  fetchDailyChallenge,
  fetchRepeatableChallenge,
} from '@/services/minigameApi';
import { deleteCustomChallenge, getCustomChallenges } from '@/utils/minigames/storage';
import { checkDocument } from '@/utils/contentRevocation';
import { decodeChallengeShare, readChallengeFragment } from '@/utils/minigames/shareLink';
import { DbdSpinner } from '@/components/common/DbdSpinner';
import { Button } from '@/components/common/Button';
import { ReportContentModal } from '@/components/common/ReportContentModal';
import { signingPayload } from '@/utils/contentPayload';
import { Flag } from 'lucide-react';
import { AuthRequiredState } from '@/components/common/AuthRequiredState';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/utils/api';

function PlayTrialContent() {
  const dict = useDictionary();
  const locale = useLocale();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();

  const type = searchParams.get('type');
  const mode = searchParams.get('mode');
  const customId = searchParams.get('id');
  const [hasChallengeFragment, setHasChallengeFragment] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && Boolean(readChallengeFragment(window.location.hash))) {
      setHasChallengeFragment(true);
    }
  }, []);

  const isCustomTrial = Boolean(customId || hasChallengeFragment);

  const [challenge, setChallenge] = useState<ChallengeDefinition | null>(null);
  const [catalog, setCatalog] = useState<MinigameCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const cat = await fetchMinigameCatalog(locale);
        if (!isMounted) return;
        setCatalog(cat);

        let loadedChallenge: ChallengeDefinition | null = null;
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
          loadedChallenge = await fetchDailyChallenge('fog_trial');
        }

        if (loadedChallenge && (sharedPayload || customId)) {
          const check = await checkDocument('minigame', loadedChallenge);
          if (check.revoked) {
            if (customId) deleteCustomChallenge(customId);
            throw new Error(dict.tierLists.contentRevoked);
          }
          // A shared link must come from an account; a trial the user built themselves is not shared yet.
          if (sharedPayload && check.signed === false) throw new Error(dict.tierLists.unsignedContent);
        }

        if (isMounted) {
          setChallenge(loadedChallenge);
        }
      } catch (err) {
        if (isMounted) {
          setError(getErrorMessage(err, 'Failed to load challenge.'));
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

  const nsfwGate = useNsfwGate(
    'minigame',
    String(challenge?.id ?? customId ?? 'shared'),
    challenge?.is_nsfw === true
  );

  useDocumentTitle(challenge ? `${challenge.title} - LemonDBD` : dict.minigames.pageTitle);

  return (
    <PageShell
      locale={locale}
      activeCategory="minigames"
      mainClassName="relative flex flex-col items-center justify-center min-h-[70vh]"
    >
      {loading || (isCustomTrial && authLoading) ? (
        <div className="flex flex-col items-center justify-center p-12 gap-4">
          <DbdSpinner size="lg" />
          <p className="type-card-title text-text-muted">{dict.app.loading}</p>
        </div>
      ) : isCustomTrial && !isAuthenticated ? (
        <div className="w-full max-w-lg mx-auto py-12 px-4">
          <AuthRequiredState
            title={dict.minigames.authRequiredTitle}
            subtitle={dict.minigames.authRequiredDesc}
          />
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-accent-red/10 border border-accent-red/30 text-center max-w-md mx-auto my-12">
          <h2 className="text-lg font-bold text-accent-red mb-2">{dict.app.notice}</h2>
          <p className="text-xs text-text-muted">{error}</p>
        </div>
      ) : challenge && catalog && nsfwGate.gated ? (
        <NsfwContentGate
          title={dict.minigames.nsfw.title}
          description={dict.minigames.nsfw.description}
          confirmLabel={dict.minigames.nsfw.confirm}
          onConfirm={nsfwGate.confirm}
        />
      ) : challenge && catalog ? (
        <>
          {isCustomTrial && (
            <div className="w-full max-w-4xl flex justify-end px-4 mb-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setReportModalOpen(true)}
                aria-label={dict.tierLists.reportButtonAria}
              >
                <Flag className="h-4 w-4 text-accent-red" aria-hidden="true" />
                <span className="type-label-sm text-text-muted">{dict.tierLists.reportButtonAria}</span>
              </Button>
            </div>
          )}
          <ChallengeRunner
            challenge={challenge}
            catalog={catalog}
            locale={locale}
          />
          {isCustomTrial && (
            <ReportContentModal
              isOpen={reportModalOpen}
              onClose={() => setReportModalOpen(false)}
              contentType="minigame"
              manifest={challenge._manifest ?? null}
              payload={signingPayload('minigame', challenge)}
              contentTitle={challenge.title}
            />
          )}
        </>
      ) : null}
    </PageShell>
  );
}

export function PlayTrialClient() {
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
