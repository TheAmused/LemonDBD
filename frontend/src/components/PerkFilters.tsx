'use client';
// frontend/src/components/PerkFilters.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  ArrowUpAZ,
  ArrowDownZA,
} from 'lucide-react';
import { SegmentedControl, SegmentedControlOption } from '@/components/common/SegmentedControl';
import { CustomDropdown } from '@/components/common/CustomDropdown';
import {
  RoleCategory,
  ScopeFilter,
  OwnershipFilter,
  SortField,
  SortOrder,
  PerkSuggestion,
  PerkDictionary,
} from '@/types/perks';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';
import { Checkbox } from '@/components/common/Checkbox';
import { Button } from '@/components/common/Button';
import { useDictionary } from "@/context/DictionaryContext";

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
      onReset,
      locale,
      survivorCount,
      killerCount,
      allCount,
      ownedCount,
    }) => {
  const dict = useDictionary();
  const backendBase = getBackendBaseUrl();

  const [perkSuggestions, setPerkSuggestions] = useState<PerkSuggestion[]>([]);
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

  useEffect(() => {
    if (!search || search.trim().length < 1) {
      setPerkSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${backendBase}/api/v1/perks/suggestions?q=${encodeURIComponent(
            search
          )}&category=${role}&limit=8&lang=${encodeURIComponent(locale || 'en')}`
        );
        if (res.ok) {
          const json = await res.json();
          setPerkSuggestions(json.data || []);
        }
      } catch (err) {
        console.error('Failed fetching perk suggestions:', err);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [search, role, backendBase, locale]);

  const roleOptions: readonly [SegmentedControlOption<RoleCategory>, SegmentedControlOption<RoleCategory>] = [
    {
      value: 'Survivor',
      icon: <SurvivorIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 wide:h-4 wide:w-4 wide-2k:h-5 wide-2k:w-5" />,
      activeClassName: 'bg-accent-green text-text-inverted',
      label: (
        <span className="inline-flex items-center gap-1.5">
          {dict.filters.survivor && <span>{dict.filters.survivor}</span>}
          {typeof survivorCount === 'number' && (
            <span className="rounded-full bg-text-inverted/20 px-1 py-0.5 text-micro sm:px-1.5 sm:text-tiny wide:px-2 wide:text-xs font-black leading-none">
              {survivorCount}
            </span>
          )}
        </span>
      ),
    },
    {
      value: 'Killer',
      icon: <KillerIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 wide:h-4 wide:w-4 wide-2k:h-5 wide-2k:w-5" />,
      activeClassName: 'bg-accent-red text-text-inverted',
      label: (
        <span className="inline-flex items-center gap-1.5">
          {dict.filters.killer && <span>{dict.filters.killer}</span>}
          {typeof killerCount === 'number' && (
            <span className="rounded-full bg-text-inverted/20 px-1 py-0.5 text-micro sm:px-1.5 sm:text-tiny wide:px-2 wide:text-xs font-black leading-none">
              {killerCount}
            </span>
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
            <span className="rounded-full bg-text-inverted/20 px-1 py-0.5 text-micro sm:px-1.5 sm:text-tiny wide:px-2 wide:text-xs font-black leading-none">
              {allCount}
            </span>
          )}
        </span>
      ),
    },
    {
      value: 'owned',
      activeClassName: 'bg-accent-red text-text-inverted',
      label: (
        <span className="inline-flex items-center gap-1.5">
          {dict.filters.ownedOnly && <span>{dict.filters.ownedOnly}</span>}
          {typeof ownedCount === 'number' && (
            <span className="rounded-full bg-text-inverted/20 px-1 py-0.5 text-micro sm:px-1.5 sm:text-tiny wide:px-2 wide:text-xs font-black leading-none">
              {ownedCount}
            </span>
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
      icon: <ArrowUpAZ className="h-3 w-3 sm:h-3.5 sm:w-3.5 wide:h-4 wide:w-4 wide-2k:h-5 wide-2k:w-5" />,
      label: dict.filters.orderAsc,
      activeClassName: 'bg-accent-red text-text-inverted',
    },
    {
      value: 'desc',
      icon: <ArrowDownZA className="h-3 w-3 sm:h-3.5 sm:w-3.5 wide:h-4 wide:w-4 wide-2k:h-5 wide-2k:w-5" />,
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
      className="w-full shrink-0 gap-1.5 whitespace-nowrap rounded-full border border-border-color bg-bg-elevated/60 px-3 py-2 text-mini font-extrabold text-text-secondary shadow-inner sm:w-auto sm:gap-2 sm:px-3.5 sm:text-xs lg:py-2.5 wide:gap-2.5 wide:px-5 wide:py-3 wide:text-sm"
      boxClassName="h-3.5 w-3.5 wide:h-4 wide:w-4"
    >
      {dict.filters.generalOnly && <span>{dict.filters.generalOnly}</span>}
    </Checkbox>
  );

  return (
    <section
      aria-label={dict.filters.filtersTitle}
      className="relative z-30 flex w-full flex-col gap-2 rounded-2xl border border-border-color bg-bg-surface/90 p-2 shadow-xs sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:rounded-3xl sm:p-4 wide:gap-4 wide:p-6 wide-2k:p-7 backdrop-blur-xl transition-colors"
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
          buttonClassName="w-full justify-between rounded-2xl border-border-color bg-bg-surface px-3 py-2.5 text-xs"
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
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted sm:left-3.5 sm:h-4 sm:w-4 wide:h-5 wide:w-5" />
        <input
          type="text"
          value={search}
          onFocus={() => setIsPerkSuggestionsOpen(true)}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsPerkSuggestionsOpen(true);
          }}
          placeholder={dict.filters.searchPlaceholder}
          aria-label={dict.filters.searchPlaceholder}
          className="w-full rounded-full border border-border-color bg-bg-elevated/60 py-2 pl-9 pr-8 text-mini sm:py-2.5 sm:pl-10 sm:pr-9 sm:text-xs lg:py-3 lg:text-sm wide:py-3.5 font-medium text-text-primary placeholder:text-text-muted focus:border-accent-red focus:bg-bg-surface focus:outline-none focus:ring-2 focus:ring-accent-red/20 transition-all"
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
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full"
          >
            <X className="h-3 w-3" />
          </Button>
        )}

        {isPerkSuggestionsOpen && perkSuggestions.length > 0 && (
          <div
            role="listbox"
            className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-border-color bg-bg-surface shadow-2xl z-50 p-1.5 flex flex-col gap-1"
          >
            {perkSuggestions.map((item, idx) => (
              <button
                key={`${item.name}-${idx}`}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  setSearch(item.name);
                  setIsPerkSuggestionsOpen(false);
                }}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-bg-elevated cursor-pointer transition-colors text-left w-full"
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
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
