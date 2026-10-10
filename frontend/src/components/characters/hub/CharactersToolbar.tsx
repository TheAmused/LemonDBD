'use client';
// frontend/src/components/characters/hub/CharactersToolbar.tsx
import React from 'react';
import { Lock, Search, X } from 'lucide-react';
import { useDictionary } from '@/context/DictionaryContext';
import { Input } from '@/components/common/Field';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';
import type { RoleCategory } from '@/types/perks';

interface CharactersToolbarProps {
  activeTab: RoleCategory;
  onTabChange: (tab: RoleCategory) => void;
  survivorCount: number;
  killerCount: number;
  ownershipMode: boolean;
  ownershipLoading: boolean;
  onToggleOwnershipMode: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

/** Survivor / Killer switch, the "My characters" toggle and the name filter. */
export function CharactersToolbar({
  activeTab,
  onTabChange,
  survivorCount,
  killerCount,
  ownershipMode,
  ownershipLoading,
  onToggleOwnershipMode,
  searchQuery,
  setSearchQuery,
}: CharactersToolbarProps) {
  const dict = useDictionary();

  return (
    <section
      aria-label={dict.characterDetail.characterOverview}
      className="flex flex-col sm:flex-row gap-4 justify-between items-center"
    >
      <div
        role="group"
        aria-label={dict.filters.category}
        className="order-2 sm:order-1 relative flex items-center w-full sm:w-72 h-11 p-1 bg-bg-primary border border-border-color rounded-2xl shadow-inner select-none transition-colors"
      >
        <span
          aria-hidden="true"
          className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-xl shadow-md transition-transform duration-300 ease-out ${
            activeTab === 'Survivor'
              ? 'translate-x-0 bg-accent-green'
              : 'translate-x-[calc(100%+8px)] bg-accent-red'
          }`}
        />
        <button
          type="button"
          onClick={() => onTabChange('Survivor')}
          aria-pressed={activeTab === 'Survivor'}
          className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 h-full min-h-[40px] rounded-xl text-xs font-bold transition-colors cursor-pointer touch-manipulation ${
            activeTab === 'Survivor'
              ? 'text-text-inverted'
              : 'text-text-secondary hover:text-accent-green'
          }`}
        >
          <SurvivorIcon className="h-3.5 w-3.5" />
          <span>{dict.filters.survivor}</span> ({survivorCount})
        </button>
        <button
          type="button"
          onClick={() => onTabChange('Killer')}
          aria-pressed={activeTab === 'Killer'}
          className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 h-full min-h-[40px] rounded-xl text-xs font-bold transition-colors cursor-pointer touch-manipulation ${
            activeTab === 'Killer'
              ? 'text-text-inverted'
              : 'text-text-secondary hover:text-accent-red'
          }`}
        >
          <KillerIcon className="h-3.5 w-3.5" />
          <span>{dict.filters.killer}</span> ({killerCount})
        </button>
      </div>

      <div className="order-1 sm:order-2 flex items-center justify-center sm:justify-start gap-3 w-full sm:w-auto">
        <button
          type="button"
          onClick={onToggleOwnershipMode}
          disabled={ownershipLoading}
          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-2xl text-xs font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait touch-manipulation shadow-xs ${
            ownershipMode
              ? 'bg-accent-amber text-text-inverted border border-accent-amber shadow-accent-amber/20'
              : 'border border-border-color bg-bg-surface text-text-primary hover:border-accent-amber/50 hover:text-accent-amber'
          }`}
        >
          {ownershipMode ? <X className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          <span>
            {ownershipLoading
              ? dict.app.loading
              : ownershipMode
                ? dict.characterDetail.exitSelection
                : dict.characterDetail.myCharacters}
          </span>
        </button>
      </div>

      <div className="order-3 relative w-full sm:w-72">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <Input
          type="text"
          placeholder={dict.filters.filterByCharacter}
          aria-label={dict.filters.filterByCharacter}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10 min-h-[44px] rounded-2xl bg-bg-primary font-semibold shadow-inner"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label={dict.filters.clearSearch}
            className="absolute right-1 top-1/2 -translate-y-1/2 flex min-h-[40px] min-w-[40px] items-center justify-center text-text-muted hover:text-text-primary cursor-pointer touch-manipulation"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
}
