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

/** Pure "is any filter non-default" check, pulled out of the component body
 * so it's unit-testable without rendering anything. Drives whether the
 * Reset button shows up at all. */
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
  /** Live per-role counts across the whole vault (not just the current
   * page) -- shown right on the Survivor/Killer switch itself. */
  survivorCount?: number;
  killerCount?: number;
  /** Live counts for the currently selected role -- shown on the
   * All/Owned ownership switch itself, same pattern as the role switch
   * above it. */
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
      activeClassName: 'bg-gradient-to-r from-emerald-600 to-teal-700',
      label: (
        <span className="inline-flex items-center gap-1.5">
          {dict?.filters?.survivor || 'Survivors'}
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
      activeClassName: 'bg-gradient-to-r from-rose-700 to-red-800',
      label: (
        <span className="inline-flex items-center gap-1.5">
          {dict?.filters?.killer || 'Killers'}
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
      activeClassName: 'bg-gradient-to-r from-slate-700 to-slate-800',
      label: (
        <span className="inline-flex items-center gap-1.5">
          {dict?.filters?.allPerks || 'All'}
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
      activeClassName: 'bg-gradient-to-r from-cyan-600 to-teal-700',
      label: (
        <span className="inline-flex items-center gap-1.5">
          {dict?.filters?.ownedOnly || 'Owned'}
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
      label: dict?.filters?.sortByName || 'Name',
      activeClassName: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60',
    },
    {
      value: 'character',
      label: dict?.filters?.sortByCharacter || 'Character',
      activeClassName: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60',
    },
  ];

  const sortOrderOptions: readonly [ToggleSwitchOption<SortOrder>, ToggleSwitchOption<SortOrder>] = [
    {
      value: 'asc',
      icon: <ArrowUpAZ className="h-3.5 w-3.5" />,
      label: dict?.filters?.orderAsc || 'A-Z',
      activeClassName: 'bg-white text-cyan-600 dark:bg-slate-800 dark:text-cyan-400 border border-slate-200 dark:border-slate-700/60',
    },
    {
      value: 'desc',
      icon: <ArrowDownZA className="h-3.5 w-3.5" />,
      label: dict?.filters?.orderDesc || 'Z-A',
      activeClassName: 'bg-white text-cyan-600 dark:bg-slate-800 dark:text-cyan-400 border border-slate-200 dark:border-slate-700/60',
    },
  ];

  return (
    <section
      aria-label={dict?.filters?.filtersTitle || 'Perk Filters'}
      className="relative z-30 flex w-full items-center gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-xl dark:shadow-slate-950/40 sm:p-4 backdrop-blur-xl"
    >
      {/* Every toggle, the General Only checkbox, and Reset all live in one
          horizontally-scrollable cluster -- never wrapped onto a second
          line, and never truncated: each switch is sized to its own
          content (see ToggleSwitch), so a longer label in another locale
          just makes that one switch wider instead of getting clipped. If
          the cluster is ever wider than the available space it scrolls
          sideways within itself, rather than wrapping the toolbar to a
          second row or shrinking any label. */}
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-0.5 sm:gap-2.5 [scrollbar-width:thin]">
        <ToggleSwitch
          ariaLabel={dict?.filters?.sortByRole || 'Filter by Role'}
          value={role}
          onChange={setRole}
          options={roleOptions}
        />

        <ToggleSwitch
          ariaLabel={dict?.filters?.ownershipFilter || 'Filter by Ownership'}
          value={ownershipFilter}
          onChange={setOwnershipFilter}
          options={ownershipOptions}
        />

        {/* "General Only" used to be its own two-way toggle (All Perks /
            General Only) sitting right next to the ownership toggle above,
            which meant two separate switches both nominally about "how much
            of the pool" -- confusing, and one extra control. It's just a
            single on/off narrowing filter, so it's a checkbox now. */}
        <label className="inline-flex shrink-0 cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-extrabold text-slate-700 shadow-inner dark:border-slate-800/80 dark:bg-slate-950/80 dark:text-slate-300">
          <input
            type="checkbox"
            checked={scope === 'general'}
            onChange={(e) => setScope(e.target.checked ? 'general' : 'all')}
            className="h-3.5 w-3.5 shrink-0 rounded border-slate-400 accent-amber-500 dark:border-slate-600"
          />
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
          <span>{dict?.filters?.generalOnly || 'General Only'}</span>
        </label>

        <ToggleSwitch
          ariaLabel={dict?.filters?.sortFields || 'Sort Fields'}
          value={sortBy}
          onChange={setSortBy}
          options={sortFieldOptions}
          size="sm"
        />

        <ToggleSwitch
          ariaLabel={dict?.filters?.sortOrderLabel || 'Sort Direction'}
          value={order}
          onChange={setOrder}
          options={sortOrderOptions}
          size="sm"
        />

      </div>

      {/* Search + view mode live outside the scrolling cluster above (not
          scrolled away with it) so the search suggestions dropdown always
          has room to open below it without being clipped. */}
      <div className="flex shrink-0 items-center gap-2.5">
        <div ref={searchDropdownRef} className="relative z-40 w-36 sm:w-64">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onFocus={() => setIsPerkSuggestionsOpen(true)}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsPerkSuggestionsOpen(true);
            }}
            placeholder={
              dict?.filters?.searchPlaceholder || 'Type perk name or alias...'
            }
            aria-label={dict?.filters?.searchPlaceholder || 'Search perks'}
            className="w-full rounded-full border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/80 py-2.5 pl-10 pr-9 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-500 focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setIsPerkSuggestionsOpen(false);
              }}
              aria-label={dict?.filters?.clearSearch || 'Clear search text'}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              <X className="h-3 w-3" />
            </button>
          )}

          {isPerkSuggestionsOpen && perkSuggestions.length > 0 && (
            <div
              role="listbox"
              className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-2xl z-50 p-1.5 flex flex-col gap-1"
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
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer transition-colors text-left w-full"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                        {item.name}
                      </span>
                      {item.alternate_name && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold truncate">
                          {dict?.filters?.aliasLabel || 'Alias:'} {item.alternate_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 shrink-0">
                    {item.character || 'General'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          role="group"
          aria-label={dict?.filters?.viewMode || 'View Mode Toggle'}
          className="flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/90 p-1"
        >
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            aria-label={dict?.filters?.gridView || 'Grid View'}
            className={`rounded-full p-2 transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white text-cyan-600 border border-slate-200 shadow-sm dark:bg-cyan-500/20 dark:text-cyan-400 dark:border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-label={dict?.filters?.listView || 'List View'}
            className={`rounded-full p-2 transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white text-cyan-600 border border-slate-200 shadow-sm dark:bg-cyan-500/20 dark:text-cyan-400 dark:border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
