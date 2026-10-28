'use client';
// frontend/src/components/PerkFilters.tsx
//
// The Perks page header, one row of controls of one height: role switch on the left, the plain search in the
// middle, the "Filters" popover (All / Owned / General, perk types) and the sort menu on the right. The Filters
// button carries the number of filters that are on. Below lg the row wraps instead of centring the search.

import React, { useMemo } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { SegmentedControlOption } from '@/components/common/SegmentedControl';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { CustomDropdown } from '@/components/common/CustomDropdown';
import type {
  RoleCategory,
  ScopeFilter,
  OwnershipFilter,
  SortField,
  SortOrder,
  Perk,
} from '@/types/perks';
import { useDictionary } from '@/context/DictionaryContext';
import { Surface } from '@/components/common/Surface';
import { Badge } from '@/components/common/Badge';
import { PerkSearchBox, CONTROL_H, CONTROL_HEIGHT } from '@/components/perks/PerkSearchBox';
import { PerkFilterPanel, type PerkTypeCounts } from '@/components/perks/PerkFilterPanel';
import { PerkSortMenu } from '@/components/perks/PerkSortMenu';
import { PERK_TYPES, getKnownPerkTypes, type PerkType } from '@/utils/perkTypes';

const NO_PERKS: readonly Perk[] = [];
const NO_TYPES: readonly PerkType[] = [];

export function computeHasActiveFilters(state: {
  search: string;
  scope: ScopeFilter;
  ownershipFilter: OwnershipFilter;
  sortBy: SortField;
  order: SortOrder;
  types?: readonly string[];
}): boolean {
  return (
    state.search !== '' ||
    (state.types?.length ?? 0) > 0 ||
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
  /** The current role's perks: the types offered and the search suggestions come from them. */
  rolePerks?: readonly Perk[];
  activeTypes?: readonly PerkType[];
  onTypesChange?: (types: PerkType[]) => void;
  /** Per type, how many perks would match with it added to the current filters (default: its size in the role). */
  typeCounts?: PerkTypeCounts;
  isLoggedIn?: boolean;
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
      rolePerks = NO_PERKS,
      activeTypes = NO_TYPES,
      onTypesChange = () => {},
      typeCounts,
      isLoggedIn = false,
    }) => {
  const dict = useDictionary();

  // Only the types this role's perks actually have are offered (no "Hex 0" on the Survivor side).
  const roleTypeCounts = useMemo(() => {
    const counts: PerkTypeCounts = {};
    for (const perk of rolePerks) for (const type of getKnownPerkTypes(perk)) counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, [rolePerks]);
  const roleTypes = useMemo(() => PERK_TYPES.filter((type) => (roleTypeCounts[type] ?? 0) > 0), [roleTypeCounts]);

  // Owned and General are one choice in the popover, so together they count once.
  const panelFilterCount = activeTypes.length + (ownershipFilter !== 'all' || scope !== 'all' ? 1 : 0);

  const roleOptions: readonly [SegmentedControlOption<RoleCategory>, SegmentedControlOption<RoleCategory>] = [
    { value: 'Survivor', activeClassName: 'bg-accent-green text-text-inverted', label: dict.filters.survivor },
    { value: 'Killer', activeClassName: 'bg-accent-red text-text-inverted', label: dict.filters.killer },
  ];

  return (
    <Surface
      aria-label={dict.filters.filtersTitle}
      as="section"
      padding="none"
      className="relative z-30 flex w-full flex-col bg-bg-surface/90 shadow-xs backdrop-blur-xl transition-colors"
    >
      <h1 className="sr-only">{dict.filters.perks}</h1>

      <div className="flex flex-wrap items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 lg:flex-nowrap">
        {/* The two outer cells share the row equally, which keeps the search in the middle. */}
        <div className="flex lg:flex-1 lg:basis-0">
          <SegmentedControl
            ariaLabel={dict.filters.sortByRole}
            value={role}
            onChange={setRole}
            options={roleOptions}
            size="fill"
            className={CONTROL_H}
          />
        </div>

        <PerkSearchBox
          rolePerks={rolePerks}
          search={search}
          setSearch={setSearch}
          activeTypes={activeTypes}
          onTypesChange={onTypesChange}
          suggestPerks
          typesInField={false}
          className="relative z-40 min-w-56 flex-1 lg:w-full lg:max-w-sm lg:flex-none"
        />

        <div className="ml-auto flex items-center gap-2 lg:ml-0 lg:flex-1 lg:basis-0 lg:justify-end">
          <CustomDropdown
            ariaLabel={dict.filters.filtersTitle}
            label={
              <span className="inline-flex items-center gap-2">
                {dict.filters.filtersTitle}
                {panelFilterCount > 0 && (
                  <Badge tone="red" size="xs" plain>
                    {panelFilterCount}
                  </Badge>
                )}
              </span>
            }
            icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
            accent="primary"
            align="right"
            minWidthClass=""
            menuClassName="w-72 sm:w-96"
            buttonClassName={CONTROL_HEIGHT}
          >
            <PerkFilterPanel
              roleTypes={roleTypes}
              activeTypes={activeTypes}
              typeCounts={typeCounts ?? roleTypeCounts}
              onTypesChange={onTypesChange}
              ownershipFilter={ownershipFilter}
              setOwnershipFilter={setOwnershipFilter}
              isLoggedIn={isLoggedIn}
              scope={scope}
              setScope={setScope}
              hasFilters={panelFilterCount > 0}
              onClear={() => {
                onTypesChange([]);
                setOwnershipFilter('all');
                setScope('all');
              }}
            />
          </CustomDropdown>

          <PerkSortMenu
            sortBy={sortBy}
            setSortBy={setSortBy}
            order={order}
            setOrder={setOrder}
            buttonClassName={CONTROL_HEIGHT}
          />
        </div>
      </div>
    </Surface>
  );
};
