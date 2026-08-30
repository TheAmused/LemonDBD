'use client';

import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Layers, Sparkle } from 'lucide-react';
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { pickRandomLoadout, buildDrawnSlots } from '../lib/perkPicker';
import { PerkSlot } from '../shared/PerkSlot';
import { useJackpotCelebration } from '../shared/useJackpotCelebration';
import { playCardFlip } from '@/utils/perkAudio';

export interface TarotDeckStageProps {
  role: RoleCategory;
  activePlayablePerks: Perk[];
  activeMutator: ChaosMutator | null;
  onRollComplete: (slots: DrawnSlot[]) => void;
  dict?: Dictionary;
  backendBase?: string;
}

interface TarotCard {
  cardName: string;
  slot: DrawnSlot;
  flipped: boolean;
}

const DEFAULT_CARD_NAMES = ['The Hex', 'The Exhaustion', 'The Obsession', 'The Boon'];

export const TarotDeckStage: React.FC<TarotDeckStageProps> = ({
  role,
  activePlayablePerks,
  activeMutator,
  onRollComplete,
  dict,
  backendBase,
}) => {
  const [cards, setCards] = useState<TarotCard[] | null>(null);
  const { flavorLine, celebrate } = useJackpotCelebration(dict);
  const reduceMotion = useReducedMotion();

  const cardNames = dict?.generator?.tarotCardNames || DEFAULT_CARD_NAMES;

  const handleShuffle = () => {
    if (activePlayablePerks.length === 0) return;

    const picked = pickRandomLoadout(activePlayablePerks, activeMutator, 4);
    const slots = buildDrawnSlots(picked, activePlayablePerks);
    const shuffledNames = [...cardNames].sort(() => Math.random() - 0.5);

    setCards(
      slots.map((slot, i) => ({
        cardName: shuffledNames[i % shuffledNames.length],
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cards.map((card, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleFlip(idx)}
              disabled={card.flipped}
              className="perspective-[1000px] cursor-pointer disabled:cursor-default"
              style={{ perspective: '1000px' }}
            >
              <motion.div
                className="relative h-32 w-32 sm:h-36 sm:w-36 md:h-40 md:w-40 lg:h-44 lg:w-44 xl:h-48 xl:w-48"
                style={{ transformStyle: 'preserve-3d' }}
                animate={{ rotateY: card.flipped ? 180 : 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.5 }}
              >
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-purple-950 to-slate-950"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <Sparkle className="h-6 w-6 text-purple-400" />
                  <span className="text-[11px] font-black uppercase tracking-wide text-purple-300">
                    {card.cardName}
                  </span>
                </div>

                <div
                  className="absolute inset-0"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <PerkSlot
                    perk={card.slot.perk}
                    role={role}
                    page={card.slot.page}
                    slot={card.slot.slot}
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
