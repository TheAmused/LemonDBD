'use client';
// frontend/src/components/smash-or-pass/card/CardBackFace.tsx
import { AlertTriangle, Flame, Heart, Quote, RotateCw, Sparkles, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Surface } from '@/components/common/Surface';
import { tip } from '@/components/common/Tooltip';
import { useDictionary } from '@/context/DictionaryContext';
import type { EntityItem, RosterCustomLabels } from '@/types/smashOrPass';
import { cn } from '@/utils/cn';
import type { localizedProfile } from '@/utils/entityProfile';
import { SmashSounds } from '../SmashSoundEffects';

/** The dating-profile back face is not ready yet: its content sits blurred behind a "Soon..." badge. */
const BACK_FACE_COMING_SOON = true;

interface CardBackFaceProps {
  character: EntityItem;
  profile: ReturnType<typeof localizedProfile>;
  isSurvivor: boolean;
  isFlipped: boolean;
  customLabels?: RosterCustomLabels;
  rosterMode?: 'simple' | 'full';
  onFlip: () => void;
  onVote: (type: 'smash' | 'pass', origin?: { x: number; y: number }) => void;
}

/** The dating-profile side of the card: vibe, turn on, dealbreaker, quote, and the vote buttons. */
export function CardBackFace({
  character,
  profile,
  isSurvivor,
  isFlipped,
  customLabels,
  rosterMode = 'full',
  onFlip,
  onVote,
}: CardBackFaceProps) {
  const dict = useDictionary();
  const text = dict.smashOrPass;
  // `|| character.role` is a render-level default for an entity with no archetype yet,
  // not a data fallback — localizedProfile already resolved locale vs. English.
  const charTitle = profile.archetype || character.role;
  const charTagline = profile.tagline;
  const charBio = profile.bio;
  const charQuote = profile.quote;
  const charMeme: string = profile.meme;

  return (
    <div
      style={{
        pointerEvents: isFlipped ? 'auto' : 'none',
        visibility: isFlipped ? 'visible' : 'hidden',
      }}
      onClick={() => {
        SmashSounds.playFlipSound();
        onFlip();
      }}
      className="absolute inset-0 h-full w-full rounded-[32px] sm:rounded-[36px] overflow-hidden border-2 border-accent-red/50 bg-bg-primary/95 backdrop-blur-2xl p-4 sm:p-5 flex flex-col justify-between text-text-primary cursor-pointer select-none"
    >
      {/* Top Bar with accessible Flip Back button and Title */}
      <div className="relative z-30 flex items-center justify-between pb-2 border-b border-border-color shrink-0 pointer-events-auto">
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            SmashSounds.playFlipSound();
            onFlip();
          }}
          {...tip(text.flipBack, undefined, 'action')}
          aria-label={text.flipBack}
          className="pointer-coarse:min-h-11 pointer-coarse:min-w-11 flex min-h-[40px] min-w-[40px] h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-bg-elevated border border-accent-red/40 text-accent-red hover:text-text-inverted hover:border-accent-red hover:scale-110 active:scale-95 transition-all shadow-lg cursor-pointer touch-manipulation"
        >
          <RotateCw className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-1.5 px-2 min-w-0">
          <Sparkles className="h-4 w-4 text-accent-red shrink-0" aria-hidden="true" />
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-text-primary truncate max-w-[150px] sm:max-w-[180px]">
            {character.name}
          </h3>
        </div>

        <span
          className={`text-micro font-black uppercase px-2 py-0.5 rounded-lg border shrink-0 ${
            isSurvivor
              ? 'bg-accent-green/15 text-accent-green border-accent-green/30'
              : 'bg-accent-red/15 text-accent-red border-accent-red/30'
          }`}
        >
          {isSurvivor
            ? text.filters.survivors
            : text.filters.killers}
        </span>
      </div>

      {/* Scrollable Back Content */}
      <div className="relative my-2 flex-1 min-h-0">
      <div
        className={cn(
          'space-y-2.5 h-full pr-1 scrollbar-thin scrollbar-thumb-border-color',
          BACK_FACE_COMING_SOON
            ? 'overflow-hidden blur-sm opacity-40 select-none pointer-events-none'
            : 'overflow-y-auto select-text pointer-events-auto'
        )}
        aria-hidden={BACK_FACE_COMING_SOON || undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Archetype / Dating Vibe */}
        <div className="p-2.5 rounded-2xl bg-bg-elevated border border-accent-red/30 space-y-0.5">
          <span className="type-label-2xs text-accent-red flex items-center gap-1">
            <Flame className="h-3 w-3 text-accent-red" aria-hidden="true" />
            {customLabels?.dating_vibe || 'Dating Vibe'}: {charTitle}
          </span>
          {charTagline && <p className="text-mini text-text-secondary italic leading-snug">{charTagline}</p>}
        </div>

        {/* Turn On (Visible & Optional) */}
        {profile.turn_on && (
          <div className="p-2.5 rounded-2xl bg-accent-green/10 border border-accent-green/40 space-y-0.5">
            <span className="type-label-2xs text-accent-green flex items-center gap-1">
              <Flame className="h-3 w-3 text-accent-green" aria-hidden="true" />
              {customLabels?.turn_on || ''}
            </span>
            <p className="text-mini text-text-primary leading-snug">{profile.turn_on}</p>
          </div>
        )}

        {/* Dealbreaker (Visible & Optional) */}
        {profile.dealbreaker && (
          <div className="p-2.5 rounded-2xl bg-accent-red/10 border border-accent-red/40 space-y-0.5">
            <span className="type-label-2xs text-accent-red flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-accent-red" aria-hidden="true" />
              {customLabels?.dealbreaker || ''}
            </span>
            <p className="text-mini text-text-primary leading-snug">{profile.dealbreaker}</p>
          </div>
        )}

        {/* Signature Quote */}
        {charQuote && (
          <div className="p-2.5 rounded-2xl bg-bg-elevated border border-accent-amber/30 space-y-0.5">
            <span className="type-label-2xs text-accent-amber flex items-center gap-1">
              <Quote className="h-3 w-3 text-accent-amber" aria-hidden="true" />
              {customLabels?.quote || 'Quote'}
            </span>
            <p className="text-mini text-text-secondary italic leading-relaxed">{charQuote}</p>
          </div>
        )}

        {/* Full Mode Extras */}
        {rosterMode !== 'simple' && charBio && (
          <Surface tone="elevated" radius="2xl" padding="none" className="p-2.5 space-y-1">
            <span className="type-label-2xs text-text-muted">
              {text.loreAndPersonality}
            </span>
            <p className="type-body text-text-secondary">{charBio}</p>
          </Surface>
        )}

        {rosterMode !== 'simple' && charMeme && (
          <Surface tone="elevated" radius="2xl" padding="none" className="p-2.5 space-y-0.5">
            <span className="flex items-center gap-1.5 type-label-2xs text-text-secondary">
              <Sparkles className="h-3 w-3 text-text-muted" aria-hidden="true" />
              {customLabels?.meme || text.trialRumor}
            </span>
            <p className="text-mini text-text-secondary italic leading-snug">{charMeme}</p>
          </Surface>
        )}
      </div>
      {BACK_FACE_COMING_SOON && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="px-6 py-3 rounded-2xl bg-bg-primary/80 border border-border-color/60 backdrop-blur-md shadow-2xl">
            <span className="text-2xl sm:text-3xl font-black tracking-widest text-text-primary uppercase drop-shadow-md">
              {text.soon}
            </span>
          </div>
        </div>
      )}
      </div>

      {/* Bottom Actions Bar */}
      <div className="pt-2 flex items-center justify-between border-t border-border-color shrink-0 gap-2 pointer-events-auto">
        <Button
          variant="secondary" size="sm"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            onVote('pass', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
          }}
          className="flex-1"
        >
          <ThumbsDown className="h-4 w-4" aria-hidden="true" />
          <span>{text.pass}</span>
        </Button>
        <Button
          variant="primary" size="sm"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            onVote('smash', { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
          }}
          className="flex-1"
        >
          <Heart className="h-4 w-4 fill-text-inverted" aria-hidden="true" />
          <span>{text.smash}</span>
        </Button>
      </div>
    </div>
  );
}
