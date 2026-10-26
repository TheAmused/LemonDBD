'use client';
// frontend/src/components/perks/PerkResultsStrip.tsx
//
// The row under the Perks toolbar: how many perks match, the filters that are on (each one removable
// without opening the Filters popover) and the sort menu.
import React from 'react';
import { ArrowDownUp, X } from 'lucide-react';
import { CustomDropdown, type DropdownOption } from '@/components/common/CustomDropdown';
import { ToggleChip } from '@/components/common/ToggleChip';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import type { OwnershipFilter, ScopeFilter, SortField, SortOrder } from '@/types/perks';
import type { PerkType } from '@/utils/perkTypes';
import { formatMessage } from '@/utils/i18nFormat';

type SortChoice = `${SortField}:${SortOrder}`;

const SORT_CHOICES: readonly SortChoice[] = ['name:asc', 'name:desc', 'character:asc', 'character:desc'];

interface PerkResultsStripProps {
  totalResults: number;
  activeTypes: readonly PerkType[];
  onTypesChange: (types: PerkType[]) => void;
  ownershipFilter: OwnershipFilter;
  setOwnershipFilter: (filter: OwnershipFilter) => void;
  scope: ScopeFilter;
  setScope: (scope: ScopeFilter) => void;
  sortBy: SortField;
  setSortBy: (field: SortField) => void;
  order: SortOrder;
  setOrder: (order: SortOrder) => void;
}

export const PerkResultsStrip: React.FC<PerkResultsStripProps> = ({
  totalResults,
  activeTypes,
  onTypesChange,
  ownershipFilter,
  setOwnershipFilter,
  scope,
  setScope,
  sortBy,
  setSortBy,
  order,
  setOrder,
}) => {
  const dict = useDictionary();
  const locale = useLocale();

  const sortLabel = (choice: SortChoice) => {
    const [field, direction] = choice.split(':') as [SortField, SortOrder];
    return `${field === 'name' ? dict.filters.sortByName : dict.filters.sortByCharacter} ${direction === 'asc' ? dict.filters.orderAsc : dict.filters.orderDesc}`;
  };
  const sortOptions: DropdownOption<SortChoice>[] = SORT_CHOICES.map((choice) => ({ value: choice, label: sortLabel(choice) }));
  const currentSort: SortChoice = `${sortBy}:${order}`;

  // Every active filter as a chip: label plus the same "Remove {type} filter" name the old in-field chips had.
  const removable: { key: string; label: string; tone: 'amber' | 'red'; onRemove: () => void }[] = [
    ...activeTypes.map((type) => ({
      key: type,
      label: dict.perkTypes.labels[type],
      tone: 'amber' as const,
      onRemove: () => onTypesChange(activeTypes.filter((t) => t !== type)),
    })),
    ...(ownershipFilter === 'owned'
      ? [{ key: 'owned', label: dict.filters.ownedOnly, tone: 'red' as const, onRemove: () => setOwnershipFilter('all') }]
      : []),
    ...(scope === 'general'
      ? [{ key: 'general', label: dict.filters.generalOnly, tone: 'red' as const, onRemove: () => setScope('all') }]
      : []),
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border-color px-3 py-2.5 sm:px-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <output className="type-strong text-text-primary">
          {totalResults.toLocaleString(locale)} {dict.pagination.results}
        </output>
        {removable.map((chip) => (
          <ToggleChip
            key={chip.key}
            size="xs"
            pill
            pressed
            tone={chip.tone}
            aria-label={formatMessage(dict.perkTypes.removeType, { type: chip.label }, locale)}
            onClick={chip.onRemove}
          >
            {chip.label}
            <X aria-hidden="true" className="h-3 w-3" />
          </ToggleChip>
        ))}
      </div>

      <CustomDropdown<SortChoice>
        options={sortOptions}
        value={currentSort}
        onChange={(choice) => {
          const [field, direction] = choice.split(':') as [SortField, SortOrder];
          setSortBy(field);
          setOrder(direction);
        }}
        icon={<ArrowDownUp className="h-3.5 w-3.5" />}
        label={`${dict.filters.sortBy}: ${sortLabel(currentSort)}`}
        ariaLabel={dict.filters.sortBy}
        accent="primary"
        align="right"
        minWidthClass="min-w-44"
      />
    </div>
  );
};
