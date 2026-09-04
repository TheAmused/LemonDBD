'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/app/[locale]/characters/[slug]/page.tsx

import React, { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, UserX } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { CharacterDetailSkeleton } from '@/components/character-detail/CharactersSkeleton';
import {
  CharacterSubpageView,
  CharacterDetailPayload,
  CharacterItem,
  PerkItem,
} from '@/components/character-detail/CharacterSubpageView';
import { Locale } from '@/i18n/config';
import { useDictionary } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useCachedData } from '@/hooks/useCachedData';
import { fetchJson } from '@/services/dataCache';
import { getBackendBaseUrl } from '@/utils/api';

const QuestsModal = dynamic(
  () => import('@/components/QuestsModal').then((m) => m.QuestsModal),
  { ssr: false }
);

export default function CharacterDetailPage() {
  const params = useParams();
  const rawLocale = params?.locale;
  const locale = (Array.isArray(rawLocale) ? rawLocale[0] : rawLocale || 'en') as Locale;
  const rawSlug = params?.slug;
  const slug = (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug || '') as string;


  const dict = useDictionary();
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);
  const [notFound, setNotFound] = useState<boolean>(false);


  const backendBase = getBackendBaseUrl();

  // Sibling roster for the breadcrumb's prev/next links. Same cache key the
  // roster page uses, so arriving here from /characters costs nothing.
  const rosterKey = `${backendBase}/api/v1/characters?lang=${locale}`;
  const { data: rosterResponse } = useCachedData<{ data?: CharacterItem[] }>(
    rosterKey,
    () => fetchJson<{ data?: CharacterItem[] }>(rosterKey)
  );
  const allCharacters = rosterResponse?.data ?? [];

  // Per-slug detail, cached the same way. Revisiting a character you have
  // already opened -- including via the prev/next breadcrumb links -- renders
  // from cache on the first frame with no spinner at all.
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

  useEffect(() => {
    if (detailError) {
      console.error('Failed to fetch character detail:', detailError);
      setNotFound(true);
      return;
    }
    if (detailResponse) {
      setNotFound(!detailResponse.data?.character);
    }
  }, [detailResponse, detailError]);

  useDocumentTitle(
    detailData?.character?.name ? `${detailData.character.name} - LemonDBD` : undefined
  );

  const t = dict.characterDetail;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory="characters"
        onOpenQuests={() => setIsQuestsOpen(true)}
      />

      <main
        className="flex-1 w-full overflow-y-auto transition-[padding] duration-300 p-4 sm:p-6 lg:p-8 lemon-shell-main"
      >
        {loading ? (
          <CharacterDetailSkeleton dict={dict} />
        ) : notFound || !detailData ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-5 text-center p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-900 border border-slate-800 text-slate-400">
              <UserX className="h-8 w-8" />
            </div>
            <div className="space-y-1 max-w-md">
              <h2 className="text-xl sm:text-2xl font-black text-slate-100 font-mono">
                {t.notFoundTitle || 'Character Not Found'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {t.notFoundDesc ||
                  'The character you are looking for does not exist or could not be found in the archives.'}
              </p>
            </div>
            <Link
              href={`/${locale}/characters`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>{t.backToCharacters || 'Back to Characters'}</span>
            </Link>
          </div>
        ) : (
          <Suspense fallback={<CharacterDetailSkeleton dict={dict} />}>
            <CharacterSubpageView
              currentLocale={locale}
              dict={dict}
              detailData={detailData}
              allCharacters={allCharacters}
            />
          </Suspense>
        )}

        {isQuestsOpen && (
          <QuestsModal
            isOpen={isQuestsOpen}
            onClose={() => setIsQuestsOpen(false)}
            dict={dict}
          />
        )}
      </main>
    </div>
  );
}
