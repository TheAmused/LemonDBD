'use client';
// frontend/src/components/streaks/id-please/IdPleaseMatchCard.tsx

import React from 'react';
import { useDictionary } from '@/context/DictionaryContext';
import { formatMessage } from '@/utils/i18nFormat';
import type { IdPleaseMatch } from '@/types/idPleaseStreak';
import { IdPleaseCharacterTile, IdPleasePerkTile } from './IdPleaseTiles';
import { usePerkCoordinates } from './usePerkCoordinates';

interface IdPleaseMatchCardProps {
  match: IdPleaseMatch;
  /** Replaces "Match N" (the setup shows "Match 2 (preview)"). */
  title?: string;
}

/** One match: who to play and with which perks, each perk with where it sits in the inventory. Flat on purpose: the tiles are the only boxes. */
export const IdPleaseMatchCard: React.FC<IdPleaseMatchCardProps> = ({ match, title }) => {
  const dict = useDictionary();
  const s = dict.streaks;
  const coordinates = usePerkCoordinates();
  return (
    <section className="mx-auto w-full max-w-4xl">
      <h3 className="mb-3 flex items-center gap-2 type-label text-text-primary">
        <span>{title ?? formatMessage(s.idPleaseMatchLabel, { number: match.number })}</span>
        <span className="text-text-muted" aria-hidden="true">
          ·
        </span>
        <span className="text-text-secondary">{match.side === 'killer' ? s.killer : s.survivor}</span>
      </h3>
      <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,4fr)] gap-2 sm:gap-3">
        <div className="flex flex-col">
          <p className="mb-1 truncate type-label-xs text-text-muted">{s.idPleasePlayAs}</p>
          <IdPleaseCharacterTile character={match.character} side={match.side} className="flex-1" />
        </div>
        <div>
          <p className="mb-1 truncate type-label-xs text-text-muted">{s.idPleasePerksHeading}</p>
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {match.perks.map((perk) => (
              <IdPleasePerkTile key={perk.id} perk={perk} coordinate={coordinates.get(perk.id)} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
