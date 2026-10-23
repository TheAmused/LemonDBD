'use client';
// frontend/src/components/PerkFilters.tsx

import { logger } from '@/utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import {
  SlidersHorizontal,
  X,
  ArrowUpAZ,
  ArrowDownZA,
} from 'lucide-react';
import type { SegmentedControlOption } from '@/components/common/SegmentedControl';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { CustomDropdown } from '@/components/common/CustomDropdown';
import type {
  RoleCategory,
  ScopeFilter,
  OwnershipFilter,
  SortField,
  SortOrder,
  PerkSuggestion,
} from '@/types/perks';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';
import { Checkbox } from '@/components/common/Checkbox';
import { Button } from '@/components/common/Button';
import { useDictionary } from "@/context/DictionaryContext";
import { Surface } from '@/components/common/Surface';
import { SearchInput } from '@/components/common/Field';
import { Badge } from '@/components/common/Badge';
import { MenuItem } from '@/components/common/MenuItem';

const NO_SUGGESTIONS: PerkSuggestion[] = [];

/** The icon beside a filter label: grows with the screen. */
const FILTER_ICON = 'h-3 w-3 sm:h-3.5 sm:w-3.5 wide:h-4 wide:w-4 wide-2k:h-5 wide-2k:w-5';
/** The count inside a coloured filter button. */
const COUNT_BADGE = 'px-1 sm:px-1.5 wide:px-2 sm:text-tiny wide:text-xs leading-none';

export function computeHasActiveFilters(state: {
  search: string;
  scope: ScopeFilter;
  ownershipFilter: OwnershipFilter;
  sortBy: SortField;
  order: SortOrder;
}): boolean {
  return (
    state.search !== '' ||
    state.scope !== 'all' ||
    state.ownershipFilter !== 'all' ||
    state.sortBy !== 'name' ||
    state.order !== 'asc'
  );
}

interface PerkFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  role: RoleCategory;
  setRole: (role: RoleCategory) => void;
  scope: ScopeFilter;
  setScope: (scope: ScopeFilter) => void;
  ownershipFilter: OwnershipFilter;
  setOwnershipFilter: (filter: OwnershipFilter) => void;
  sortBy: SortField;
  setSortBy: (val: SortField) => void;
  order: SortOrder;
  setOrder: (val: SortOrder) => void;
  onReset: () => void;
  locale?: string;
  survivorCount?: number;
  killerCount?: number;
  allCount?: number;
  ownedCount?: number;
  isLoggedIn?: boolean;
}

