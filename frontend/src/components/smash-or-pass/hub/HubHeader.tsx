'use client';
// frontend/src/components/smash-or-pass/hub/HubHeader.tsx
import { useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Tooltip } from '@/components/common/Tooltip';
import { Button } from '@/components/common/Button';
import { Popover, popoverTriggerProps } from '@/components/common/Popover';
import {
  AshUrnIcon,
  CardShuffleIcon,
  CardStackIcon,
  FogEllipsisIcon,
  HeartCrownIcon,
  HeartSieveIcon,
  LanternQuestionIcon,
  PersonaSigilIcon,
  SnuffedCandleIcon,
  ThornHeartIcon,
  ThunderPulseIcon,
} from '@/components/icons/DbdIcons';
import { useDictionary } from '@/context/DictionaryContext';
import type { RosterItem } from '@/types/smashOrPass';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { rosterCoverUrl } from '../roster-select/rosterDisplay';
import { Badge } from '@/components/common/Badge';
import { Surface } from '@/components/common/Surface';
import { MenuItem } from '@/components/common/MenuItem';

/** Square icon buttons: 44px to touch, a little smaller where a pointer is precise. */
const DOCK_BUTTON =
  'h-11 w-11 sm:h-9 sm:w-9 min-h-11 min-w-11 sm:min-h-[38px] sm:min-w-[38px] pointer-coarse:sm:min-h-11 pointer-coarse:sm:min-w-11';

interface DockActionProps {
  title: string;
  description: string;
  ariaLabel: string;
  variant: 'soft' | 'secondary' | 'amberSoft';
  onClick: () => void;
  className?: string;
  children: ReactNode;
}

/** One icon button of the action cluster, with its tooltip. */
function DockAction({ title, description, ariaLabel, variant, onClick, className, children }: DockActionProps) {
  return (
    <Tooltip variant="action" title={title} description={description} placement="bottom">
      <Button
        variant={variant}
        size="md"
        icon
        onClick={onClick}
        aria-label={ariaLabel}
        className={className ? `${className} ${DOCK_BUTTON}` : DOCK_BUTTON}
      >
        {children}
      </Button>
    </Tooltip>
  );
}

interface HubHeaderProps {
  activeRoster: RosterItem;
  rosterName: string;
  rosterBadgeCount: number;
  remainingInDeck: number;
  sessionSmashes: number;
  sessionPasses: number;
  sessionSmashRate: number;
  isFilterActive: boolean;
  isFilterDrawerOpen: boolean;
  effectsEnabled: boolean;
  onOpenRosters: () => void;
  onToggleFilters: () => void;
  onOpenEffects: () => void;
  onOpenPersona: () => void;
  onOpenLeaderboard: () => void;
  onShuffle: () => void;
  onReset: () => void;
  onOpenHowToPlay: () => void;
  /** The filter drawer, which expands inside the dock. */
  children?: ReactNode;
}

