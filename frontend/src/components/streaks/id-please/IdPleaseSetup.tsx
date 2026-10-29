'use client';
// frontend/src/components/streaks/id-please/IdPleaseSetup.tsx

import React, { useMemo, useState } from 'react';
import { SelectableCard } from '@/components/common/SelectableCard';
import { Button } from '@/components/common/Button';
import { PerkSearchBox } from '@/components/perks/PerkSearchBox';
import { roleOnlyMessage } from '@/components/perks/roleOnlyMessage';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { useCatalogPerks } from '@/hooks/useCatalogPerks';
import { useProgressiveList } from '@/hooks/useProgressiveList';
import { usePerkTypeVocabulary } from '@/hooks/usePerkTypeVocabulary';
import { isEmptyQuery, parsePerkQuery } from '@/utils/perkSearch/parse';
import { roleOnlyConflict, searchPerks } from '@/utils/perkSearch/match';
import { sortByRelevance } from '@/utils/perkSearch/sort';
import { perkTypesByRole, type PerkType } from '@/utils/perkTypes';
import { cn } from '@/utils/cn';
import { formatMessage } from '@/utils/i18nFormat';
import { idPleaseLaneSide } from '@/types/idPleaseStreak';
import type { IdPleaseDifficulty, IdPleaseLane, IdPleasePerk, IdPleaseSide } from '@/types/idPleaseStreak';
import { StreakActionBar, StreakActionButton } from '../StreakActionBar';
import { IdPleaseMatchCard } from './IdPleaseMatchCard';
import { IdPleasePerkTile } from './IdPleaseTiles';
import { usePerkCoordinates } from './usePerkCoordinates';
import type { PerkCoordinate } from './usePerkCoordinates';
import { useIdPleasePreview, useIdPleaseRoster } from './useIdPleaseSetupData';

const LOADOUT_SIZE = 4;
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
  fingerprint: string | undefined;
  busy: boolean;
  onStart: (side: IdPleaseSide, perkPositions: number[]) => void;
}

/** Choosing the opening: four perks (and, in the mixed lane, the side to start on), with a preview of the first match (and, in the mixed lane, the second) before you commit. */
export const IdPleaseSetup: React.FC<IdPleaseSetupProps> = ({ lane, difficulty, startSide, fingerprint, busy, onStart }) => {
  const dict = useDictionary();
  const s = dict.streaks;
  const locale = useLocale();
  const vocab = usePerkTypeVocabulary();
  const { perks: catalog, loading: catalogLoading } = useCatalogPerks(locale);
  const coordinates = usePerkCoordinates();
  const laneSide = idPleaseLaneSide(lane);
  const [pickedSide, setPickedSide] = useState<IdPleaseSide>(startSide);
  const side = laneSide ?? pickedSide;
  const [chosen, setChosen] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [types, setTypes] = useState<PerkType[]>([]);

  const { roster, loading } = useIdPleaseRoster(lane, side, fingerprint);
  // Hardcore+ shuffles the perks when the run starts, so there is no first match to show beforehand.
  const shuffled = difficulty === 'hardcore_plus';
  const preview = useIdPleasePreview(lane, difficulty, side, shuffled ? [] : chosen, fingerprint);

  const changeSide = (next: IdPleaseSide) => {
    setPickedSide(next);
    setChosen([]);
    setSearch('');
    setTypes([]);
  };

  const toggle = (position: number) =>
    setChosen((current) => {
      if (current.includes(position)) return current.filter((p) => p !== position);
      return current.length >= LOADOUT_SIZE ? current : [...current, position];
    });

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

  const full = chosen.length === LOADOUT_SIZE;
  const unplayable = !loading && ((roster?.characters.length ?? 0) === 0 || (roster?.perks.length ?? 0) < LOADOUT_SIZE);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="type-card-title text-text-primary">{s.idPleaseSetupTitle}</h2>
        <p className="mt-1 text-sm text-text-secondary">{laneSide === null ? s.idPleaseIntro : s.idPleaseIntroSolo}</p>
      </div>

      {laneSide === null && (
        <fieldset className="flex flex-wrap items-center justify-center gap-2" aria-label={s.idPleaseChooseSide}>
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
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="type-label text-text-primary">{s.idPleasePickPerks}</h3>
          <span className="text-sm tabular-nums text-text-muted">{formatMessage(s.idPleasePerksChosen, { count: chosen.length })}</span>
        </div>

        {/* The Perks page's search box: perk types as chips, the Types menu, aliases and characters. */}
        <PerkSearchBox rolePerks={rolePerks} search={search} setSearch={setSearch} activeTypes={types} onTypesChange={setTypes} className="mb-3" />

        {unplayable ? (
          <p className="py-6 text-center text-sm text-text-muted">{s.idPleaseSideEmpty}</p>
        ) : loading || (filtering && catalogLoading) ? (
          <p className="py-6 text-center text-sm text-text-muted">{dict.app.loading}</p>
        ) : visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">{conflict ? roleOnlyMessage(conflict, dict, locale) : s.idPleaseNoPerksFound}</p>
        ) : (
          <div ref={rootRef} className="grid max-h-96 grid-cols-4 gap-2 overflow-y-auto pr-1 phone-md:grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
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

      {shuffled && <p className="text-center text-sm text-text-secondary">{s.idPleaseShuffleNote}</p>}

      <StreakActionBar>
        <StreakActionButton variant="green" onClick={() => onStart(side, chosen)} disabled={busy || !full || (!shuffled && !preview)}>
          {s.idPleaseStart}
        </StreakActionButton>
      </StreakActionBar>
    </div>
  );
};
