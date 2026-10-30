'use client';
// frontend/src/components/characters/hub/CharactersToolbar.tsx
import React from 'react';
import { Search, X } from 'lucide-react';
import { useDictionary } from '@/context/DictionaryContext';
import { IconInput } from '@/components/common/Field';
import { LockIcon } from '@/components/icons/DbdIcons';
import type { RoleCategory } from '@/types/perks';

import { Button } from '@/components/common/Button';
import { SegmentedControl } from '@/components/common/SegmentedControl';
interface CharactersToolbarProps {
  activeTab: RoleCategory;
  onTabChange: (tab: RoleCategory) => void;
  survivorCount: number;
  killerCount: number;
  ownershipMode: boolean;
  ownershipLoading: boolean;
  /** A save is in flight: leaving now would look like a cancel while the changes still go through. */
  ownershipSaving: boolean;
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
  ownershipSaving,
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
      <SegmentedControl<RoleCategory>
        ariaLabel={dict.filters.category}
        value={activeTab}
        onChange={onTabChange}
        className="order-2 sm:order-1 w-full sm:w-72"
        options={[
          { value: 'Survivor', label: <>{dict.filters.survivor} ({survivorCount})</>, activeClassName: 'bg-accent-green text-text-inverted' },
          { value: 'Killer', label: <>{dict.filters.killer} ({killerCount})</>, activeClassName: 'bg-accent-red text-text-inverted' },
        ]}
      />

      <div className="order-1 sm:order-2 flex items-center justify-center sm:justify-start gap-3 w-full sm:w-auto">
        <Button
          variant={ownershipMode ? 'amber' : 'secondary'}
          size="md"
          aria-pressed={ownershipMode}
          onClick={onToggleOwnershipMode}
          disabled={ownershipLoading || ownershipSaving}
          className="min-h-11"
        >
          {ownershipMode ? <X className="icon-sm" /> : <LockIcon className="icon-sm" />}
          <span>
            {ownershipLoading
              ? dict.app.loading
              : ownershipMode
                ? dict.characterDetail.exitSelection
                : dict.characterDetail.myCharacters}
          </span>
        </Button>
      </div>

      <div className="order-3 relative w-full sm:w-72">
        <IconInput
          icon={Search}
          type="text"
          placeholder={dict.filters.filterByCharacter}
          aria-label={dict.filters.filterByCharacter}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10 min-h-11 bg-bg-primary font-semibold shadow-inner"
        />
        {searchQuery && (
          <Button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label={dict.filters.clearSearch}
            variant="ghost" size="sm" icon className="absolute right-1 top-1/2 -translate-y-1/2"
          >
            <X />
          </Button>
        )}
      </div>
    </section>
  );
}
