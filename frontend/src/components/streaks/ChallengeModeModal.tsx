'use client';
// frontend/src/components/streaks/ChallengeModeModal.tsx
import type { Dictionary } from '@/locales/types';

import React, { useState } from 'react';
import {
  ChallengeIntroModalShell,
  NEUTRAL_TILE_ACCENT,
  type ChallengeIntroTile,
} from './ChallengeIntroModalShell';
import { cascadeCompletedTiers, tierCompletionCount } from '@/utils/challengeTierCompletion';

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

export interface ChallengeModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tiles: ChallengeIntroTile[];
  onSelectTile: (value: string) => void;
  tileGridClassName: string;
  /** Omit to skip the intro box (and with it the rules link). */
  intro?: string;
  /** Set false to hide the "Read full rules" link even when there is an intro. */
  showRules?: boolean;
  /** Renders the mode's rules modal; the modal owns the open/close state. */
  renderRules: (rules: { isOpen: boolean; onClose: () => void }) => React.ReactNode;
  selectedValue?: string;
  title?: string;
  onBack?: () => void;
  backLabel?: string;
  dict?: Dictionary;
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
  renderRules,
  selectedValue,
  title,
  onBack,
  backLabel,
  dict,
}) => {
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  return (
    <>
      <ChallengeIntroModalShell
        isOpen={isOpen}
        onClose={onClose}
        title={title ?? (dict?.streaks?.chooseMode || 'Choose a mode')}
        intro={intro}
        rulesLabel={dict?.streaks?.readFullRules || 'Full rules'}
        onOpenRules={showRules ? () => setIsRulesOpen(true) : undefined}
        tiles={tiles}
        onSelectTile={onSelectTile}
        tileGridClassName={tileGridClassName}
        escapeDisabled={isRulesOpen}
        selectedValue={selectedValue}
        currentLabel={dict?.streaks?.current || 'Current'}
        onBack={onBack}
        backLabel={backLabel}
        dict={dict}
      />
      {renderRules({ isOpen: isRulesOpen, onClose: () => setIsRulesOpen(false) })}
    </>
  );
};
