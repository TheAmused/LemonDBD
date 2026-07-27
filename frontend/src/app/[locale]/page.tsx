'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { PerkFilters } from '@/components/PerkFilters';
import { PerkCard, Perk } from '@/components/PerkCard';
import { PerkModal } from '@/components/PerkModal';
import { Pagination } from '@/components/Pagination';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';
import { Shield, Sparkles } from 'lucide-react';

export default function DashboardPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';

  const [dict, setDict] = useState<any>(null);
  const [perks, setPerks] = useState<Perk[]>([]);
  const [characters, setCharacters] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Pagination & Filtering state
  const [search, setSearch] = useState<string>('');
  const [category, setCategory] = useState<string>('all');
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

  const fetchPerks = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort_by: sortBy,
        order: order,
      });

      if (category !== 'all') queryParams.append('category', category);
      if (character !== 'all') queryParams.append('character', character);
      if (search) queryParams.append('search', search);

      const [perksRes, survivorsRes, killersRes] = await Promise.all([
        fetch(`${backendBase}/api/v1/perks?${queryParams.toString()}`),
        fetch(`${backendBase}/api/v1/survivors`),
        fetch(`${backendBase}/api/v1/killers`),
      ]);

      if (perksRes.ok) {
        const result = await perksRes.json();
        setPerks(result.data || []);
        if (result.pagination) {
          setTotalPages(result.pagination.total_pages);
          setTotalResults(result.pagination.total);
        }
      }

      const charSet = new Set<string>();
      if (survivorsRes.ok) {
        const sData = await survivorsRes.json();
        (sData.data || []).forEach((c: string) => charSet.add(c));
      }
      if (killersRes.ok) {
        const kData = await killersRes.json();
        (kData.data || []).forEach((c: string) => charSet.add(c));
      }
      setCharacters(Array.from(charSet).sort());
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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar currentLocale={locale} dict={dict} onSyncComplete={fetchPerks} />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Filter Toolbar */}
        <PerkFilters
          search={search}
          setSearch={(v) => { setSearch(v); setPage(1); }}
          category={category}
          setCategory={(v) => { setCategory(v); setPage(1); }}
          character={character}
          setCharacter={(v) => { setCharacter(v); setPage(1); }}
          sortBy={sortBy}
          setSortBy={setSortBy}
          order={order}
          setOrder={setOrder}
          viewMode={viewMode}
          setViewMode={setViewMode}
          characters={characters}
          dict={dict}
          onReset={handleResetFilters}
        />

        {/* Content Section */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
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
                  ? 'grid grid-cols-1 gap-6 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
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

        <PerkModal perk={selectedPerk} onClose={() => setSelectedPerk(null)} dict={dict} />
      </main>
    </div>
  );
}