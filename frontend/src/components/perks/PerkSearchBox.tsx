'use client';
// frontend/src/components/perks/PerkSearchBox.tsx
//
// THE perk search (Perks page and the profile loadout picker): one SearchInput
// with the active perk-type filters inside it as chips (its token variant), a
// "Types" CustomDropdown (multi-select variant) next to it, and a dropdown under the field offering the types the text is starting
// to name ("hea" -> Healing · 47) and, where wanted, the best-matching perks.
// Everything is computed from the catalog the caller already holds.
import React, { useMemo, useRef, useState } from 'react';
import { SearchInput } from '@/components/common/Field';
import { CustomDropdown } from '@/components/common/CustomDropdown';
import { MENU_PANEL_CLASS, Popover } from '@/components/common/Popover';
import { MenuItem } from '@/components/common/MenuItem';
import { Badge } from '@/components/common/Badge';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { usePerkTypeVocabulary } from '@/hooks/usePerkTypeVocabulary';
import type { Perk } from '@/types/perks';
import { PERK_TYPES, getKnownPerkTypes, type PerkType } from '@/utils/perkTypes';
import { parsePerkQuery } from '@/utils/perkSearch/parse';
import { searchPerks } from '@/utils/perkSearch/match';
import { sortByRelevance } from '@/utils/perkSearch/sort';
import { suggestPerkTypes } from '@/utils/perkSearch/suggest';
import { formatMessage } from '@/utils/i18nFormat';
import { cn } from '@/utils/cn';

const MAX_PERK_SUGGESTIONS = 8;

/** Field and Types button share one height so the pair reads as one control. */
const CONTROL_HEIGHT = 'py-2 sm:py-2.5 lg:py-3 lg:text-sm wide:py-3.5';

interface PerkSearchBoxProps {
  /** The current role's perks: the types offered, their counts and the perk suggestions come from them. */
  rolePerks: readonly Perk[];
  search: string;
  setSearch: (value: string) => void;
  activeTypes: readonly PerkType[];
  onTypesChange: (types: PerkType[]) => void;
  /** List matching perks under the field too (off where the grid right below already shows them). */
  suggestPerks?: boolean;
  /** Mark the field as the control a dialog focuses when it opens (data-autofocus). */
  focusOnOpen?: boolean;
  className?: string;
}

