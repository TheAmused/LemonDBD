'use client';
// frontend/src/components/perks/PerksClient.tsx

import React, { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { PageShellFallback } from '@/components/layout/PageShellFallback';
import { PerkFilters } from '@/components/PerkFilters';
import { PerkCard } from '@/components/PerkCard';
import { PerksGridSkeleton } from '@/components/PerksSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { Locale } from '@/i18n/config';
import { SearchX } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  Perk,
  CharacterItem,
  RoleCategory,
  ScopeFilter,
  OwnershipFilter,
  SortField,
  SortOrder,
} from '@/types/perks';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { useImagePrefetch } from '@/components/common/ImagePreloadProvider';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { useCachedData } from '@/hooks/useCachedData';
import { fetchCached, fetchJson } from '@/services/dataCache';
import { SEARCH_DEBOUNCE_MS } from '@/constants/timing';

const PerkModal = dynamic(() => import('@/components/PerkModal').then((m) => m.PerkModal), { ssr: false });

interface PerksResponse {
  data?: Perk[];
  pagination?: { total_pages: number; total: number };
}

const DEFAULT_PERKS_PER_PAGE = 15;

function PerksContent() {
  const searchParams = useSearchParams();
  const locale = useLocale() as Locale;
  const { user } = useAuth();

  const paramRole = searchParams ? searchParams.get('role') : null;

  const dict = useDictionary();
  const [perks, setPerks] = useState<Perk[]>([]);
  const [allPerksForStats, setAllPerksForGenerator] = useState<Perk[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [role, setRole] = useState<RoleCategory>('Survivor');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [order, setOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

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

  const [selectedPerk, setSelectedPerk] = useState<Perk | null>(null);

  const [rowHeightPx, setRowHeightPx] = useState<number | null>(null);
  const gridResizeObserverRef = useRef<ResizeObserver | null>(null);
  const gridNodeRef = useRef<HTMLDivElement | null>(null);
  const perksCountRef = useRef<number>(0);
  const GRID_ROW_GAP_PX = 12;
  const MIN_ROW_HEIGHT_PX = 90;
  const MAX_ROW_ASPECT = 2.2;

  const computeGridMetrics = useCallback((node: HTMLDivElement) => {
    const cs = getComputedStyle(node);
    const colCount = Math.max(1, cs.gridTemplateColumns.split(' ').filter(Boolean).length);
    const count = Math.max(1, perksCountRef.current);
    const rows = Math.max(1, Math.ceil(count / colCount));

    const colWidthPx = (node.clientWidth - GRID_ROW_GAP_PX * (colCount - 1)) / colCount;
    const maxRowFromWidth = colWidthPx > 0 ? colWidthPx * MAX_ROW_ASPECT : null;

    const h = node.clientHeight;
    const heightBasedRow = h > 0 ? Math.max(0, (h - GRID_ROW_GAP_PX * (rows - 1)) / rows) : null;

    const upperBound = maxRowFromWidth ?? Infinity;
    const base = heightBasedRow ?? upperBound;
    const clamped = Math.min(Math.max(base, MIN_ROW_HEIGHT_PX), upperBound);
    setRowHeightPx(Number.isFinite(clamped) && clamped > 0 ? clamped : null);
  }, []);

  const measureGridArea = useCallback((node: HTMLDivElement | null) => {
    if (gridResizeObserverRef.current) {
      gridResizeObserverRef.current.disconnect();
      gridResizeObserverRef.current = null;
    }
    gridNodeRef.current = node;
    if (!node) return;
    computeGridMetrics(node);
    const ro = new ResizeObserver(() => computeGridMetrics(node));
    ro.observe(node);
    gridResizeObserverRef.current = ro;
  }, [computeGridMetrics]);

  useEffect(() => {
    perksCountRef.current = perks.length;
    if (gridNodeRef.current) {
      computeGridMetrics(gridNodeRef.current);
    }
  }, [perks.length, computeGridMetrics]);

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
    document.title = dict.app.perksVaultPageTitle;
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
  const fetchSeqRef = useRef(0);

  const fetchPerks = useCallback(async () => {
    const requestId = ++fetchSeqRef.current;
    if (perks.length === 0) {
      setLoading(true);
    }
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
      if (debouncedSearch) {
        queryParams.append('search', debouncedSearch);
      }
      if (ownershipFilter === 'owned' && user) {
        queryParams.append('owned_only', 'true');
      }

      const url = `${backendBase}/api/v1/perks?${queryParams.toString()}`;
      const result = await fetchCached<PerksResponse>(url, () => fetchJson(url));
      if (requestId !== fetchSeqRef.current) return;
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
      if (requestId === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  }, [
    backendBase,
    role,
    scope,
    debouncedSearch,
    sortBy,
    order,
    page,
    limit,
    ownershipFilter,
    user,
    locale,
    prefetchPerkIcons,
    perks.length,
  ]);

  useEffect(() => {
    fetchPerks();
  }, [fetchPerks]);

  const allPerksKey = `${backendBase}/api/v1/perks?limit=1000&lang=${locale}`;
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
    <PageShell
      locale={locale}
      activeCategory="perks"
      onSelectCategory={handleSelectCategoryFromSidebar}
      totalPerksCount={totalVaultPerks}
      survivorCount={survivorCount}
      killerCount={killerCount}
      characterCount={characterCount}
      padding="tight"
      outerClassName="h-dvh overflow-hidden text-text-primary flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300"
      mainClassName="relative flex h-full min-h-0 flex-col overflow-hidden gap-3 sm:gap-4"
    >
      <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden gap-3 sm:gap-4">
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
            onReset={handleResetFilters}
            locale={locale}
            survivorCount={survivorCount}
            killerCount={killerCount}
            allCount={role === 'Survivor' ? survivorCount : killerCount}
            ownedCount={role === 'Survivor' ? survivorOwnedCount : killerOwnedCount}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {loading ? (
            <PerksGridSkeleton />
          ) : perks.length === 0 ? (
            <EmptyState
              variant="solid"
              icon={SearchX}
              iconClassName="mx-auto h-12 w-12 text-text-muted mb-3"
              title={dict.empty.title}
              subtitle={dict.empty.subtitle}
              action={{
                label: dict.app.resetFilters,
                onClick: handleResetFilters,
              }}
            />
          ) : (
            <section aria-label={dict.filters.viewMode} className="flex min-h-0 flex-1 flex-col">
              <div
                ref={measureGridArea}
                className="grid min-h-0 w-full flex-1 grid-cols-3 phone-lg:grid-cols-4 sm:grid-cols-5 gap-3"
                style={rowHeightPx ? { gridAutoRows: `${rowHeightPx}px` } : undefined}
              >
                {perks.map((perk, idx) => (
                  <PerkCard
                    key={`${perk.name}-${idx}`}
                    perk={perk}
                    size="fill"
                    onSelect={setSelectedPerk}
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
            />
          </div>
        )}

        {selectedPerk && (
          <PerkModal
            perk={selectedPerk}
            onClose={() => setSelectedPerk(null)}
          />
        )}
      </div>
    </PageShell>
  );
}

export function PerksClient() {
  return (
    <Suspense
      fallback={
        <PageShellFallback
          outerClassName="h-dvh overflow-hidden text-text-primary flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300"
          padding="tight"
          mainClassName="flex h-full min-h-0 flex-col overflow-hidden gap-3 sm:gap-4"
          skeleton={<PerksGridSkeleton />}
        />
      }
    >
      <PerksContent />
    </Suspense>
  );
}
