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
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';
import { useSidebarState } from '@/hooks/useSidebarState';

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

  const { isCollapsed } = useSidebarState();

  const [dict, setDict] = useState<Dictionary | null>(null);
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);
  const [detailData, setDetailData] = useState<CharacterDetailPayload | null>(null);
  const [allCharacters, setAllCharacters] = useState<CharacterItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);

  // Vault Stats for Sidebar
  const [totalPerksCount, setTotalPerksCount] = useState<number>(0);
  const [survivorCount, setSurvivorCount] = useState<number>(0);
  const [killerCount, setKillerCount] = useState<number>(0);
  const [characterCount, setCharacterCount] = useState<number>(0);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    let isMounted = true;
    getDictionary(locale)
      .then((res) => {
        if (isMounted) {
          setDict(res);
        }
      })
      .catch((err) => {
        console.error('Failed to load dictionary:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [locale]);

  // Load Vault stats & all characters list
  useEffect(() => {
    let isMounted = true;
    async function loadVaultStats() {
      try {
        const [perksRes, charsRes] = await Promise.all([
          fetch(`${backendBase}/api/v1/perks?limit=1000`),
          fetch(`${backendBase}/api/v1/characters`),
        ]);
        if (!isMounted) return;
        if (perksRes.ok) {
          const pData = await perksRes.json();
          const list: PerkItem[] = pData.data || [];
          setTotalPerksCount(pData.pagination?.total || list.length);
          setSurvivorCount(list.filter((p) => p.category === 'Survivor').length);
          setKillerCount(list.filter((p) => p.category === 'Killer').length);
        }
        if (charsRes.ok) {
          const cData = await charsRes.json();
          const charList: CharacterItem[] = cData.data || [];
          setAllCharacters(charList);
          setCharacterCount(cData.count || charList.length);
        }
      } catch (err: unknown) {
        console.error('Failed to load sidebar vault stats:', err);
      }
    }
    loadVaultStats();
    return () => {
      isMounted = false;
    };
  }, [backendBase]);

  // Fetch character details by slug
  useEffect(() => {
    if (!slug) return;
    let isMounted = true;

    async function fetchCharacterDetail() {
      setLoading(true);
      setNotFound(false);
      try {
        const cleanSlug = encodeURIComponent(slug);
        const res = await fetch(`${backendBase}/api/v1/characters/${cleanSlug}/detail?lang=${locale}`);
        if (!isMounted) return;
        if (res.ok) {
          const json = await res.json();
          if (json && json.data && json.data.character) {
            setDetailData(json.data);
            if (typeof document !== 'undefined') {
              document.title = `${json.data.character.name || 'Character'} - LemonDBD`;
            }
          } else {
            setNotFound(true);
          }
        } else {
          setNotFound(true);
        }
      } catch (err: unknown) {
        console.error('Failed to fetch character detail:', err);
        if (isMounted) {
          setNotFound(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchCharacterDetail();
    return () => {
      isMounted = false;
    };
  }, [slug, backendBase, locale]);

  if (!dict) {
    return (
      <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
        <aside className="hidden lg:flex w-72 flex-col shrink-0 border-r border-slate-800 bg-[#0a0f18]/90 p-4 select-none animate-pulse" />
        <main className="flex-1 w-full overflow-y-auto p-4 sm:p-6 lg:p-8 lg:pl-72">
          <CharacterDetailSkeleton />
        </main>
      </div>
    );
  }

  const t = dict.characterDetail;

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory="characters"
        onOpenQuests={() => setIsQuestsOpen(true)}
        totalPerksCount={totalPerksCount}
        survivorCount={survivorCount}
        killerCount={killerCount}
        characterCount={characterCount}
      />

      <main
        className={`flex-1 w-full overflow-y-auto transition-all duration-300 p-4 sm:p-6 lg:p-8 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
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
