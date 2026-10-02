'use client';
// frontend/src/components/smash-or-pass/RosterSelectModal.tsx

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check, Flame, Lock, AlertTriangle, Sparkles, Upload, Pencil, Trash2, Share2 } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { RosterItem } from '@/types/smashOrPass';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { cn } from '@/utils/cn';
import { SmashSounds } from './SmashSoundEffects';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';

const STORAGE_KEY = 'dbd_smash_selected_roster';

interface RosterSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Every pickable roster, official (API) and the viewer's own (localStorage)
   * already merged into one list by the caller -- this component is data-driven
   * and does not care where a roster came from, only whether `is_active` and
   * `is_local` say about it. */
  rosters: RosterItem[];
  selectedRosterSlug: string;
  onSelectRoster: (slug: string) => void;
  /** Opens the roster creator (a fresh draft). */
  onCreateRoster?: () => void;
  /** Opens the "paste JSON / upload / share link" import flow for a custom roster. */
  onImportRoster?: () => void;
  /** Opens the creator pre-filled with this local roster's id for editing. */
  onEditRoster?: (id: string) => void;
  /** Deletes a local roster (after the caller has confirmed with the viewer). */
  onDeleteRoster?: (id: string) => void;
  /** Opens the share-link/JSON export flow for a local roster. */
  onExportRoster?: (id: string) => void;
  locale?: string;
  dict?: Dictionary | any;
}

