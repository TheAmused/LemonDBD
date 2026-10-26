'use client';
// frontend/src/components/PerkFilters.tsx
//
// The Perks page header: title, role switch, plain search, a "Filters" popover (types, ownership,
// general only) and a results strip with the active filters and the sort menu.

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
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { Surface } from '@/components/common/Surface';
import { Badge } from '@/components/common/Badge';
import { IconTile } from '@/components/common/IconTile';
import { PerkSearchBox } from '@/components/perks/PerkSearchBox';
import { PerkFilterPanel, type PerkTypeCounts } from '@/components/perks/PerkFilterPanel';
import { PerkResultsStrip } from '@/components/perks/PerkResultsStrip';
import { PERK_TYPES, getKnownPerkTypes, type PerkType } from '@/utils/perkTypes';

const NO_PERKS: readonly Perk[] = [];
const NO_TYPES: readonly PerkType[] = [];

/** The icon beside a filter label: grows with the screen. */
const FILTER_ICON = 'h-3 w-3 sm:h-3.5 sm:w-3.5 wide:h-4 wide:w-4 wide-2k:h-5 wide-2k:w-5';
/** The count inside a coloured filter button. */
const COUNT_BADGE = 'px-1 sm:px-1.5 wide:px-2 sm:text-tiny wide:text-xs leading-none';

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
  /** How many perks match the current filters. */
  totalResults?: number;
  survivorCount?: number;
  killerCount?: number;
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
      totalResults = rolePerks.length,
      survivorCount,
      killerCount,
      isLoggedIn = false,
    }) => {
  const dict = useDictionary();
  const locale = useLocale();

  // Only the types this role's perks actually have are offered (no "Hex 0" on the Survivor side).
  const roleTypeCounts = useMemo(() => {
    const counts: PerkTypeCounts = {};
    for (const perk of rolePerks) for (const type of getKnownPerkTypes(perk)) counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, [rolePerks]);
  const roleTypes = useMemo(() => PERK_TYPES.filter((type) => (roleTypeCounts[type] ?? 0) > 0), [roleTypeCounts]);

  const panelFilterCount = activeTypes.length + (ownershipFilter !== 'all' ? 1 : 0) + (scope !== 'all' ? 1 : 0);

  const roleOptions: readonly [SegmentedControlOption<RoleCategory>, SegmentedControlOption<RoleCategory>] = [
    {
      value: 'Survivor',
      icon: <SurvivorIcon className={FILTER_ICON} />,
      activeClassName: 'bg-accent-green text-text-inverted',
      label: (
        <span className="inline-flex items-center gap-1.5">
          {dict.filters.survivor && <span>{dict.filters.survivor}</span>}
          {typeof survivorCount === 'number' && (
            <Badge tone="onAccent" size="xs" plain className={COUNT_BADGE}>
              {survivorCount}
            </Badge>
          )}
        </span>
      ),
    },
    {
      value: 'Killer',
      icon: <KillerIcon className={FILTER_ICON} />,
      activeClassName: 'bg-accent-red text-text-inverted',
      label: (
        <span className="inline-flex items-center gap-1.5">
          {dict.filters.killer && <span>{dict.filters.killer}</span>}
          {typeof killerCount === 'number' && (
            <Badge tone="onAccent" size="xs" plain className={COUNT_BADGE}>
              {killerCount}
            </Badge>
          )}
        </span>
      ),
    },
  ];

  const roleCount = role === 'Survivor' ? survivorCount : killerCount;

  return (
    <Surface
      aria-label={dict.filters.filtersTitle}
      as="section"
      padding="none"
      className="relative z-30 flex w-full flex-col bg-bg-surface/90 shadow-xs backdrop-blur-xl transition-colors"
    >
      <div className="flex items-center gap-3 px-3 pt-3 sm:px-4 sm:pt-4">
        <IconTile size="sm" tone={role === 'Survivor' ? 'green' : 'red'}>
          {role === 'Survivor' ? <SurvivorIcon className="h-5 w-5" /> : <KillerIcon className="h-5 w-5" />}
        </IconTile>
        <div className="min-w-0">
          <h1 className="type-page-title text-text-primary">{dict.filters.perks}</h1>
          {typeof roleCount === 'number' && (
            <p className="type-caption text-text-muted">
              {roleCount.toLocaleString(locale)} {dict.pagination.results}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
        <SegmentedControl
          ariaLabel={dict.filters.sortByRole}
          value={role}
          onChange={setRole}
          options={roleOptions}
        />

        {/* Takes whatever the row has left (wrapping below the role switch when that is under 18rem). */}
        <PerkSearchBox
          rolePerks={rolePerks}
          search={search}
          setSearch={setSearch}
          activeTypes={activeTypes}
          onTypesChange={onTypesChange}
          suggestPerks
          typesInField={false}
          className="relative z-40 min-w-56 flex-1"
        />

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
          buttonClassName="rounded-full py-2.5"
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
      </div>

      <PerkResultsStrip
        totalResults={totalResults}
        activeTypes={activeTypes}
        onTypesChange={onTypesChange}
        ownershipFilter={ownershipFilter}
        setOwnershipFilter={setOwnershipFilter}
        scope={scope}
        setScope={setScope}
        sortBy={sortBy}
        setSortBy={setSortBy}
        order={order}
        setOrder={setOrder}
      />
    </Surface>
  );
};
