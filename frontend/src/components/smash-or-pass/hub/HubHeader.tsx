'use client';
// frontend/src/components/smash-or-pass/hub/HubHeader.tsx
import type { ReactNode } from 'react';
import {
  ChevronDown,
  Heart,
  HelpCircle,
  Layers,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Zap,
  ThumbsDown,
  Trash2,
} from 'lucide-react';
import { Tooltip } from '@/components/common/Tooltip';
import { Button } from '@/components/common/Button';
import { IridescentShardIcon } from '@/components/icons/DbdIcons';
import { useDictionary } from '@/context/DictionaryContext';
import type { RosterItem } from '@/types/smashOrPass';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { rosterCoverUrl } from '../roster-select/rosterDisplay';

/** Square icon buttons: 44px to touch, a little smaller where a pointer is precise. */
const DOCK_BUTTON = 'h-11 w-11 sm:h-9 sm:w-9 min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px]';

interface DockActionProps {
  title: string;
  description: string;
  ariaLabel: string;
  variant: 'soft' | 'secondary';
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

  return (
    <header className="relative z-20 mx-auto w-full max-w-6xl rounded-3xl bg-bg-surface border border-border-color backdrop-blur-2xl p-3.5 sm:p-4 md:p-5 space-y-3.5 transition-all">
      {/* MAIN ROW: Left Stats + Centered Roster Pill + Right Action Cluster */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 sm:gap-4 w-full">
        {/* LEFT: Live Session Telemetry Capsule */}
        <div className="flex items-center justify-center lg:justify-start w-full lg:w-auto order-2 lg:order-1 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 px-3.5 py-2 rounded-2xl bg-bg-elevated border border-border-color text-xs sm:text-sm shadow-inner">
            <span className="flex items-center gap-1.5 text-text-secondary font-bold">
              <Layers className="h-4 w-4 text-text-secondary" />
              <span className="text-text-primary font-black text-sm sm:text-base">{remainingInDeck}</span>
              <span className="text-mini sm:text-xs text-text-muted font-medium">{hudLabels.left}</span>
            </span>
            <span className="text-border-color">{dict.smashOrPass.pipeSeparator}</span>
            <span className="flex items-center gap-1.5 text-accent-red type-strong-fluid">
              <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-accent-red" />
              <span>{sessionSmashes}</span>
            </span>
            <span className="text-border-color">{dict.smashOrPass.pipeSeparator}</span>
            <span className="flex items-center gap-1.5 text-text-muted type-strong-fluid">
              <ThumbsDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-text-muted" />
              <span>{sessionPasses}</span>
            </span>
            <span className="text-border-color">{dict.smashOrPass.pipeSeparator}</span>
            <span className="text-accent-amber font-black text-xs sm:text-sm tracking-wide">
              {sessionSmashRate}
              {dict.smashOrPass.percentSign}
            </span>
          </div>
        </div>

        {/* CENTER: Heart-Flanked Dynamic Roster Selector */}
        <div className="flex items-center justify-center gap-2.5 sm:gap-3 w-full lg:w-auto order-1 lg:order-2">
          <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-accent-red fill-accent-red animate-pulse shrink-0" />

          <button
            type="button"
            onClick={onOpenRosters}
            className="flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-2 sm:py-2.5 min-h-[44px] rounded-2xl bg-bg-surface border border-accent-red/50 hover:border-accent-red type-strong-fluid text-accent-red transition-all cursor-pointer group shrink-0 touch-manipulation"
          >
            <span className="relative flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg overflow-hidden border border-accent-red/60 shrink-0">
              <img
                src={rosterCoverUrl(activeRoster)}
                alt=""
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `${getBackendBaseUrl()}/static/avatars/survivors/sable_ward.webp`;
                }}
                className="h-full w-full object-cover"
              />
            </span>
            <span className="truncate max-w-[150px] sm:max-w-[220px] text-text-primary group-hover:text-accent-red font-black tracking-wide">
              {rosterName}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-accent-red/20 text-accent-red text-tiny sm:text-xs font-black">
              {rosterBadgeCount}
            </span>
            <ChevronDown className="h-4 w-4 text-accent-red group-hover:translate-y-0.5 transition-transform" />
          </button>

          <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-accent-red fill-accent-red animate-pulse shrink-0" />
        </div>

        {/* RIGHT: Action Cluster (Icons with Tooltips and >=44px Touch Targets) */}
        <div className="flex items-center justify-center lg:justify-end gap-1.5 sm:gap-2 w-full lg:w-auto order-3 shrink-0 flex-wrap">
          <DockAction
            title={tooltips.filter}
            description={tooltips.filterDesc}
            ariaLabel={tooltips.filter}
            variant={isFilterDrawerOpen || isFilterActive ? 'soft' : 'secondary'}
            onClick={onToggleFilters}
            className="relative"
          >
            <SlidersHorizontal className="h-4 w-4 sm:h-4 sm:w-4" />
            {isFilterActive && (
              <span className="absolute 1.5 sm:-top-0.5 1.5 sm:-right-0.5 h-2.5 w-2.5 rounded-full bg-accent-red ring-2 ring-bg-surface" />
            )}
          </DockAction>

          <DockAction
            title={dict.smashOrPass.effectsPrefs.button}
            description={dict.smashOrPass.effectsPrefs.buttonDesc}
            ariaLabel={dict.smashOrPass.effectsPrefs.button}
            variant={effectsEnabled ? 'soft' : 'secondary'}
            onClick={onOpenEffects}
          >
            <Zap className="h-4 w-4 sm:h-4 sm:w-4" />
          </DockAction>

          <DockAction
            title={dict.smashOrPass.modals.personaTitle}
            description={tooltips.archetypeDesc}
            ariaLabel={tooltips.archetype}
            variant="soft"
            onClick={onOpenPersona}
          >
            <Sparkles className="h-4 w-4 sm:h-4 sm:w-4 text-accent-red" />
          </DockAction>

          {/* Hall of Fame Leaderboard Modal */}
          <Tooltip
            variant="action"
            title={dict.smashOrPass.modals.leaderboardTitle}
            description={tooltips.leaderboardDesc}
            placement="bottom"
          >
            <button
              type="button"
              onClick={onOpenLeaderboard}
              aria-label={tooltips.leaderboard}
              className="flex min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-accent-amber/10 border border-accent-amber/30 hover:border-accent-amber/60 text-accent-amber transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95 touch-manipulation"
            >
              <IridescentShardIcon className="h-4 w-4 sm:h-4 sm:w-4 text-accent-amber" />
            </button>
          </Tooltip>

          <DockAction
            title={tooltips.shuffle}
            description={tooltips.shuffleDesc}
            ariaLabel={tooltips.shuffle}
            variant="secondary"
            onClick={onShuffle}
          >
            <Shuffle className="h-4 w-4 sm:h-4 sm:w-4" />
          </DockAction>

          <DockAction
            title={tooltips.resetAllVotes}
            description={tooltips.resetDesc}
            ariaLabel={tooltips.resetAllVotes}
            variant="secondary"
            onClick={onReset}
          >
            <Trash2 className="h-4 w-4 sm:h-4 sm:w-4" />
          </DockAction>

          <DockAction
            title={tooltips.howToPlay}
            description={tooltips.howToPlayDesc}
            ariaLabel={tooltips.howToPlay}
            variant="secondary"
            onClick={onOpenHowToPlay}
          >
            <HelpCircle className="h-4 w-4 sm:h-4 sm:w-4" />
          </DockAction>
        </div>
      </div>

      {children}
    </header>
  );
}
