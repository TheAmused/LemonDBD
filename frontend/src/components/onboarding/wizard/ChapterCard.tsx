'use client';
// frontend/src/components/onboarding/wizard/ChapterCard.tsx
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { OwnershipClipOverlay } from '@/components/characters/CharacterOwnershipOverlay';
import { SwitchTrack } from '@/components/common/Switch';
import { useDictionary } from '@/context/DictionaryContext';
import { getChapterBannerSrc } from '@/utils/mapUtils';
import {
  type ChapterGroup,
  type OnboardingCharacter,
  normalizeChapterKey,
  slugifyChapterName,
} from '../CharacterOnboardingWizardParts';
import type { ChapterBanner } from './useOnboardingRoster';

interface ChapterCardProps {
  group: ChapterGroup;
  isExpanded: boolean;
  chapterBanners: Record<string, ChapterBanner>;
  translatedChapterNames: Record<string, string>;
  backendBase: string;
  isCharacterOwned: (character: OnboardingCharacter) => boolean;
  getCharacterPerkStats: (characterId: number, role: string) => { total: number; unlocked: number };
  toggleChapterExpanded: (chapterName: string) => void;
  toggleChapter: (group: ChapterGroup, own: boolean) => void;
}

/** One chapter tile: banner (expands its characters) and a footer switch (owns the whole chapter). */
export function ChapterCard({
  group,
  isExpanded,
  chapterBanners,
  translatedChapterNames,
  backendBase,
  isCharacterOwned,
  getCharacterPerkStats,
  toggleChapterExpanded,
  toggleChapter,
}: ChapterCardProps) {
  const t = useDictionary().onboarding;
  const banner = chapterBanners[normalizeChapterKey(group.chapterName)];
  const bannerSrc = getChapterBannerSrc(banner, backendBase);
  const ownedCharacterCount = group.characters.filter(isCharacterOwned).length;
  const chapterOwned = ownedCharacterCount === group.characters.length;
  const chapterHasPartialSignal =
    ownedCharacterCount > 0 ||
    group.characters.some(
      (c) => !isCharacterOwned(c) && getCharacterPerkStats(c.id, c.category).unlocked > 0,
    );
  const chapterPartiallyOwned = !chapterOwned && chapterHasPartialSignal;
  // Display only -- expandedChapter/aria-id/banner lookups all key off
  // the canonical group.chapterName above, never this localized text.
  const chapterDisplayName = translatedChapterNames[group.chapterName] || group.chapterName;
  const chapterSwitchLabel = `${t.ownChapterButton}: ${chapterDisplayName}`;
  const chapterPanelId = `chapter-panel-${slugifyChapterName(group.chapterName)}`;

  return (
    <div className={`flex flex-col overflow-hidden rounded-xl sm:rounded-2xl border sm:border-2 bg-bg-surface ${isExpanded ? 'border-accent-red' : 'border-border-color'}`}>
      <button
        type="button"
        onClick={() => toggleChapterExpanded(group.chapterName)}
        aria-expanded={isExpanded}
        aria-controls={chapterPanelId}
        className="group relative flex aspect-video w-full items-center justify-center overflow-hidden bg-bg-elevated cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-red"
      >
        {bannerSrc ? (
          // object-cover, not object-contain -- these are ~616x353
          // (16:9-ish) capsule art from wiki.gg, so contain-fitted
          // into a differently-proportioned box left visible
          // letterboxing on the sides, reading as a small floating
          // image rather than art that fills the card.
          <img
            src={bannerSrc}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="px-1 sm:px-2 text-center text-tiny sm:text-sm font-extrabold text-text-secondary line-clamp-2">{chapterDisplayName}</span>
        )}
        <OwnershipClipOverlay
          isOwned={chapterOwned}
          isPartial={chapterPartiallyOwned}
          imageSrc={bannerSrc}
        />
        <ChevronDown
          className={`absolute top-1 right-1 sm:top-2 sm:right-2 h-3.5 w-3.5 sm:h-5 sm:w-5 text-text-inverted drop-shadow transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>
      {/* The whole footer toggles ownership, not just the small
          switch -- Switch renders its own <button>, so it can't
          be nested here; SwitchTrack is its presentational half. */}
      <button
        type="button"
        onClick={() => toggleChapter(group, !chapterOwned)}
        role="switch"
        aria-checked={chapterOwned}
        aria-label={chapterSwitchLabel}
        className="flex w-full items-center justify-between gap-1 sm:gap-2 border-t border-border-color px-1.5 py-1 sm:px-2.5 sm:py-2 text-left cursor-pointer hover:bg-bg-elevated transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-red"
      >
        <h3 className="flex-1 text-micro sm:text-xs font-bold sm:font-extrabold leading-tight line-clamp-2 min-h-[22px] sm:min-h-[32px] flex items-center text-text-primary break-words">
          {chapterDisplayName}
        </h3>
        <SwitchTrack checked={chapterOwned} size="sm" />
      </button>
    </div>
  );
}