export const PerkFilters: React.FC<PerkFiltersProps> = ({
      search,
      setSearch,
      role,
      setRole,
      scope,
      setScope,
      ownershipFilter,
      setOwnershipFilter,
      sortBy,
      setSortBy,
      order,
      setOrder,
      locale,
      survivorCount,
      killerCount,
      allCount,
      ownedCount,
      isLoggedIn,
    }) => {
  const dict = useDictionary();
  const backendBase = getBackendBaseUrl();

  const [fetchedSuggestions, setPerkSuggestions] = useState<PerkSuggestion[]>([]);
  // An empty search box suggests nothing; otherwise the last answer stays until the next arrives.
  const perkSuggestions = search && search.trim().length > 0 ? fetchedSuggestions : NO_SUGGESTIONS;
  const [isPerkSuggestionsOpen, setIsPerkSuggestionsOpen] = useState<boolean>(false);
  const searchDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(target)) {
        setIsPerkSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!search || search.trim().length < 1) return;
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    const fetchSuggestions = async () => {
      try {
        const res = await fetch(
          `${backendBase}/api/v1/perks/suggestions?q=${encodeURIComponent(
            search
          )}&category=${role}&limit=8&lang=${encodeURIComponent(locale || 'en')}`,
          { signal }
        );
        if (res.ok) {
          const json = await res.json();
          setPerkSuggestions(json.data || []);
        }
      } catch (err: unknown) {
        if (!(err instanceof Error && err.name === 'AbortError')) {
          logger.error('Failed fetching perk suggestions:', err);
        }
      }
    };
    const timer = setTimeout(() => {
      void fetchSuggestions();
    }, 180);
    return () => {
      clearTimeout(timer);
      abortControllerRef.current?.abort();
    };
  }, [search, role, backendBase, locale]);

  const roleOptions: readonly [SegmentedControlOption<RoleCategory>, SegmentedControlOption<RoleCategory>] = [
    {
      value: 'Survivor',
      icon: <SurvivorIcon className={FILTER_ICON} />,
      activeClassName: 'bg-accent-green text-text-inverted',
      label: (
        <span className="inline-flex items-center gap-1.5">
          {dict.filters.survivor && <span>{dict.filters.survivor}</span>}
          {typeof survivorCount === 'number' && (
            <Badge tone="onAccent" size="xs" plain className={COUNT_BADGE}>
              {survivorCount}
            </Badge>
          )}
        </span>
      ),
    },
    {
      value: 'Killer',
      icon: <KillerIcon className={FILTER_ICON} />,
      activeClassName: 'bg-accent-red text-text-inverted',
      label: (
        <span className="inline-flex items-center gap-1.5">
          {dict.filters.killer && <span>{dict.filters.killer}</span>}
          {typeof killerCount === 'number' && (
            <Badge tone="onAccent" size="xs" plain className={COUNT_BADGE}>
              {killerCount}
            </Badge>
          )}
        </span>
      ),
    },
  ];

  const ownershipOptions: readonly [SegmentedControlOption<OwnershipFilter>, SegmentedControlOption<OwnershipFilter>] = [
    {
      value: 'all',
      activeClassName: 'bg-accent-red text-text-inverted',
      label: (
        <span className="inline-flex items-center gap-1.5">
          {dict.filters.allPerks && <span>{dict.filters.allPerks}</span>}
          {typeof allCount === 'number' && (
            <Badge tone="onAccent" size="xs" plain className={COUNT_BADGE}>
              {allCount}
            </Badge>
          )}
        </span>
      ),
    },
    {
      value: 'owned',
      disabled: !isLoggedIn,
      activeClassName: 'bg-accent-red text-text-inverted',
      label: (
        <span className="inline-flex items-center gap-1.5">
          {dict.filters.ownedOnly && <span>{dict.filters.ownedOnly}</span>}
          {typeof ownedCount === 'number' && (
            <Badge tone="onAccent" size="xs" plain className={COUNT_BADGE}>
              {ownedCount}
            </Badge>
          )}
        </span>
      ),
    },
  ];

  const sortFieldOptions: readonly [SegmentedControlOption<SortField>, SegmentedControlOption<SortField>] = [
    {
      value: 'name',
      label: dict.filters.sortByName,
      activeClassName: 'bg-accent-red text-text-inverted',
    },
    {
      value: 'character',
      label: dict.filters.sortByCharacter,
      activeClassName: 'bg-accent-red text-text-inverted',
    },
  ];

  const sortOrderOptions: readonly [SegmentedControlOption<SortOrder>, SegmentedControlOption<SortOrder>] = [
    {
      value: 'asc',
      icon: <ArrowUpAZ className={FILTER_ICON} />,
      label: dict.filters.orderAsc,
      activeClassName: 'bg-accent-red text-text-inverted',
    },
    {
      value: 'desc',
      icon: <ArrowDownZA className={FILTER_ICON} />,
      label: dict.filters.orderDesc,
      activeClassName: 'bg-accent-red text-text-inverted',
    },
  ];

  // Shared between the desktop inline row and the mobile Settings panel --
  // same controls, same state, just two separate SegmentedControl elements
  // (safe: no ids, no per-instance state) rendered in whichever one is
  // actually visible at the current width.
  const generalOnlyLabel = (
    <Checkbox
      checked={scope === 'general'}
      onChange={(checked) => setScope(checked ? 'general' : 'all')}
      ariaLabel={dict.filters.generalOnly}
      className="w-full shrink-0 gap-1.5 whitespace-nowrap rounded-control border border-border-color bg-bg-elevated/60 px-3 py-2 text-mini font-extrabold text-text-secondary shadow-inner sm:w-auto sm:gap-2 sm:px-3.5 sm:text-xs lg:py-2.5 wide:gap-2.5 wide:px-5 wide:py-3 wide:text-sm"
      boxClassName="h-3.5 w-3.5 wide:h-4 wide:w-4"
    >
      {dict.filters.generalOnly && <span>{dict.filters.generalOnly}</span>}
    </Checkbox>
  );

  return (
    <Surface
      aria-label={dict.filters.filtersTitle}
      as="section" padding="none" className="relative z-30 flex w-full flex-col gap-2 bg-bg-surface/90 p-2 shadow-xs sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:p-4 wide:gap-4 wide:p-6 wide-2k:p-7 backdrop-blur-xl transition-colors"
    >
      {/* Below sm (640px) there simply isn't room to show five controls
          plus search without either hiding some behind a scrollbar or
          shrinking everything into illegibility -- both were tried and
          both still read as broken. Below sm, every toggle instead lives
          inside one "Filters" dropdown, stacked vertically and always
          fully legible; only that trigger and the search bar sit in the
          page itself. At sm+ this whole block is hidden and the original
          inline row (below) takes over, unchanged. */}
      <div className="w-full sm:hidden">
        <CustomDropdown
          className="w-full"
          ariaLabel={dict.filters.filtersTitle}
          label={dict.filters.filtersTitle}
          icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
          buttonClassName="w-full justify-between border-border-color bg-bg-surface px-3 py-2.5 text-xs"
          menuClassName="w-full"
          minWidthClass=""
        >
          <div className="flex flex-col gap-2 p-1">
            <SegmentedControl
              className="w-full"
              ariaLabel={dict.filters.sortByRole}
              value={role}
              onChange={setRole}
              options={roleOptions}
            />
            <SegmentedControl
              className="w-full"
              ariaLabel={dict.filters.ownershipFilter}
              value={ownershipFilter}
              onChange={setOwnershipFilter}
              options={ownershipOptions}
            />
            {generalOnlyLabel}
            <SegmentedControl
              className="w-full"
              ariaLabel={dict.filters.sortFields}
              value={sortBy}
              onChange={setSortBy}
              options={sortFieldOptions}
              size="sm"
            />
            <SegmentedControl
              className="w-full"
              ariaLabel={dict.filters.sortOrderLabel}
              value={order}
              onChange={setOrder}
              options={sortOrderOptions}
              size="sm"
            />
          </div>
        </CustomDropdown>
      </div>

      <div className="hidden sm:contents">
        <SegmentedControl
          ariaLabel={dict.filters.sortByRole}
          value={role}
          onChange={setRole}
          options={roleOptions}
        />

        <SegmentedControl
          ariaLabel={dict.filters.ownershipFilter}
          value={ownershipFilter}
          onChange={setOwnershipFilter}
          options={ownershipOptions}
        />

        {generalOnlyLabel}

        <SegmentedControl
          ariaLabel={dict.filters.sortFields}
          value={sortBy}
          onChange={setSortBy}
          options={sortFieldOptions}
          size="sm"
        />

        <SegmentedControl
          ariaLabel={dict.filters.sortOrderLabel}
          value={order}
          onChange={setOrder}
          options={sortOrderOptions}
          size="sm"
        />
      </div>

      <div ref={searchDropdownRef} className="relative z-40 w-full sm:ml-auto sm:w-64 xl:w-40 2xl:w-48 wide:w-64 wide-2k:w-72">
        <SearchInput
          pill
          fieldSize="sm"
          value={search}
          onFocus={() => setIsPerkSuggestionsOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsPerkSuggestionsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsPerkSuggestionsOpen(false);
            }
          }}
          placeholder={dict.filters.searchPlaceholder}
          aria-label={dict.filters.searchPlaceholder}
          className="bg-bg-elevated/60 pr-8 font-medium sm:py-2.5 sm:pr-9 lg:py-3 lg:text-sm wide:py-3.5"
        />
        {search && (
          <Button
            icon
            size="xs"
            variant="ghost"
            onClick={() => {
              setSearch('');
              setIsPerkSuggestionsOpen(false);
            }}
            aria-label={dict.filters.clearSearch}
            pill
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
          >
            <X className="h-3 w-3" />
          </Button>
        )}

        {isPerkSuggestionsOpen && perkSuggestions.length > 0 && (
          // Suggestions are ordinary buttons under the search box (Tab reaches them), not a listbox.
          <Surface
            padding="none" className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto shadow-2xl z-50 p-1.5 flex flex-col gap-1"
          >
            {perkSuggestions.map((item, idx) => (
              <MenuItem className="justify-between"
                key={`${item.name}-${idx}`}
                onClick={() => {
                  setSearch(item.name);
                  setIsPerkSuggestionsOpen(false);
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex flex-col min-w-0">
                    <span className="type-strong text-text-primary truncate">
                      {item.name}
                    </span>
                    {item.alternate_name && (
                      <span className="type-strong-2xs text-accent-amber truncate">
                        {dict.filters.aliasLabel && `${dict.filters.aliasLabel} `}
                        {item.alternate_name}
                      </span>
                    )}
                  </div>
                </div>
                <span className="type-strong-2xs text-text-muted shrink-0">
                  {item.character || dict.modal.generalPerk}
                </span>
              </MenuItem>
            ))}
          </Surface>
        )}
      </div>
    </Surface>
  );
};
