'use client';
// frontend/src/components/perks/PerkFilterMenu.tsx
//
// The "Filters" button and its popover (perk types with live counts, optionally the All / Owned / General toggle),
// shared by the Perks page header and the ID, Please perk picker. The button carries the number of filters that are on.
import React, { useMemo } from 'react';
import { FiltersIcon } from '@/components/icons/DbdIcons';
import { CustomDropdown } from '@/components/common/CustomDropdown';
import { Badge } from '@/components/common/Badge';
import { useDictionary } from '@/context/DictionaryContext';
import type { Perk } from '@/types/perks';
import { countPerkTypes, typesWithPerks, type PerkType, type PerkTypeCounts } from '@/utils/perkTypes';
import { CONTROL_HEIGHT } from '@/components/perks/PerkSearchBox';
import { PerkFilterPanel, isScopeFilterOn, type PerkScopeFilter } from '@/components/perks/PerkFilterPanel';

interface PerkFilterMenuProps {
  /** The perks being filtered: the types offered (only those they have) come from them. */
  perks: readonly Perk[];
  activeTypes: readonly PerkType[];
  onTypesChange: (types: PerkType[]) => void;
  /** Per type, how many perks would match with it added to the current filters (default: its size in `perks`). */
  typeCounts?: PerkTypeCounts;
  /** Omit where the All / Owned / General choice means nothing. */
  scopeFilter?: PerkScopeFilter;
}

export const PerkFilterMenu: React.FC<PerkFilterMenuProps> = ({ perks, activeTypes, onTypesChange, typeCounts, scopeFilter }) => {
  const dict = useDictionary();
  const perkTypeCounts = useMemo(() => countPerkTypes(perks), [perks]);
  const roleTypes = useMemo(() => typesWithPerks(perkTypeCounts), [perkTypeCounts]);

  // Owned and General are one choice in the popover, so together they count once.
  const filterCount = activeTypes.length + (scopeFilter && isScopeFilterOn(scopeFilter) ? 1 : 0);

  return (
    <CustomDropdown
      ariaLabel={dict.filters.filtersTitle}
      label={
        <span className="inline-flex items-center gap-2">
          {dict.filters.filtersTitle}
          {filterCount > 0 && (
            <Badge tone="red" size="xs" plain>
              {filterCount}
            </Badge>
          )}
        </span>
      }
      icon={<FiltersIcon className="icon-sm" />}
      accent="primary"
      align="right"
      minWidthClass=""
      menuClassName="w-72 sm:w-96"
      buttonClassName={CONTROL_HEIGHT}
    >
      <PerkFilterPanel
        roleTypes={roleTypes}
        activeTypes={activeTypes}
        typeCounts={typeCounts ?? perkTypeCounts}
        onTypesChange={onTypesChange}
        scopeFilter={scopeFilter}
        hasFilters={filterCount > 0}
        onClear={() => {
          onTypesChange([]);
          if (scopeFilter) {
            scopeFilter.setOwnershipFilter('all');
            scopeFilter.setScope('all');
          }
        }}
      />
    </CustomDropdown>
  );
};