export const RosterSelectModal: React.FC<RosterSelectModalProps> = ({
  isOpen,
  onClose,
  rosters,
  selectedRosterSlug,
  onSelectRoster,
  onCreateRoster,
  onImportRoster,
  onEditRoster,
  onDeleteRoster,
  onExportRoster,
  locale = 'en',
  dict,
}) => {
  const isCurrentlyCustom = Boolean(selectedRosterSlug?.startsWith('local:'));
  const [filter, setFilter] = useState<'official' | 'custom'>(isCurrentlyCustom ? 'custom' : 'official');
  const [visualIndex, setVisualIndex] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [activeSelectedSlug, setActiveSelectedSlug] = useState<string>(selectedRosterSlug);

  const officialRosters = useMemo(
    () => rosters.filter((r) => !r.is_local && !r.slug.startsWith('local:')),
    [rosters]
  );
  const customRosters = useMemo(
    () => rosters.filter((r) => r.is_local || r.slug.startsWith('local:')),
    [rosters]
  );

  const displayedRosters = useMemo(() => {
    return filter === 'custom' ? customRosters : officialRosters;
  }, [filter, officialRosters, customRosters]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartXRef = useRef<number>(0);
  const dragStartCenterRef = useRef<number>(0);
  const lastTickIndexRef = useRef<number>(0);

  const visualIndexRef = useRef<number>(0);
  const targetIndexRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  const N = displayedRosters.length;

  const handleFilterChange = (newFilter: 'official' | 'custom') => {
    setFilter(newFilter);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    visualIndexRef.current = 0;
    targetIndexRef.current = 0;
    lastTickIndexRef.current = 0;
    setVisualIndex(0);
  };

  const normalizeIndex = useCallback(
    (idx: number): number => {
      if (N === 0) return 0;
      return ((Math.round(idx) % N) + N) % N;
    },
    [N]
  );

  const animateTo = useCallback(
    (target: number, duration = 420) => {
      targetIndexRef.current = target;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      const startVal = visualIndexRef.current;
      const endVal = target;
      const startTime = performance.now();

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

  useEffect(() => {
    if (!isOpen || N === 0) return;

    const savedSlug =
      (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) ||
      selectedRosterSlug ||
      'canon';

    const foundIdx = displayedRosters.findIndex((r) => r.slug === savedSlug);
    const initialIdx = foundIdx !== -1 ? foundIdx : 0;

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    visualIndexRef.current = initialIdx;
    targetIndexRef.current = initialIdx;
    setVisualIndex(initialIdx);
    setIsDragging(false);
    setActiveSelectedSlug(savedSlug);
    lastTickIndexRef.current = initialIdx;
  }, [isOpen, N, displayedRosters, selectedRosterSlug]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

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

      const chosenRoster = displayedRosters[targetIdx];
      if (chosenRoster) {
        if (chosenRoster.is_active === false) {
          SmashSounds.playHoverTick();
          return;
        }
        setActiveSelectedSlug(chosenRoster.slug);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, chosenRoster.slug);
        }
        onSelectRoster(chosenRoster.slug);
        SmashSounds.playSmashSound();
      }
      onClose();
    },
    [N, normalizeIndex, displayedRosters, onSelectRoster, onClose]
  );

  // Closing (X, backdrop, Escape) confirms the roster centered in the carousel.
  // If that roster is locked/inactive (or nothing is centered), nothing changes
  // and the roster that was active when the modal opened stays selected.
  const handleClose = useCallback(() => {
    if (N > 0) {
      const centered = displayedRosters[normalizeIndex(targetIndexRef.current)];
      if (centered && centered.is_active !== false) {
        if (centered.slug !== activeSelectedSlug) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, centered.slug);
          }
          setActiveSelectedSlug(centered.slug);
          onSelectRoster(centered.slug);
        }
      }
    }
    onClose();
  }, [N, displayedRosters, normalizeIndex, activeSelectedSlug, onSelectRoster, onClose]);

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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, commitSelection, stepPrev, stepNext]);

  const getRosterDisplayName = useCallback(
    (r: RosterItem) => {
      return r.name || r.slug;
    },
    []
  );

  const getRosterCoverUrl = (r: RosterItem) => {
    if (r.cover_image_url) {
      return r.cover_image_url.startsWith('http') || r.cover_image_url.startsWith('data:')
        ? r.cover_image_url
        : `${getBackendBaseUrl()}${r.cover_image_url}`;
    }
    // A local roster has no backend static asset to fall back to.
    if (r.is_local) return `${getBackendBaseUrl()}/static/avatars/survivors/sable_ward.webp`;
    return `${getBackendBaseUrl()}/static/avatars/rosters/${r.slug}.webp`;
  };

  const lastMoveXRef = useRef<number>(0);
  const lastMoveTimeRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);

  const handlePointerDown = (e: React.PointerEvent) => {
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

    velocityRef.current = dx / dt;
    lastMoveXRef.current = e.clientX;
    lastMoveTimeRef.current = now;

    const deltaX = e.clientX - dragStartXRef.current;
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

    let momentumShift = 0;
    if (Math.abs(velocityRef.current) > 0.35) {
      momentumShift =
        -Math.sign(velocityRef.current) *
        Math.min(2, Math.round(Math.abs(velocityRef.current) * 1.5));
    }

    const targetCenter = Math.round(visualIndexRef.current + momentumShift);
    animateTo(targetCenter, 420);
  };

  const visibleCards = useMemo(() => {
    if (N === 0) return [];

    return displayedRosters
      .map((roster, i) => {
        const diff = ((i - visualIndex) % N + N * 1.5) % N - (N / 2);
        return {
          roster,
          rosterIdx: i,
          keyId: roster.slug,
          visualOffset: diff,
        };
      })
      .sort((a, b) => Math.abs(b.visualOffset) - Math.abs(a.visualOffset));
  }, [N, visualIndex, displayedRosters]);

  const activeRosterInCenter = N > 0 ? displayedRosters[normalizeIndex(targetIndexRef.current)] : null;

  const rawSmash = dict?.smashOrPass;
  const selectRosterTitle = rawSmash?.selectRoster || '';
  const candidatesWord = rawSmash?.candidates || rawSmash?.candidatesWord || '';
  const selectPrefixText = rawSmash?.selectPrefix || rawSmash?.select || '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      variant="dialog"
      size="full"
      closeButton="floating"
      ariaLabel={selectRosterTitle}
      closeButtonAriaLabel={dict?.modal?.close || ''}
      backdrop="blur"
      className="h-[94dvh] max-h-[1100px] min-h-[580px] max-w-[1600px] border-2 border-accent-red/35 rounded-[32px] sm:rounded-[44px]"
      bodyClassName="flex flex-col overflow-hidden"
    >
      <div className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-between overflow-hidden p-4 sm:p-6 md:p-8">
        {/* Top Left: Filter Toggle (Official vs Custom) */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50">
          <div className="inline-flex items-center gap-1 p-1 bg-bg-elevated/90 backdrop-blur-md rounded-2xl border border-border-color shadow-sm">
            <button
              type="button"
              onClick={() => handleFilterChange('official')}
              className={cn(
                'flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer touch-manipulation',
                filter === 'official'
                  ? 'bg-accent-red text-text-inverted shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Flame className="h-3 w-3" />
              <span>{dict?.smashOrPass?.picker?.officialTab} ({officialRosters.length})</span>
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange('custom')}
              className={cn(
                'flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer touch-manipulation',
                filter === 'custom'
                  ? 'bg-accent-red text-text-inverted shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Sparkles className="h-3 w-3" />
              <span>{dict?.smashOrPass?.picker?.customTab} ({customRosters.length})</span>
            </button>
          </div>
        </div>

        <div className="text-center pt-1 sm:pt-2 space-y-2.5">
          <h2 className="text-xl sm:text-3xl md:text-4xl font-black tracking-[0.25em] sm:tracking-[0.35em] text-text-primary uppercase">
            {selectRosterTitle}
          </h2>

          {(onCreateRoster || onImportRoster) && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
              {onCreateRoster && (
                <button
                  type="button"
                  onClick={onCreateRoster}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-xl bg-accent-red/10 border border-accent-red/40 text-accent-red text-xs font-bold uppercase tracking-wide hover:bg-accent-red/20 transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  {dict?.smashOrPass?.picker?.createRoster || 'Create a roster'}
                </button>
              )}
              {onImportRoster && (
                <button
                  type="button"
                  onClick={onImportRoster}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-xl bg-bg-elevated border border-border-color text-text-secondary text-xs font-bold uppercase tracking-wide hover:text-text-primary hover:border-border-subtle transition-colors cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  {dict?.smashOrPass?.picker?.importRoster || 'Import'}
                </button>
              )}
            </div>
          )}
        </div>

        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-full flex-1 min-h-0 flex items-center justify-center overflow-visible touch-none cursor-grab active:cursor-grabbing my-2"
          style={{
            perspective: 1200,
            ['--card-h' as string]: 'clamp(340px, calc(94dvh - 330px), 760px)',
            ['--card-w' as string]: 'calc(var(--card-h) * 0.685)',
          }}
          role="region"
          aria-label={selectRosterTitle}
        >
          {N > 0 && (
            <>
              <button
                type="button"
                aria-label={dict?.pagination?.previous || ''}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={stepPrev}
                className="absolute left-2 sm:left-4 md:left-8 z-50 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-bg-surface border border-accent-red/40 text-accent-red hover:bg-accent-red hover:text-text-inverted hover:border-accent-red hover:scale-110 active:scale-95 transition-all cursor-pointer pointer-events-auto select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
              >
                <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7 stroke-[2.5]" aria-hidden="true" />
              </button>

              <button
                type="button"
                aria-label={dict?.pagination?.next || ''}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={stepNext}
                className="absolute right-2 sm:right-4 md:right-8 z-50 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-bg-surface border border-accent-red/40 text-accent-red hover:bg-accent-red hover:text-text-inverted hover:border-accent-red hover:scale-110 active:scale-95 transition-all cursor-pointer pointer-events-auto select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
              >
                <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7 stroke-[2.5]" aria-hidden="true" />
              </button>
            </>
          )}

          {N === 0 ? (
            <div className="relative z-10 flex flex-col items-center justify-center gap-3 p-8 rounded-3xl border border-dashed border-border-color bg-bg-elevated/40 text-center max-w-md mx-auto">
              <Sparkles className="h-10 w-10 text-accent-red animate-pulse" />
              <h3 className="text-base font-bold text-text-primary uppercase tracking-wide">
                {filter === 'custom'
                  ? dict?.smashOrPass?.picker?.noCustomRostersFound
                  : dict?.smashOrPass?.picker?.noRostersFound}
              </h3>
              <p className="text-xs text-text-muted">
                {filter === 'custom'
                  ? dict?.smashOrPass?.picker?.noCustomRostersDesc
                  : dict?.smashOrPass?.picker?.noRostersMatchDesc}
              </p>
              {onCreateRoster && filter === 'custom' && (
                <Button
                  variant="primary" size="sm"
                  onClick={() => {
                    onClose();
                    onCreateRoster();
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{dict?.smashOrPass?.picker?.createFirstRoster}</span>
                </Button>
              )}
            </div>
          ) : (
            <div
              className="relative w-full h-full flex items-center justify-center"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {visibleCards.map(({ roster: r, keyId, visualOffset }) => {
              const absOffset = Math.abs(visualOffset);
              const isCenter = absOffset < 0.5;
              const isCurrentlyActive = r.slug === activeSelectedSlug;
              const isRosterEnabled = r.is_active !== false;
              const count = r.entity_count ?? r.character_count ?? 0;
              const coverUrl = getRosterCoverUrl(r);

              const spreadUnit =
                typeof window !== 'undefined' && window.innerWidth < 640
                  ? 145
                  : typeof window !== 'undefined' && window.innerWidth < 1024
                    ? 205
                    : window.innerWidth >= 1536
                      ? 360
                      : window.innerWidth >= 1280
                        ? 310
                        : 260;

              const translateX = visualOffset * spreadUnit;
              const rotateY = Math.max(-55, Math.min(55, -visualOffset * 30));
              const translateZ = -absOffset * 95;
              const scale = Math.max(0.68, 1.06 - absOffset * 0.14);
              const opacity = Math.max(0.1, 1 - absOffset * 0.26);
              const brightness = Math.max(0.3, 1 - absOffset * 0.35);
              const zIndex = Math.round(40 - absOffset * 10);

              const rosterLabel = `${getRosterDisplayName(r)}${count ? `, ${count} ${candidatesWord}` : ''}${!isRosterEnabled ? ' (Coming Soon)' : ''}${r.is_nsfw ? ' (NSFW)' : ''}`;

              return (
                <div
                  key={keyId}
                  role="button"
                  tabIndex={0}
                  aria-label={rosterLabel}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isCenter) {
                      animateTo(Math.round(targetIndexRef.current + visualOffset), 420);
                      SmashSounds.playHoverTick();
                    } else if (isRosterEnabled) {
                      commitSelection();
                    } else {
                      SmashSounds.playHoverTick();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (isRosterEnabled) commitSelection();
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
                      className="absolute top-4 left-4 sm:top-5 sm:left-5 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-bg-primary/80 backdrop-blur-md border border-border-color text-text-inverted text-xs sm:text-sm font-bold shadow-md pointer-events-none"
                    >
                      <Flame className="h-4 w-4 text-accent-red fill-accent-red" aria-hidden="true" />
                      <span>{count}</span>
                    </div>
                  )}

                  {r.is_nsfw && (
                    <div
                      data-testid="roster-nsfw-badge"
                      className="absolute top-4 left-1/2 -translate-x-1/2 sm:top-5 flex items-center gap-1 px-2.5 py-1 rounded-2xl bg-accent-red text-text-inverted text-[10px] sm:text-xs font-black uppercase tracking-wide shadow-md pointer-events-none"
                    >
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                      <span>{dict?.smashOrPass?.nsfw?.badge || 'NSFW'}</span>
                    </div>
                  )}

                  {r.is_local && (
                    <div
                      data-testid="roster-local-badge"
                      className="absolute bottom-[5.5rem] left-1/2 -translate-x-1/2 sm:bottom-24 flex items-center gap-1 px-2.5 py-1 rounded-2xl bg-bg-primary/85 backdrop-blur-md border border-accent-amber/40 text-accent-amber text-[10px] sm:text-xs font-black uppercase tracking-wide shadow-md pointer-events-none"
                    >
                      <Sparkles className="h-3 w-3" aria-hidden="true" />
                      <span>{dict?.smashOrPass?.picker?.yours || 'Yours'}</span>
                    </div>
                  )}

                  {isCurrentlyActive && (
                    <div
                      className="absolute top-4 right-4 sm:top-5 sm:right-5 flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-accent-red text-text-inverted text-xs font-black pointer-events-none"
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" aria-hidden="true" />
                      <span>{rawSmash?.active || ''}</span>
                    </div>
                  )}

                  {!isRosterEnabled && !isCurrentlyActive && (
                    <div className="absolute top-4 right-4 sm:top-5 sm:right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-bg-elevated border border-border-color text-text-secondary text-xs font-bold shadow-lg pointer-events-none">
                      <Lock className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                      <span>{dict?.smashOrPass?.comingSoon || 'Coming Soon'}</span>
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
                      {getRosterDisplayName(r)}
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
            })}
          </div>
        )}
      </div>

        <div className="text-center pt-2 pb-1 space-y-2 sm:space-y-3">
          {rawSmash?.dwellHint && (
            <p className="text-xs sm:text-sm md:text-base text-text-muted tracking-wide">
              {rawSmash.dwellHint}
            </p>
          )}

          {activeRosterInCenter && (
            // `relative z-50`: the carousel's centered card sits at inline
            // `zIndex: 40` (see the per-card `style` above) so it can layer
            // over its neighbors -- without an explicit stacking context here
            // that outranks it, a tall card (long roster name/description)
            // can end up painted on top of this row and swallow clicks on
            // Select/Edit/Export/Delete even though they render visually above it.
            <div className="relative z-50 flex flex-wrap items-center justify-center gap-2.5">
              {activeRosterInCenter.is_active !== false ? (
                <Button
                  variant="primary" size="lg"
                  onClick={() => commitSelection()}
                  className="rounded-2xl px-8 sm:px-10 uppercase tracking-widest"
                >
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 stroke-[3]" aria-hidden="true" />
                  <span>
                    {selectPrefixText ? `${selectPrefixText} ` : ''}
                    {getRosterDisplayName(activeRosterInCenter)}
                  </span>
                </Button>
              ) : (
                <Button
                  variant="secondary" size="lg"
                  disabled
                  className="rounded-2xl px-8 sm:px-10 uppercase tracking-widest"
                >
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-text-muted" aria-hidden="true" />
                  <span>
                    {getRosterDisplayName(activeRosterInCenter)} ({dict?.smashOrPass?.comingSoon || 'Coming Soon'})
                  </span>
                </Button>
              )}

              {activeRosterInCenter.is_local && (onEditRoster || onExportRoster || onDeleteRoster) && (
                <>
                  {onEditRoster && (
                    <Button
                      variant="secondary" size="lg" icon
                      onClick={() => onEditRoster((activeRosterInCenter as RosterItem).id)}
                      aria-label={dict?.smashOrPass?.picker?.editRoster || 'Edit this roster'}
                      className="h-11 w-11 sm:h-[52px] sm:w-[52px] rounded-2xl"
                    >
                      <Pencil className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    </Button>
                  )}
                  {onExportRoster && (
                    <Button
                      variant="secondary" size="lg" icon
                      onClick={() => onExportRoster((activeRosterInCenter as RosterItem).id)}
                      aria-label={dict?.smashOrPass?.picker?.exportRoster || 'Export this roster'}
                      className="h-11 w-11 sm:h-[52px] sm:w-[52px] rounded-2xl"
                    >
                      <Share2 className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    </Button>
                  )}
                  {onDeleteRoster && (
                    <Button
                      variant="secondary" size="lg" icon
                      onClick={() => onDeleteRoster((activeRosterInCenter as RosterItem).id)}
                      aria-label={dict?.smashOrPass?.picker?.deleteRoster || 'Delete this roster'}
                      className="h-11 w-11 sm:h-[52px] sm:w-[52px] rounded-2xl"
                    >
                      <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
