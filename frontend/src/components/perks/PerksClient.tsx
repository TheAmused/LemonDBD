'use client';
// frontend/src/components/perks/PerksClient.tsx
//
// The perk grid filters the full catalog in memory: the page already holds it
// (the role and owned counts come from it), so search, type filters, sorting
// and paging never wait on the network. The search understands perk types
// ("healing", "gens", "type:chase") -- see utils/perkSearch.

import React, { Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { PerkFilters } from '@/components/PerkFilters';
import { PerkCard } from '@/components/PerkCard';
import type { PerkTypeCounts } from '@/components/perks/PerkFilterPanel';
import { PerkResultsCount } from '@/components/perks/PerkResultsCount';import { PerksGridSkeleton } from '@/components/PerksSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { Button } from '@/components/common/Button';
import type { Locale } from '@/i18n/config';
import { SearchX } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type {
  Perk,
  RoleCategory,
  ScopeFilter,
  OwnershipFilter,
  SortField,
  SortOrder,
} from '@/types/perks';
import { useImagePrefetch } from '@/components/common/ImagePreloadProvider';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { useCatalogPerks } from '@/hooks/useCatalogPerks';
import { useOnValueChange } from '@/hooks/useOnValueChange';
import { usePerkTypeVocabulary } from '@/hooks/usePerkTypeVocabulary';
import { PERK_TYPES, isPerkType, perkTypesByRole, type PerkType } from '@/utils/perkTypes';
import { parsePerkQuery } from '@/utils/perkSearch/parse';
import { isGeneralPerk, roleOnlyConflict, searchPerks, typesForRole } from '@/utils/perkSearch/match';
import { sortPerks } from '@/utils/perkSearch/sort';
import { formatMessage } from '@/utils/i18nFormat';
import { roleLabel, roleOnlyMessage } from '@/components/perks/roleOnlyMessage';

const PerkModal = dynamic(() => import('@/components/PerkModal').then((m) => m.PerkModal), { ssr: false });

const DEFAULT_PERKS_PER_PAGE = 15;

/** `?type=healing,chase` -> the known types, once each. */
function parseTypeParam(value: string): PerkType[] {
  return [...new Set(value.split(',').map((t) => t.trim().toLowerCase()).filter(isPerkType))];
}

/** Mirrors the type filters into the address bar so a filtered view can be shared. */
function writeTypeParam(types: readonly PerkType[]): void {
  const params = new URLSearchParams(window.location.search);
  if (types.length > 0) params.set('type', types.join(','));
  else params.delete('type');
  const query = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
}

function PerksContent() {
  const searchParams = useSearchParams();
  const locale = useLocale() as Locale;
  const { user } = useAuth();
  const dict = useDictionary();
  const vocab = usePerkTypeVocabulary();

  const paramRole = searchParams ? searchParams.get('role') : null;
  const paramTypes = (searchParams ? searchParams.get('type') : null) ?? '';

  const [role, setRole] = useState<RoleCategory>(paramRole === 'Killer' ? 'Killer' : 'Survivor');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
  const [search, setSearch] = useState<string>('');
  const [typeParam, setTypeParam] = useState<string>(paramTypes);
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [order, setOrder] = useState<SortOrder>('asc');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(DEFAULT_PERKS_PER_PAGE);
  const [selectedPerk, setSelectedPerk] = useState<Perk | null>(null);

  const types = useMemo(() => parseTypeParam(typeParam), [typeParam]);
  // Filtering ~320 perks is instant; deferring keeps typing smooth on slow phones anyway.
  const deferredSearch = useDeferredValue(search);

  useOnValueChange(paramRole, (next) => {
    if (next === 'Killer' || next === 'Survivor') setRole(next);
  });
  useOnValueChange(paramTypes, (next) => setTypeParam(next));

  const setTypes = useCallback((next: readonly PerkType[]) => {
    setTypeParam(next.join(','));
    setPage(1);
    writeTypeParam(next);
  }, []);
  const addType = useCallback(
    (type: PerkType) => {
      if (!types.includes(type)) setTypes([...types, type]);
    },
    [types, setTypes]
  );

  // Shares its cache entry with the tier lists and the profile showcase.
  const { perks: allPerksList, loading, error, refresh } = useCatalogPerks(locale);
  const [retrying, setRetrying] = useState(false);

  const rolePerks = useMemo(() => allPerksList.filter((p) => p.category === role), [allPerksList, role]);
  const query = useMemo(() => parsePerkQuery(deferredSearch, vocab), [deferredSearch, vocab]);
  const ownedOnly = ownershipFilter === 'owned' && Boolean(user);

  const scopedPerks = useMemo(
    () => rolePerks.filter((p) => (scope !== 'general' || isGeneralPerk(p)) && (!ownedOnly || p.is_owned !== false)),
    [rolePerks, scope, ownedOnly]
  );
  const sortedPerks = useMemo(() => {
    const matched = searchPerks(scopedPerks, query, types).map((hit) => hit.perk);
    return sortPerks(matched, sortBy, order, locale);
  }, [scopedPerks, query, types, sortBy, order, locale]);
  // Per type: how many perks stay if it is added to the current search and filters (types combine with AND).
  const typeCounts = useMemo(() => {
    const counts: PerkTypeCounts = {};
    for (const type of PERK_TYPES) {
      counts[type] = searchPerks(scopedPerks, query, types.includes(type) ? types : [...types, type]).length;
    }
    return counts;
  }, [scopedPerks, query, types]);

  const totalResults = sortedPerks.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / limit));
  const currentPage = Math.min(page, totalPages);
  const perks = useMemo(
    () => sortedPerks.slice((currentPage - 1) * limit, currentPage * limit),
    [sortedPerks, currentPage, limit]
  );

  const typesByRole = useMemo(() => perkTypesByRole(allPerksList), [allPerksList]);
  const conflict = totalResults === 0 ? roleOnlyConflict(query, types, role, typesByRole) : null;

  const [rowHeightPx, setRowHeightPx] = useState<number | null>(null);
  const gridResizeObserverRef = useRef<ResizeObserver | null>(null);
  const gridNodeRef = useRef<HTMLDivElement | null>(null);
  // Rows are sized for a full page, so a short page (a search, the last page) keeps the same tiles and sits at the top.
  const pageSizeRef = useRef<number>(DEFAULT_PERKS_PER_PAGE);
  const GRID_ROW_GAP_PX = 12;
  const MIN_ROW_HEIGHT_PX = 120;
  const MAX_ROW_ASPECT = 2.2;

  const computeGridMetrics = useCallback((node: HTMLDivElement) => {
    const cs = getComputedStyle(node);
    const colCount = Math.max(1, cs.gridTemplateColumns.split(' ').filter(Boolean).length);
    const count = Math.max(1, pageSizeRef.current);
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
    pageSizeRef.current = limit;
    if (gridNodeRef.current) {
      computeGridMetrics(gridNodeRef.current);
    }
  }, [limit, computeGridMetrics]);

  useEffect(() => {
    return () => {
      gridResizeObserverRef.current?.disconnect();
    };
  }, []);

  const { prefetchPerkIcons } = useImagePrefetch();

  useEffect(() => {
    prefetchPerkIcons(perks);
  }, [perks, prefetchPerkIcons]);

  useEffect(() => {
    if (allPerksList.length > 0) prefetchPerkIcons(allPerksList.slice(0, 60));
  }, [allPerksList, prefetchPerkIcons]);

  const fetchPerks = async () => {
    setRetrying(true);
    try {
      await refresh();
    } finally {
      setRetrying(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setScope('all');
    setOwnershipFilter('all');
    setSortBy('name');
    setOrder('asc');
    setTypes([]);
    setPage(1);
  };

  // A manual role switch drops the active types the new role has none of (a link with ?role=&type= keeps them: the empty state explains).
  const handleRoleChange = (newRole: RoleCategory) => {
    setRole(newRole);
    setTypes(typesForRole(types, newRole, typesByRole));
    setPage(1);
  };

  const fetchError = Boolean(error) && allPerksList.length === 0;

  return (
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
          sortBy={sortBy}
          setSortBy={(s) => setSortBy(s)}
          order={order}
          setOrder={(o) => setOrder(o)}
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
          rolePerks={rolePerks}
          activeTypes={types}
          onTypesChange={setTypes}
          typeCounts={typeCounts}
          isLoggedIn={Boolean(user)}
        />
      </div>

      {!loading && !retrying && perks.length > 0 && (
        <PerkResultsCount page={currentPage} limit={limit} totalResults={totalResults} />
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {fetchError ? (
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
        ) : loading || retrying ? (
          <PerksGridSkeleton />
        ) : perks.length === 0 && conflict ? (
          <EmptyState
            variant="solid"
            icon={SearchX}
            iconClassName="mx-auto h-12 w-12 text-text-muted mb-3"
            title={roleOnlyMessage(conflict, dict, locale)}
            action={{
              label: formatMessage(dict.perkTypes.switchRole, { role: roleLabel(conflict.role, dict) }, locale),
              onClick: () => handleRoleChange(conflict.role),
            }}
          />
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
                  showName
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
            variant="numbered"
            page={currentPage}
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
          activeTypes={types}
          onSelectType={(type) => {
            addType(type);
            setSelectedPerk(null);
          }}
        />
      )}
    </div>
  );
}

export function PerksClient() {
  return (
    <Suspense fallback={<PerksGridSkeleton />}>
      <PerksContent />
    </Suspense>
  );
}
