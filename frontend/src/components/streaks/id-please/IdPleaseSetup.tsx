'use client';
// frontend/src/components/streaks/id-please/IdPleaseSetup.tsx

import React, { useMemo, useState } from 'react';
import { SelectableCard } from '@/components/common/SelectableCard';
import { Button } from '@/components/common/Button';
import { PerkSearchBox } from '@/components/perks/PerkSearchBox';
import { PerkFilterMenu } from '@/components/perks/PerkFilterMenu';
import { roleOnlyMessage } from '@/components/perks/roleOnlyMessage';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { useCatalogPerks } from '@/hooks/useCatalogPerks';
import { useProgressiveList } from '@/hooks/useProgressiveList';
import { usePerkTypeVocabulary } from '@/hooks/usePerkTypeVocabulary';
import { isEmptyQuery, parsePerkQuery } from '@/utils/perkSearch/parse';
import { roleOnlyConflict, searchPerks, typeCountsIfAdded } from '@/utils/perkSearch/match';
import { sortByRelevance } from '@/utils/perkSearch/sort';
import { perkTypesByRole, type PerkType } from '@/utils/perkTypes';
import { cn } from '@/utils/cn';
import { useStoredItem } from '@/hooks/useStoredItem';
import {
  ID_PLEASE_LOADOUT_SIZE,
  idPleaseOpeningStorageKey,
  readIdPleaseOpening,
  serializeIdPleaseOpening,
  type IdPleaseOpening,
} from '@/utils/idPleaseOpening';
import { formatMessage } from '@/utils/i18nFormat';
import { idPleaseLaneSide } from '@/types/idPleaseStreak';
import type { IdPleaseDifficulty, IdPleaseLane, IdPleasePerk, IdPleaseSide } from '@/types/idPleaseStreak';
import { StreakActionBar, StreakActionButton } from '../StreakActionBar';
import { IdPleaseMatchCard } from './IdPleaseMatchCard';
import { IdPleasePerkTile } from './IdPleaseTiles';
import { usePerkCoordinates } from './usePerkCoordinates';
import type { PerkCoordinate } from './usePerkCoordinates';
import { useIdPleasePreview, useIdPleaseRoster } from './useIdPleaseSetupData';

// A side has a couple of hundred perks, each with an icon: the grid fills in as it is scrolled.
const FIRST_CHUNK = 36;

/** Place of a perk in the inventory (page, then slot); perks the inventory does not list go last. */
function inventoryIndex(coordinates: ReadonlyMap<number, PerkCoordinate>, perk: IdPleasePerk): number {
  const found = coordinates.get(perk.id);
  return found ? (found.page - 1) * 1000 + found.slot : Number.MAX_SAFE_INTEGER;
}

interface IdPleaseSetupProps {
  lane: IdPleaseLane;
  difficulty: IdPleaseDifficulty;
  /** The side the tab opens on in the mixed lane; ignored by a single-side lane, which has only its own. */
  startSide: IdPleaseSide;
  /** Names this attempt of this run: a saved opening only applies to the attempt it was made in. */
  attemptKey: string;
  fingerprint: string | undefined;
  busy: boolean;
  onStart: (side: IdPleaseSide, perkPositions: number[]) => void;
}

