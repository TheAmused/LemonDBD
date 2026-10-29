'use client';
// frontend/src/components/streaks/id-please/usePerkCoordinates.ts

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocale } from '@/context/DictionaryContext';
import { useCatalogPerks } from '@/hooks/useCatalogPerks';
import { computeEligiblePool, perkCoordinate } from '@/components/generator/lib/perkPicker';

export interface PerkCoordinate {
  page: number;
  slot: number;
}

/**
 * Where each perk sits in the in-game inventory, as the [P/S] tag of the randomizers says it: the perks you own,
 * alphabetical in the current language, fifteen to a page. Same sorting as the randomizer, so
 * the two can never disagree. Keyed by perk id; a perk the player does not own has no coordinate.
 */
export function usePerkCoordinates(): ReadonlyMap<number, PerkCoordinate> {
  const locale = useLocale();
  const { user } = useAuth();
  // The shared catalog entry (Perks page, tier lists, loadout picker): whichever opens first pays for the download.
  const { perks } = useCatalogPerks(locale);

  return useMemo(() => {
    const coordinates = new Map<number, PerkCoordinate>();
    if (perks.length === 0) return coordinates;
    for (const role of ['Killer', 'Survivor'] as const) {
      computeEligiblePool([...perks], role, Boolean(user)).forEach((perk, index) => {
        if (perk.id !== undefined) coordinates.set(perk.id, perkCoordinate(index));
      });
    }
    return coordinates;
  }, [perks, user]);
}
