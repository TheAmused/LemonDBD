// frontend/src/components/onboarding/wizard/useChapterExpansion.ts
import { useEffect, useRef, useState } from 'react';
import { useResponsiveGridColumns } from '@/hooks/useResponsiveGridColumns';
import { CHAPTER_GRID_BREAKPOINTS, type ChapterGroup } from '../CharacterOnboardingWizardParts';

/** Which chapter's character panel is open, animating, or queued, and where in the grid it sits. */
export function useChapterExpansion(filteredChapterGroups: ChapterGroup[]) {
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);
  // A chapter's expand panel only ever occupies a grid row while it's
  // mounted -- see chapterRowEndIndex below -- so it can't just track
  // `expandedChapter` directly: the panel's own row position is keyed off
  // `renderedChapter`, which framer-motion's `onExitComplete` (not a guessed
  // setTimeout) keeps mounted for exactly as long as the close animation
  // actually takes. Switching straight from one open chapter to another
  // (different row) goes through pendingChapterOpenRef so the old panel gets
  // to fully close before the new one's row position takes over.
  const [renderedChapter, setRenderedChapter] = useState<string | null>(null);
  const pendingChapterOpenRef = useRef<string | null>(null);

  const toggleChapterExpanded = (chapterName: string) => {
    setExpandedChapter((prev) => {
      if (prev === chapterName) {
        pendingChapterOpenRef.current = null;
        return null;
      }
      // Also queues (rather than opening immediately) while something is
      // still mounted-but-closing (renderedChapter set, expandedChapter
      // already null) -- e.g. chapter A is closing after B was clicked,
      // and C gets clicked before A's exit animation finishes. Gating on
      // `prev` alone would open C right away, forcing A's still-animating
      // panel (whose row position is keyed off renderedChapter) to get
      // yanked out from under framer-motion instead of finishing its exit.
      if (prev !== null || renderedChapter !== null) {
        pendingChapterOpenRef.current = chapterName;
        return null;
      }
      pendingChapterOpenRef.current = null;
      return chapterName;
    });
  };

  useEffect(() => {
    if (expandedChapter !== null) setRenderedChapter(expandedChapter);
    // When expandedChapter goes null, renderedChapter is left as-is --
    // handleChapterPanelExitComplete clears it once the close transition
    // genuinely finishes, and opens any pending chapter at that point.
  }, [expandedChapter]);

  const handleChapterPanelExitComplete = () => {
    setRenderedChapter(null);
    if (pendingChapterOpenRef.current) {
      const next = pendingChapterOpenRef.current;
      pendingChapterOpenRef.current = null;
      setExpandedChapter(next);
    }
  };

  // Chapters can legitimately disappear between renders (e.g. a refetch of
  // /users/{id}/characters returning a different roster) -- without this,
  // `renderedChapter`/`expandedChapter` referencing a now-gone chapter would
  // drive chapterRowEndIndex below to a permanent -1, so the expand panel's
  // AnimatePresence host stops rendering, its onExitComplete never fires,
  // renderedChapter never clears, and every future chapter click gets stuck
  // queued in pendingChapterOpenRef instead of opening.
  useEffect(() => {
    const stillExists = (name: string | null) =>
      name === null || filteredChapterGroups.some((g) => g.chapterName === name);
    if (!stillExists(expandedChapter) || !stillExists(renderedChapter)) {
      setExpandedChapter(null);
      setRenderedChapter(null);
      pendingChapterOpenRef.current = null;
    }
  }, [filteredChapterGroups, expandedChapter, renderedChapter]);

  // Needed so the expand panel below can be placed after the last card of
  // its row instead of right after whichever card was clicked -- otherwise
  // the other cards sharing that row get shoved onto a new row too (there's
  // no room left for a full-width item mid-row), which reads as unrelated
  // cards randomly jumping instead of the row smoothly growing.
  const chapterColumns = useResponsiveGridColumns(CHAPTER_GRID_BREAKPOINTS, 3);
  const renderedGroup = renderedChapter
    ? filteredChapterGroups.find((g) => g.chapterName === renderedChapter)
    : undefined;
  const renderedChapterIndex = renderedGroup ? filteredChapterGroups.indexOf(renderedGroup) : -1;
  const chapterRowEndIndex =
    renderedChapterIndex === -1
      ? -1
      : Math.min(
          chapterColumns * (Math.floor(renderedChapterIndex / chapterColumns) + 1) - 1,
          filteredChapterGroups.length - 1
        );

  return {
    expandedChapter,
    renderedGroup,
    chapterRowEndIndex,
    toggleChapterExpanded,
    handleChapterPanelExitComplete,
  };
}
