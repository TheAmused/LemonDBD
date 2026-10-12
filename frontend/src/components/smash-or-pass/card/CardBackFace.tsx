'use client';
// frontend/src/components/smash-or-pass/card/CardBackFace.tsx
import { SnuffedCandleIcon, TarotTurnIcon, ThornHeartIcon } from '@/components/icons/DbdIcons';
import { Button } from '@/components/common/Button';
import { Surface } from '@/components/common/Surface';
import { tip } from '@/components/common/Tooltip';
import { useDictionary } from '@/context/DictionaryContext';
import type { EntityItem, RosterCustomLabels } from '@/types/smashOrPass';
import type { localizedProfile } from '@/utils/entityProfile';
import { SmashSounds } from '../SmashSoundEffects';

interface CardBackFaceProps {
  character: EntityItem;
  profile: ReturnType<typeof localizedProfile>;
  isSurvivor: boolean;
  isFlipped: boolean;
  customLabels?: RosterCustomLabels;
  rosterMode?: 'simple' | 'full';
  /** The green / red flags to list, already picked by the card (see `sampleFlags`). */
  greenFlags?: string[];
  redFlags?: string[];
  onFlip: () => void;
  onVote: (type: 'smash' | 'pass', origin?: { x: number; y: number }) => void;
}

/** The dating-profile side of the card: vibe, turn on, dealbreaker, quote, flags, and the vote buttons. */
export function CardBackFace({
  character,
  profile,
  isSurvivor,
  isFlipped,
  customLabels,
  rosterMode = 'full',
  greenFlags = [],
  redFlags = [],
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
  // Everything past the short version sits behind "Show more".
  const moreGreen = greenFlags.slice(1);
  const moreRed = redFlags.slice(1);
  const showBio = rosterMode !== 'simple' && Boolean(charBio);
  const showMeme = rosterMode !== 'simple' && Boolean(charMeme);
  const hasMore = Boolean(charTagline) || Boolean(charQuote) || moreGreen.length > 0 || moreRed.length > 0 || showBio || showMeme;

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
      className="absolute inset-0 h-full w-full rounded-3xl overflow-hidden border-2 border-accent-red/50 bg-bg-primary p-4 sm:p-5 flex flex-col justify-between text-text-primary cursor-pointer select-none"
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
          <TarotTurnIcon className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-1.5 px-2 min-w-0">
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
        className="space-y-2 h-full pr-1 overflow-y-auto select-text pointer-events-auto scrollbar-thin scrollbar-thumb-border-color"
        onClick={(e) => e.stopPropagation()}
      >
        {/* The short version: who they are, what works, what ends it, one flag each way */}
        <div className="p-2.5 rounded-2xl bg-bg-elevated border border-accent-red/30 space-y-0.5">
          <span className="type-label-2xs text-accent-red block">
            {customLabels?.dating_vibe || text.loreLabels.datingArchetype}
          </span>
          <p className="type-strong text-text-primary leading-snug">{charTitle}</p>
        </div>

        {profile.turn_on && (
          <div className="p-2.5 rounded-2xl bg-accent-green/10 border border-accent-green/40 space-y-0.5">
            <span className="type-label-2xs text-accent-green block">
              {customLabels?.turn_on || text.loreLabels.turn_on}
            </span>
            <p className="text-mini text-text-primary leading-snug">{profile.turn_on}</p>
          </div>
        )}

        {profile.dealbreaker && (
          <div className="p-2.5 rounded-2xl bg-accent-red/10 border border-accent-red/40 space-y-0.5">
            <span className="type-label-2xs text-accent-red block">
              {customLabels?.dealbreaker || text.loreLabels.dealbreaker}
            </span>
            <p className="text-mini text-text-primary leading-snug">{profile.dealbreaker}</p>
          </div>
        )}

        {(greenFlags.length > 0 || redFlags.length > 0) && (
          <div className="p-2.5 rounded-2xl bg-bg-elevated border border-border-color space-y-1.5">
            {greenFlags.length > 0 && (
              <p className="text-mini text-text-primary leading-snug">
                <span className="type-label-2xs text-accent-green block">{text.greenFlags}</span>
                {greenFlags[0]}
              </p>
            )}
            {redFlags.length > 0 && (
              <p className="text-mini text-text-primary leading-snug">
                <span className="type-label-2xs text-accent-red block">{text.redFlags}</span>
                {redFlags[0]}
              </p>
            )}
          </div>
        )}

        {/* The long version, one tap away */}
        {hasMore && (
          <details className="group space-y-2.5">
            <summary className="flex min-h-9 pointer-coarse:min-h-11 cursor-pointer list-none items-center justify-center rounded-2xl border border-border-color type-label-xs text-text-secondary transition-colors hover:text-text-primary [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">{text.showMore}</span>
              <span className="hidden group-open:inline">{text.showLess}</span>
            </summary>

            {charTagline && <p className="px-1 text-mini text-text-secondary italic leading-snug">{charTagline}</p>}

            {charQuote && (
              <div className="p-2.5 rounded-2xl bg-bg-elevated border border-accent-amber/30 space-y-0.5">
                <span className="type-label-2xs text-accent-amber block">
                  {customLabels?.quote || text.loreLabels.signatureQuote}
                </span>
                <p className="text-mini text-text-secondary italic leading-relaxed">{charQuote}</p>
              </div>
            )}

            {(moreGreen.length > 0 || moreRed.length > 0) && (
              <div className="p-2.5 rounded-2xl bg-bg-elevated border border-border-color space-y-1.5">
                {moreGreen.length > 0 && (
                  <ul className="text-mini text-text-primary leading-snug space-y-0.5 pl-4 list-disc marker:text-accent-green">
                    {moreGreen.map((flag, i) => (
                      <li key={`g${i}-${flag}`}>{flag}</li>
                    ))}
                  </ul>
                )}
                {moreRed.length > 0 && (
                  <ul className="text-mini text-text-primary leading-snug space-y-0.5 pl-4 list-disc marker:text-accent-red">
                    {moreRed.map((flag, i) => (
                      <li key={`r${i}-${flag}`}>{flag}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {showBio && (
              <Surface tone="elevated" radius="2xl" padding="none" className="p-2.5 space-y-1">
                <span className="type-label-2xs text-text-muted">{text.loreAndPersonality}</span>
                <p className="type-body text-text-secondary">{charBio}</p>
              </Surface>
            )}

            {showMeme && (
              <Surface tone="elevated" radius="2xl" padding="none" className="p-2.5 space-y-0.5">
                <span className="type-label-2xs text-text-secondary block">{customLabels?.meme || text.trialRumor}</span>
                <p className="text-mini text-text-secondary italic leading-snug">{charMeme}</p>
              </Surface>
            )}
          </details>
        )}
      </div>
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
          <SnuffedCandleIcon className="h-5 w-5" aria-hidden="true" />
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
          <ThornHeartIcon className="h-5 w-5" aria-hidden="true" />
          <span>{text.smash}</span>
        </Button>
      </div>
    </div>
  );
}
