// frontend/src/context/DisplayNamesContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { backendBase } from '@/utils/staticUrl';

interface NamedRecord {
  description?: string;
  id: number;
  name: string;
}

interface DisplayNamesValue {
  /** Canonical (English) character/killer/survivor name -> localized name. */
  characterName: (name: string) => string;
  /** Canonical (English) perk name -> localized name. */
  perkName: (name: string) => string;
  /** A perk record -> its localized name and description, matched by id first, then by name. */
  perkLabel: (perk: { id?: number; name: string }) => LocalizedLabel | undefined;
}

const DisplayNamesContext = createContext<DisplayNamesValue>({
  characterName: (name) => name,
  perkName: (name) => name,
  perkLabel: () => undefined,
});

interface LocalizedLabel {
  name: string;
  description?: string;
}

interface DisplayMaps {
  /** Keyed by the canonical (lang=en) name. */
  byName: Map<string, LocalizedLabel>;
  /** Keyed by record id, which is stable where canonical names are not (a perk's lang=en name can differ from its stored one). */
  byId: Map<number, LocalizedLabel>;
}

const EMPTY_MAPS: DisplayMaps = { byName: new Map(), byId: new Map() };

/**
 * `canonicalUrl` must pass `lang=en` explicitly, not omit `lang` -- the
 * backend's extract_lang() treats a missing param as "sniff from Referer /
 * Accept-Language", not "give me English". On a same-origin deployment the
 * browser sends the full page path as Referer, so an omitted `lang` here
 * would silently translate the "canonical" side too and collapse this map's
 * keys to the localized names, breaking every lookup.
 */
async function buildDisplayMap(
  canonicalUrl: string,
  translatedUrl: string
): Promise<DisplayMaps> {
  const [canonicalRes, translatedRes] = await Promise.all([
    fetch(canonicalUrl).catch(() => null),
    fetch(translatedUrl).catch(() => null),
  ]);
  if (!canonicalRes?.ok || !translatedRes?.ok) return EMPTY_MAPS;

  const [canonicalData, translatedData] = await Promise.all([canonicalRes.json(), translatedRes.json()]);
  const canonicalById = new Map<number, string>();
  for (const item of (canonicalData.data || []) as NamedRecord[]) {
    canonicalById.set(item.id, item.name);
  }
  const byName = new Map<string, LocalizedLabel>();
  const byId = new Map<number, LocalizedLabel>();
  for (const item of (translatedData.data || []) as NamedRecord[]) {
    if (!item.name) continue;
    const label = { name: item.name, description: item.description };
    byId.set(item.id, label);
    const canonicalName = canonicalById.get(item.id);
    if (canonicalName) byName.set(canonicalName, label);
  }
  return { byName, byId };
}

/**
 * Loads the canonical-name -> localized-name lookup for every character and
 * perk once per locale, and makes it available anywhere under the streaks
 * tree via `useCharacterDisplayName` / `usePerkDisplayName`. Game state
 * (ownership, run progress, build slots, checkpoints) is always keyed by the
 * canonical English name, so this never touches that identifier -- it only
 * supplies a translated label for rendering.
 */
export const DisplayNamesProvider: React.FC<{ locale: string; children: React.ReactNode }> = ({
  locale,
  children,
}) => {
  const [characterMap, setCharacterMap] = useState<DisplayMaps>(EMPTY_MAPS);
  const [perkMap, setPerkMap] = useState<DisplayMaps>(EMPTY_MAPS);

  useEffect(() => {
    if (!locale || locale === 'en') {
      setCharacterMap(EMPTY_MAPS);
      setPerkMap(EMPTY_MAPS);
      return;
    }

    let cancelled = false;

    buildDisplayMap(
      `${backendBase}/api/v1/characters?category=all&lang=en`,
      `${backendBase}/api/v1/characters?category=all&lang=${locale}`
    ).then((map) => {
      if (!cancelled) setCharacterMap(map);
    });

    buildDisplayMap(
      `${backendBase}/api/v1/perks?limit=1000&lang=en`,
      `${backendBase}/api/v1/perks?limit=1000&lang=${locale}`
    ).then((map) => {
      if (!cancelled) setPerkMap(map);
    });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const value: DisplayNamesValue = {
    characterName: (name) => characterMap.byName.get(name)?.name || name,
    perkName: (name) => perkMap.byName.get(name)?.name || name,
    perkLabel: (perk) => (perk.id !== undefined ? perkMap.byId.get(perk.id) : undefined) ?? perkMap.byName.get(perk.name),
  };

  return <DisplayNamesContext.Provider value={value}>{children}</DisplayNamesContext.Provider>;
};

/**
 * Returns a resolver function mapping a canonical character/killer/survivor
 * name to its localized label. Returns a function (not a resolved string) so
 * it's safe to call repeatedly inside a list's `.map()` without violating the
 * rules of hooks.
 */
export function useCharacterDisplayName(): (name: string) => string {
  return useContext(DisplayNamesContext).characterName;
}

/** Returns a resolver function mapping a canonical perk name to its localized label. */
export function usePerkDisplayName(): (name: string) => string {
  return useContext(DisplayNamesContext).perkName;
}

/** Returns a resolver mapping a perk record to its localized name and description, or undefined when none. */
export function usePerkLabel(): (perk: { id?: number; name: string }) => LocalizedLabel | undefined {
  return useContext(DisplayNamesContext).perkLabel;
}
