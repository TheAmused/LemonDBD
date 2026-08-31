// frontend/src/context/DisplayNamesContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { backendBase } from '@/utils/staticUrl';

interface NamedRecord {
  id: number;
  name: string;
}

interface DisplayNamesValue {
  /** Canonical (English) character/killer/survivor name -> localized name. */
  characterName: (name: string) => string;
  /** Canonical (English) perk name -> localized name. */
  perkName: (name: string) => string;
}

const DisplayNamesContext = createContext<DisplayNamesValue>({
  characterName: (name) => name,
  perkName: (name) => name,
});

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
): Promise<Map<string, string>> {
  const [canonicalRes, translatedRes] = await Promise.all([
    fetch(canonicalUrl).catch(() => null),
    fetch(translatedUrl).catch(() => null),
  ]);
  if (!canonicalRes?.ok || !translatedRes?.ok) return new Map();

  const [canonicalData, translatedData] = await Promise.all([canonicalRes.json(), translatedRes.json()]);
  const canonicalById = new Map<number, string>();
  for (const item of (canonicalData.data || []) as NamedRecord[]) {
    canonicalById.set(item.id, item.name);
  }
  const map = new Map<string, string>();
  for (const item of (translatedData.data || []) as NamedRecord[]) {
    const canonicalName = canonicalById.get(item.id);
    if (canonicalName && item.name) map.set(canonicalName, item.name);
  }
  return map;
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
  const [characterMap, setCharacterMap] = useState<Map<string, string>>(new Map());
  const [perkMap, setPerkMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!locale || locale === 'en') {
      setCharacterMap(new Map());
      setPerkMap(new Map());
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
    characterName: (name) => characterMap.get(name) || name,
    perkName: (name) => perkMap.get(name) || name,
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
