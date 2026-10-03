// frontend/src/components/generator/Toolbar.tsx
'use client';

import React from 'react';
import { Repeat, Volume2, VolumeX, RotateCcw, EyeOff, Info } from 'lucide-react';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { IconToggleButton } from './shared/IconToggleButton';
import { Tooltip } from '@/components/common/Tooltip';
import { getLocalizedMutator } from './lib/chaosMutatorLocalization';
import { useDictionary } from "@/context/DictionaryContext";

export interface ToolbarProps {
  noRepeatPerks: boolean;
  onToggleNoRepeat: () => void;
  /** Perks still playable right now (post No-Repeat exclusion) -- the "X"
   * of the X/N badge shown on the No-Repeat button while it's active. */
  playableCount: number;
  /** Total perks owned for this role -- the "N" of that same badge. */
  ownedCount: number;
  blindMode: boolean;
  onToggleBlindMode: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenChaosModal: () => void;
  activeMutator: ChaosMutator | null;
  onResetAll: () => void;
}

/** Bare row of icon toggle buttons -- no wrapping banner/border/background.
 * Floats directly in the stage's top-right corner (see StageFrame's
 * `topRight` slot), each button supplying its own shape/accent. */
export const Toolbar: React.FC<ToolbarProps> = ({
      noRepeatPerks,
      onToggleNoRepeat,
      playableCount,
      ownedCount,
      blindMode,
      onToggleBlindMode,
      audioEnabled,
      onToggleAudio,
      onOpenChaosModal,
      activeMutator,
      onResetAll,
    }) => {
  const dict = useDictionary();
  return (
    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Explains the [P/S] tag every drawn perk carries, across every mode
         * (Wheel, Instant, Slot Machine, Tarot, Loot Crate) since this toolbar
         * is mounted regardless of which one is active. Purely informational --
         * onClick is a no-op, the tooltip (hover/focus/touch) is the point. */}
        <Tooltip variant="action"
          title={dict.generator.coordinateLegendTooltipTitle}
          description={
            dict.generator.coordinateLegendTooltipDesc
          }
        >
          <IconToggleButton
            icon={<Info className="h-5 w-5" />}
            label={dict.generator.coordinateLegendTooltip}
            onClick={() => {}}
          />
        </Tooltip>

        <Tooltip variant="action"
          title={dict.generator.noRepeatTooltipTitle}
          description={
            noRepeatPerks
              ? dict.generator.noRepeatTooltipDescOn
              : dict.generator.noRepeatTooltipDescOff
          }
        >
          <IconToggleButton
            icon={<Repeat className="h-5 w-5" />}
            label={dict.generator.noRepeatTooltip}
            isActive={noRepeatPerks}
            badge={noRepeatPerks ? `${playableCount}/${ownedCount}` : undefined}
            onClick={onToggleNoRepeat}
          />
        </Tooltip>

        <Tooltip variant="action"
          title={dict.generator.blindModeTooltipTitle}
          description={dict.generator.blindModeTooltipDesc}
        >
          <IconToggleButton
            icon={<EyeOff className="h-5 w-5" />}
            label={dict.generator.blindModeTooltip}
            isActive={blindMode}
            onClick={onToggleBlindMode}
          />
        </Tooltip>

        <Tooltip variant="action"
          title={activeMutator
            ? getLocalizedMutator(activeMutator, dict).name
            : (dict.generator.chaosMutatorTooltip)}
          description={
            activeMutator
              ? getLocalizedMutator(activeMutator, dict).description
              : dict.generator.chaosMutatorTooltipDesc
          }
        >
          <IconToggleButton
            icon={<span className="text-lg leading-none">{activeMutator ? activeMutator.icon : '🔮'}</span>}
            label={activeMutator
              ? getLocalizedMutator(activeMutator, dict).name
              : (dict.generator.chaosMutatorTooltip)}
            isActive={Boolean(activeMutator)}
            onClick={onOpenChaosModal}
          />
        </Tooltip>

        <Tooltip variant="action"
          title={dict.generator.soundTooltipTitle}
          description={
            audioEnabled
              ? dict.generator.soundTooltipDescOn
              : dict.generator.soundTooltipDescOff
          }
        >
          <IconToggleButton
            icon={audioEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            label={
              audioEnabled
                ? dict.generator.audioOnLabel
                : dict.generator.audioOffLabel
            }
            isActive={audioEnabled}
            onClick={onToggleAudio}
          />
        </Tooltip>

        <Tooltip variant="action"
          title={dict.generator.resetAllTooltipTitle}
          align="end"
          description={dict.generator.resetAllTooltipDesc}
        >
          <IconToggleButton
            icon={<RotateCcw className="h-5 w-5" />}
            label={dict.generator.resetAllTooltip}
            onClick={onResetAll}
          />
        </Tooltip>
    </div>
  );
};
