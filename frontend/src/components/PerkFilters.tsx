'use client';
// frontend/src/components/PerkFilters.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  RotateCcw,
  Shield,
  Skull,
  Sparkles,
  Layers,
  CheckCircle2,
  X,
  ArrowUpAZ,
  ArrowDownZA,
} from 'lucide-react';
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

  const hasActiveFilters =
    search !== '' ||
    scope !== 'all' ||
    ownershipFilter !== 'all' ||
    sortBy !== 'name' ||
    order !== 'asc';

  return (
    <section
      aria-label={dict?.filters?.filtersTitle || 'Perk Filters'}
      className="relative z-30 mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-slate-900/60 p-4 sm:p-5 backdrop-blur-xl shadow-sm dark:shadow-xl dark:shadow-slate-950/40"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Role Filter */}
          <div
            role="group"
            aria-label={dict?.filters?.sortByRole || 'Filter by Role'}
            className="inline-flex items-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800/80 dark:bg-slate-950/80 p-1 shadow-inner"
          >
            <button
              type="button"
              onClick={() => setRole('Survivor')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all duration-200 cursor-pointer ${
                role === 'Survivor'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md ring-1 ring-emerald-400/40'
                  : 'text-slate-700 hover:text-emerald-700 hover:bg-emerald-500/10 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/30'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>{dict?.filters?.survivor || 'Survivor'}</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('Killer')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all duration-200 cursor-pointer ${
                role === 'Killer'
                  ? 'bg-gradient-to-r from-rose-700 to-red-800 text-white shadow-md ring-1 ring-rose-500/40'
                  : 'text-slate-700 hover:text-rose-700 hover:bg-rose-500/10 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/30'
              }`}
            >
              <Skull className="h-3.5 w-3.5" />
              <span>{dict?.filters?.killer || 'Killer'}</span>
            </button>
          </div>

          {/* Scope Filter */}
          <div
            role="group"
            aria-label={dict?.filters?.allPerks || 'Filter by Scope'}
            className="inline-flex items-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800/80 dark:bg-slate-950/80 p-1 shadow-inner"
          >
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all duration-200 cursor-pointer ${
                scope === 'all'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700/60'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400" />
              <span>{dict?.filters?.allPerks || 'All Perks'}</span>
            </button>

            <button
              type="button"
              onClick={() => setScope('general')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all duration-200 cursor-pointer ${
                scope === 'general'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-700 text-white shadow-md ring-1 ring-amber-400/40'
                  : 'text-slate-600 hover:text-amber-700 hover:bg-amber-500/10 dark:text-slate-400 dark:hover:text-amber-400 dark:hover:bg-amber-950/30'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{dict?.filters?.generalOnly || 'General Only'}</span>
            </button>
          </div>

          {/* Ownership Filter */}
          <div
            role="group"
            aria-label={dict?.filters?.ownershipFilter || 'Filter by Ownership'}
            className="inline-flex items-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800/80 dark:bg-slate-950/80 p-1 shadow-inner"
          >
            <button
              type="button"
              onClick={() => setOwnershipFilter('all')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold rounded-xl transition-all duration-200 cursor-pointer ${
                ownershipFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700/60'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <span>{dict?.filters?.everyPerk || 'Every Perk'}</span>
            </button>

            <button
              type="button"
              onClick={() => setOwnershipFilter('owned')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold rounded-xl transition-all duration-200 cursor-pointer ${
                ownershipFilter === 'owned'
                  ? 'bg-gradient-to-r from-cyan-600 to-teal-700 text-white shadow-md ring-1 ring-cyan-400/40'
                  : 'text-slate-600 hover:text-cyan-700 hover:bg-cyan-500/10 dark:text-slate-400 dark:hover:text-cyan-400 dark:hover:bg-cyan-950/30'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{dict?.filters?.ownedOnly || 'Owned Only'}</span>
            </button>
          </div>
        </div>

        {/* Search & View Mode Switcher */}
        <div className="flex items-center gap-3">
          <div ref={searchDropdownRef} className="relative z-40 flex-1 sm:w-80">
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
              className="w-full rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/80 py-2.5 pl-10 pr-9 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-500 focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
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
            className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/90 p-1 shrink-0"
          >
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label={dict?.filters?.gridView || 'Grid View'}
              className={`rounded-xl p-2 transition-all cursor-pointer ${
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
              className={`rounded-xl p-2 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-cyan-600 border border-slate-200 shadow-sm dark:bg-cyan-500/20 dark:text-cyan-400 dark:border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60">
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label={dict?.filters?.sortFields || 'Sort Fields'}
            className="inline-flex items-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800/80 dark:bg-slate-950/80 p-1 shadow-inner"
          >
            <button
              type="button"
              onClick={() => setSortBy('name')}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                sortBy === 'name'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700/60'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {dict?.filters?.sortByName || 'Name'}
            </button>
            <button
              type="button"
              onClick={() => setSortBy('character')}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                sortBy === 'character'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700/60'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {dict?.filters?.sortByCharacter || 'Character'}
            </button>
          </div>

          <div
            role="group"
            aria-label={dict?.filters?.sortOrderLabel || 'Sort Direction'}
            className="inline-flex items-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800/80 dark:bg-slate-950/80 p-1 shadow-inner"
          >
            <button
              type="button"
              onClick={() => setOrder('asc')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                order === 'asc'
                  ? 'bg-white text-cyan-600 shadow-sm border border-slate-200 dark:bg-slate-800 dark:text-cyan-400 dark:border-slate-700/60'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <ArrowUpAZ className="h-3.5 w-3.5" />
              <span>{dict?.filters?.orderAsc || 'A-Z'}</span>
            </button>
            <button
              type="button"
              onClick={() => setOrder('desc')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                order === 'desc'
                  ? 'bg-white text-cyan-600 shadow-sm border border-slate-200 dark:bg-slate-800 dark:text-cyan-400 dark:border-slate-700/60'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <ArrowDownZA className="h-3.5 w-3.5" />
              <span>{dict?.filters?.orderDesc || 'Z-A'}</span>
            </button>
          </div>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer w-full lg:w-auto justify-center"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{dict?.filters?.clear || 'Reset Filters'}</span>
          </button>
        )}
      </div>
    </section>
  );
};
