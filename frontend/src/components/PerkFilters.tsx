'use client';

import React from 'react';
import { Search, LayoutGrid, List, RotateCcw, ArrowUpDown, Filter, User, Shield } from 'lucide-react';

interface PerkFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  character: string;
  setCharacter: (val: string) => void;
  sortBy: string;
  setSortBy: (val: string) => void;
  order: string;
  setOrder: (val: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (val: 'grid' | 'list') => void;
  characters: string[];
  dict: any;
  onReset: () => void;
}

export const PerkFilters: React.FC<PerkFiltersProps> = ({
  search,
  setSearch,
  category,
  setCategory,
  character,
  setCharacter,
  sortBy,
  setSortBy,
  order,
  setOrder,
  viewMode,
  setViewMode,
  characters,
  dict,
  onReset,
}) => {
  const hasActiveFilters = search || category !== 'all' || character !== 'all' || sortBy !== 'name' || order !== 'asc';

  return (
    <div className="mb-8 rounded-2xl border border-slate-200/80 bg-white/70 p-4 sm:p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/60 transition-all">
      {/* Top Section: Search Bar & View Mode Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={dict.filters.searchPlaceholder}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100 dark:focus:bg-slate-950 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Layout Toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{dict.filters.clear}</span>
            </button>
          )}

          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-950">
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid View"
              className={`rounded-lg p-1.5 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-red-600 shadow-sm dark:bg-slate-800 dark:text-red-400'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label="List View"
              className={`rounded-lg p-1.5 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-red-600 shadow-sm dark:bg-slate-800 dark:text-red-400'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Controls: Role Selector, Character Dropdown, Sort Controls */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
        {/* Role Tab Pill Switcher */}
        <div className="flex rounded-xl border border-slate-200 bg-slate-100/60 p-1 dark:border-slate-800 dark:bg-slate-950">
          <button
            onClick={() => setCategory('all')}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
              category === 'all'
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            {dict.filters.allCategories}
          </button>
          <button
            onClick={() => setCategory('Survivor')}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
              category === 'Survivor'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            {dict.filters.survivor}
          </button>
          <button
            onClick={() => setCategory('Killer')}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer ${
              category === 'Killer'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            {dict.filters.killer}
          </button>
        </div>

        {/* Character Filter Dropdown */}
        <div className="relative">
          <select
            value={character}
            onChange={(e) => setCharacter(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 text-xs font-medium text-slate-800 focus:border-red-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-200 transition-colors"
          >
            <option value="all">{dict.filters.allCharacters}</option>
            <option value="General">General Perks Only</option>
            {characters.map((char) => (
              <option key={char} value={char}>
                {char}
              </option>
            ))}
          </select>
          <User className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Sort By Dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 text-xs font-medium text-slate-800 focus:border-red-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-200 transition-colors"
          >
            <option value="name">{dict.filters.sortName}</option>
            <option value="character">{dict.filters.sortCharacter}</option>
            <option value="category">{dict.filters.sortCategory}</option>
          </select>
          <Filter className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Order Direction Toggle */}
        <button
          onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-200 dark:hover:bg-slate-900 transition-colors cursor-pointer"
        >
          <span>{order === 'asc' ? dict.filters.asc : dict.filters.desc}</span>
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
        </button>
      </div>
    </div>
  );
};