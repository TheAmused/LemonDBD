'use client';

import React, { useMemo } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  RotateCcw,
  ArrowUpDown,
  Filter,
  User,
  Shield,
  Skull,
  Sparkles,
  X,
} from 'lucide-react';

interface PerkFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  category?: string;
  setCategory?: (val: string) => void;
  character: string;
  setCharacter: (val: string) => void;
  sortBy: string;
  setSortBy: (val: string) => void;
  order: string;
  setOrder: (val: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (val: 'grid' | 'list') => void;
  characterOptions: { value: string; label: string }[];
  dict: any;
  onReset: () => void;
}

export const PerkFilters: React.FC<PerkFiltersProps> = ({
  search,
  setSearch,
  category = 'all',
  setCategory,
  character,
  setCharacter,
  sortBy,
  setSortBy,
  order,
  setOrder,
  viewMode,
  setViewMode,
  characterOptions,
  dict,
  onReset,
}) => {
  const hasActiveFilters =
    search ||
    category !== 'all' ||
    character !== 'all' ||
    sortBy !== 'name' ||
    order !== 'asc';

  // Extract top popular characters for quick-filter chips
  const popularChips = useMemo(() => {
    const defaultChips = [
      { value: 'all', label: 'All Characters' },
      { value: 'General', label: 'General Perks' },
    ];
    if (!characterOptions || characterOptions.length === 0) return defaultChips;

    // Take top 8 characters for quick access chips
    const featured = characterOptions.slice(0, 8).map((opt) => ({
      value: opt.value,
      label: opt.value,
    }));
    return [...defaultChips, ...featured];
  }, [characterOptions]);

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-slate-900/60 p-4 sm:p-5 backdrop-blur-xl shadow-sm dark:shadow-xl dark:shadow-slate-950/40">
      {/* ── Top Row: Role Tabs + Controls ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* 4-Way Role Segmented Toggle */}
        {setCategory && (
          <div className="inline-flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800/80 dark:bg-slate-950/80 p-1.5 shadow-inner">
            <button
              onClick={() => setCategory('all')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all duration-200 cursor-pointer ${category === 'all'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700/60'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/60'
                }`}
            >
              <LayoutGrid className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400" />
              <span>All Roles</span>
            </button>

            <button
              onClick={() => setCategory('Survivor')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all duration-200 cursor-pointer ${category === 'Survivor'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md ring-1 ring-emerald-400/40'
                  : 'text-slate-700 hover:text-emerald-700 hover:bg-emerald-500/10 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/30'
                }`}
            >
              <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Survivor</span>
            </button>

            <button
              onClick={() => setCategory('Killer')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all duration-200 cursor-pointer ${category === 'Killer'
                  ? 'bg-gradient-to-r from-rose-700 to-red-800 text-white shadow-md ring-1 ring-rose-500/40'
                  : 'text-slate-700 hover:text-rose-700 hover:bg-rose-500/10 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/30'
                }`}
            >
              <Skull className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              <span>Killer</span>
            </button>

            <button
              onClick={() => setCategory('General')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all duration-200 cursor-pointer ${category === 'General'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-700 text-white shadow-md ring-1 ring-amber-400/40'
                  : 'text-slate-700 hover:text-amber-700 hover:bg-amber-500/10 dark:text-slate-400 dark:hover:text-amber-400 dark:hover:bg-amber-950/30'
                }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>General</span>
            </button>
          </div>
        )}

        {/* Search Bar & Grid/List View Toggles */}
        <div className="flex flex-1 items-center gap-3 lg:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={dict?.filters?.searchPlaceholder || 'Search perks by name...'}
              className="w-full rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/80 py-2.5 pl-10 pr-9 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-500 focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/90 p-1 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid View"
              className={`rounded-xl p-2 transition-all cursor-pointer ${viewMode === 'grid'
                  ? 'bg-white text-cyan-600 border border-slate-200 shadow-sm dark:bg-cyan-500/20 dark:text-cyan-400 dark:border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'
                }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label="List View"
              className={`rounded-xl p-2 transition-all cursor-pointer ${viewMode === 'list'
                  ? 'bg-white text-cyan-600 border border-slate-200 shadow-sm dark:bg-cyan-500/20 dark:text-cyan-400 dark:border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'
                }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Middle Row: Character Quick-Filter Chips ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 shrink-0 mr-1">
          Quick Filter:
        </span>
        {popularChips.map((chip) => {
          const isSelected = character === chip.value;
          return (
            <button
              key={chip.value}
              onClick={() => setCharacter(chip.value)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${isSelected
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200'
                }`}
            >
              <span>{chip.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Bottom Row: Character Dropdown, Sorting & Reset ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800/60">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Full Character Dropdown Select */}
          <div className="relative flex-1 sm:w-64">
            <select
              value={character}
              onChange={(e) => setCharacter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/80 px-3.5 py-2 pr-9 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none transition-colors"
            >
              <option value="all">{dict?.filters?.allCharacters || 'All Characters'}</option>
              <option value="General">General Perks Only</option>
              {characterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <User className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          </div>

          {/* Sort By Select */}
          <div className="relative flex-1 sm:w-44">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/80 px-3.5 py-2 pr-9 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none transition-colors"
            >
              <option value="name">{dict?.filters?.sortName || 'Sort by Name'}</option>
              <option value="character">{dict?.filters?.sortCharacter || 'Sort by Character'}</option>
              <option value="category">{dict?.filters?.sortCategory || 'Sort by Category'}</option>
            </select>
            <Filter className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/80 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <span>{order === 'asc' ? dict?.filters?.asc || 'Asc' : dict?.filters?.desc || 'Desc'}</span>
            <ArrowUpDown className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400" />
          </button>
        </div>

        {/* Clear / Reset Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer w-full sm:w-auto justify-center"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{dict?.filters?.clear || 'Reset Filters'}</span>
          </button>
        )}
      </div>
    </div>
  );
};