'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/app/[locale]/perks/page.tsx

import React, { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { PerkFilters } from '@/components/PerkFilters';
import { PerkCard } from '@/components/PerkCard';
import { PerksGridSkeleton } from '@/components/PerksSkeleton';
import { Pagination } from '@/components/Pagination';
import { Locale } from '@/i18n/config';
import { Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  Perk,
  CharacterItem,
  RoleCategory,
  ScopeFilter,
  OwnershipFilter,
  SortField,
  SortOrder,
  ViewDisplayMode,
  PerkDictionary,
} from '@/types/perks';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { useImagePrefetch } from '@/components/ImagePreloadProvider';
import { useDictionary } from '@/context/DictionaryContext';
import { useCachedData } from '@/hooks/useCachedData';
import { fetchCached, fetchJson } from '@/services/dataCache';

const PerkModal = dynamic(() => import('@/components/PerkModal').then((m) => m.PerkModal), { ssr: false });
const QuestsModal = dynamic(
  () => import('@/components/QuestsModal').then((m) => m.QuestsModal),
  { ssr: false }
);

interface PerksResponse {
  data?: Perk[];
  pagination?: { total_pages: number; total: number };
}

const DEFAULT_PERKS_PER_PAGE = 15;

function PerksContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as Locale) || 'en';
  const { user } = useAuth();

  const paramRole = searchParams ? searchParams.get('role') : null;

  const dict = useDictionary();
  const [perks, setPerks] = useState<Perk[]>([]);
  const [allPerksForStats, setAllPerksForGenerator] = useState<Perk[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);

  const [role, setRole] = useState<RoleCategory>('Survivor');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [order, setOrder] = useState<SortOrder>('asc');

  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(DEFAULT_PERKS_PER_PAGE);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalResults, setTotalResults] = useState<number>(0);

  const [survivorCount, setSurvivorCount] = useState<number>(0);
  const [killerCount, setKillerCount] = useState<number>(0);
  const [survivorOwnedCount, setSurvivorOwnedCount] = useState<number>(0);
  const [killerOwnedCount, setKillerOwnedCount] = useState<number>(0);
  const [characterCount, setCharacterCount] = useState<number>(0);
  const [ownedPerksCount, setOwnedPerksCount] = useState<number>(0);

  const [viewMode, setViewMode] = useState<ViewDisplayMode>('grid');
  const [selectedPerk, setSelectedPerk] = useState<Perk | null>(null);

  // The 5-column perk grid always shows exactly 3 rows worth of vertical
  // space -- any extra rows (from a larger Pagination page size) should
  // scroll at that *same* per-row height instead of squeezing everything
  // to fit or collapsing to zero height. That per-row height can't be
  // expressed as a CSS percentage of the grid's own box (that's a cyclic
  // calculation -- the row height would depend on the height being solved
  // for -- which is exactly what broke rows past the 15th item). So it's
  // measured directly off the grid's own rendered height instead, the
  // same ResizeObserver-based approach used for the slot machine's reel
  // sizing.
  const [rowHeightPx, setRowHeightPx] = useState<number | null>(null);
  const gridResizeObserverRef = useRef<ResizeObserver | null>(null);
  const GRID_ROW_GAP_PX = 12; // matches the grid's gap-3 (0.75rem @ 16px root)

  const measureGridArea = useCallback((node: HTMLDivElement | null) => {
    if (gridResizeObserverRef.current) {
      gridResizeObserverRef.current.disconnect();
      gridResizeObserverRef.current = null;
    }
    if (!node) return;
    const compute = () => {
      const h = node.clientHeight;
      setRowHeightPx(h > 0 ? Math.max(0, (h - GRID_ROW_GAP_PX * 2) / 3) : null);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(node);
    gridResizeObserverRef.current = ro;
  }, []);

  useEffect(() => {
    return () => {
      gridResizeObserverRef.current?.disconnect();
    };
  }, []);

  const backendBase = getBackendBaseUrl();

  useEffect(() => {
    if (paramRole === 'Killer' || paramRole === 'Survivor') {
      setRole(paramRole);
    }
    document.title = dict?.app?.perksVaultPageTitle || 'LemonDBD - Dead by Daylight Perks Vault';
  }, [paramRole, dict]);

  const handleSelectCategoryFromSidebar = (selected: string) => {
    if (selected === 'Survivor' || selected === 'Killer') {
      setRole(selected);
      setScope('all');
    } else if (selected === 'General') {
      setScope('general');
    } else {
      setScope('all');
    }
    setPage(1);
  };

  const { prefetchPerkIcons } = useImagePrefetch();

  // Split into three independent cached reads.
  //
  // These used to be one Promise.all inside a single effect keyed on every
  // filter, so paging or re-sorting re-downloaded the whole 1000-perk list and
  // the entire character roster -- neither of which depends on page, sort,
  // search or scope. Now only the paginated query re-runs; the other two are
  // served from the module cache, including when you leave the page and return.
  const fetchPerks = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort_by: sortBy,
        order: order,
        category: role,
        lang: locale,
      });

      if (scope === 'general') {
        queryParams.append('scope', 'general');
      }
      if (search) {
        queryParams.append('search', search);
      }
      if (ownershipFilter === 'owned' && user) {
        queryParams.append('owned_only', 'true');
      }
      if (user?.id) {
        queryParams.append('user_id', user.id.toString());
      }

      const url = `${backendBase}/api/v1/perks?${queryParams.toString()}`;
      const result = await fetchCached<PerksResponse>(url, () => fetchJson(url));
      const perkList = result.data || [];
      setPerks(perkList);
      prefetchPerkIcons(perkList);
      if (result.pagination) {
        setTotalPages(result.pagination.total_pages);
        setTotalResults(result.pagination.total);
      }
    } catch (err) {
      console.error('Failed fetching perks:', err);
    } finally {
      setLoading(false);
    }
  }, [
    backendBase,
    role,
    scope,
    search,
    sortBy,
    order,
    page,
    limit,
    ownershipFilter,
    user?.id,
    locale,
    prefetchPerkIcons,
  ]);

  useEffect(() => {
    fetchPerks();
  }, [fetchPerks]);

  // Vault-wide perk list: drives the stats row and the generator handoff. Keyed
  // on locale + user only, so paging never touches it.
  const allPerksKey = `${backendBase}/api/v1/perks?limit=1000&lang=${locale}${
    user?.id ? `&user_id=${user.id}` : ''
  }`;
  const { data: allPerksResponse } = useCachedData<PerksResponse>(
    allPerksKey,
    () => fetchJson<PerksResponse>(allPerksKey)
  );

  const charactersKey = `${backendBase}/api/v1/characters?lang=${locale}`;
  const { data: charactersResponse } = useCachedData<{ data?: CharacterItem[] }>(
    charactersKey,
    () => fetchJson<{ data?: CharacterItem[] }>(charactersKey)
  );

  useEffect(() => {
    const fullList: Perk[] = allPerksResponse?.data || [];
    if (fullList.length === 0) return;
    setAllPerksForGenerator(fullList);
    prefetchPerkIcons(fullList.slice(0, 60));
    setSurvivorCount(fullList.filter((p) => p.category === 'Survivor').length);
    setKillerCount(fullList.filter((p) => p.category === 'Killer').length);
    setSurvivorOwnedCount(
      fullList.filter((p) => p.category === 'Survivor' && p.is_owned !== false).length
    );
    setKillerOwnedCount(
      fullList.filter((p) => p.category === 'Killer' && p.is_owned !== false).length
    );
    setOwnedPerksCount(fullList.filter((p) => p.is_owned !== false).length);
  }, [allPerksResponse, prefetchPerkIcons]);

  useEffect(() => {
    setCharacterCount((charactersResponse?.data || []).length);
  }, [charactersResponse]);

  const handleResetFilters = () => {
    setSearch('');
    setScope('all');
    setOwnershipFilter('all');
    setSortBy('name');
    setOrder('asc');
    setPage(1);
  };

  const handleRoleChange = (newRole: RoleCategory) => {
    setRole(newRole);
    setPage(1);
  };

  const totalVaultPerks = allPerksForStats.length || totalResults;

  return (
    <div className="h-dvh overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory="perks"
        onSelectCategory={handleSelectCategoryFromSidebar}
        onOpenQuests={() => setIsQuestsOpen(true)}
        totalPerksCount={totalVaultPerks}
        survivorCount={survivorCount}
        killerCount={killerCount}
        characterCount={characterCount}
      />

      {/* Fixed-height column: the filters bar (and, when present, the empty
          state) never scroll away -- only the perk grid/list area below
          them does, in its own contained region. That's what keeps every
          control reachable without ever having to scroll the whole page to
          find them again. */}
      <main
        className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden transition-[padding] duration-300 p-3 sm:p-4 lg:p-6 gap-3 sm:gap-4 lemon-shell-main"
      >
        <div className="shrink-0">
          <PerkFilters
            search={search}
            setSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            role={role}
            setRole={handleRoleChange}
            scope={scope}
            setScope={(s) => {
              setScope(s);
              setPage(1);
            }}
            ownershipFilter={ownershipFilter}
            setOwnershipFilter={(o) => {
              setOwnershipFilter(o);
              setPage(1);
            }}
            sortBy={sortBy}
            setSortBy={(s) => setSortBy(s)}
            order={order}
            setOrder={(o) => setOrder(o)}
            viewMode={viewMode}
            setViewMode={setViewMode}
            dict={dict}
            onReset={handleResetFilters}
            locale={locale}
            survivorCount={survivorCount}
            killerCount={killerCount}
            allCount={role === 'Survivor' ? survivorCount : killerCount}
            ownedCount={role === 'Survivor' ? survivorOwnedCount : killerOwnedCount}
          />
        </div>

        {/* The scrollable perk grid/list lives strictly between the
            filters bar above and the Pagination footer below -- Pagination
            itself is a fixed shrink-0 sibling AFTER this scroll region, not
            inside it, so it never ends up buried mid-scroll behind the
            grid once a larger page size pushes the grid past 3 rows. */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {loading ? (
            // Fixed 5x3 grid (grid-cols-5 and grid-rows-3 layout)
            <PerksGridSkeleton dict={dict} />
          ) : perks.length === 0 ? (
            <section
              aria-live="polite"
              className="my-auto rounded-3xl bg-slate-900/40 p-8 sm:p-12 text-center backdrop-blur-sm shadow-sm w-full border border-slate-800"
            >
              <Shield className="mx-auto h-12 w-12 text-slate-600 mb-3" />
              <h2 className="text-lg font-extrabold text-slate-200">
                {dict?.empty?.title || 'No Perks Found'}
              </h2>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                {dict?.empty?.subtitle ||
                  'Try clearing your search query or switching ownership filters.'}
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-500/20 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition-colors cursor-pointer shadow-sm border border-cyan-500/30"
              >
                {dict?.app?.resetFilters || dict?.filters?.resetAllFilters || 'Reset Filters'}
              </button>
            </section>
          ) : (
            <section aria-label={dict?.filters?.viewMode || 'Perks Grid'} className="flex min-h-0 flex-1 flex-col">
              <div
                ref={viewMode === 'grid' ? measureGridArea : undefined}
                className={
                  viewMode === 'list'
                    ? 'flex flex-col gap-2 w-full'
                    : 'grid min-h-0 w-full flex-1 grid-cols-5 gap-3'
                }
                style={viewMode === 'grid' && rowHeightPx ? { gridAutoRows: `${rowHeightPx}px` } : undefined}
              >
                {perks.map((perk, idx) => (
                  <PerkCard
                    key={`${perk.name}-${idx}`}
                    perk={perk}
                    viewMode={viewMode}
                    size={viewMode === 'grid' ? 'fill' : undefined}
                    onSelect={setSelectedPerk}
                    dict={dict}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {!loading && perks.length > 0 && (
          <div className="shrink-0 w-full">
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
          </div>
        )}

        {selectedPerk && (
          <PerkModal
            perk={selectedPerk}
            onClose={() => setSelectedPerk(null)}
            dict={dict}
          />
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

export default function PerksPage() {
  return (
    <Suspense
      fallback={
        <div className="h-dvh overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
          <aside aria-hidden="true" className="lemon-shell-aside hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col border-r border-slate-800 bg-[#0a0f18]/90 p-4 select-none animate-pulse" />
          <main className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden p-3 sm:p-4 lg:p-6 gap-3 sm:gap-4 lemon-shell-main">
            <PerksGridSkeleton />
          </main>
        </div>
      }
    >
      <PerksContent />
    </Suspense>
  );
}
