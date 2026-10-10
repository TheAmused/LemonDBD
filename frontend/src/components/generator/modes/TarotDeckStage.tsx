// frontend/src/components/generator/modes/TarotDeckStage.tsx
'use client';

import React, { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { DbdButton } from '../shared/DbdButton';
import { Perk, RoleCategory, DrawnSlot } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { pickRandomLoadout, buildDrawnSlots, pickPerkTarotType, TarotType } from '../lib/perkPicker';
import { getSlotInteraction } from '../lib/blindnessCurse';
import { PerkSlot } from '../shared/PerkSlot';
import { useJackpotCelebration } from '../shared/useJackpotCelebration';
import { playCardFlip } from '@/utils/perkAudio';
import { useDictionary } from "@/context/DictionaryContext";

export interface TarotDeckStageProps {
  role: RoleCategory;
  activePlayablePerks: Perk[];
  activeMutator: ChaosMutator | null;
  onRollComplete: (slots: DrawnSlot[]) => void;
  revealedSlots: boolean[];
  onRevealSlot: (idx: number) => void;
  onSelectPerk: (perk: Perk) => void;
  isBlind?: boolean;
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
  hooks: 'The Hanged Man',
};

/** The on-disk card-back filenames (public/images/tarot/the-*.webp) follow
 * each type's *display* name, not its internal TarotType key -- most line
 * up (hex/boon/sacrifice/exhaustion/obsession/chase/entity), but five
 * don't: 'aura' ships as the-watcher.webp, 'generator' as the-machinist.webp,
 * 'healing' as the-caregiver.webp, 'stealth' as the-shadow.webp, and 'hooks'
 * as the-hanged-man.webp. Using the raw type key directly 404'd those five
 * and silently fell back to the solid-gradient placeholder. */
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
  hooks: 'hanged-man',
};

/** Static card art lives under /images/ so the service worker caches it
 * cache-first and next.config.ts serves it with long-lived headers. Faces are
 * produced by scripts/generate_tarot_card_faces.py from the art above. */
const TAROT_IMAGE_BASE = '/images/tarot';
const TAROT_FACE_DIR = 'faces';

type TarotSide = 'back' | 'face';

const tarotImageUrl = (type: TarotType, side: TarotSide): string =>
  `${TAROT_IMAGE_BASE}/${side === 'face' ? `${TAROT_FACE_DIR}/` : ''}the-${TAROT_IMAGE_SLUG[type]}.webp`;

/** Warm the browser/SW cache so a card flips onto an already-loaded face. */
const preloadTarotFace = (type: TarotType): void => {
  if (typeof Image === 'undefined') return;
  new Image().src = tarotImageUrl(type, 'face');
};

/**
 * Card art for a given type and side, with a graceful fallback if the file is
 * ever missing (never renders a broken <img>; the face keeps its solid colour).
 */
const CardImage: React.FC<{ type: TarotType; side: TarotSide }> = ({ type, side }) => {
  const [errored, setErrored] = useState(false);

  if (errored) return null;

  return (
    <img
      src={tarotImageUrl(type, side)}
      alt=""
      aria-hidden="true"
      draggable={false}
      onError={() => setErrored(true)}
      className="pointer-events-none absolute inset-0 h-full w-full rounded-2xl object-cover"
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
      backendBase,
    }) => {
  const dict = useDictionary();
  const [cards, setCards] = useState<TarotCard[] | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const { celebrate } = useJackpotCelebration();
  const reduceMotion = useReducedMotion();

  const typeNames = dict.generator.tarotCardNames || DEFAULT_TYPE_NAMES;

  const handleShuffle = () => {
    if (activePlayablePerks.length === 0) return;

    const picked = pickRandomLoadout(activePlayablePerks, activeMutator, 4);
    const slots = buildDrawnSlots(picked, activePlayablePerks);

    const next: TarotCard[] = slots.map((slot) => ({
      // Dealt once here, never while rendering: a perk with a secondary type
      // can come up as that type's card (see pickPerkTarotType).
      type: slot.perk ? pickPerkTarotType(slot.perk) : 'entity',
      slot,
      flipped: false,
    }));
    next.forEach((card) => preloadTarotFace(card.type));
    setCards(next);
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
    <div className="flex flex-col items-center justify-center gap-3 sm:gap-6 xl:gap-8 2xl:gap-10 py-2 sm:py-6 wide:py-8">
      <p className="max-w-lg xl:max-w-2xl 2xl:max-w-3xl wide:max-w-4xl text-center text-xs sm:text-base xl:text-lg wide:text-xl font-semibold text-text-secondary">
        {dict.generator.tarotTapToFlip}
      </p>

      {cards ? (
        <div ref={resultsRef} className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:grid-cols-4 max-w-full justify-items-center lg:gap-4 xl:gap-6 2xl:gap-8 wide:gap-10 wide-2k:gap-12 wide-4k:gap-16">
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
                  className="relative h-44 w-32 xs:h-48 xs:w-36 sm:h-52 sm:w-36 md:h-60 md:w-40 lg:h-68 lg:w-48 xl:h-88 xl:w-60 2xl:h-[440px] 2xl:w-72 wide:h-[510px] wide:w-[336px] wide-2k:h-[580px] wide-2k:w-[384px] wide-4k:h-[680px] wide-4k:w-[440px]"
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
                    aria-label={typeNames[card.type] || DEFAULT_TYPE_NAMES[card.type]}
                    className="group absolute inset-0 overflow-hidden rounded-2xl bg-gradient-to-br from-bg-elevated to-bg-primary cursor-pointer disabled:cursor-default border-2 border-transparent transition-all duration-300 hover:scale-[1.04] hover:border-accent-amber/70 hover:shadow-lg hover:shadow-accent-amber/40 active:scale-[0.97]"
                    style={{ backfaceVisibility: 'hidden', pointerEvents: card.flipped ? 'none' : 'auto' }}
                  >
                    <CardImage type={card.type} side="back" />
                  </button>

                  {/* Front face: the same card stock as the back art (generated
                      from it, see CardImage side="face"), revealing the perk
                      in its diamond window instead of turning into a bare icon. */}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-between overflow-hidden rounded-2xl bg-bg-surface p-2 sm:p-2.5 xl:p-3 2xl:p-4 wide:p-5"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      pointerEvents: card.flipped ? 'auto' : 'none',
                    }}
                  >
                    <CardImage type={card.type} side="face" />
                    {card.flipped && (
                      <>
                        <div className="relative z-10 pt-1 text-center">
                          <span className="text-micro sm:text-tiny md:text-mini xl:text-xs 2xl:text-sm wide:text-base font-black uppercase tracking-spaced text-tarot-ink drop-shadow-xs">
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
        <button
          type="button"
          onClick={handleShuffle}
          disabled={activePlayablePerks.length === 0}
          className="group cursor-pointer disabled:cursor-default transition-transform hover:scale-105 active:scale-95"
        >
          <img
            src="/images/randomizer/tarot.webp"
            alt=""
            className="h-28 w-28 sm:h-36 sm:w-36 xl:h-48 xl:w-48 2xl:h-60 2xl:w-60 wide:h-72 wide:w-72 object-contain drop-shadow-2xl select-none pointer-events-none group-hover:drop-shadow-[0_0_24px_var(--color-accent-amber)] transition-all duration-300"
            draggable={false}
          />
        </button>
      )}

      <DbdButton
        role={role}
        size="lg"
        onClick={handleShuffle}
        disabled={activePlayablePerks.length === 0}
      >
        {dict.generator.tarotShuffleButton}
      </DbdButton>
    </div>
  );
};


