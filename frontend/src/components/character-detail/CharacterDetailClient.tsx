'use client';
// frontend/src/components/character-detail/CharacterDetailClient.tsx

import { logger } from '@/utils/logger';
import React, { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, UserX } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { CharacterDetailSkeleton } from '@/components/character-detail/CharactersSkeleton';
import type {
  CharacterDetailPayload,
  CharacterItem} from '@/components/character-detail/CharacterSubpageView';
import {
  CharacterSubpageView
} from '@/components/character-detail/CharacterSubpageView';
import type { Locale } from '@/i18n/config';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useCachedData } from '@/hooks/useCachedData';
import { fetchJson } from '@/services/dataCache';
import { getBackendBaseUrl } from '@/utils/api';
import { buttonClassName } from '@/components/common/Button';

export function CharacterDetailClient({ slug }: { slug: string }) {
  const locale = useLocale() as Locale;
  const dict = useDictionary();
  const backendBase = getBackendBaseUrl();

  const rosterKey = `${backendBase}/api/v1/characters?lang=${locale}`;
  const { data: rosterResponse } = useCachedData<{ data?: CharacterItem[] }>(
    rosterKey,
    () => fetchJson<{ data?: CharacterItem[] }>(rosterKey)
  );
  const allCharacters = rosterResponse?.data ?? [];

  const detailKey = slug
    ? `${backendBase}/api/v1/characters/${encodeURIComponent(slug)}/detail?lang=${locale}`
    : null;
  const {
    data: detailResponse,
    loading,
    error: detailError,
  } = useCachedData<{ data?: CharacterDetailPayload }>(detailKey, () =>
    fetchJson<{ data?: CharacterDetailPayload }>(detailKey as string)
  );

  const detailData = detailResponse?.data ?? null;

  // A failed request, or an answer without a character, is a not-found page.
  const notFound = Boolean(detailError) || (detailResponse !== undefined && !detailResponse.data?.character);
  useEffect(() => {
    if (detailError) logger.error('Failed to fetch character detail:', detailError);
  }, [detailError]);

  useDocumentTitle(
    detailData?.character?.name ? `${detailData.character.name} - LemonDBD` : undefined
  );

  const t = dict.characterDetail;

  return (
    <div className="relative z-10">
      {loading ? (
        <CharacterDetailSkeleton />
      ) : notFound || !detailData ? (
        <EmptyState
          variant="solid"
          icon={UserX}
          title={t.notFoundTitle}
          subtitle={t.notFoundDesc}
          className="min-h-vh-60 flex flex-col items-center justify-center space-y-5 text-center p-6"
        >
          <Link
            href={`/${locale}/characters`}
            className={buttonClassName('primary', 'md')}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>{t.backToCharacters}</span>
          </Link>
        </EmptyState>
      ) : (
        <Suspense fallback={<CharacterDetailSkeleton />}>
          <CharacterSubpageView
            currentLocale={locale}
            detailData={detailData}
            allCharacters={allCharacters}
          />
        </Suspense>
      )}
    </div>
  );
}
