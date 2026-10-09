'use client';
// frontend/src/components/smash-or-pass/roster-select/RosterCarouselCard.tsx
import { AlertTriangle, Check, Flame, Lock, Sparkles } from 'lucide-react';
import { useDictionary } from '@/context/DictionaryContext';
import type { RosterItem } from '@/types/smashOrPass';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { SmashSounds } from '../SmashSoundEffects';
import { rosterCoverUrl, rosterDisplayName } from './rosterDisplay';

interface RosterCarouselCardProps {
  roster: RosterItem;
  /** How far this card sits from the centre of the carousel, in cards (fractional while it moves). */
  visualOffset: number;
  isDragging: boolean;
  /** The roster that is being played now. */
  isCurrentlyActive: boolean;
  /** Brings this (off-centre) card to the centre. */
  onJump: () => void;
  /** Chooses the centred card. */
  onCommit: () => void;
}

/** Horizontal spread between neighbouring cards, by viewport width. */
function spreadUnitForViewport(): number {
  if (typeof window === 'undefined') return 260;
  const w = window.innerWidth;
  if (w < 640) return 145;
  if (w < 1024) return 205;
  if (w >= 1536) return 360;
  if (w >= 1280) return 310;
  return 260;
}

/** One roster on the 3D carousel: its cover, badges, and name, laid out by distance from the centre. */
export function RosterCarouselCard({
  roster: r,
  visualOffset,
  isDragging,
  isCurrentlyActive,
  onJump,
  onCommit,
}: RosterCarouselCardProps) {
  const dict = useDictionary();
  const absOffset = Math.abs(visualOffset);
  const isCenter = absOffset < 0.5;
  const isRosterEnabled = r.is_active !== false;
  const count = r.entity_count ?? r.character_count ?? 0;
  const coverUrl = rosterCoverUrl(r);

  const translateX = visualOffset * spreadUnitForViewport();
  const rotateY = Math.max(-55, Math.min(55, -visualOffset * 30));
  const translateZ = -absOffset * 95;
  const scale = Math.max(0.68, 1.06 - absOffset * 0.14);
  const opacity = Math.max(0.1, 1 - absOffset * 0.26);
  const brightness = Math.max(0.3, 1 - absOffset * 0.35);
  const zIndex = Math.round(40 - absOffset * 10);

  const rosterLabel = `${rosterDisplayName(r)}${count ? `, ${count} ${dict.smashOrPass.candidates}` : ''}${!isRosterEnabled ? ' (Coming Soon)' : ''}${r.is_nsfw ? ' (NSFW)' : ''}`;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={rosterLabel}
      onClick={(e) => {
        e.stopPropagation();
        if (!isCenter) {
          onJump();
          SmashSounds.playHoverTick();
        } else if (isRosterEnabled) {
          onCommit();
        } else {
          SmashSounds.playHoverTick();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (isRosterEnabled) onCommit();
        }
      }}
      className={`absolute w-[var(--card-w)] h-[var(--card-h)] rounded-[28px] sm:rounded-[36px] overflow-hidden cursor-pointer ${isCenter
        ? isRosterEnabled
          ? 'border-2 sm:border-[3px] border-accent-red'
          : 'border-2 border-border-color'
        : 'border border-accent-red/20'
        }`}
      style={{
        transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
        opacity,
        filter: isRosterEnabled
          ? `brightness(${brightness})`
          : `brightness(${brightness * 0.75}) grayscale(45%)`,
        zIndex,
        transformStyle: 'preserve-3d',
        transition: isDragging
          ? 'none'
          : 'box-shadow 250ms ease-out, border-color 250ms ease-out',
        willChange: isDragging ? 'transform, opacity, filter' : 'auto',
        backfaceVisibility: 'hidden',
      }}
    >
      <img
        src={coverUrl}
        alt=""
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (!target.dataset.triedFallback) {
            target.dataset.triedFallback = '1';
            target.src = `${getBackendBaseUrl()}/static/avatars/rosters/${r.slug}.webp`;
          } else {
            target.style.display = 'none';
          }
        }}
        className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/95 via-bg-primary/40 to-bg-primary/20 pointer-events-none" aria-hidden="true" />

      {isRosterEnabled && (
        <div
          className="absolute top-4 left-4 sm:top-5 sm:left-5 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-bg-primary/80 backdrop-blur-md border border-border-color text-text-inverted type-strong-fluid shadow-md pointer-events-none"
        >
          <Flame className="h-4 w-4 text-accent-red fill-accent-red" aria-hidden="true" />
          <span>{count}</span>
        </div>
      )}

      {r.is_nsfw && (
        <div
          data-testid="roster-nsfw-badge"
          className="absolute top-4 left-1/2 -translate-x-1/2 sm:top-5 flex items-center gap-1 px-2.5 py-1 rounded-2xl bg-accent-red text-text-inverted text-tiny sm:text-xs font-black uppercase tracking-wide shadow-md pointer-events-none"
        >
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          <span>{dict.smashOrPass.nsfw.badge}</span>
        </div>
      )}

      {r.is_local && (
        <div
          data-testid="roster-local-badge"
          className="absolute bottom-[5.5rem] left-1/2 -translate-x-1/2 sm:bottom-24 flex items-center gap-1 px-2.5 py-1 rounded-2xl bg-bg-primary/85 backdrop-blur-md border border-accent-amber/40 text-accent-amber text-tiny sm:text-xs font-black uppercase tracking-wide shadow-md pointer-events-none"
        >
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          <span>{dict.smashOrPass.picker.yours}</span>
        </div>
      )}

      {isCurrentlyActive && (
        <div
          className="absolute top-4 right-4 sm:top-5 sm:right-5 flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-accent-red text-text-inverted type-strong pointer-events-none"
        >
          <Check className="h-3.5 w-3.5 stroke-[3]" aria-hidden="true" />
          <span>{dict.smashOrPass.active}</span>
        </div>
      )}

      {!isRosterEnabled && !isCurrentlyActive && (
        <div className="absolute top-4 right-4 sm:top-5 sm:right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-bg-elevated border border-border-color text-text-secondary type-strong shadow-lg pointer-events-none">
          <Lock className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
          <span>{dict.smashOrPass.comingSoon}</span>
        </div>
      )}

      {isCenter && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
          {isRosterEnabled ? (
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-accent-red/20 border-2 border-accent-red/50 backdrop-blur-sm animate-pulse">
              <Flame className="h-8 w-8 sm:h-10 sm:w-10 text-accent-red fill-accent-red" />
            </div>
          ) : (
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-bg-elevated border-2 border-border-color shadow-2xl backdrop-blur-sm">
              <Lock className="h-8 w-8 sm:h-9 sm:w-9 text-text-muted" />
            </div>
          )}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 text-center flex flex-col items-center justify-end z-10 pointer-events-none">
        <h3 className="text-base sm:text-lg md:text-xl font-black tracking-wide text-text-inverted drop-shadow-md mb-1">
          {rosterDisplayName(r)}
        </h3>

        {r.description && (
          <p className="text-xs sm:text-sm md:text-base font-bold text-accent-red/90 tracking-wider drop-shadow-md">
            {r.description}
          </p>
        )}
      </div>

      {isCenter && (
        <div
          className={`absolute inset-0 rounded-[28px] sm:rounded-[36px] border-2 pointer-events-none ${isRosterEnabled ? 'border-accent-red/50' : 'border-border-color'
            }`}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
