'use client';
// frontend/src/components/PerkFilters.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  Shield,
  Skull,
  Sparkles,
  X,
  ArrowUpAZ,
  ArrowDownZA,
} from 'lucide-react';
import { ToggleSwitch, ToggleSwitchOption } from '@/components/common/ToggleSwitch';
import {
  RoleCategory,
  ScopeFilter,
  OwnershipFilter,
  SortField,
  SortOrder,
  ViewDisplayMode,
  PerkSuggestion,
  PerkDictionary,
} from '@/types/perks';
import { getBackendBaseUrl } from '@/utils/perkUtils';

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
  viewMode: ViewDisplayMode;
  setViewMode: (val: ViewDisplayMode) => void;
  dict?: PerkDictionary;
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
  viewMode,
  setViewMode,
  dict,
  onReset,
  locale,
  survivorCount,
  killerCount,
  allCount,
  ownedCount,
}) => {
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

  const roleOptions: readonly [ToggleSwitchOption<RoleCategory>, ToggleSwitchOption<RoleCategory>] = [
    {
      value: 'Survivor',
      icon: <Shield className="h-3.5 w-3.5" />,
      activeClassName: 'bg-emerald-600 text-text-inverted',
      label: (
        <span className="inline-flex items-center gap-1.5">
          {dict?.filters?.survivor && <span>{dict.filters.survivor}</span>}
          {typeof survivorCount === 'number' && (
            <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] font-black leading-none">
              {survivorCount}
            </span>
          )}
        </span>
      ),
    },
    {
      value: 'Killer',
      icon: <Skull className="h-3.5 w-3.5" />,
      activeClassName: 'bg-accent-red text-text-inverted',
      label: (
        <span className="inline-flex items-center gap-1.5">
          {dict?.filters?.killer && <span>{dict.filters.killer}</span>}
          {typeof killerCount === 'number' && (
            <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] font-black leading-none">
              {killerCount}
            </span>
          )}
        </span>
      ),
    },
  ];

  const ownershipOptions: readonly [ToggleSwitchOption<OwnershipFilter>, ToggleSwitchOption<OwnershipFilter>] = [
    {
      value: 'all',
      activeClassName: 'bg-accent-amber text-text-inverted',
      label: (
        <span className="inline-flex items-center gap-1.5">
          {dict?.filters?.allPerks && <span>{dict.filters.allPerks}</span>}
          {typeof allCount === 'number' && (
            <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] font-black leading-none">
              {allCount}
            </span>
          )}
        </span>
      ),
    },
    {
      value: 'owned',
      activeClassName: 'bg-accent-amber text-text-inverted',
      label: (
        <span className="inline-flex items-center gap-1.5">
          {dict?.filters?.ownedOnly && <span>{dict.filters.ownedOnly}</span>}
          {typeof ownedCount === 'number' && (
            <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] font-black leading-none">
              {ownedCount}
            </span>
          )}
        </span>
      ),
    },
  ];

  const sortFieldOptions: readonly [ToggleSwitchOption<SortField>, ToggleSwitchOption<SortField>] = [
    {
      value: 'name',
      label: dict?.filters?.sortByName,
      activeClassName: 'bg-accent-amber text-text-inverted',
    },
    {
      value: 'character',
      label: dict?.filters?.sortByCharacter,
      activeClassName: 'bg-accent-amber text-text-inverted',
    },
  ];

  const sortOrderOptions: readonly [ToggleSwitchOption<SortOrder>, ToggleSwitchOption<SortOrder>] = [
    {
      value: 'asc',
      icon: <ArrowUpAZ className="h-3.5 w-3.5" />,
      label: dict?.filters?.orderAsc,
      activeClassName: 'bg-accent-amber text-text-inverted',
    },
    {
      value: 'desc',
      icon: <ArrowDownZA className="h-3.5 w-3.5" />,
      label: dict?.filters?.orderDesc,
      activeClassName: 'bg-accent-amber text-text-inverted',
    },
  ];

  return (
    <section
      aria-label={dict?.filters?.filtersTitle}
      className="relative z-30 flex w-full items-center gap-3 rounded-3xl border border-border-color bg-bg-surface/90 p-3 shadow-xs sm:p-4 backdrop-blur-xl transition-colors"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-0.5 sm:gap-2.5 [scrollbar-width:thin]">
        <ToggleSwitch
          ariaLabel={dict?.filters?.sortByRole || ''}
          value={role}
          onChange={setRole}
          options={roleOptions}
        />

        <ToggleSwitch
          ariaLabel={dict?.filters?.ownershipFilter || ''}
          value={ownershipFilter}
          onChange={setOwnershipFilter}
          options={ownershipOptions}
        />

        <label className="inline-flex shrink-0 cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-full border border-border-color bg-bg-elevated/60 px-3.5 py-2 text-xs font-extrabold text-text-secondary shadow-inner">
          <input
            type="checkbox"
            checked={scope === 'general'}
            onChange={(e) => setScope(e.target.checked ? 'general' : 'all')}
            className="h-3.5 w-3.5 shrink-0 rounded border-border-color accent-accent-amber"
          />
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent-amber" />
          {dict?.filters?.generalOnly && <span>{dict.filters.generalOnly}</span>}
        </label>

        <ToggleSwitch
          ariaLabel={dict?.filters?.sortFields || ''}
          value={sortBy}
          onChange={setSortBy}
          options={sortFieldOptions}
          size="sm"
        />

        <ToggleSwitch
          ariaLabel={dict?.filters?.sortOrderLabel || ''}
          value={order}
          onChange={setOrder}
          options={sortOrderOptions}
          size="sm"
        />
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <div ref={searchDropdownRef} className="relative z-40 w-36 sm:w-64">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onFocus={() => setIsPerkSuggestionsOpen(true)}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsPerkSuggestionsOpen(true);
            }}
            placeholder={dict?.filters?.searchPlaceholder}
            aria-label={dict?.filters?.searchPlaceholder}
            className="w-full rounded-full border border-border-color bg-bg-elevated/60 py-2.5 pl-10 pr-9 text-xs font-medium text-text-primary placeholder:text-text-muted focus:border-accent-amber focus:bg-bg-surface focus:outline-none focus:ring-2 focus:ring-accent-amber/20 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setIsPerkSuggestionsOpen(false);
              }}
              aria-label={dict?.filters?.clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
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
                      <span className="text-xs font-black text-text-primary truncate">
                        {item.name}
                      </span>
                      {item.alternate_name && (
                        <span className="text-[10px] text-accent-amber font-semibold truncate">
                          {dict?.filters?.aliasLabel && `${dict.filters.aliasLabel} `}
                          {item.alternate_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-text-muted shrink-0">
                    {item.character || dict?.modal?.generalPerk}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          role="group"
          aria-label={dict?.filters?.viewMode}
          className="flex shrink-0 items-center rounded-full border border-border-color bg-bg-elevated/60 p-1"
        >
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            aria-label={dict?.filters?.gridView}
            className={`rounded-full p-2 transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-bg-surface text-accent-amber border border-border-color shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-label={dict?.filters?.listView}
            className={`rounded-full p-2 transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-bg-surface text-accent-amber border border-border-color shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

