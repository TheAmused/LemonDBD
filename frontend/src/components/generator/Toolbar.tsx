// frontend/src/components/generator/Toolbar.tsx
'use client';

import React, { useRef, useState } from 'react';
import { ChevronDown, Repeat, Volume2, VolumeX, RotateCcw, EyeOff } from 'lucide-react';
import type { ChaosMutator } from '@/types/chaos';
import { CurseIcon } from '@/components/icons/DbdIcons';

import { IconToggleButton } from './shared/IconToggleButton';
import { Tooltip } from '@/components/common/Tooltip';
import { Collapsible } from '@/components/common/Collapsible';
import { MENU_PANEL_CLASS, Popover } from '@/components/common/Popover';
import { cn } from '@/utils/cn';
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
 * `topRight` slot), each button supplying its own shape/accent.
 * Below `sm` only No-Repeat and the curse stay in the row; the rest fold away behind a chevron
 * (the root dissolves there, so the buttons wrap in the parent row). */
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
  const [moreOpen, setMoreOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const legendRef = useRef<HTMLSpanElement>(null);
  return (
    <div className="contents sm:flex sm:items-center sm:gap-1.5 sm:shrink-0">
        <Tooltip variant="action"
          title={dict.generator.noRepeatTooltipTitle}
          description={
            noRepeatPerks
              ? dict.generator.noRepeatTooltipDescOn
              : dict.generator.noRepeatTooltipDescOff
          }
        >
          <IconToggleButton
            icon={<Repeat className="icon-lg" />}
            label={dict.generator.noRepeatTooltip}
            isActive={noRepeatPerks}
            badge={noRepeatPerks ? `${playableCount}/${ownedCount}` : undefined}
            onClick={onToggleNoRepeat}
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
            icon={activeMutator
              ? <span className="text-lg leading-none">{activeMutator.icon}</span>
              : <CurseIcon className="icon-lg" />}
            label={activeMutator
              ? getLocalizedMutator(activeMutator, dict).name
              : (dict.generator.chaosMutatorTooltip)}
            isActive={Boolean(activeMutator)}
            onClick={onOpenChaosModal}
          />
        </Tooltip>

        <IconToggleButton
          icon={<ChevronDown className={cn('icon-lg transition-transform duration-300 motion-reduce:transition-none', moreOpen && 'rotate-180')} />}
          label={dict.streaks.moreActions}
          isActive={moreOpen}
          onClick={() => setMoreOpen((v) => !v)}
          className="sm:hidden"
        />
        <Collapsible open={moreOpen} onlyBelow="sm" className="max-sm:basis-full" contentClassName="flex items-center justify-center gap-1.5 sm:contents">
          <Tooltip variant="action"
            title={dict.generator.blindModeTooltipTitle}
            description={dict.generator.blindModeTooltipDesc}
          >
            <IconToggleButton
              icon={<EyeOff className="icon-lg" />}
              label={dict.generator.blindModeTooltip}
              isActive={blindMode}
              onClick={onToggleBlindMode}
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
              icon={audioEnabled ? <Volume2 className="icon-lg" /> : <VolumeX className="icon-lg" />}
              label={
                audioEnabled
                  ? dict.generator.audioOnLabel
                  : dict.generator.audioOffLabel
              }
              isActive={audioEnabled}
              onClick={onToggleAudio}
            />
          </Tooltip>

          {/* Explains the [P/S] tag every drawn perk carries, across every mode
           * (Wheel, Instant, Slot Machine, Tarot, Loot Crate) since this toolbar
           * is mounted regardless of which one is active. Hover shows the tooltip;
           * a tap (a touch screen has no hover) or Enter opens the same text in a popover. */}
          <span ref={legendRef} className="inline-flex">
            <Tooltip variant="action"
              title={dict.generator.coordinateLegendTooltipTitle}
              description={
                dict.generator.coordinateLegendTooltipDesc
              }
            >
              <IconToggleButton
                icon={<span className="type-strong leading-none">{dict.generator.coordinateLegendIcon}</span>}
                label={dict.generator.coordinateLegendTooltip}
                isActive={legendOpen}
                onClick={() => setLegendOpen((open) => !open)}
              />
            </Tooltip>
          </span>
          <Popover
            open={legendOpen}
            anchorRef={legendRef}
            onClose={() => setLegendOpen(false)}
            align="end"
            className={cn(MENU_PANEL_CLASS, 'w-64 p-3')}
          >
            <p className="type-strong text-accent-amber">{dict.generator.coordinateLegendTooltipTitle}</p>
            <p className="type-body mt-1 text-text-secondary">{dict.generator.coordinateLegendTooltipDesc}</p>
          </Popover>

          <Tooltip variant="action"
            title={dict.generator.resetAllTooltipTitle}
            align="end"
            description={dict.generator.resetAllTooltipDesc}
          >
            <IconToggleButton
              icon={<RotateCcw className="icon-lg" />}
              label={dict.generator.resetAllTooltip}
              onClick={onResetAll}
            />
          </Tooltip>
        </Collapsible>
    </div>
  );
};
