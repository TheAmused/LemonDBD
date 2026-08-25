// frontend/src/components/smash-or-pass/RosterSelectModal.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check, Flame, X } from 'lucide-react';
import { RosterItem } from '@/types/smashOrPass';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { SmashSounds } from './SmashSoundEffects';

const STORAGE_KEY = 'dbd_smash_selected_roster';

const ROSTER_HERO_MAP: Record<string, string> = {
  canon: 'Mikaela & Sable',
  hooked_on_you: 'The Huntress',
  legendary_cosplay: 'Baba Yaga',
  cyberpunk_2077: 'Cyber Trickster',
  anime_manga: 'The Spirit',
  gothic_eldritch: 'The Dark Lord',
};

interface RosterSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  rosters: RosterItem[];
  selectedRosterSlug: string;
  onSelectRoster: (slug: string) => void;
  locale?: string;
  dict?: any;
}

export const RosterSelectModal: React.FC<RosterSelectModalProps> = ({
  isOpen,
  onClose,
  rosters,
  selectedRosterSlug,
  onSelectRoster,
  locale = 'en',
  dict,
}) => {
  const [visualIndex, setVisualIndex] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [activeSelectedSlug, setActiveSelectedSlug] = useState<string>(selectedRosterSlug);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartXRef = useRef<number>(0);
  const dragStartCenterRef = useRef<number>(0);
  const lastTickIndexRef = useRef<number>(0);

  const visualIndexRef = useRef<number>(0);
  const targetIndexRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  const N = rosters.length;

  // Helper to normalize any integer/float index into [0, N - 1]
  const normalizeIndex = useCallback(
    (idx: number): number => {
      if (N === 0) return 0;
      return ((Math.round(idx) % N) + N) % N;
    },
    [N]
  );

  // Smooth RAF Animation Controller for continuous 60fps 3D carousel transitions
  const animateTo = useCallback(
    (target: number, duration = 420) => {
      targetIndexRef.current = target;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      const startVal = visualIndexRef.current;
      const endVal = target;
      const startTime = performance.now();

      // Smooth cubic-bezier(0.2, 0.9, 0.2, 1) ease-out curve
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const eased = easeOutCubic(progress);
        const current = startVal + (endVal - startVal) * eased;

        visualIndexRef.current = current;
        setVisualIndex(current);

        const currentRounded = normalizeIndex(current);
        if (currentRounded !== lastTickIndexRef.current) {
          lastTickIndexRef.current = currentRounded;
          SmashSounds.playHoverTick();
        }

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(step);
        } else {
          visualIndexRef.current = endVal;
          setVisualIndex(endVal);
          animFrameRef.current = null;
        }
      };

      animFrameRef.current = requestAnimationFrame(step);
    },
    [normalizeIndex]
  );

  // 1. Initialize centerIndex on modal open from localStorage or selectedRosterSlug
  useEffect(() => {
    if (!isOpen || N === 0) return;

    const savedSlug =
      (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) ||
      selectedRosterSlug ||
      'canon';

    const foundIdx = rosters.findIndex((r) => r.slug === savedSlug);
    const initialIdx = foundIdx !== -1 ? foundIdx : 0;

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    visualIndexRef.current = initialIdx;
    targetIndexRef.current = initialIdx;
    setVisualIndex(initialIdx);
    setIsDragging(false);
    setActiveSelectedSlug(savedSlug);
    lastTickIndexRef.current = initialIdx;
  }, [isOpen, N, rosters, selectedRosterSlug]);

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Helper: Commit selection of whatever card is currently in the middle
  const commitSelection = useCallback(
    (indexToChoose?: number) => {
      if (N === 0) {
        onClose();
        return;
      }
      const targetIdx =
        indexToChoose !== undefined
          ? normalizeIndex(indexToChoose)
          : normalizeIndex(targetIndexRef.current);

      const chosenRoster = rosters[targetIdx];
      if (chosenRoster) {
        setActiveSelectedSlug(chosenRoster.slug);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, chosenRoster.slug);
        }
        onSelectRoster(chosenRoster.slug);
        SmashSounds.playSmashSound();
      }
      onClose();
    },
    [N, normalizeIndex, rosters, onSelectRoster, onClose]
  );

  // Helper: Step previous/next roster card with smooth animation
  const stepPrev = useCallback(
    (e?: React.MouseEvent | React.PointerEvent) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      const newTarget = Math.round(targetIndexRef.current) - 1;
      SmashSounds.playHoverTick();
      animateTo(newTarget, 420);
    },
    [animateTo]
  );

  const stepNext = useCallback(
    (e?: React.MouseEvent | React.PointerEvent) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      const newTarget = Math.round(targetIndexRef.current) + 1;
      SmashSounds.playHoverTick();
      animateTo(newTarget, 420);
    },
    [animateTo]
  );

  // 2. Keyboard navigation (Arrow keys to spin continuously, Enter to confirm, Escape to choose middle card and leave)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepNext();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        commitSelection();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        commitSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, commitSelection, stepPrev, stepNext]);

  // Helper: Display names
  const getRosterDisplayName = useCallback(
    (r: RosterItem) => {
      const locName = dict?.smashOrPass?.rosters?.[r.slug]?.name;
      if (locName) return locName;
      if (r.slug === 'canon') return locale === 'pl' ? 'Dead by Daylight: Kanon Mgły' : 'Dead by Daylight: Fog Canon';
      if (r.slug === 'hooked_on_you') return locale === 'pl' ? 'Hooked on You: Romans na Wyspie' : 'Hooked on You: Island Romance';
      if (r.slug === 'legendary_cosplay') return locale === 'pl' ? 'Legendarne Skórki i Kolaboracje' : 'Legendary Skins & Collabs';
      if (r.slug === 'cyberpunk_2077') return locale === 'pl' ? 'Cyberpunkowa Mgła 2077' : 'Cyberpunk Fog 2077';
      if (r.slug === 'anime_manga') return locale === 'pl' ? 'Estetyka Anime / Mangi w Mgle' : 'Fog Anime / Manga Aesthetic';
      if (r.slug === 'gothic_eldritch') return locale === 'pl' ? 'Wiktoriańskie i Gotyckie Legendy' : 'Victorian & Gothic Eldritch';
      return r.name || r.slug;
    },
    [dict, locale]
  );

  const getRosterHeroName = (slug: string) => {
    return ROSTER_HERO_MAP[slug] || '';
  };

  const getRosterCoverUrl = (r: RosterItem) => {
    if (r.cover_image_url) {
      return r.cover_image_url.startsWith('http')
        ? r.cover_image_url
        : `${getBackendBaseUrl()}${r.cover_image_url}`;
    }
    return `${getBackendBaseUrl()}/static/avatars/rosters/${r.slug}.png`;
  };

  const lastMoveXRef = useRef<number>(0);
  const lastMoveTimeRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);

  // 3. Pointer Drag Gestures (Grab and Pull / Swipe with velocity fling momentum)
  const handlePointerDown = (e: React.PointerEvent) => {
    // If pointer down is on any button (chevrons, close), do not start drag or capture pointer
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    dragStartCenterRef.current = visualIndexRef.current;
    lastMoveXRef.current = e.clientX;
    lastMoveTimeRef.current = Date.now();
    velocityRef.current = 0;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const now = Date.now();
    const dt = Math.max(1, now - lastMoveTimeRef.current);
    const dx = e.clientX - lastMoveXRef.current;

    velocityRef.current = dx / dt; // pixels per ms
    lastMoveXRef.current = e.clientX;
    lastMoveTimeRef.current = now;

    const deltaX = e.clientX - dragStartXRef.current;
    // 170px drag = 1 card shift
    const offset = -deltaX / 170;
    const newVisual = dragStartCenterRef.current + offset;

    visualIndexRef.current = newVisual;
    targetIndexRef.current = newVisual;
    setVisualIndex(newVisual);

    const roundedIdx = normalizeIndex(newVisual);
    if (roundedIdx !== lastTickIndexRef.current) {
      lastTickIndexRef.current = roundedIdx;
      SmashSounds.playHoverTick();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    // Fling momentum calculation
    let momentumShift = 0;
    if (Math.abs(velocityRef.current) > 0.35) {
      momentumShift =
        -Math.sign(velocityRef.current) *
        Math.min(2, Math.round(Math.abs(velocityRef.current) * 1.5));
    }

    const targetCenter = Math.round(visualIndexRef.current + momentumShift);
    animateTo(targetCenter, 420);
  };

  // 4. Symmetrical Circular 3D Cards Computation with STABLE KEYS
  // Every roster maintains its exact identity in the 3D ring and glides smoothly
  const visibleCards = useMemo(() => {
    if (N === 0) return [];

    return rosters
      .map((roster, i) => {
        // Calculate shortest signed angular difference in modulo N space [-N/2, N/2]
        let diff = ((i - visualIndex) % N + N * 1.5) % N - (N / 2);
        return {
          roster,
          rosterIdx: i,
          keyId: roster.slug, // STABLE KEY: DOM node persists across smooth animation
          visualOffset: diff,
        };
      })
      .sort((a, b) => Math.abs(b.visualOffset) - Math.abs(a.visualOffset)); // Outer cards rendered first, center card rendered on top
  }, [N, visualIndex, rosters]);

  const activeRosterInCenter = N > 0 ? rosters[normalizeIndex(targetIndexRef.current)] : null;

  if (!isOpen) return null;

  return (
    <div
      onClick={() => commitSelection()}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-250 select-none overflow-y-auto"
    >
      {/* Fog Background Ambience */}
      <div className="absolute inset-0 bg-gradient-radial from-pink-950/30 via-zinc-950/85 to-black/95 pointer-events-none" />

      {/* MODAL MAIN CONTAINER - LARGER & RESPONSIVE */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[1300px] h-[92vh] max-h-[860px] min-h-[580px] rounded-[32px] sm:rounded-[44px] bg-[#08080c]/95 border-2 border-pink-500/35 shadow-[0_0_90px_rgba(255,0,85,0.4)] p-4 sm:p-6 md:p-8 flex flex-col items-center justify-between overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Close Icon (Top-Right) */}
        <button
          type="button"
          onClick={() => commitSelection()}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-zinc-900/90 border border-zinc-700/70 text-zinc-400 hover:text-white hover:border-pink-500 hover:bg-pink-950/50 hover:shadow-[0_0_20px_rgba(255,0,85,0.4)] transition-all cursor-pointer z-50"
          aria-label="Close and choose middle roster"
        >
          <X className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        {/* TOP TITLE */}
        <div className="text-center pt-1 sm:pt-2">
          <h2 className="text-xl sm:text-3xl md:text-4xl font-black font-mono tracking-[0.25em] sm:tracking-[0.35em] text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-rose-100 to-white drop-shadow-[0_0_25px_rgba(255,0,85,0.8)] uppercase">
            {dict?.smashOrPass?.selectRoster || (locale === 'pl' ? 'WYBIERZ ZESTAW' : 'SELECT ROSTER')}
          </h2>
        </div>

        {/* 3D CYLINDRICAL COVERFLOW CAROUSEL VIEWPORT */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-full flex-1 max-h-[580px] flex items-center justify-center overflow-visible touch-none cursor-grab active:cursor-grabbing my-2"
          style={{ perspective: 1200 }}
        >
          {/* Navigation Chevron Left */}
          <button
            type="button"
            aria-label="Previous Roster"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={stepPrev}
            className="absolute left-2 sm:left-4 md:left-8 z-50 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-black/80 border border-pink-500/40 text-white shadow-[0_0_25px_rgba(255,0,85,0.4)] hover:bg-[#ff0055] hover:border-pink-300 hover:scale-110 active:scale-95 transition-all cursor-pointer pointer-events-auto select-none"
          >
            <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7 stroke-[2.5]" />
          </button>

          {/* Navigation Chevron Right */}
          <button
            type="button"
            aria-label="Next Roster"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={stepNext}
            className="absolute right-2 sm:right-4 md:right-8 z-50 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-black/80 border border-pink-500/40 text-white shadow-[0_0_25px_rgba(255,0,85,0.4)] hover:bg-[#ff0055] hover:border-pink-300 hover:scale-110 active:scale-95 transition-all cursor-pointer pointer-events-auto select-none"
          >
            <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7 stroke-[2.5]" />
          </button>

          {/* 3D CARDS CONTAINER */}
          <div
            className="relative w-full h-full flex items-center justify-center"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {visibleCards.map(({ roster: r, keyId, visualOffset }) => {
              const absOffset = Math.abs(visualOffset);
              const isCenter = absOffset < 0.5;
              const isCurrentlyActive = r.slug === activeSelectedSlug;
              const count = r.entity_count ?? r.character_count ?? 0;
              const heroName = getRosterHeroName(r.slug);
              const coverUrl = getRosterCoverUrl(r);

              // Responsive Spread & 3D Geometry Calculation
              // Cards dynamically spread nicely on Mobile (150px) vs Tablet (210px) vs PC (260px)
              const spreadUnit =
                typeof window !== 'undefined' && window.innerWidth < 640
                  ? 145
                  : typeof window !== 'undefined' && window.innerWidth < 1024
                  ? 205
                  : 260;

              const translateX = visualOffset * spreadUnit;
              const rotateY = Math.max(-55, Math.min(55, -visualOffset * 30));
              const translateZ = -absOffset * 95;
              const scale = Math.max(0.68, 1.06 - absOffset * 0.14);
              const opacity = Math.max(0.1, 1 - absOffset * 0.26);
              const brightness = Math.max(0.3, 1 - absOffset * 0.35);
              const zIndex = Math.round(40 - absOffset * 10);

              return (
                <div
                  key={keyId}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isCenter) {
                      animateTo(Math.round(targetIndexRef.current + visualOffset), 420);
                      SmashSounds.playHoverTick();
                    } else {
                      commitSelection();
                    }
                  }}
                  className={`absolute w-[240px] sm:w-[300px] md:w-[350px] lg:w-[370px] h-[360px] sm:h-[450px] md:h-[500px] lg:h-[540px] rounded-[28px] sm:rounded-[36px] overflow-hidden cursor-pointer ${
                    isCenter
                      ? 'border-2 sm:border-[3px] border-[#ff0055] shadow-[0_0_55px_rgba(255,0,85,0.75),inset_0_0_25px_rgba(255,0,85,0.3)]'
                      : 'border border-pink-500/20 shadow-[0_0_25px_rgba(0,0,0,0.85)]'
                  }`}
                  style={{
                    transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                    opacity,
                    filter: `brightness(${brightness})`,
                    zIndex,
                    transformStyle: 'preserve-3d',
                    transition: isDragging
                      ? 'none'
                      : 'box-shadow 250ms ease-out, border-color 250ms ease-out',
                    willChange: isDragging ? 'transform, opacity, filter' : 'auto',
                    backfaceVisibility: 'hidden',
                  }}
                >
                  {/* Hero Artwork Image */}
                  <img
                    src={coverUrl}
                    alt={r.name || r.slug}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.dataset.triedWebp) {
                        target.dataset.triedWebp = '1';
                        target.src = `${getBackendBaseUrl()}/static/avatars/rosters/${r.slug}.webp`;
                      }
                    }}
                    className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none"
                  />

                  {/* Dark Gradient Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20 pointer-events-none" />

                  {/* Top-Left Candidate Count Tag */}
                  <div className="absolute top-4 left-4 sm:top-5 sm:left-5 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs sm:text-sm font-mono font-bold shadow-md pointer-events-none">
                    <Flame className="h-4 w-4 text-pink-400 fill-pink-400" />
                    <span>{count}</span>
                  </div>

                  {/* Top-Right Active Badge */}
                  {isCurrentlyActive && (
                    <div className="absolute top-4 right-4 sm:top-5 sm:right-5 flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-[#ff0055] text-white text-xs font-mono font-black shadow-[0_0_20px_rgba(255,0,85,0.9)] pointer-events-none">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                      <span>{dict?.smashOrPass?.active || 'ACTIVE'}</span>
                    </div>
                  )}

                  {/* Central Glowing Flame Emblem (Shown when Centered) */}
                  {isCenter && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-pink-950/45 border-2 border-pink-500/50 shadow-[0_0_35px_rgba(255,0,85,0.6)] backdrop-blur-sm animate-pulse">
                        <Flame className="h-8 w-8 sm:h-10 sm:w-10 text-pink-400 fill-pink-400 drop-shadow-[0_0_15px_rgba(255,0,85,0.9)]" />
                      </div>
                    </div>
                  )}

                  {/* Bottom Roster Information */}
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 text-center flex flex-col items-center justify-end z-10 pointer-events-none">
                    <h3 className="text-base sm:text-lg md:text-xl font-black font-mono tracking-wide text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] mb-1">
                      {getRosterDisplayName(r)}
                    </h3>

                    {heroName && (
                      <p className="text-xs sm:text-sm md:text-base font-mono font-bold text-pink-300/95 tracking-wider drop-shadow-md">
                        {heroName}
                      </p>
                    )}
                  </div>

                  {/* Center Card Inner Glow Highlight */}
                  {isCenter && (
                    <div className="absolute inset-0 rounded-[28px] sm:rounded-[36px] border-2 border-pink-400/50 pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM FOOTER INSTRUCTION & CHOOSE ACTION */}
        <div className="text-center pt-2 pb-1 space-y-2 sm:space-y-3">
          <p className="text-xs sm:text-sm md:text-base font-mono text-zinc-400 tracking-wide">
            {dict?.smashOrPass?.dwellHint ||
              (locale === 'pl'
                ? 'Chwyć i obróć. Karta na środku zostanie wybrana po zamknięciu.'
                : 'Grab and spin. Whatever card is in the center will be chosen.')}
          </p>

          {/* Large Click-to-Confirm Button */}
          {activeRosterInCenter && (
            <button
              type="button"
              onClick={() => commitSelection()}
              className="inline-flex items-center gap-2.5 px-8 sm:px-10 py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-pink-600 text-white font-mono font-black text-xs sm:text-sm md:text-base tracking-widest uppercase border border-pink-400/60 shadow-[0_0_35px_rgba(255,0,85,0.6)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Check className="h-4 w-4 sm:h-5 sm:w-5 stroke-[3]" />
              <span>
                {locale === 'pl' ? 'Wybierz: ' : 'Select: '}
                {getRosterDisplayName(activeRosterInCenter)}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
