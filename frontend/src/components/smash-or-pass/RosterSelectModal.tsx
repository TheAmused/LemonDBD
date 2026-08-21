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
  const [centerIndex, setCenterIndex] = useState<number>(0);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [activeSelectedSlug, setActiveSelectedSlug] = useState<string>(selectedRosterSlug);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartXRef = useRef<number>(0);
  const dragStartCenterRef = useRef<number>(0);
  const lastTickIndexRef = useRef<number>(0);

  // 1. Initialize centerIndex on modal open from localStorage or selectedRosterSlug
  useEffect(() => {
    if (!isOpen || rosters.length === 0) return;

    const savedSlug =
      (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) ||
      selectedRosterSlug ||
      'canon';

    const foundIdx = rosters.findIndex((r) => r.slug === savedSlug);
    const initialIdx = foundIdx !== -1 ? foundIdx : 0;

    setCenterIndex(initialIdx);
    setDragOffset(0);
    setIsDragging(false);
    setActiveSelectedSlug(savedSlug);
    lastTickIndexRef.current = initialIdx;
  }, [isOpen, rosters, selectedRosterSlug]);

  // Helper: Commit selection of whatever card is currently in the middle
  const commitSelection = useCallback(
    (indexToChoose?: number) => {
      if (rosters.length === 0) {
        onClose();
        return;
      }
      const targetIdx = Math.max(
        0,
        Math.min(
          rosters.length - 1,
          indexToChoose !== undefined ? indexToChoose : Math.round(centerIndex)
        )
      );
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
    [rosters, centerIndex, onSelectRoster, onClose]
  );

  // 2. Keyboard navigation (Arrow keys to spin, Enter to confirm, Escape to choose middle card and leave)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCenterIndex((prev) => {
          const next = Math.max(0, prev - 1);
          if (next !== prev) SmashSounds.playHoverTick();
          return next;
        });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCenterIndex((prev) => {
          const next = Math.min(rosters.length - 1, prev + 1);
          if (next !== prev) SmashSounds.playHoverTick();
          return next;
        });
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        commitSelection();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        // Whatever card is in the middle gets chosen upon leaving
        commitSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, rosters.length, commitSelection]);

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

  // 3. Pointer Drag Gestures (Grab and Pull / Swipe)
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    dragStartCenterRef.current = centerIndex;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartXRef.current;
    // 160px drag = 1 card shift
    const offset = -deltaX / 160;
    const rawTarget = dragStartCenterRef.current + offset;
    const clampedTarget = Math.max(0, Math.min(rosters.length - 1, rawTarget));

    setDragOffset(deltaX);
    setCenterIndex(clampedTarget);

    const roundedIdx = Math.round(clampedTarget);
    if (roundedIdx !== lastTickIndexRef.current) {
      lastTickIndexRef.current = roundedIdx;
      SmashSounds.playHoverTick();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    setDragOffset(0);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const snapped = Math.max(0, Math.min(rosters.length - 1, Math.round(centerIndex)));
    setCenterIndex(snapped);
  };

  // 4. Compute visible window of cards (Virtualized: only renders active window)
  const visibleCards = useMemo(() => {
    if (rosters.length === 0) return [];
    return rosters
      .map((roster, idx) => {
        const offset = idx - centerIndex;
        return { roster, idx, offset };
      })
      .filter(({ offset }) => Math.abs(offset) <= 2.5)
      .sort((a, b) => Math.abs(b.offset) - Math.abs(a.offset)); // render center card last for highest DOM z-index
  }, [rosters, centerIndex]);

  const activeRosterInCenter = rosters[Math.round(centerIndex)] || null;

  if (!isOpen) return null;

  return (
    <div
      onClick={() => commitSelection()}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-250 select-none"
    >
      {/* Fog Background Ambience */}
      <div className="absolute inset-0 bg-gradient-radial from-pink-950/25 via-zinc-950/80 to-black/95 pointer-events-none" />

      {/* MODAL MAIN CONTAINER */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl rounded-[32px] sm:rounded-[40px] bg-[#09090d]/95 border-2 border-pink-500/30 shadow-[0_0_80px_rgba(255,0,85,0.35)] p-5 sm:p-8 flex flex-col items-center justify-between overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Close Icon (Top-Right) */}
        <button
          type="button"
          onClick={() => commitSelection()}
          className="absolute top-5 right-5 sm:top-6 sm:right-6 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900/80 border border-zinc-700/60 text-zinc-400 hover:text-white hover:border-pink-500/50 hover:bg-pink-950/40 transition-all cursor-pointer z-40"
          aria-label="Close and choose middle roster"
        >
          <X className="h-5 w-5" />
        </button>

        {/* TOP TITLE */}
        <div className="text-center pt-2 pb-4">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black font-mono tracking-[0.25em] sm:tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-rose-100 to-white drop-shadow-[0_0_20px_rgba(255,0,85,0.7)] uppercase">
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
          className="relative w-full h-[390px] sm:h-[450px] flex items-center justify-center overflow-visible touch-none cursor-grab active:cursor-grabbing my-2"
          style={{ perspective: 1100 }}
        >
          {/* Navigation Chevron Left */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCenterIndex((prev) => {
                const next = Math.max(0, prev - 1);
                if (next !== prev) SmashSounds.playHoverTick();
                return next;
              });
            }}
            disabled={centerIndex <= 0}
            className={`absolute left-2 sm:left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-black/60 border border-pink-500/30 text-white shadow-[0_0_20px_rgba(255,0,85,0.3)] hover:bg-[#ff0055] hover:border-pink-300 hover:scale-110 active:scale-95 transition-all cursor-pointer ${
              centerIndex <= 0 ? 'opacity-30 pointer-events-none' : 'opacity-90 hover:opacity-100'
            }`}
          >
            <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
          </button>

          {/* Navigation Chevron Right */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCenterIndex((prev) => {
                const next = Math.min(rosters.length - 1, prev + 1);
                if (next !== prev) SmashSounds.playHoverTick();
                return next;
              });
            }}
            disabled={centerIndex >= rosters.length - 1}
            className={`absolute right-2 sm:right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-black/60 border border-pink-500/30 text-white shadow-[0_0_20px_rgba(255,0,85,0.3)] hover:bg-[#ff0055] hover:border-pink-300 hover:scale-110 active:scale-95 transition-all cursor-pointer ${
              centerIndex >= rosters.length - 1
                ? 'opacity-30 pointer-events-none'
                : 'opacity-90 hover:opacity-100'
            }`}
          >
            <ChevronRight className="h-6 w-6 stroke-[2.5]" />
          </button>

          {/* 3D CARDS CONTAINER */}
          <div
            className="relative w-full h-full flex items-center justify-center"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {visibleCards.map(({ roster: r, idx, offset }) => {
              const absOffset = Math.abs(offset);
              const isCenter = absOffset < 0.5;
              const isCurrentlyActive = r.slug === activeSelectedSlug;
              const count = r.entity_count ?? r.character_count ?? 0;
              const heroName = getRosterHeroName(r.slug);
              const coverUrl = getRosterCoverUrl(r);

              // 3D Geometry Calculation
              const translateX = offset * 210; // horizontal spread
              const rotateY = Math.max(-55, Math.min(55, -offset * 32)); // angular tilt
              const translateZ = -absOffset * 90; // depth recession
              const scale = Math.max(0.72, 1.05 - absOffset * 0.15); // center scale
              const opacity = Math.max(0.2, 1 - absOffset * 0.28);
              const brightness = Math.max(0.35, 1 - absOffset * 0.38);
              const zIndex = Math.round(30 - absOffset * 10);

              return (
                <div
                  key={r.slug}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isCenter) {
                      setCenterIndex(idx);
                      SmashSounds.playHoverTick();
                    } else {
                      commitSelection(idx);
                    }
                  }}
                  className={`absolute w-[230px] sm:w-[270px] h-[340px] sm:h-[400px] rounded-3xl overflow-hidden cursor-pointer transition-transform ${
                    isDragging ? 'duration-75' : 'duration-350 ease-out'
                  } ${
                    isCenter
                      ? 'border-2 border-[#ff0055] shadow-[0_0_45px_rgba(255,0,85,0.7),inset_0_0_20px_rgba(255,0,85,0.25)]'
                      : 'border border-pink-500/20 shadow-[0_0_20px_rgba(0,0,0,0.8)]'
                  }`}
                  style={{
                    transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                    opacity,
                    filter: `brightness(${brightness})`,
                    zIndex,
                    transformStyle: 'preserve-3d',
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
                  <div className="absolute top-3.5 left-3.5 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-mono font-bold shadow-md pointer-events-none">
                    <Flame className="h-3.5 w-3.5 text-pink-400 fill-pink-400" />
                    <span>{count}</span>
                  </div>

                  {/* Top-Right Active Badge */}
                  {isCurrentlyActive && (
                    <div className="absolute top-3.5 right-3.5 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#ff0055] text-white text-[11px] font-mono font-black shadow-[0_0_15px_rgba(255,0,85,0.8)] pointer-events-none">
                      <Check className="h-3 w-3 stroke-[3]" />
                      <span>{dict?.smashOrPass?.active || 'ACTIVE'}</span>
                    </div>
                  )}

                  {/* Central Glowing Flame Emblem (Shown when Centered) */}
                  {isCenter && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-pink-950/40 border border-pink-500/40 shadow-[0_0_25px_rgba(255,0,85,0.5)] backdrop-blur-sm animate-pulse">
                        <Flame className="h-7 w-7 text-pink-400 fill-pink-400 drop-shadow-[0_0_10px_rgba(255,0,85,0.8)]" />
                      </div>
                    </div>
                  )}

                  {/* Center/Bottom Roster Information */}
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 text-center flex flex-col items-center justify-end z-10 pointer-events-none">
                    <h3 className="text-sm sm:text-base font-black font-mono tracking-wide text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] mb-1">
                      {getRosterDisplayName(r)}
                    </h3>

                    {heroName && (
                      <p className="text-xs sm:text-sm font-mono font-bold text-pink-300/90 tracking-wider drop-shadow-md">
                        {heroName}
                      </p>
                    )}
                  </div>

                  {/* Active Border Glow Ring */}
                  {isCenter && (
                    <div className="absolute inset-0 rounded-3xl border-2 border-pink-400/60 pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM FOOTER INSTRUCTION & CHOOSE ACTION */}
        <div className="text-center pt-3 pb-1 space-y-2">
          <p className="text-xs sm:text-sm font-mono text-zinc-400 tracking-wide">
            {dict?.smashOrPass?.dwellHint ||
              (locale === 'pl'
                ? 'Chwyć i obróć. Karta na środku zostanie wybrana po zamknięciu.'
                : 'Grab and spin. Whatever card is in the center will be chosen.')}
          </p>

          {/* Quick Click-to-Confirm Button */}
          {activeRosterInCenter && (
            <button
              type="button"
              onClick={() => commitSelection()}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-pink-600 text-white font-mono font-black text-xs sm:text-sm tracking-widest uppercase border border-pink-400/50 shadow-[0_0_25px_rgba(255,0,85,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Check className="h-4 w-4 stroke-[3]" />
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
