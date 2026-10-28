'use client';
// frontend/src/components/perks/PerkFilterPanel.tsx
//
// The body of the "Filters" popover on the Perks page: one All / Owned / General toggle, the perk types
// (a checklist with live counts) and a centred reset link. Sorting is not a filter and lives in its own menu.
import React from 'react';
import { SegmentedControl, type SegmentedControlOption } from '@/components/common/SegmentedControl';
import { Checkbox } from '@/components/common/Checkbox';
import { Button } from '@/components/common/Button';
import { FieldLabel } from '@/components/common/Field';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import type { OwnershipFilter, ScopeFilter } from '@/types/perks';
import type { PerkType } from '@/utils/perkTypes';

export type PerkTypeCounts = Partial<Record<PerkType, number>>;

interface PerkFilterPanelProps {
  /** The types this role's perks have, in display order. */
  roleTypes: readonly PerkType[];
  activeTypes: readonly PerkType[];
  /** How many perks stay if the type is added to the current filters. */
  typeCounts: PerkTypeCounts;
  onTypesChange: (types: PerkType[]) => void;
  ownershipFilter: OwnershipFilter;
  setOwnershipFilter: (filter: OwnershipFilter) => void;
  isLoggedIn: boolean;
  scope: ScopeFilter;
  setScope: (scope: ScopeFilter) => void;
  /** Whether anything this panel controls is on. */
  hasFilters: boolean;
  onClear: () => void;
}

export const PerkFilterPanel: React.FC<PerkFilterPanelProps> = ({
  roleTypes,
  activeTypes,
  typeCounts,
  onTypesChange,
  ownershipFilter,
  setOwnershipFilter,
  isLoggedIn,
  scope,
  setScope,
  hasFilters,
  onClear,
}) => {
  const dict = useDictionary();
  const locale = useLocale();

  // One choice: "Owned" and "General" exclude each other, which is how the two filters read in a single toggle.
  type ScopeChoice = 'all' | 'owned' | 'general';
  const choice: ScopeChoice = ownershipFilter === 'owned' ? 'owned' : scope === 'general' ? 'general' : 'all';
  const setChoice = (next: ScopeChoice) => {
    setOwnershipFilter(next === 'owned' ? 'owned' : 'all');
    setScope(next === 'general' ? 'general' : 'all');
  };
  const scopeOptions: readonly [SegmentedControlOption<ScopeChoice>, SegmentedControlOption<ScopeChoice>, SegmentedControlOption<ScopeChoice>] = [
    { value: 'all', label: dict.filters.allPerks },
    { value: 'owned', label: dict.filters.ownedOnly, disabled: !isLoggedIn },
    { value: 'general', label: dict.filters.generalShort },
  ];

  return (
    <div className="flex flex-col gap-4 p-1.5">
      <div>
        <FieldLabel as="span">{dict.filters.scopeTitle}</FieldLabel>
        <SegmentedControl
          ariaLabel={dict.filters.ownershipFilter}
          value={choice}
          onChange={setChoice}
          options={scopeOptions}
          size="sm"
          className="flex w-full"
        />
      </div>

      <div>
        <FieldLabel as="span">{dict.perkTypes.typesHeading}</FieldLabel>
        <div className="grid grid-cols-2 gap-x-2">
          {roleTypes.map((type) => {
            const active = activeTypes.includes(type);
            const count = typeCounts[type] ?? 0;
            return (
              <Checkbox
                key={type}
                checked={active}
                // A type that would leave nothing is dimmed, but one already on stays clickable to turn it off.
                disabled={!active && count === 0}
                onChange={(on) => onTypesChange(on ? [...activeTypes, type] : activeTypes.filter((t) => t !== type))}
                className="flex w-full rounded-control px-2.5 py-2 hover:bg-bg-elevated"
              >
                <span className="type-strong flex min-w-0 flex-1 items-center justify-between gap-2 text-text-primary">
                  <span className="truncate">{dict.perkTypes.labels[type]}</span>
                  <span className="text-text-muted tabular-nums">{count.toLocaleString(locale)}</span>
                </span>
              </Checkbox>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center border-t border-border-color pt-3">
        <Button variant="linkDanger" size="sm" disabled={!hasFilters} onClick={onClear}>
          {dict.filters.clear}
        </Button>
      </div>
    </div>
  );
};
