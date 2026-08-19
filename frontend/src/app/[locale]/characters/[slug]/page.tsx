// frontend/src/app/[locale]/characters/[slug]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, UserX, RefreshCw } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { QuestsModal } from '@/components/QuestsModal';
import {
  CharacterSubpageView,
  CharacterDetailPayload,
  CharacterItem,
} from '@/components/character-detail/CharacterSubpageView';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';
import { useSidebarState } from '@/hooks/useSidebarState';

export default function CharacterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as Locale) || 'en';
  const slug = (params?.slug as string) || '';

  const { isCollapsed } = useSidebarState();

  const [dict, setDict] = useState<any>(null);
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
    getDictionary(locale).then(setDict);
  }, [locale]);

  // Load Vault stats & all characters list
  useEffect(() => {
    async function loadVaultStats() {
      try {
        const [perksRes, charsRes] = await Promise.all([
          fetch(`${backendBase}/api/v1/perks?limit=1000`),
          fetch(`${backendBase}/api/v1/characters`),
        ]);
        if (perksRes.ok) {
          const pData = await perksRes.json();
          const list = pData.data || [];
          setTotalPerksCount(pData.pagination?.total || list.length);
          setSurvivorCount(list.filter((p: any) => p.category === 'Survivor').length);
          setKillerCount(list.filter((p: any) => p.category === 'Killer').length);
        }
        if (charsRes.ok) {
          const cData = await charsRes.json();
          const charList: CharacterItem[] = cData.data || [];
          setAllCharacters(charList);
          setCharacterCount(cData.count || charList.length);
        }
      } catch (err) {
        console.error('Failed to load sidebar vault stats:', err);
      }
    }
    loadVaultStats();
  }, [backendBase]);

  // Fetch character details by slug
  useEffect(() => {
    if (!slug) return;

    async function fetchCharacterDetail() {
      setLoading(true);
      setNotFound(false);
      try {
        const cleanSlug = encodeURIComponent(slug);
        const res = await fetch(`${backendBase}/api/v1/characters/${cleanSlug}/detail`);
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.character) {
            setDetailData(json.data);
            document.title = `${json.data.character.name} - LemonDBD`;
          } else {
            setNotFound(true);
          }
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Failed to fetch character detail:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchCharacterDetail();
  }, [slug, backendBase]);

  const handleSelectCategory = (cat: string) => {
    router.push(`/${locale}`);
  };

  if (!dict) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400 flex items-center justify-center font-mono">
        Loading...
      </div>
    );
  }

  const t = dict?.characterDetail || {};

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col md:flex-row dbd-fog-overlay transition-colors duration-300">
      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory="characters"
        onSelectCategory={handleSelectCategory}
        onOpenQuests={() => setIsQuestsOpen(true)}
        totalPerksCount={totalPerksCount}
        survivorCount={survivorCount}
        killerCount={killerCount}
        characterCount={characterCount}
      />

      <main
        className={`flex-1 w-full overflow-y-auto transition-all duration-300 p-5 sm:p-7 lg:p-9 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
        }`}
      >
        {loading ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="h-8 w-8 text-red-500 animate-spin" />
            <p className="text-sm font-mono text-slate-500 dark:text-slate-400">
              {t.loading || 'Loading Character Details...'}
            </p>
          </div>
        ) : notFound || !detailData ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-5 text-center p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400">
              <UserX className="h-8 w-8" />
            </div>
            <div className="space-y-1 max-w-md">
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                {t.notFoundTitle || 'Character Not Found'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {t.notFoundDesc ||
                  'The character you are looking for does not exist or could not be found in the archives.'}
              </p>
            </div>
            <Link
              href={`/${locale}/characters`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>{t.backToCharacters || 'Back to Characters'}</span>
            </Link>
          </div>
        ) : (
          <CharacterSubpageView
            currentLocale={locale}
            dict={dict}
            detailData={detailData}
            allCharacters={allCharacters}
          />
        )}

        <QuestsModal
          isOpen={isQuestsOpen}
          onClose={() => setIsQuestsOpen(false)}
          dict={dict}
        />
      </main>
    </div>
  );
}
