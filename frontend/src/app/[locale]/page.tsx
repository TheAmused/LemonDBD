'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { PerkFilters } from '@/components/PerkFilters';
import { PerkCard, Perk } from '@/components/PerkCard';
import { PerkModal } from '@/components/PerkModal';
import { PerkGenerator } from '@/components/PerkGenerator';
import { QuestsModal } from '@/components/QuestsModal';
import { Pagination } from '@/components/Pagination';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';
import { Shield } from 'lucide-react';

export interface CharacterItem {
  name: string;
  real_name: string;
  category: string;
}

const DASHBOARD_TAB_KEY = 'lemon_dbd_active_tab_v2';

function DashboardContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as Locale) || 'en';

  const paramCategory = searchParams ? searchParams.get('category') : null;
  const paramTab = searchParams ? searchParams.get('tab') : null;

  const [dict, setDict] = useState<any>(null);
  const [perks, setPerks] = useState<Perk[]>([]);
  const [allPerksForGenerator, setAllPerksForGenerator] = useState<Perk[]>([]);
  const [characterOptions, setCharacterOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);

  // Vault Stats State
  const [survivorCount, setSurvivorCount] = useState<number>(0);
  const [killerCount, setKillerCount] = useState<number>(0);
  const [characterCount, setCharacterCount] = useState<number>(0);

  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [character, setCharacter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [order, setOrder] = useState<string>('asc');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(24);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalResults, setTotalResults] = useState<number>(0);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPerk, setSelectedPerk] = useState<Perk | null>(null);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    getDictionary(locale).then(setDict);
  }, [locale]);

  useEffect(() => {
    if (paramTab === 'generator') {
      setCategory('generator');
    } else if (paramCategory) {
      setCategory(paramCategory);
    } else {
      try {
        const savedTab = localStorage.getItem(DASHBOARD_TAB_KEY);
        if (savedTab) {
          setCategory(savedTab);
        } else {
          setCategory('all');
        }
      } catch (e) {
        setCategory('all');
      }
    }
  }, [paramCategory, paramTab]);

  const handleSelectCategory = (cat: string) => {
    setCategory(cat);
    setCharacter('all');
    setPage(1);
    try {
      localStorage.setItem(DASHBOARD_TAB_KEY, cat);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPerks = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort_by: sortBy,
        order: order,
      });

      if (category !== 'all' && category !== 'generator') {
        queryParams.append('category', category);
      }
      if (character !== 'all') queryParams.append('character', character);
      if (search) queryParams.append('search', search);

      const [perksRes, charRes, generatorRes, allCharsRes] = await Promise.all([
        fetch(`${backendBase}/api/v1/perks?${queryParams.toString()}`),
        fetch(`${backendBase}/api/v1/characters${category !== 'all' && category !== 'generator' ? `?category=${category}` : ''}`),
        fetch(`${backendBase}/api/v1/perks?limit=1000`),
        fetch(`${backendBase}/api/v1/characters`),
      ]);

      if (perksRes.ok) {
        const result = await perksRes.json();
        setPerks(result.data || []);
        if (result.pagination) {
          setTotalPages(result.pagination.total_pages);
          setTotalResults(result.pagination.total);
        }
      }

      let fetchedCharactersList: CharacterItem[] = [];
      if (allCharsRes.ok) {
        const acData = await allCharsRes.json();
        fetchedCharactersList = acData.data || [];
      }

      if (generatorRes.ok) {
        const gResult = await generatorRes.json();
        const fullList: Perk[] = gResult.data || [];
        setAllPerksForGenerator(fullList);

        setSurvivorCount(fullList.filter((p) => p.category === 'Survivor').length);
        setKillerCount(fullList.filter((p) => p.category === 'Killer').length);

        // Calculate dynamic character count from perks if character cache is unpopulated
        if (fetchedCharactersList.length > 0) {
          setCharacterCount(fetchedCharactersList.length);
        } else {
          const uniqueChars = new Set(
            fullList.map((p) => p.character).filter((c) => c && c !== 'General')
          );
          setCharacterCount(uniqueChars.size);
        }
      }

      if (charRes.ok) {
        const cData = await charRes.json();
        const options = (cData.data || []).map((c: CharacterItem) => ({
          value: c.name,
          label: c.real_name && c.real_name !== c.name ? `${c.name} (${c.real_name})` : c.name,
        }));
        setCharacterOptions(options);
      }
    } catch (err) {
      console.error('Failed fetching perks:', err);
    } finally {
      setLoading(false);
    }
  }, [backendBase, category, character, search, sortBy, order, page, limit]);

  useEffect(() => {
    fetchPerks();
  }, [fetchPerks]);

  const handleResetFilters = () => {
    setSearch('');
    setCategory('all');
    setCharacter('all');
    setSortBy('name');
    setOrder('asc');
    setPage(1);
  };

  if (!dict) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory={category}
        onSelectCategory={handleSelectCategory}
        onSyncComplete={fetchPerks}
        onOpenQuests={() => setIsQuestsOpen(true)}
        totalPerksCount={allPerksForGenerator.length || totalResults}
        survivorCount={survivorCount}
        killerCount={killerCount}
        characterCount={characterCount}
      />

      <div className="lg:pl-64 min-h-screen flex flex-col w-full">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 xl:p-10 w-full">
          {category === 'generator' ? (
            <PerkGenerator
              allPerks={allPerksForGenerator}
              onSelectPerk={setSelectedPerk}
              dict={dict}
            />
          ) : (
            <>
              <PerkFilters
                search={search}
                setSearch={(v) => { setSearch(v); setPage(1); }}
                category={category}
                setCategory={(v) => { handleSelectCategory(v); setPage(1); }}
                character={character}
                setCharacter={(v) => { setCharacter(v); setPage(1); }}
                sortBy={sortBy}
                setSortBy={setSortBy}
                order={order}
                setOrder={setOrder}
                viewMode={viewMode}
                setViewMode={setViewMode}
                characterOptions={characterOptions}
                dict={dict}
                onReset={handleResetFilters}
              />

              {loading ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="h-52 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800"
                    />
                  ))}
                </div>
              ) : perks.length === 0 ? (
                <div className="my-12 rounded-3xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
                  <Shield className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {dict.empty.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {dict.empty.subtitle}
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className={
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
                        : 'flex flex-col gap-3'
                    }
                  >
                    {perks.map((perk, idx) => (
                      <PerkCard
                        key={`${perk.name}-${idx}`}
                        perk={perk}
                        viewMode={viewMode}
                        onSelect={setSelectedPerk}
                        dict={dict}
                      />
                    ))}
                  </div>

                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    totalResults={totalResults}
                    limit={limit}
                    onPageChange={setPage}
                    onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
                    dict={dict}
                  />
                </>
              )}
            </>
          )}

          <PerkModal perk={selectedPerk} onClose={() => setSelectedPerk(null)} dict={dict} />
          <QuestsModal isOpen={isQuestsOpen} onClose={() => setIsQuestsOpen(false)} dict={dict} />
        </main>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}