export const PerkSearchBox: React.FC<PerkSearchBoxProps> = ({
  rolePerks,
  search,
  setSearch,
  activeTypes,
  onTypesChange,
  suggestPerks = false,
  focusOnOpen = false,
  className,
}) => {
  const dict = useDictionary();
  const locale = useLocale();
  const vocab = usePerkTypeVocabulary();
  const [open, setOpen] = useState(false);
  const fieldRef = useRef<HTMLLabelElement>(null);

  // Only the types this role's perks actually have are offered (no "Hex 0" on the Survivor side).
  const typeCounts = useMemo(() => {
    const counts: Partial<Record<PerkType, number>> = {};
    for (const perk of rolePerks) for (const type of getKnownPerkTypes(perk)) counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, [rolePerks]);
  const roleTypes = useMemo(() => PERK_TYPES.filter((type) => (typeCounts[type] ?? 0) > 0), [typeCounts]);

  const typeSuggestions = useMemo(
    () => suggestPerkTypes(search, vocab, roleTypes.filter((t) => !activeTypes.includes(t))),
    [search, vocab, roleTypes, activeTypes]
  );
  const perkSuggestions = useMemo(
    () =>
      suggestPerks && search.trim()
        ? sortByRelevance(searchPerks(rolePerks, parsePerkQuery(search, vocab)), locale).slice(0, MAX_PERK_SUGGESTIONS)
        : [],
    [suggestPerks, search, rolePerks, vocab, locale]
  );

  const typeOptions = useMemo(
    () =>
      roleTypes.map((type) => ({
        value: type,
        label: dict.perkTypes.labels[type],
        sublabel: (typeCounts[type] ?? 0).toLocaleString(locale),
      })),
    [roleTypes, dict, typeCounts, locale]
  );
  // Chips for types the role does not have stay visible (and removable): the empty state explains them.
  const tokens = activeTypes.map((type) => ({
    key: type,
    label: dict.perkTypes.labels[type],
    removeLabel: formatMessage(dict.perkTypes.removeType, { type: dict.perkTypes.labels[type] }, locale),
  }));

  const showDropdown = open && search.trim().length > 0 && (typeSuggestions.length > 0 || perkSuggestions.length > 0);

  return (
    <div className={cn('flex w-full min-w-0 items-center gap-2', className)}>
      <SearchInput
        frameRef={fieldRef}
        pill
        fieldSize="sm"
        wrapperClassName={cn('flex-1 bg-bg-elevated/60 font-medium', CONTROL_HEIGHT)}
        tokens={tokens}
        onRemoveToken={(key) => onTypesChange(activeTypes.filter((t) => t !== key))}
        value={search}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
          // Enter takes the first suggested type, so "healing" + Enter becomes a filter chip.
          if (e.key === 'Enter' && typeSuggestions.length > 0) {
            e.preventDefault();
            onTypesChange([...activeTypes, typeSuggestions[0].type]);
            setSearch(typeSuggestions[0].remainingSearch);
          }
        }}
        onClear={() => {
          setSearch('');
          setOpen(false);
        }}
        clearLabel={dict.filters.clearSearch}
        placeholder={activeTypes.length > 0 ? '' : dict.perkTypes.searchPlaceholder}
        aria-label={dict.perkTypes.searchPlaceholder}
        data-autofocus={focusOnOpen || undefined}
      />

      <CustomDropdown<PerkType>
        options={typeOptions}
        values={activeTypes.filter((t) => roleTypes.includes(t))}
        onValuesChange={(next) => onTypesChange([...next, ...activeTypes.filter((t) => !roleTypes.includes(t))])}
        label={dict.perkTypes.typesButton}
        ariaLabel={dict.perkTypes.typeFilters}
        clearLabel={dict.perkTypes.clearTypes}
        accent="primary"
        align="right"
        className="shrink-0"
        buttonClassName={`rounded-full bg-bg-elevated/60 ${CONTROL_HEIGHT}`}
      />

      <Popover
        open={showDropdown}
        anchorRef={fieldRef}
        onClose={() => setOpen(false)}
        matchWidth
        returnFocus={false}
        className={cn(MENU_PANEL_CLASS, 'flex max-h-72 flex-col gap-1 overflow-y-auto custom-scrollbar')}
      >
        {typeSuggestions.length > 0 && (
          <>
            <span className="px-3 pt-1 type-strong-2xs text-text-muted">{dict.perkTypes.suggestionsHeading}</span>
            {typeSuggestions.map(({ type, remainingSearch }) => (
              <MenuItem
                key={type}
                className="justify-between"
                onClick={() => {
                  onTypesChange([...activeTypes, type]);
                  setSearch(remainingSearch);
                  setOpen(false);
                }}
              >
                <span className="type-strong text-accent-amber truncate">{dict.perkTypes.labels[type]}</span>
                <Badge tone="neutral" size="xs" plain>
                  {(typeCounts[type] ?? 0).toLocaleString(locale)}
                </Badge>
              </MenuItem>
            ))}
          </>
        )}
        {perkSuggestions.map((perk, idx) => (
          <MenuItem
            className="justify-between"
            key={`${perk.name}-${idx}`}
            onClick={() => {
              setSearch(perk.name);
              setOpen(false);
            }}
          >
            <span className="flex min-w-0 flex-col">
              <span className="type-strong text-text-primary truncate">{perk.name}</span>
              {perk.alternate_name && (
                <span className="type-strong-2xs text-accent-amber truncate">
                  {dict.filters.aliasLabel && `${dict.filters.aliasLabel} `}
                  {perk.alternate_name}
                </span>
              )}
            </span>
            <span className="type-strong-2xs text-text-muted shrink-0">
              {perk.character && perk.character !== 'General' ? perk.character : dict.modal.generalPerk}
            </span>
          </MenuItem>
        ))}
      </Popover>
    </div>
  );
};
