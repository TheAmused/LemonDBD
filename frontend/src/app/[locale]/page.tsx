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
import { Shield, Skull, Sparkles, Database, Users, Flame } from 'lucide-react';

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

  const VALID_PERK_CATEGORIES = ['all', 'Survivor', 'Killer', 'General', 'generator'];

  useEffect(() => {
    if (paramTab === 'generator') {
      setCategory('generator');
    } else if (paramCategory && VALID_PERK_CATEGORIES.includes(paramCategory)) {
      setCategory(paramCategory);
    } else {
      try {
        const savedTab = localStorage.getItem(DASHBOARD_TAB_KEY);
        if (savedTab && VALID_PERK_CATEGORIES.includes(savedTab)) {
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
    const targetCategory = VALID_PERK_CATEGORIES.includes(cat) ? cat : 'all';
    setCategory(targetCategory);
    setCharacter('all');
    setPage(1);
    try {
      localStorage.setItem(DASHBOARD_TAB_KEY, targetCategory);
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

      if (category === 'General') {
        queryParams.append('character', 'General');
      } else if (category !== 'all' && category !== 'generator') {
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

  const totalVaultPerks = allPerksForGenerator.length || totalResults;

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row dbd-fog-overlay">
      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory={category}
        onSelectCategory={handleSelectCategory}
        onSyncComplete={fetchPerks}
        onOpenQuests={() => setIsQuestsOpen(true)}
        totalPerksCount={totalVaultPerks}
        survivorCount={survivorCount}
        killerCount={killerCount}
        characterCount={characterCount}
      />

      <main className="flex-1 lg:pl-64 p-4 sm:p-6 lg:p-8 w-full overflow-y-auto">
        {/* ── Atmospheric Hero Header ── */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 p-5 sm:p-6 backdrop-blur-xl shadow-2xl shadow-slate-950/60">
            {/* Background Glow Accents */}
            <div className="pointer-events-none absolute -left-12 -top-12 h-36 w-36 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-12 -bottom-12 h-36 w-36 rounded-full bg-rose-600/10 blur-3xl" />

            <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Header Title & Subtitle */}
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/25 shadow-lg shadow-cyan-950/40">
                  <Database className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-100 tracking-tight sm:text-3xl">
                    Perks Vault & Codex
                  </h1>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">
                    Explore all Dead by Daylight Survivor and Killer teachables, descriptions, and character assignments in one place.
                  </p>
                </div>
              </div>

              {/* Dynamic Vault Counter Badges */}
              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 shadow-inner">
                  <Flame className="h-4 w-4 text-cyan-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Vault Total</span>
                    <span className="text-xs font-black text-slate-100">{totalVaultPerks}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 px-3.5 py-2 shadow-inner">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-emerald-500/80">Survivor</span>
                    <span className="text-xs font-black text-emerald-300">{survivorCount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-950/30 px-3.5 py-2 shadow-inner">
                  <Skull className="h-4 w-4 text-rose-400" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-rose-500/80">Killer</span>
                    <span className="text-xs font-black text-rose-300">{killerCount}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Content View ── */}
        {category === 'generator' ? (
          <PerkGenerator
            allPerks={allPerksForGenerator}
            onSelectPerk={setSelectedPerk}
            dict={dict}
          />
        ) : (
          <>
            {/* Filter Bar */}
            <PerkFilters
              search={search}
              setSearch={(v) => {
                setSearch(v);
                setPage(1);
              }}
              category={category}
              setCategory={(v) => {
                handleSelectCategory(v);
                setPage(1);
              }}
              character={character}
              setCharacter={(v) => {
                setCharacter(v);
                setPage(1);
              }}
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

            {/* Perks Cards Grid / List */}
            {loading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="h-48 animate-pulse rounded-3xl bg-slate-900/60 border border-slate-800/80"
                  />
                ))}
              </div>
            ) : perks.length === 0 ? (
              <div className="my-12 rounded-3xl border border-dashed border-slate-800/80 bg-slate-900/40 p-12 text-center backdrop-blur-sm">
                <Shield className="mx-auto h-12 w-12 text-slate-600 mb-3" />
                <h3 className="text-lg font-extrabold text-slate-200">
                  {dict?.empty?.title || 'No Perks Found'}
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  {dict?.empty?.subtitle || 'Try clearing search filters or choosing another character.'}
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <>
                <div
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
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

                {/* Pagination */}
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  totalResults={totalResults}
                  limit={limit}
                  onPageChange={setPage}
                  onLimitChange={(newLimit) => {
                    setLimit(newLimit);
                    setPage(1);
                  }}
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
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono">
          Loading Perks Vault...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}