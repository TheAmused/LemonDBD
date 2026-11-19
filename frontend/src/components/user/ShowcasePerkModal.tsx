'use client';
import { PerkHexIcon } from '@/components/icons/DbdIcons';
// frontend/src/components/user/ShowcasePerkModal.tsx

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PerkIcon } from '@/components/ui/PerkIcon';
import { Check } from 'lucide-react';
import type { RoleCategory, Perk } from '@/types/perks';
import { perkTypesByRole } from '@/utils/perkTypes';
import { usePerkTypeVocabulary } from '@/hooks/usePerkTypeVocabulary';
import { isEmptyQuery, parsePerkQuery } from '@/utils/perkSearch/parse';
import { roleOnlyConflict, searchPerks } from '@/utils/perkSearch/match';
import { sortByRelevance } from '@/utils/perkSearch/sort';
import { SearchInput } from '@/components/common/Field';
import { CONTROL_HEIGHT } from '@/components/perks/PerkSearchBox';
import { cn } from '@/utils/cn';
import { roleOnlyMessage } from '@/components/perks/roleOnlyMessage';
import { useCatalogPerks } from '@/hooks/useCatalogPerks';
import { useProgressiveList } from '@/hooks/useProgressiveList';
import { Modal } from '@/components/common/Modal';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { useDictionary } from "@/context/DictionaryContext";
import { SelectableCard } from '@/components/common/SelectableCard';
import { useOnValueChange } from '@/hooks/useOnValueChange';
import { getPerkIconThumbUrl } from '@/utils/perkUtils';

/** The slots sit clockwise from the top (top, right, bottom, left); the build fills them the other way round. */
const FILL_ORDER = [0, 3, 2, 1] as const;

interface ShowcasePerkModalProps {
  isOpen: boolean;
  role: RoleCategory;
  /** The four slots of the main's build; null is an empty slot. */
  perkIds: (number | null)[];
  /** Applied straight away, so the build behind the panel updates with every pick. */
  onSetPerk: (slotIndex: number, perkId: number | null) => void;
  onClose: () => void;
  locale?: string;
}

const PerkGridItem = React.memo<{
  perk: Perk;
  isSelected: boolean;
  onToggle: (perk: Perk) => void;
}>(({ perk, isSelected, onToggle }) => {
  return (
    <SelectableCard selected={isSelected} className="group relative flex flex-col items-center p-2 text-center sm:p-3"
     
      onClick={() => onToggle(perk)}>
      {/* Perk Icon — just the icon, no shape/background/border behind it */}
      <div className="relative aspect-square w-full max-w-21 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform pointer-events-none">
        <PerkIcon
          perk={perk}
          src={getPerkIconThumbUrl(perk) ?? undefined}
          alt={perk.name}
          fallbackIcon={<PerkHexIcon className="h-8 w-8 text-accent-red" />}
          className="object-contain"
        />
      </div>

      {/* Name */}
      <span className="type-strong text-text-primary group-hover:text-accent-red line-clamp-1">
        {perk.name}
      </span>

      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent-red text-text-inverted">
          <Check className="icon-2xs stroke-[3]" />
        </div>
      )}
    </SelectableCard>
  );
});
PerkGridItem.displayName = 'PerkGridItem';

export const ShowcasePerkModal: React.FC<ShowcasePerkModalProps> = ({ isOpen, role, perkIds, onSetPerk, onClose, locale = 'en' }) => {
  const dict = useDictionary();
  const [search, setSearch] = useState('');
  const { perks, loading } = useCatalogPerks(locale, isOpen);
  const vocab = usePerkTypeVocabulary();

  useOnValueChange(isOpen, (open) => {
    if (open) {
      setSearch('');
    }
  });

  // The role's perks are listed right away, by name; a search narrows them, best match first (a type named in the text counts).
  const sortedPerks = useMemo(
    () =>
      perks
        .filter((p) => (p.category || '').toLowerCase() === role.toLowerCase())
        .sort((a, b) => a.name.localeCompare(b.name, locale)),
    [perks, role, locale]
  );
  const query = useMemo(() => parsePerkQuery(search, vocab), [search, vocab]);
  const filteredPerks = useMemo(
    () =>
      isEmptyQuery(query) ? sortedPerks : sortByRelevance(searchPerks(sortedPerks, query), locale),
    [sortedPerks, query, locale]
  );
  const typesByRole = useMemo(() => perkTypesByRole(perks), [perks]);
  const conflict = filteredPerks.length === 0 ? roleOnlyConflict(query, [], role, typesByRole) : null;

  // The grid fills in as it is scrolled: a role has a couple hundred perks, each with an icon.
  const { limit, rootRef, sentinelRef } = useProgressiveList(filteredPerks.length, `${role}|${search}`);
  const visiblePerks = useMemo(() => filteredPerks.slice(0, limit), [filteredPerks, limit]);

  // Read through a ref so togglePerk keeps one identity and a pick re-renders only the tiles whose selection changed.
  const buildRef = useRef({ perkIds, onSetPerk });
  useLayoutEffect(() => {
    buildRef.current = { perkIds, onSetPerk };
  });

  // Picking fills the first free slot, picking a chosen perk again frees its slot; a full build ignores new picks.
  const togglePerk = useCallback((perk: Perk) => {
    if (!perk.id) return;
    const { perkIds: current, onSetPerk: setPerk } = buildRef.current;
    const slot = current.indexOf(perk.id);
    if (slot >= 0) {
      setPerk(slot, null);
      return;
    }
    const freeSlot = FILL_ORDER.find((s) => current[s] === null);
    if (freeSlot !== undefined) setPerk(freeSlot, perk.id);
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      title={dict.user.selectPerk}
      className="max-h-vh-85 flex flex-col"
      bodyClassName="flex flex-col min-h-0 overflow-hidden"
      borderless
    >
      {/* The grid below already lists the matching perks, so the field is just a field. */}
      <div className="shrink-0 px-4 pt-4 sm:px-6 sm:pt-6">
        <SearchInput
          pill
          fieldSize="sm"
          className={cn('bg-bg-elevated/60 font-medium', CONTROL_HEIGHT)}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={dict.filters.searchPlaceholder}
          aria-label={dict.filters.searchPlaceholder}
          data-autofocus
        />
      </div>

      {/* Perks Grid */}
      <div ref={rootRef} className="flex-1 overflow-y-auto px-4 pb-4 pt-3 sm:px-6 sm:pb-6 min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Spinner size="lg" tone="accent" />
            <p className="text-xs text-text-muted">
              {dict.user.loadingPerks}
            </p>
          </div>
        ) : filteredPerks.length === 0 ? (
          <EmptyState variant="inline" title={conflict ? roleOnlyMessage(conflict, dict, locale) : dict.user.noPerksFound} />
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {visiblePerks.map((perk) => (
                <PerkGridItem
                  key={perk.id ?? perk.name}
                  perk={perk}
                  isSelected={perk.id !== undefined && perkIds.includes(perk.id)}
                  onToggle={togglePerk}
                />
              ))}
            </div>
            <div ref={sentinelRef} aria-hidden="true" className="h-px" />
          </>
        )}
      </div>
    </Modal>
  );
};
