// frontend/src/components/smash-or-pass/roster-select/useRosterCarousel.ts
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RosterItem } from '@/types/smashOrPass';
import { SmashSounds } from '../SmashSoundEffects';

const STORAGE_KEY = 'dbd_smash_selected_roster';

interface UseRosterCarouselOptions {
  isOpen: boolean;
  rosters: RosterItem[];
  selectedRosterSlug: string;
  onSelectRoster: (slug: string) => void;
  onClose: () => void;
}

/**
 * The roster picker's carousel: official/custom tabs, the animated and draggable position, the
 * arrow/Enter/Escape-to-confirm keys, and which roster ends up chosen.
 */
export function useRosterCarousel({ isOpen, rosters, selectedRosterSlug, onSelectRoster, onClose }: UseRosterCarouselOptions) {
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


  /** Brings a card that is `visualOffset` cards from the centre to the centre. */
  const jumpBy = useCallback(
    (visualOffset: number) => {
      animateTo(Math.round(targetIndexRef.current + visualOffset), 420);
      SmashSounds.playHoverTick();
    },
    [animateTo]
  );

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

  return {
    filter,
    handleFilterChange,
    officialRosters,
    customRosters,
    N,
    isDragging,
    activeSelectedSlug,
    visibleCards,
    activeRosterInCenter,
    containerRef,
    commitSelection,
    handleClose,
    stepPrev,
    stepNext,
    jumpBy,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
