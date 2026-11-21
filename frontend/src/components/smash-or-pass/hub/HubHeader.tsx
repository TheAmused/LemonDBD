'use client';
// frontend/src/components/smash-or-pass/hub/HubHeader.tsx
import { useState, type ReactNode } from 'react';
import { BarChart2, ChevronDown, SlidersHorizontal, Settings, Shuffle, RotateCcw, Ellipsis, User, HelpCircle } from 'lucide-react';
import { Tooltip } from '@/components/common/Tooltip';
import { Button } from '@/components/common/Button';
import { TileButton } from '@/components/common/TileButton';
import {
  CardStackIcon,
  HeartIcon,
  PassIcon,
} from '@/components/icons/DbdIcons';
import { useDictionary } from '@/context/DictionaryContext';
import type { RosterItem } from '@/types/smashOrPass';
import { isLocalRosterSlug } from '@/utils/smashOrPass/rosterSlug';
import { HubActionsDrawer, type HubDrawerAction } from './HubActionsDrawer';

/** Square icon buttons: 44px to touch, a little smaller where a pointer is precise. */
const DOCK_BUTTON =
  'h-11 w-11 sm:h-9 sm:w-9 min-h-11 min-w-11 sm:min-h-hit-sm sm:min-w-hit-sm pointer-coarse:sm:min-h-11 pointer-coarse:sm:min-w-11';

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
  onOpenRosters: () => void;
  onToggleFilters: () => void;
  onCloseFilters?: () => void;
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
  remainingInDeck,
  sessionSmashes,
  sessionPasses,
  sessionSmashRate,
  isFilterActive,
  isFilterDrawerOpen,
  onOpenRosters,
  onToggleFilters,
  onCloseFilters,
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
  // Custom rosters live in this browser only, so they have no Hall of Fame.
  const hasLeaderboard = !isLocalRosterSlug(activeRoster.slug);

  const [moreOpen, setMoreOpen] = useState(false);
  const handleToggleFilters = () => {
    setMoreOpen(false);
    onToggleFilters();
  };
  const handleToggleMore = () => {
    if (!moreOpen && isFilterDrawerOpen) onCloseFilters?.();
    setMoreOpen((open) => !open);
  };

  // Secondary actions show inline on @hub-sm/hub+ and @hub-md/hub+; on narrow phones they live in the slide-out drawer.
  const WIDE_ONLY = 'hidden @hub-md/hub:flex';

  const drawerActions: HubDrawerAction[] = [
    ...(hasLeaderboard
      ? [{ key: 'leaderboard', label: tooltips.leaderboard, Icon: BarChart2, onClick: onOpenLeaderboard, variant: 'secondary' as const }]
      : []),
    { key: 'archetype', label: tooltips.archetype, Icon: User, onClick: onOpenPersona, variant: 'secondary' },
    { key: 'effects', label: dict.smashOrPass.effectsPrefs.button, Icon: Settings, onClick: onOpenEffects, variant: 'secondary' },
    { key: 'shuffle', label: tooltips.shuffle, Icon: Shuffle, onClick: onShuffle, variant: 'secondary' },
    { key: 'help', label: tooltips.howToPlay, Icon: HelpCircle, onClick: onOpenHowToPlay, variant: 'secondary' },
    { key: 'reset', label: tooltips.resetAllVotes, Icon: RotateCcw, onClick: onReset, variant: 'soft' },
  ];

  return (
    <header
      data-hub-header=""
      className={`relative ${isFilterDrawerOpen || moreOpen ? 'z-40' : 'z-30'} mx-auto w-full max-w-6xl rounded-card bg-bg-surface border border-border-color backdrop-blur-2xl transition-all`}
    >
      {/* Integrated segmented toolbar:
          Below 1016px: roster bar on top, stats + actions bar below (on phones: [Filter] [Stats] [More]).
          From 1016px: single row [Stats | Roster | Actions]. */}
      <div className="flex flex-col @hub-xl/hub:flex-row items-stretch justify-between w-full">
        {/* ROSTER: flat segmented center (no inner pill, no cover image, original heart + chevron icons) */}
        <TileButton
          press={false}
          onClick={onOpenRosters}
          className="group relative flex items-center justify-center gap-2.5 w-full @hub-xl/hub:w-auto order-1 @hub-xl/hub:order-2 min-w-0 px-4 py-2.5 @hub-xl/hub:px-6 @hub-xl/hub:py-3 rounded-t-card @hub-xl/hub:rounded-none bg-bg-elevated/40 hover:bg-bg-elevated/75 border-b @hub-xl/hub:border-b-0 @hub-xl/hub:border-x border-border-color transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
        >
          <HeartIcon className="hidden @hub-xs/hub:block icon-lg text-accent-red animate-pulse shrink-0" aria-hidden="true" />
          <span className="truncate min-w-0 max-w-64 text-text-primary group-hover:text-accent-red font-black tracking-wide transition-colors">
            {rosterName}
          </span>
          <ChevronDown className="icon-md shrink-0 text-accent-red group-hover:translate-y-0.5 transition-transform" aria-hidden="true" />
          <HeartIcon className="hidden @hub-xs/hub:block icon-lg text-accent-red animate-pulse shrink-0" aria-hidden="true" />
        </TileButton>

        {/* STATS + ACTIONS: [Filter | Stats | More] on mobile; [Stats | Actions] on tablet+; dissolves on desktop */}
        <div className="flex flex-row items-center justify-between gap-2 @hub-sm/hub:gap-3 w-full px-2.5 py-2 @hub-sm/hub:px-4 @hub-sm/hub:py-2.5 order-2 @hub-xl/hub:order-none @hub-xl/hub:contents">
          {/* Live session figures: centered on mobile, left on tablet/laptop/desktop */}
          <div className="flex items-center justify-center @hub-sm/hub:justify-start shrink-0 order-2 @hub-sm/hub:order-1 @hub-xl/hub:px-4 @hub-xl/hub:py-3">
            <div className="flex items-center gap-2 @hub-sm/hub:gap-3 text-xs">
              <span className="flex items-center gap-1 text-text-secondary font-bold">
                <CardStackIcon className="icon-md text-text-secondary" aria-hidden="true" />
                <span className="type-card-title text-text-primary">{remainingInDeck}</span>
                <span className="hidden @hub-sm/hub:inline text-mini text-text-muted font-medium">{hudLabels.left}</span>
              </span>
              <span className="h-4 @hub-sm/hub:h-5 w-px bg-border-color" aria-hidden="true" />
              <span className="flex items-center gap-1 text-accent-red type-strong-fluid">
                <HeartIcon className="icon-md" aria-hidden="true" />
                <span>{sessionSmashes}</span>
              </span>
              <span className="h-4 @hub-sm/hub:h-5 w-px bg-border-color" aria-hidden="true" />
              <span className="flex items-center gap-1 text-text-muted type-strong-fluid">
                <PassIcon className="icon-md text-text-muted" aria-hidden="true" />
                <span>{sessionPasses}</span>
              </span>
              <span className="h-4 @hub-sm/hub:h-5 w-px bg-border-color" aria-hidden="true" />
              <span className="text-accent-amber font-black text-xs tracking-wide">
                {sessionSmashRate}
                {dict.smashOrPass.percentSign}
              </span>
            </div>
          </div>

          {/* Action cluster: `contents` on mobile so Filter flanks left & More flanks right; grouped right on sm+ */}
          <div className="contents @hub-sm/hub:flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 @hub-sm/hub:order-2 @hub-xl/hub:order-3 @hub-xl/hub:px-4 @hub-xl/hub:py-2.5">
            <div className="order-1 @hub-sm/hub:order-none">
              <DockAction
                title={tooltips.filter}
                description={tooltips.filterDesc}
                ariaLabel={tooltips.filter}
                variant={isFilterDrawerOpen || isFilterActive ? 'soft' : 'secondary'}
                onClick={handleToggleFilters}
              >
                <SlidersHorizontal className="icon-lg" aria-hidden="true" />
              </DockAction>
            </div>

            <div className="hidden @hub-sm/hub:flex items-center gap-1.5 sm:gap-2">
              <DockAction
                title={dict.smashOrPass.effectsPrefs.button}
                description={dict.smashOrPass.effectsPrefs.buttonDesc}
                ariaLabel={dict.smashOrPass.effectsPrefs.button}
                variant="secondary"
                onClick={onOpenEffects}
              >
                <Settings className="icon-lg" aria-hidden="true" />
              </DockAction>

              <DockAction
                title={dict.smashOrPass.modals.personaTitle}
                description={tooltips.archetypeDesc}
                ariaLabel={tooltips.archetype}
                variant="secondary"
                onClick={onOpenPersona}
              >
                <User className="icon-lg" aria-hidden="true" />
              </DockAction>

              {/* Hall of Fame leaderboard (official rosters only) */}
              {hasLeaderboard && (
                <DockAction
                  title={dict.smashOrPass.modals.leaderboardTitle}
                  description={tooltips.leaderboardDesc}
                  ariaLabel={tooltips.leaderboard}
                  variant="secondary"
                  onClick={onOpenLeaderboard}
                >
                  <BarChart2 className="icon-lg" aria-hidden="true" />
                </DockAction>
              )}

              <DockAction
                title={tooltips.shuffle}
                description={tooltips.shuffleDesc}
                ariaLabel={tooltips.shuffle}
                variant="secondary"
                onClick={onShuffle}
                className={WIDE_ONLY}
              >
                <Shuffle className="icon-lg" aria-hidden="true" />
              </DockAction>

              <DockAction
                title={tooltips.resetAllVotes}
                description={tooltips.resetDesc}
                ariaLabel={tooltips.resetAllVotes}
                variant="secondary"
                onClick={onReset}
                className={WIDE_ONLY}
              >
                <RotateCcw className="icon-lg" aria-hidden="true" />
              </DockAction>

              <DockAction
                title={tooltips.howToPlay}
                description={tooltips.howToPlayDesc}
                ariaLabel={tooltips.howToPlay}
                variant="secondary"
                onClick={onOpenHowToPlay}
                className={WIDE_ONLY}
              >
                <HelpCircle className="icon-lg" aria-hidden="true" />
              </DockAction>
            </div>

            {/* Slide-out actions drawer trigger (below @hub-md/hub) */}
            <div className="@hub-md/hub:hidden order-3 @hub-sm/hub:order-none">
              <Button
                variant={moreOpen ? 'soft' : 'secondary'}
                size="md"
                icon
                onClick={handleToggleMore}
                aria-label={tooltips.moreActions}
                aria-expanded={moreOpen}
                className={DOCK_BUTTON}
              >
                <Ellipsis aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {children}
      <HubActionsDrawer
        isOpen={moreOpen}
        actions={drawerActions}
        onClose={() => setMoreOpen(false)}
      />
    </header>
  );
}
