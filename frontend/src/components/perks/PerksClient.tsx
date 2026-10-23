'use client';
// frontend/src/components/perks/PerksClient.tsx

import { logger } from '@/utils/logger';
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { PageShellFallback } from '@/components/layout/PageShellFallback';
import { PerkFilters } from '@/components/PerkFilters';
import { PerkCard } from '@/components/PerkCard';
import { PerksGridSkeleton } from '@/components/PerksSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { Button } from '@/components/common/Button';
import type { Locale } from '@/i18n/config';
import { SearchX } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type {
  Perk,
  CharacterItem,
  RoleCategory,
  ScopeFilter,
  OwnershipFilter,
  SortField,
  SortOrder,
} from '@/types/perks';
import { useImagePrefetch } from '@/components/common/ImagePreloadProvider';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { useCachedData } from '@/hooks/useCachedData';
import { useCatalogPerks } from '@/hooks/useCatalogPerks';
import { catalogKey, fetchCached, fetchJson } from '@/services/dataCache';
import { SEARCH_DEBOUNCE_MS } from '@/constants/timing';
import { useOnValueChange } from '@/hooks/useOnValueChange';

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

  const [role, setRole] = useState<RoleCategory>(paramRole === 'Killer' ? 'Killer' : 'Survivor');
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

  useOnValueChange(paramRole, (next) => {
    if (next === 'Killer' || next === 'Survivor') setRole(next);
  });

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

  const [fetchError, setFetchError] = useState<string | null>(null);

  const perksUrl = catalogKey('perks', {
    page,
    limit,
    sort_by: sortBy,
    order,
    category: role,
    lang: locale,
    scope: scope === 'general' ? 'general' : undefined,
    // Debounced: the list refetches once typing pauses, not on every keystroke.
    search: debouncedSearch,
    owned_only: ownershipFilter === 'owned' && user ? 'true' : undefined,
    user_id: user?.id,
  });
  // The spinner shows only while there is nothing on screen yet for this request (or a retry runs).
  const [settledUrl, setSettledUrl] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const loading = retrying || (settledUrl !== perksUrl && perks.length === 0);

  /** Fetches one page of perks; only the newest request's answer is shown. */
  const requestPerks = useCallback(
    (url: string) => {
      const requestId = ++fetchSeqRef.current;
      const latest = () => requestId === fetchSeqRef.current;
      return fetchCached<PerksResponse>(url, () => fetchJson(url))
        .then(
          (result) => {
            if (!latest()) return;
            const perkList = result.data || [];
            setPerks(perkList);
            prefetchPerkIcons(perkList);
            if (result.pagination) {
              setTotalPages(result.pagination.total_pages);
              setTotalResults(result.pagination.total);
            }
            setFetchError(null);
          },
          (err: unknown) => {
            logger.error('Failed fetching perks:', err);
            if (latest()) setFetchError(err instanceof Error ? err.message : 'Failed fetching perks');
          }
        )
        .finally(() => {
          if (latest()) setSettledUrl(url);
        });
    },
    [prefetchPerkIcons]
  );

  useEffect(() => {
    void requestPerks(perksUrl);
  }, [perksUrl, requestPerks]);

  const fetchPerks = async () => {
    setRetrying(true);
    setFetchError(null);
    try {
      await requestPerks(perksUrl);
    } finally {
      setRetrying(false);
    }
  };

  // Shares its cache entry with the tier lists and the profile showcase.
  const { perks: allPerksList } = useCatalogPerks(locale);

  const charactersKey = catalogKey('characters', { lang: locale });
  const { data: charactersResponse } = useCachedData<{ data?: CharacterItem[] }>(
    charactersKey,
    () => fetchJson<{ data?: CharacterItem[] }>(charactersKey)
  );

  // The full catalog feeds the sidebar counts (derived while rendering) and warms the first icons.
  const allPerksForStats = allPerksList;
  const survivorCount = useMemo(() => allPerksList.filter((p) => p.category === 'Survivor').length, [allPerksList]);
  const killerCount = useMemo(() => allPerksList.filter((p) => p.category === 'Killer').length, [allPerksList]);
  const survivorOwnedCount = useMemo(
    () => allPerksList.filter((p) => p.category === 'Survivor' && p.is_owned !== false).length,
    [allPerksList]
  );
  const killerOwnedCount = useMemo(
    () => allPerksList.filter((p) => p.category === 'Killer' && p.is_owned !== false).length,
    [allPerksList]
  );
  const characterCount = (charactersResponse?.data || []).length;

  useEffect(() => {
    if (allPerksList.length > 0) prefetchPerkIcons(allPerksList.slice(0, 60));
  }, [allPerksList, prefetchPerkIcons]);

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
            isLoggedIn={Boolean(user)}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {fetchError && perks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 p-12 text-center my-auto">
              <p className="text-text-secondary text-base">{dict.filters.loadError}</p>
              <Button
                variant="primary"
                size="md"
                onClick={() => { void fetchPerks(); }}
              >
                {dict.modal.retry}
              </Button>
            </div>
          ) : loading ? (
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
