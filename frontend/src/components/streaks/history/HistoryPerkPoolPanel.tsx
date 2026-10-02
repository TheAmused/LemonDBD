'use client';
// frontend/src/components/streaks/history/HistoryPerkPoolPanel.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Lock, Search, Sparkles, X } from 'lucide-react';
import { Perk } from '@/types/gauntletStreak';
import { perkIconUrl as perkIconFor } from '@/utils/staticUrl';
import { usePerkDisplayName, usePerkLabel } from '@/context/DisplayNamesContext';
import { normalizeSearchText } from '@/utils/perkUtils';

const UnlockedTile: React.FC<{ perk: Perk; displayName: string; justUnlocked: boolean }> = ({
  perk,
  displayName,
  justUnlocked,
}) => {
  const [failed, setFailed] = useState(false);
  const src = perkIconFor(perk);
  return (
    <div
      className={`flex flex-col items-center gap-1.5 p-2 rounded-lg bg-bg-elevated border border-border-color ${
        justUnlocked ? 'chaos-badge-pop' : ''
      }`}
    >
      <div className="w-full aspect-square rounded-md overflow-hidden bg-bg-elevated flex items-center justify-center">
        {src && !failed ? (
          <img
            src={src}
            alt={displayName}
            className="w-full h-full object-contain p-1.5"
            onError={() => setFailed(true)}
          />
        ) : (
          <Sparkles className="w-6 h-6 text-text-muted" />
        )}
      </div>
      <span className="text-mini font-medium text-center text-text-secondary leading-tight line-clamp-2">
        {displayName}
      </span>
    </div>
  );
};

const LockedTile: React.FC<{ perk: Perk; displayName: string }> = ({ perk, displayName }) => {
  const [failed, setFailed] = useState(false);
  const src = perkIconFor(perk);
  return (
    <div className="relative flex flex-col items-center gap-1.5 p-2 rounded-lg bg-bg-elevated border border-dashed border-2 border-border-color overflow-hidden">
      <div className="w-full aspect-square rounded-md overflow-hidden bg-bg-elevated flex items-center justify-center grayscale opacity-40">
        {src && !failed ? (
          <img
            src={src}
            alt={displayName}
            className="w-full h-full object-contain p-1.5"
            onError={() => setFailed(true)}
          />
        ) : (
          <Sparkles className="w-6 h-6 text-text-muted" />
        )}
      </div>
      <span className="text-mini font-medium text-center text-text-muted leading-tight line-clamp-2 opacity-60">
        {displayName}
      </span>
      <div className="absolute inset-0 flex items-center justify-center bg-bg-primary/50">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-elevated border border-border-color">
          <Lock className="w-3.5 h-3.5 text-text-muted" />
        </div>
      </div>
    </div>
  );
};

export interface HistoryPerkPoolPanelProps {
  pool: Perk[];
  unlockedPerkNames: string[];
  dict?: Dictionary;
}

export const HistoryPerkPoolPanel: React.FC<HistoryPerkPoolPanelProps> = ({
  pool,
  unlockedPerkNames,
  dict,
}) => {
  const fallbackName = usePerkDisplayName();
  const perkLabel = usePerkLabel();
  // Matched by id where possible, since a perk's canonical name can differ between catalogs.
  const localName = (perk: Perk) => perkLabel(perk)?.name ?? fallbackName(perk.name);
  const [query, setQuery] = useState('');
  const normalizedQuery = normalizeSearchText(query);
  const matchesQuery = (perk: Perk) =>
    !normalizedQuery ||
    normalizeSearchText(localName(perk)).includes(normalizedQuery) ||
    normalizeSearchText(perk.name).includes(normalizedQuery);

  const unlockedSet = useMemo(() => new Set(unlockedPerkNames), [unlockedPerkNames]);
  const unlocked = pool.filter((p) => unlockedSet.has(p.name) && matchesQuery(p));
  const locked = pool.filter((p) => !unlockedSet.has(p.name) && matchesQuery(p));
  const noMatchText = dict?.streaks?.noPerksMatchSearch || 'No perks match your search.';

  const seenUnlockedRef = useRef<Set<string>>(new Set());
  const [justUnlockedNames, setJustUnlockedNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    const seen = seenUnlockedRef.current;
    const freshlyUnlocked = new Set<string>();
    for (const name of unlockedPerkNames) {
      if (!seen.has(name)) freshlyUnlocked.add(name);
    }
    if (seen.size > 0 && freshlyUnlocked.size > 0) {
      setJustUnlockedNames(freshlyUnlocked);
      const timer = setTimeout(() => setJustUnlockedNames(new Set()), 1200);
      unlockedPerkNames.forEach((name) => seen.add(name));
      return () => clearTimeout(timer);
    }
    unlockedPerkNames.forEach((name) => seen.add(name));
  }, [unlockedPerkNames]);

  return (
    <div className="mt-10 rounded-2xl border border-border-color bg-bg-surface backdrop-blur-sm p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">
          {dict?.streaks?.perkPool || 'Perk pool'}
        </h3>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={dict?.streaks?.searchPerksPlaceholder || 'Search...'}
            aria-label={dict?.streaks?.searchPerksPlaceholder || 'Search...'}
            className="w-full rounded-xl border border-border-color bg-bg-elevated py-2 pl-9 pr-8 text-xs text-text-primary shadow-inner placeholder:text-text-muted focus:border-accent-red focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={dict?.streaks?.clearSearch || 'Clear search'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-muted transition-colors hover:text-text-primary cursor-pointer"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="mb-2 flex items-center gap-1.5 type-strong text-accent-green">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {dict?.streaks?.availableLabel || 'Available'}
      </div>
      {unlocked.length === 0 ? (
        <p className="text-xs text-text-muted mb-5">
          {normalizedQuery ? noMatchText : dict?.streaks?.noPerksUnlockedYet || 'No perks unlocked yet.'}
        </p>
      ) : (
        <div className="mb-5 grid grid-cols-3 sm:grid-cols-6 md:grid-cols-10 lg:grid-cols-[repeat(15,minmax(0,1fr))] gap-2">
          {unlocked.map((perk) => (
            <UnlockedTile
              key={perk.id ?? perk.name}
              perk={perk}
              displayName={localName(perk)}
              justUnlocked={justUnlockedNames.has(perk.name)}
            />
          ))}
        </div>
      )}

      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-text-muted">
        <Lock className="w-3.5 h-3.5" />
        {dict?.streaks?.lockedLabel || 'Locked'}
      </div>
      {locked.length === 0 ? (
        <p className="text-xs text-text-muted">
          {normalizedQuery ? noMatchText : dict?.streaks?.everyPerkUnlocked || 'Every perk is unlocked.'}
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-10 lg:grid-cols-[repeat(15,minmax(0,1fr))] gap-2">
          {locked.map((perk) => (
            <LockedTile key={perk.id ?? perk.name} perk={perk} displayName={localName(perk)} />
          ))}
        </div>
      )}
    </div>
  );
};
