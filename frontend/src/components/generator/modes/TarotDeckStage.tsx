'use client';

import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Layers } from 'lucide-react';
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { pickRandomLoadout, buildDrawnSlots, getPerkTarotType, TarotType } from '../lib/perkPicker';
import { PerkSlot } from '../shared/PerkSlot';
import { useJackpotCelebration } from '../shared/useJackpotCelebration';
import { playCardFlip } from '@/utils/perkAudio';

export interface TarotDeckStageProps {
  role: RoleCategory;
  activePlayablePerks: Perk[];
  activeMutator: ChaosMutator | null;
  onRollComplete: (slots: DrawnSlot[]) => void;
  isBlind?: boolean;
  dict?: Dictionary;
  backendBase?: string;
}

interface TarotCard {
  type: TarotType;
  slot: DrawnSlot;
  flipped: boolean;
}

const DEFAULT_TYPE_NAMES: Record<TarotType, string> = {
  hex: 'The Hex',
  boon: 'The Boon',
  sacrifice: 'The Sacrifice',
  exhaustion: 'The Exhaustion',
  obsession: 'The Obsession',
  aura: 'The Watcher',
  generator: 'The Machinist',
  healing: 'The Caregiver',
  chase: 'The Chase',
  stealth: 'The Shadow',
  entity: 'The Entity',
};

/**
 * Card-back image for a given type, with a graceful text-only fallback if
 * the file is ever missing (never renders a broken <img>).
 */
const CardBackImage: React.FC<{ type: TarotType }> = ({ type }) => {
  const [errored, setErrored] = useState(false);

  if (errored) return null;

  return (
    <img
      src={`/images/tarot/the-${type}.png`}
      alt=""
      aria-hidden="true"
      onError={() => setErrored(true)}
      className="absolute inset-0 h-full w-full rounded-2xl object-cover"
    />
  );
};

export const TarotDeckStage: React.FC<TarotDeckStageProps> = ({
  role,
  activePlayablePerks,
  activeMutator,
  onRollComplete,
  isBlind = false,
  dict,
  backendBase,
}) => {
  const [cards, setCards] = useState<TarotCard[] | null>(null);
  const { flavorLine, celebrate } = useJackpotCelebration(dict);
  const reduceMotion = useReducedMotion();

  const typeNames = dict?.generator?.tarotCardNames || DEFAULT_TYPE_NAMES;

  const handleShuffle = () => {
    if (activePlayablePerks.length === 0) return;

    const picked = pickRandomLoadout(activePlayablePerks, activeMutator, 4);
    const slots = buildDrawnSlots(picked, activePlayablePerks);

    setCards(
      slots.map((slot) => ({
        type: slot.perk ? getPerkTarotType(slot.perk) : 'entity',
        slot,
        flipped: false,
      }))
    );
  };

  const handleFlip = (idx: number) => {
    if (!cards || cards[idx].flipped) return;

    playCardFlip();
    const next = cards.map((c, i) => (i === idx ? { ...c, flipped: true } : c));
    setCards(next);

    if (next.every((c) => c.flipped)) {
      celebrate(role);
      onRollComplete(next.map((c) => c.slot));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-10">
      <p className="text-xs font-bold text-slate-400 text-center">
        {dict?.generator?.tarotTapToFlip || 'Tap a card to reveal your perk'}
      </p>

      {cards ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {cards.map((card, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleFlip(idx)}
              disabled={card.flipped}
              className="cursor-pointer disabled:cursor-default"
              style={{ perspective: '1200px' }}
            >
              <motion.div
                className="relative h-56 w-40 sm:h-64 sm:w-44 md:h-72 md:w-48"
                style={{ transformStyle: 'preserve-3d' }}
                animate={{
                  rotateY: card.flipped ? 180 : 0,
                  scale: card.flipped && !reduceMotion ? [1, 1.08, 1] : 1,
                }}
                transition={{ duration: reduceMotion ? 0 : 0.5 }}
              >
                <div
                  className="absolute inset-0 overflow-hidden rounded-2xl bg-gradient-to-br from-purple-950 to-slate-950"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <CardBackImage type={card.type} />
                  <div className="absolute inset-0 flex flex-col items-center justify-end gap-1 bg-gradient-to-t from-black/70 via-transparent to-transparent p-3">
                    <span className="text-[11px] font-black uppercase tracking-wide text-white drop-shadow">
                      {typeNames[card.type] || DEFAULT_TYPE_NAMES[card.type]}
                    </span>
                  </div>
                </div>

                <div
                  className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-900/60"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <PerkSlot
                    perk={card.slot.perk}
                    role={role}
                    page={card.slot.page}
                    slot={card.slot.slot}
                    size="large"
                    isBlind={isBlind}
                    dict={dict}
                  />
                </div>
              </motion.div>
            </button>
          ))}
        </div>
      ) : (
        <Layers className="h-16 w-16 text-slate-600" />
      )}

      <button
        type="button"
        onClick={handleShuffle}
        disabled={activePlayablePerks.length === 0}
        className={`flex items-center gap-3 rounded-2xl px-10 py-5 font-black text-lg tracking-wider uppercase shadow-2xl transition-all duration-300 cursor-pointer ${
          role === 'Survivor'
            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:brightness-110 text-white active:scale-95'
            : 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-500 hover:brightness-110 text-white active:scale-95'
        }`}
      >
        <Layers className="h-6 w-6" />
        <span>{dict?.generator?.tarotShuffleButton || 'Shuffle & Draw'}</span>
      </button>

      <div aria-live="polite" className="text-xs font-black text-amber-400 text-center">
        {flavorLine}
      </div>
    </div>
  );
};
