'use client';
// frontend/src/components/perks/PerkFilterPanel.tsx
//
// The body of the "Filters" popover on the Perks page: perk types (chips with live counts),
// ownership and "general only". Sorting is not a filter and lives in its own menu.
import React from 'react';
import { SegmentedControl, type SegmentedControlOption } from '@/components/common/SegmentedControl';
import { ToggleChip } from '@/components/common/ToggleChip';
import { Button } from '@/components/common/Button';
import { FieldLabel } from '@/components/common/Field';
import { WrapRow } from '@/components/common/WrapRow';
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

  const ownershipOptions: readonly [SegmentedControlOption<OwnershipFilter>, SegmentedControlOption<OwnershipFilter>] = [
    { value: 'all', label: dict.filters.allPerks },
    { value: 'owned', label: dict.filters.ownedOnly, disabled: !isLoggedIn },
  ];

  return (
    <div className="flex flex-col gap-4 p-1.5">
      <div>
        <FieldLabel as="span">{dict.perkTypes.typesHeading}</FieldLabel>
        <WrapRow className="justify-start">
          {roleTypes.map((type) => {
            const active = activeTypes.includes(type);
            const count = typeCounts[type] ?? 0;
            return (
              <ToggleChip
                key={type}
                size="sm"
                tone="amber"
                pill
                pressed={active}
                // A type that would leave nothing is dimmed, but one already on stays clickable to turn it off.
                disabled={!active && count === 0}
                onClick={() => onTypesChange(active ? activeTypes.filter((t) => t !== type) : [...activeTypes, type])}
              >
                {dict.perkTypes.labels[type]}
                <span className="text-text-muted">{count.toLocaleString(locale)}</span>
              </ToggleChip>
            );
          })}
        </WrapRow>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          ariaLabel={dict.filters.ownershipFilter}
          value={ownershipFilter}
          onChange={setOwnershipFilter}
          options={ownershipOptions}
          size="sm"
        />
        <ToggleChip
          size="sm"
          pressed={scope === 'general'}
          onClick={() => setScope(scope === 'general' ? 'all' : 'general')}
        >
          {dict.filters.generalOnly}
        </ToggleChip>
      </div>

      {hasFilters && (
        <Button variant="linkDanger" size="sm" className="self-start" onClick={onClear}>
          {dict.filters.clear}
        </Button>
      )}
    </div>
  );
};
