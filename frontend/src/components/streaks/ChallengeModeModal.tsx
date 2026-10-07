'use client';
// frontend/src/components/streaks/ChallengeModeModal.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useState } from 'react';
import {
  ChallengeIntroModalShell,
  NEUTRAL_TILE_ACCENT,
  type ChallengeIntroTile,
} from './ChallengeIntroModalShell';
import { cascadeCompletedTiers, tierCompletionCount } from '@/utils/challengeTierCompletion';
import { useDictionary } from "@/context/DictionaryContext";

export interface TierTileDef {
  value: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  image?: string;
}

/**
 * Turns plain tier definitions into intro tiles with the gold/red completion
 * badges. Clearing a harder tier marks every easier one as done too
 * (see `cascadeCompletedTiers`), inheriting that tier's frozen count.
 */
export function buildCompletionTiles(
  order: readonly string[],
  defs: TierTileDef[],
  completedCounts: Record<string, number>,
  completedFullCounts: Record<string, number>
): ChallengeIntroTile[] {
  const completedTiers = cascadeCompletedTiers(order, Object.keys(completedCounts));
  const completedFullTiers = cascadeCompletedTiers(order, Object.keys(completedFullCounts));
  return defs.map((def) => ({
    ...def,
    accentClassName: NEUTRAL_TILE_ACCENT,
    completed: completedTiers.has(def.value),
    completedCount: tierCompletionCount(order, completedCounts, def.value),
    completedFull: completedFullTiers.has(def.value),
    completedFullCount: tierCompletionCount(order, completedFullCounts, def.value),
  }));
}

/** What the summary box shows for the highlighted tile. */
export interface ModeInfo {
  intro?: string;
  /** False hides the rules link, e.g. when the highlighted tile only leads to another screen. */
  showRules: boolean;
}

export interface ChallengeModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tiles: ChallengeIntroTile[];
  /** Called with the tile the player accepted. */
  onSelectTile: (value: string) => void;
  tileGridClassName: string;
  /** Omit to skip the intro box (and with it the rules link). */
  intro?: string;
  /** Set false to hide the "Read full rules" link even when there is an intro. */
  showRules?: boolean;
  /** Summary and rules link for the highlighted tile; replaces `intro` and `showRules` when given. */
  modeInfo?: (value: string | undefined) => ModeInfo;
  /** Renders the mode's rules modal for the highlighted tile; the modal owns the open/close state. */
  renderRules: (rules: { isOpen: boolean; onClose: () => void; value: string | undefined }) => React.ReactNode;
  selectedValue?: string;
  title?: string;
  onBack?: () => void;
  backLabel?: string;
}

/**
 * Shared "Choose a mode" modal for every streak mode (Gauntlet, Chaos,
 * History, Page Streak): the tile picker plus the mode's own rules modal,
 * with the rules open-state and Escape handling wired once. Each mode only
 * supplies its tiles, intro copy, and rules content.
 */
export const ChallengeModeModal: React.FC<ChallengeModeModalProps> = ({
      isOpen,
      onClose,
      tiles,
      onSelectTile,
      tileGridClassName,
      intro,
      showRules = true,
      modeInfo,
      renderRules,
      selectedValue,
      title,
      onBack,
      backLabel,
    }) => {
  const dict = useDictionary();
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  // A lone tile has nothing to compare against, so it starts highlighted.
  const defaultPending = selectedValue ?? (tiles.length === 1 ? tiles[0].value : undefined);
  const [pending, setPending] = useState(defaultPending);
  useEffect(() => {
    if (isOpen) setPending(defaultPending);
  }, [isOpen, defaultPending]);

  const info = modeInfo ? modeInfo(pending) : { intro, showRules };
  const pendingTile = tiles.find((tile) => tile.value === pending);

  return (
    <>
      <ChallengeIntroModalShell
        isOpen={isOpen}
        onClose={onClose}
        title={title ?? (dict.streaks.chooseMode)}
        intro={info.intro}
        rulesLabel={dict.streaks.rules}
        onOpenRules={info.showRules ? () => setIsRulesOpen(true) : undefined}
        tiles={tiles}
        onPickTile={setPending}
        pendingValue={pending}
        onAccept={() => pending && onSelectTile(pending)}
        acceptLabel={pendingTile?.advances ? dict.streaks.continueButton : dict.streaks.accept}
        acceptDisabled={!pending}
        tileGridClassName={tileGridClassName}
        escapeDisabled={isRulesOpen}
        selectedValue={selectedValue}
        currentLabel={dict.streaks.current}
        onBack={onBack}
        backLabel={backLabel}
      />
      {renderRules({ isOpen: isRulesOpen, onClose: () => setIsRulesOpen(false), value: pending })}
    </>
  );
};
