// frontend/src/components/generator/modes/TarotDeckStage.tsx
'use client';

import React, { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Layers } from 'lucide-react';
import { DbdButton } from '../shared/DbdButton';
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { pickRandomLoadout, buildDrawnSlots, getPerkTarotType, TarotType } from '../lib/perkPicker';
import { getSlotInteraction } from '../lib/blindnessCurse';
import { PerkSlot } from '../shared/PerkSlot';
import { useJackpotCelebration } from '../shared/useJackpotCelebration';
import { playCardFlip } from '@/utils/perkAudio';

export interface TarotDeckStageProps {
  role: RoleCategory;
  activePlayablePerks: Perk[];
  activeMutator: ChaosMutator | null;
  onRollComplete: (slots: DrawnSlot[]) => void;
  revealedSlots: boolean[];
  onRevealSlot: (idx: number) => void;
  onSelectPerk: (perk: Perk) => void;
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

/** The on-disk card-back filenames (public/images/tarot/the-*.webp) follow
 * each type's *display* name, not its internal TarotType key -- most line
 * up (hex/boon/sacrifice/exhaustion/obsession/chase/entity), but four
 * don't: 'aura' ships as the-watcher.png, 'generator' as the-machinist.png,
 * 'healing' as the-caregiver.png, and 'stealth' as the-shadow.png. Using
 * the raw type key directly 404'd those four and silently fell back to
 * the solid-gradient placeholder. */
const TAROT_IMAGE_SLUG: Record<TarotType, string> = {
  hex: 'hex',
  boon: 'boon',
  sacrifice: 'sacrifice',
  exhaustion: 'exhaustion',
  obsession: 'obsession',
  aura: 'watcher',
  generator: 'machinist',
  healing: 'caregiver',
  chase: 'chase',
  stealth: 'shadow',
  entity: 'entity',
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
      src={`/images/tarot/the-${TAROT_IMAGE_SLUG[type]}.webp`}
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
  revealedSlots,
  onRevealSlot,
  onSelectPerk,
  isBlind = false,
  dict,
  backendBase,
}) => {
  const [cards, setCards] = useState<TarotCard[] | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const { celebrate } = useJackpotCelebration();
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
    onRollComplete(slots);
  };

  const handleFlip = (idx: number) => {
    if (!cards || cards[idx].flipped) return;

    playCardFlip();
    const next = cards.map((c, i) => (i === idx ? { ...c, flipped: true } : c));
    setCards(next);

    if (next.every((c) => c.flipped)) {
      celebrate(role, resultsRef.current);
      onRollComplete(next.map((c) => c.slot));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2 sm:gap-6 py-2 sm:py-6">
      <p className="max-w-lg text-center text-xs sm:text-base font-semibold text-text-secondary">
        {dict?.generator?.tarotTapToFlip ||
          'Tap any card to flip it and reveal the perk hidden beneath. Flip all four to lock in your loadout.'}
      </p>

      {cards ? (
        <div ref={resultsRef} className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:grid-cols-4 max-w-full justify-items-center lg:gap-4 xl:gap-6 2xl:gap-8 min-[1800px]:gap-12">
          {cards.map((card, idx) => {
            const { isObscured, onClick } = getSlotInteraction(
              idx,
              card.slot.perk,
              activeMutator,
              revealedSlots,
              onRevealSlot,
              onSelectPerk
            );

            return (
              <div key={idx} style={{ perspective: '1200px' }}>
                <motion.div
                  className="relative h-44 w-32 xs:h-48 xs:w-36 sm:h-52 sm:w-36 md:h-60 md:w-40 lg:h-64 lg:w-44 xl:h-72 xl:w-48 2xl:h-88 2xl:w-60 min-[1800px]:h-96 min-[1800px]:w-68"
                  style={{ transformStyle: 'preserve-3d' }}
                  animate={{
                    rotateY: card.flipped ? 180 : 0,
                    scale: card.flipped && !reduceMotion ? [1, 1.08, 1] : 1,
                  }}
                  transition={{ duration: reduceMotion ? 0 : 0.5 }}
                >
                  {/* Back face: its own button so it's the only clickable
                      element pre-flip -- disabled (and hit-tested out) once
                      flipped, so it never nests inside the front face's
                      PerkCard button. */}
                  <button
                    type="button"
                    onClick={() => handleFlip(idx)}
                    disabled={card.flipped}
                    className="absolute inset-0 overflow-hidden rounded-2xl bg-gradient-to-br from-bg-elevated to-bg-primary cursor-pointer disabled:cursor-default"
                    style={{ backfaceVisibility: 'hidden', pointerEvents: card.flipped ? 'none' : 'auto' }}
                  >
                    <CardBackImage type={card.type} />
                    <div className="absolute inset-0 flex flex-col items-center justify-end gap-1 bg-gradient-to-t from-bg-primary/80 via-transparent to-transparent p-3">
                      <span className="text-[11px] font-black uppercase tracking-wide text-text-inverted drop-shadow">
                        {typeNames[card.type] || DEFAULT_TYPE_NAMES[card.type]}
                      </span>
                    </div>
                  </button>

                  {/* Front face: still dressed as the same tarot card,
                      dark card stock, amber frame, corner pips, just
                      revealing the perk in its center window instead of
                      turning into a bare icon. */}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-between overflow-hidden rounded-2xl border-2 border-accent-amber/30 bg-bg-surface p-2 sm:p-2.5"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      pointerEvents: card.flipped ? 'auto' : 'none',
                    }}
                  >
                    {/* Inner card-stock border only */}
                    <span className="pointer-events-none absolute inset-1 sm:inset-1.5 rounded-xl border border-accent-amber/20" />
                    {card.flipped && (
                      <>
                        <div className="relative z-10 pt-1 text-center">
                          <span className="text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-accent-amber drop-shadow-xs">
                            {typeNames[card.type] || DEFAULT_TYPE_NAMES[card.type]}
                          </span>
                        </div>
                        <div className="relative z-10 flex flex-1 items-center justify-center">
                          <PerkSlot
                            perk={card.slot.perk}
                            role={role}
                            page={card.slot.page}
                            slot={card.slot.slot}
                            size="tarot"
                            isObscured={isObscured}
                            isBlind={isBlind}
                            onClick={onClick}
                            dict={dict}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      ) : (
        <Layers className={`h-28 w-28 ${role === 'Survivor' ? 'text-accent-green' : 'text-accent-red'}`} />
      )}

      <DbdButton
        role={role}
        size="lg"
        onClick={handleShuffle}
        disabled={activePlayablePerks.length === 0}
      >
        {dict?.generator?.tarotShuffleButton || 'Shuffle & Draw'}
      </DbdButton>
    </div>
  );
};


