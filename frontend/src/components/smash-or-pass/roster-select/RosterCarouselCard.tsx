'use client';
// frontend/src/components/smash-or-pass/roster-select/RosterCarouselCard.tsx
import { useRef, useState } from 'react';
import { useOnValueChange } from '@/hooks/useOnValueChange';
import {
  CardStackIcon,
  HeartIcon,
  LockIcon,
  MatureIcon,
  CheckIcon,
} from '@/components/icons/DbdIcons';
import { useDictionary } from '@/context/DictionaryContext';
import type { RosterItem } from '@/types/smashOrPass';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { SmashSounds } from '../SmashSoundEffects';
import { rosterCoverUrl, rosterDisplayName } from './rosterDisplay';
import { getCommunityCoverThumbUrl } from '@/utils/thumbUrl';
import { coverPlaceholderPath } from '@/utils/smashOrPass/placeholderArt';
import { useGlobalNsfwPreference } from '@/utils/nsfwAck';
import { Button } from '@/components/common/Button';
import { useOptionalAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';
import { MotionImg } from '@/components/common/MotionImg';

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
  if (w < 640) return 168;
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
  const auth = useOptionalAuth();
  const user = auth?.user;
  const [globalNsfw, setGlobalNsfw] = useGlobalNsfwPreference();
  const absOffset = Math.abs(visualOffset);
  const isCenter = absOffset < 0.5;
  const isRosterEnabled = r.is_active !== false;
  const isYours = !r.is_imported || Boolean(r.author_id && user?.id && r.author_id === user.id) || Boolean(r.author_login && user?.username && r.author_login === user.username);
  const count = r.entity_count ?? r.character_count ?? 0;
  const rawCoverUrl = rosterCoverUrl(r);
  const thumbCoverUrl = getCommunityCoverThumbUrl(rawCoverUrl, 480) || rawCoverUrl;
  const hasThumb = Boolean(thumbCoverUrl && thumbCoverUrl !== rawCoverUrl);
  const [fullLoaded, setFullLoaded] = useState(false);
  const fullImgRef = useRef<HTMLImageElement>(null);

  useOnValueChange(rawCoverUrl, () => setFullLoaded(false));

  const translateX = visualOffset * spreadUnitForViewport();
  const rotateY = Math.max(-55, Math.min(55, -visualOffset * 30));
  const translateZ = -absOffset * 95;
  const scale = Math.max(0.68, 1.06 - absOffset * 0.14);
  const opacity = Math.max(0.1, 1 - absOffset * 0.26);
  const brightness = Math.max(0.3, 1 - absOffset * 0.35);
  const zIndex = Math.round(40 - absOffset * 10);

  const rosterLabel = `${rosterDisplayName(r)}${count ? `, ${count} ${dict.smashOrPass.candidates}` : ''}${r.is_nsfw ? ' (NSFW)' : ''}`;

  return (
    <div
      className={`absolute w-[var(--card-w)] h-[var(--card-h)] rounded-card overflow-hidden cursor-pointer ${isCenter
        ? isRosterEnabled
          ? 'border-2 sm:border-3 border-accent-red'
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
      {/* The whole card is one button (an overlay, so the NSFW "reveal" button inside the card
          stays a separate control): a side card jumps to the centre, the centre one is chosen. */}
      <button
        type="button"
        data-roster-card=""
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
        className="absolute inset-0 z-10 cursor-pointer rounded-card focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-red"
      />
      {hasThumb && !fullLoaded && (
        <MotionImg
          src={thumbCoverUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className={cn(
            "absolute inset-0 h-full w-full object-cover object-center pointer-events-none transition-all duration-300",
            r.is_nsfw && !globalNsfw && "blur-md scale-105"
          )}
        />
      )}
      <MotionImg
        ref={fullImgRef}
        src={rawCoverUrl}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onLoad={() => setFullLoaded(true)}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (!target.dataset.triedFallback) {
            target.dataset.triedFallback = '1';
            target.src = `${getBackendBaseUrl()}${coverPlaceholderPath(r.slug)}`;
          } else {
            target.style.display = 'none';
          }
        }}
        className={cn(
          "absolute inset-0 h-full w-full object-cover object-center pointer-events-none transition-all duration-300",
          r.is_nsfw && !globalNsfw && "blur-md scale-105",
          hasThumb && !fullLoaded ? "opacity-0" : "opacity-100"
        )}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-image-scrim/95 via-image-scrim/40 to-image-scrim/20 pointer-events-none" aria-hidden="true" />

      {isCenter && r.is_nsfw && !globalNsfw && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setGlobalNsfw(true);
            }}
            className="shadow-lg"
          >
            {dict.smashOrPass.nsfw.reveal}
          </Button>
        </div>
      )}

      {isRosterEnabled && (
        <div
          className="absolute top-2.5 left-2.5 sm:top-5 sm:left-5 flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-card bg-image-scrim/80 backdrop-blur-md border border-border-color text-text-inverted type-strong-xs sm:type-strong-fluid shadow-md pointer-events-none"
        >
          <CardStackIcon className="icon-sm sm:icon-md text-accent-red" aria-hidden="true" />
          <span>{count}</span>
        </div>
      )}

      {(r.is_nsfw || isCurrentlyActive) && (
        <div className="absolute top-2.5 right-2.5 sm:top-5 sm:right-5 flex items-center gap-1 sm:gap-1.5 flex-wrap justify-end pointer-events-none">
          {r.is_nsfw && (
            <div
              data-testid="roster-nsfw-badge"
              className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1 rounded-card bg-accent-red text-text-inverted text-tiny sm:text-xs font-black uppercase tracking-wide shadow-md"
            >
              <MatureIcon className="icon-xs sm:icon-sm" aria-hidden="true" />
              <span>{dict.smashOrPass.nsfw.badge}</span>
            </div>
          )}

          {isCurrentlyActive && (
            <div
              className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-card bg-accent-red text-text-inverted type-strong-xs sm:type-strong shadow-md"
            >
              <CheckIcon className="icon-sm sm:icon-md" aria-hidden="true" />
              <span>{dict.smashOrPass.active}</span>
            </div>
          )}
        </div>
      )}

      {isCenter && (!r.is_nsfw || globalNsfw) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
          {isRosterEnabled ? (
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-accent-red/20 border-2 border-accent-red/50 backdrop-blur-sm animate-pulse">
              <HeartIcon className="h-8 w-8 sm:h-10 sm:w-10 text-accent-red" />
            </div>
          ) : (
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-bg-elevated border-2 border-border-color shadow-2xl backdrop-blur-sm">
              <LockIcon className="h-8 w-8 sm:h-9 sm:w-9 text-text-muted" />
            </div>
          )}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 text-center flex flex-col items-center justify-end z-10 pointer-events-none max-h-3/5">
        {r.is_local && (
          <div
            data-testid="roster-local-badge"
            className={cn(
              "mb-2 flex items-center gap-1 px-2.5 py-1 rounded-card bg-bg-primary/85 backdrop-blur-md border text-tiny sm:text-xs font-black uppercase tracking-wide shadow-md pointer-events-none",
              isYours ? "border-accent-amber/40 text-accent-amber" : "border-border-color text-text-secondary"
            )}
          >
            <span>{isYours ? dict.smashOrPass.picker.yours : (r.author_login ? `@${r.author_login}` : dict.smashOrPass.picker.imported)}</span>
          </div>
        )}

        <h3 className="text-base sm:text-lg md:text-xl font-black tracking-wide text-text-inverted drop-shadow-md mb-1 line-clamp-2 break-words text-balance max-w-full">
          {rosterDisplayName(r)}
        </h3>

        {r.description && (
          <p className="text-xs sm:text-sm md:text-base font-bold text-accent-red-on-scrim/90 tracking-wider drop-shadow-md line-clamp-2 sm:line-clamp-3 break-words text-balance max-w-full">
            {r.description}
          </p>
        )}
      </div>

      {isCenter && (
        <div
          className={`absolute inset-0 rounded-card border-2 pointer-events-none ${isRosterEnabled ? 'border-accent-red/50' : 'border-border-color'
            }`}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