/** Choosing the opening: four perks (and, in the mixed lane, the side to start on), with a preview of the first match (and, in the mixed lane, the second) before you commit. */
export const IdPleaseSetup: React.FC<IdPleaseSetupProps> = ({ lane, difficulty, startSide, attemptKey, fingerprint, busy, onStart }) => {
  const dict = useDictionary();
  const s = dict.streaks;
  const locale = useLocale();
  const vocab = usePerkTypeVocabulary();
  const { perks: catalog, loading: catalogLoading } = useCatalogPerks(locale);
  const coordinates = usePerkCoordinates();
  const laneSide = idPleaseLaneSide(lane);
  // The side and the perks live in localStorage, so a refresh keeps them. They are only used for this attempt and
  // this roster: a new attempt, or characters and perks that changed, start from an empty opening.
  const [savedOpening, saveOpening] = useStoredItem(idPleaseOpeningStorageKey(lane, difficulty));
  const openingKey = `${attemptKey}|${fingerprint ?? ''}`;
  const opening = readIdPleaseOpening(savedOpening, openingKey);
  const side = laneSide ?? opening.side ?? startSide;
  const chosen = opening.positions;
  const updateOpening = (next: IdPleaseOpening) => saveOpening(serializeIdPleaseOpening(openingKey, next));
  const [search, setSearch] = useState('');
  const [types, setTypes] = useState<PerkType[]>([]);

  const { roster, loading } = useIdPleaseRoster(lane, side, fingerprint);
  // Hardcore+ shuffles the perks when the run starts, so there is no first match to show beforehand.
  const shuffled = difficulty === 'hardcore_plus';
  const preview = useIdPleasePreview(lane, difficulty, side, shuffled ? [] : chosen, fingerprint);

  const changeSide = (next: IdPleaseSide) => {
    updateOpening({ side: next, positions: [] });
    setSearch('');
    setTypes([]);
  };

  const toggle = (position: number) => {
    const positions = chosen.includes(position)
      ? chosen.filter((p) => p !== position)
      : chosen.length >= ID_PLEASE_LOADOUT_SIZE
        ? chosen
        : [...chosen, position];
    updateOpening({ side, positions });
  };

  // The perks the player owns on this side, in the order of the in-game inventory, so a perk's [P/S] tag reads straight down the grid.
  const inventory: IdPleasePerk[] = useMemo(
    () => [...(roster?.perks ?? [])].sort((a, b) => inventoryIndex(coordinates, a) - inventoryIndex(coordinates, b)),
    [roster, coordinates]
  );
  // The same search as the Perks page, run over the catalog entries of those perks (they carry the types, aliases and characters).
  const rolePerks = useMemo(() => {
    const owned = new Set(inventory.map((perk) => perk.id));
    return catalog.filter((perk) => perk.id !== undefined && owned.has(perk.id));
  }, [catalog, inventory]);
  const query = useMemo(() => parsePerkQuery(search, vocab), [search, vocab]);
  const typeCounts = useMemo(() => typeCountsIfAdded(rolePerks, query, types), [rolePerks, query, types]);
  const filtering = !isEmptyQuery(query) || types.length > 0;
  const visible: IdPleasePerk[] = useMemo(() => {
    if (!filtering) return inventory;
    const byId = new Map(inventory.map((perk) => [perk.id, perk]));
    return sortByRelevance(searchPerks(rolePerks, query, types), locale).flatMap((perk) => byId.get(perk.id ?? -1) ?? []);
  }, [filtering, inventory, rolePerks, query, types, locale]);
  const conflict =
    filtering && visible.length === 0 ? roleOnlyConflict(query, types, side === 'killer' ? 'Killer' : 'Survivor', perkTypesByRole(catalog)) : null;
  const { limit, rootRef, sentinelRef } = useProgressiveList(visible.length, `${side}|${search}|${types.join(',')}`, FIRST_CHUNK);
  const shown = useMemo(() => visible.slice(0, limit), [visible, limit]);

  const full = chosen.length === ID_PLEASE_LOADOUT_SIZE;
  const unplayable = !loading && ((roster?.characters.length ?? 0) === 0 || (roster?.perks.length ?? 0) < ID_PLEASE_LOADOUT_SIZE);

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="type-label text-text-secondary">{s.idPleaseSetupTitle}</h2>
        <p className="text-sm tabular-nums text-text-muted">{formatMessage(s.idPleasePerksChosen, { count: chosen.length })}</p>
      </header>

      {laneSide === null && (
        <fieldset className="flex flex-wrap items-center gap-2" aria-label={s.idPleaseChooseSide}>
          {(['survivor', 'killer'] as const).map((option) => (
            <Button
              key={option}
              variant={side === option ? 'primary' : 'secondary'}
              aria-pressed={side === option}
              onClick={() => changeSide(option)}
              disabled={busy}
            >
              {option === 'killer' ? s.killer : s.survivor}
            </Button>
          ))}
        </fieldset>
      )}

      <section>
        {/* The Perks page's search and Filters button: aliases and characters in the search, perk types in the popover. */}
        <div className="mb-3 flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
          <PerkSearchBox
            rolePerks={rolePerks}
            search={search}
            setSearch={setSearch}
            activeTypes={types}
            onTypesChange={setTypes}
            suggestPerks
            typesInField={false}
            className="relative z-40 min-w-48 flex-1 sm:max-w-72"
          />
          <PerkFilterMenu perks={rolePerks} activeTypes={types} onTypesChange={setTypes} typeCounts={typeCounts} />
        </div>

        {unplayable ? (
          <p className="py-6 text-center text-sm text-text-muted">{s.idPleaseSideEmpty}</p>
        ) : loading || (filtering && catalogLoading) ? (
          <p className="py-6 text-center text-sm text-text-muted">{dict.app.loading}</p>
        ) : visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">{conflict ? roleOnlyMessage(conflict, dict, locale) : s.idPleaseNoPerksFound}</p>
        ) : (
          <div ref={rootRef} className="grid max-h-96 grid-cols-5 gap-2 overflow-y-auto pr-1 phone-md:grid-cols-6 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11 xl:grid-cols-14">
            {shown.map((perk) => {
              const position = perk.position ?? 0;
              const picked = chosen.includes(position);
              return (
                <SelectableCard
                  key={perk.id}
                  selected={picked}
                  disabled={busy || (!picked && full)}
                  onClick={() => toggle(position)}
                  className="p-0"
                >
                  <IdPleasePerkTile perk={perk} coordinate={coordinates.get(perk.id)} className="border-0" />
                </SelectableCard>
              );
            })}
            <div ref={sentinelRef} aria-hidden="true" className="col-span-full h-px" />
          </div>
        )}
      </section>

      {preview && (
        <div className={cn('grid gap-6 border-t border-border-color pt-5', preview.second && 'lg:grid-cols-2')}>
          <IdPleaseMatchCard match={preview.first} />
          {preview.second && <IdPleaseMatchCard match={preview.second} title={s.idPleaseMatchTwoPreview} />}
        </div>
      )}

      <StreakActionBar>
        <StreakActionButton variant="green" onClick={() => onStart(side, chosen)} disabled={busy || !full || (!shuffled && !preview)}>
          {s.idPleaseStart}
        </StreakActionButton>
      </StreakActionBar>
    </div>
  );
};