/** The command dock: session stats on the left, the roster pill in the middle, actions on the right. */
export function HubHeader({
  activeRoster,
  rosterName,
  rosterBadgeCount,
  remainingInDeck,
  sessionSmashes,
  sessionPasses,
  sessionSmashRate,
  isFilterActive,
  isFilterDrawerOpen,
  effectsEnabled,
  onOpenRosters,
  onToggleFilters,
  onOpenEffects,
  onOpenPersona,
  onOpenLeaderboard,
  onShuffle,
  onReset,
  onOpenHowToPlay,
  children,
}: HubHeaderProps) {
  const dict = useDictionary();
  const tooltips = dict.smashOrPass.tooltips;
  const hudLabels = dict.smashOrPass.hud;

  const moreRef = useRef<HTMLButtonElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const fromMore = (action: () => void) => () => {
    setMoreOpen(false);
    action();
  };

  // Shuffle, reset and help live in the "More" menu below 640px of hub width and as buttons above it.
  const WIDE_ONLY = 'hidden @[640px]/hub:flex';

  return (
    <header
      data-hub-header=""
      className={`relative ${isFilterDrawerOpen ? 'z-40' : 'z-30'} mx-auto w-full max-w-6xl rounded-card bg-bg-surface border border-border-color backdrop-blur-2xl p-2.5 @[560px]/hub:p-4 @[1016px]/hub:p-5 transition-all`}
    >
      {/* Below 1016px of hub width: roster on row 1, stats + actions on row 2 (phones: three rows).
          From 1016px: one row, stats | roster | actions. */}
      <div className="flex flex-col @[1016px]/hub:flex-row items-center justify-between gap-2 @[560px]/hub:gap-3 @[1016px]/hub:gap-4 w-full">
        {/* ROSTER: heart-flanked selector */}
        <div className="flex items-center justify-center gap-2.5 w-full @[1016px]/hub:w-auto order-1 @[1016px]/hub:order-2 min-w-0">
          <ThornHeartIcon className="hidden @[400px]/hub:block h-5 w-5 text-accent-red animate-pulse shrink-0" aria-hidden="true" />

          <button
            type="button"
            onClick={onOpenRosters}
            className="flex items-center gap-2.5 px-3.5 py-2 min-h-11 min-w-0 max-w-full rounded-control bg-bg-surface border border-accent-red/50 hover:border-accent-red type-strong-fluid text-accent-red transition-all cursor-pointer group touch-manipulation"
          >
            <span className="relative flex h-6 w-6 items-center justify-center rounded-chip overflow-hidden border border-accent-red/60 shrink-0">
              <img
                src={rosterCoverUrl(activeRoster)}
                alt=""
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `${getBackendBaseUrl()}/static/avatars/survivors/sable_ward.webp`;
                }}
                className="h-full w-full object-cover"
              />
            </span>
            <span className="truncate min-w-0 max-w-[16rem] text-text-primary group-hover:text-accent-red font-black tracking-wide">
              {rosterName}
            </span>
            <Badge tone="red" size="sm" plain square>
              {rosterBadgeCount}
            </Badge>
            <ChevronDown className="h-4 w-4 shrink-0 text-accent-red group-hover:translate-y-0.5 transition-transform" aria-hidden="true" />
          </button>

          <ThornHeartIcon className="hidden @[400px]/hub:block h-5 w-5 text-accent-red animate-pulse shrink-0" aria-hidden="true" />
        </div>

        {/* STATS + ACTIONS: one row from 560px, stacked on phones; dissolves into the main row from 1016px */}
        <div className="flex flex-col @[560px]/hub:flex-row items-center justify-between gap-2 @[560px]/hub:gap-3 w-full order-2 @[1016px]/hub:order-none @[1016px]/hub:contents">
          {/* Live session telemetry capsule */}
          <div className="flex items-center justify-center order-2 @[560px]/hub:order-1 shrink-0">
            <Surface tone="elevated" padding="none" className="flex items-center gap-2 px-3 py-1.5 text-xs shadow-inner">
              <span className="flex items-center gap-1.5 text-text-secondary font-bold">
                <CardStackIcon className="h-4 w-4 text-text-secondary" aria-hidden="true" />
                <span className="type-card-title text-text-primary">{remainingInDeck}</span>
                <span className="text-mini text-text-muted font-medium">{hudLabels.left}</span>
              </span>
              <span className="text-border-color">{dict.smashOrPass.pipeSeparator}</span>
              <span className="flex items-center gap-1.5 text-accent-red type-strong-fluid">
                <ThornHeartIcon className="h-4 w-4" aria-hidden="true" />
                <span>{sessionSmashes}</span>
              </span>
              <span className="text-border-color">{dict.smashOrPass.pipeSeparator}</span>
              <span className="flex items-center gap-1.5 text-text-muted type-strong-fluid">
                <SnuffedCandleIcon className="h-4 w-4 text-text-muted" aria-hidden="true" />
                <span>{sessionPasses}</span>
              </span>
              <span className="text-border-color">{dict.smashOrPass.pipeSeparator}</span>
              <span className="text-accent-amber font-black text-xs tracking-wide">
                {sessionSmashRate}
                {dict.smashOrPass.percentSign}
              </span>
            </Surface>
          </div>

          {/* Action cluster (>=44px touch targets on touch screens) */}
          <div className="flex items-center justify-center @[1016px]/hub:justify-end gap-1.5 sm:gap-2 order-1 @[560px]/hub:order-2 @[1016px]/hub:order-3 shrink-0">
            <DockAction
              title={tooltips.filter}
              description={tooltips.filterDesc}
              ariaLabel={tooltips.filter}
              variant={isFilterDrawerOpen || isFilterActive ? 'soft' : 'secondary'}
              onClick={onToggleFilters}
              className="relative"
            >
              <HeartSieveIcon className="h-5 w-5" aria-hidden="true" />
              {isFilterActive && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-accent-red ring-2 ring-bg-surface" />
              )}
            </DockAction>

            <DockAction
              title={dict.smashOrPass.effectsPrefs.button}
              description={dict.smashOrPass.effectsPrefs.buttonDesc}
              ariaLabel={dict.smashOrPass.effectsPrefs.button}
              variant={effectsEnabled ? 'soft' : 'secondary'}
              onClick={onOpenEffects}
            >
              <ThunderPulseIcon className="h-5 w-5" aria-hidden="true" />
            </DockAction>

            <DockAction
              title={dict.smashOrPass.modals.personaTitle}
              description={tooltips.archetypeDesc}
              ariaLabel={tooltips.archetype}
              variant="soft"
              onClick={onOpenPersona}
            >
              <PersonaSigilIcon className="h-5 w-5 text-accent-red" aria-hidden="true" />
            </DockAction>

            {/* Hall of Fame leaderboard */}
            <DockAction
              title={dict.smashOrPass.modals.leaderboardTitle}
              description={tooltips.leaderboardDesc}
              ariaLabel={tooltips.leaderboard}
              variant="amberSoft"
              onClick={onOpenLeaderboard}
            >
              <HeartCrownIcon className="h-5 w-5 text-accent-amber" aria-hidden="true" />
            </DockAction>

            <DockAction
              title={tooltips.shuffle}
              description={tooltips.shuffleDesc}
              ariaLabel={tooltips.shuffle}
              variant="secondary"
              onClick={onShuffle}
              className={WIDE_ONLY}
            >
              <CardShuffleIcon className="h-5 w-5" aria-hidden="true" />
            </DockAction>

            <DockAction
              title={tooltips.resetAllVotes}
              description={tooltips.resetDesc}
              ariaLabel={tooltips.resetAllVotes}
              variant="secondary"
              onClick={onReset}
              className={WIDE_ONLY}
            >
              <AshUrnIcon className="h-5 w-5" aria-hidden="true" />
            </DockAction>

            <DockAction
              title={tooltips.howToPlay}
              description={tooltips.howToPlayDesc}
              ariaLabel={tooltips.howToPlay}
              variant="secondary"
              onClick={onOpenHowToPlay}
              className={WIDE_ONLY}
            >
              <LanternQuestionIcon className="h-5 w-5" aria-hidden="true" />
            </DockAction>

            {/* Narrow hubs: shuffle / reset / help collapse into one menu */}
            <div className="@[640px]/hub:hidden">
              <Button
                ref={moreRef}
                variant="secondary"
                size="md"
                icon
                onClick={() => setMoreOpen((open) => !open)}
                aria-label={tooltips.moreActions}
                {...popoverTriggerProps(moreOpen, 'menu')}
                className={DOCK_BUTTON}
              >
                <FogEllipsisIcon className="h-5 w-5" aria-hidden="true" />
              </Button>
              <Popover
                open={moreOpen}
                anchorRef={moreRef}
                onClose={() => setMoreOpen(false)}
                align="end"
                role="menu"
                ariaLabel={tooltips.moreActions}
                className="rounded-card bg-bg-surface border border-border-color p-1.5 shadow-xl backdrop-blur-2xl"
              >
                {[
                  { label: tooltips.shuffle, Icon: CardShuffleIcon, run: onShuffle },
                  { label: tooltips.resetAllVotes, Icon: AshUrnIcon, run: onReset },
                  { label: tooltips.howToPlay, Icon: LanternQuestionIcon, run: onOpenHowToPlay },
                ].map(({ label, Icon, run }) => (
                  <MenuItem
                    key={label}
                    role="menuitem"
                    onClick={fromMore(run)}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{label}</span>
                  </MenuItem>
                ))}
              </Popover>
            </div>
          </div>
        </div>
      </div>

      {children}
    </header>
  );
}
