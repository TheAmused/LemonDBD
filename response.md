### src/components/streaks/chaos/ChaosCheckpointModal.tsx
```tsx
// frontend/src/components/streaks/chaos/ChaosCheckpointModal.tsx
'use client';

import React, { useEffect } from 'react';
import { ShieldCheck, PartyPopper } from 'lucide-react';

export interface ChaosCheckpointModalProps {
  checkpoint: number | null;
  onClose: () => void;
  dict?: any;
}

export const ChaosCheckpointModal: React.FC<ChaosCheckpointModalProps> = ({ checkpoint, onClose, dict }) => {
  useEffect(() => {
    if (checkpoint == null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [checkpoint, onClose]);

  if (checkpoint == null) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border-2 border-violet-400 bg-gradient-to-b from-violet-500/15 via-slate-900 to-slate-950 p-8 text-center shadow-2xl shadow-violet-500/20 cursor-default"
      >
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-violet-400 bg-violet-500/15 text-violet-400">
          <ShieldCheck className="h-10 w-10" />
        </div>
        <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-violet-400">
          <PartyPopper className="h-3.5 w-3.5" />
          {dict?.streaks?.checkpointBanked || 'Checkpoint banked'}
        </div>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-white">{checkpoint} wins</h2>
        <p className="mt-2 text-sm text-slate-300">
          {dict?.streaks?.checkpointLoseFallback || 'Lose from here and you fall back to'} <strong className="text-violet-300">{checkpoint}</strong>{dict?.streaks?.notToZero || ', not to zero.'}
        </p>
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-violet-500 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-400 cursor-pointer"
        >
          {dict?.streaks?.keepGoing || 'Keep going'}
        </button>
      </div>
    </div>
  );
};
```

### src/components/user/UserMetricsGrid.tsx
```tsx
'use client';
// frontend/src/components/user/UserMetricsGrid.tsx

import React from 'react';
import { Shield, Skull, Sparkles } from 'lucide-react';

interface MetricItem {
  owned: number;
  total: number;
  percentage: number;
}

interface OwnershipData {
  survivors?: MetricItem;
  killers?: MetricItem;
  perks?: {
    unlocked: number;
    total: number;
    percentage: number;
  };
}

interface UserMetricsGridProps {
  ownership?: OwnershipData | null;
  dict?: any;
}

export const UserMetricsGrid: React.FC<UserMetricsGridProps> = ({ ownership, dict }) => {
  const survPercent = ownership?.survivors?.percentage ?? 0;
  const killerPercent = ownership?.killers?.percentage ?? 0;
  const perkPercent = ownership?.perks?.percentage ?? 0;

  const survOwned = ownership?.survivors?.owned ?? 0;
  const survTotal = ownership?.survivors?.total ?? 54;

  const killerOwned = ownership?.killers?.owned ?? 0;
  const killerTotal = ownership?.killers?.total ?? 44;

  const perkUnlocked = ownership?.perks?.unlocked ?? 0;
  const perkTotal = ownership?.perks?.total ?? 321;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5 w-full">
      {/* Survivors Metric Card */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 sm:p-5 backdrop-blur-xl shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                {dict?.stats?.survivors || 'Survivors'}
              </h3>
              <p className="text-sm sm:text-base font-black text-slate-100 font-mono">
                {survOwned} / {survTotal}
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-cyan-400 font-mono">
            {survPercent}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-950">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
            style={{ width: `${survPercent}%` }}
          />
        </div>
      </div>

      {/* Killers Metric Card */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 sm:p-5 backdrop-blur-xl shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-rose-400">
              <Skull className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                {dict?.stats?.killers || 'Killers'}
              </h3>
              <p className="text-sm sm:text-base font-black text-slate-100 font-mono">
                {killerOwned} / {killerTotal}
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-rose-400 font-mono">
            {killerPercent}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-950">
          <div
            className="h-full bg-gradient-to-r from-red-500 to-amber-500 transition-all duration-500"
            style={{ width: `${killerPercent}%` }}
          />
        </div>
      </div>

      {/* Teachable Perks Metric Card */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 sm:p-5 backdrop-blur-xl shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                {dict?.characterDetail?.teachablePerks || 'Teachable Perks'}
              </h3>
              <p className="text-sm sm:text-base font-black text-slate-100 font-mono">
                {perkUnlocked} / {perkTotal}
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-amber-400 font-mono">
            {perkPercent}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-950">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
            style={{ width: `${perkPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
```

### src/components/streaks/StreakPanel.tsx
```tsx
// frontend/src/components/streaks/StreakPanel.tsx
import React, { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, type LucideIcon } from 'lucide-react';
import { PANEL_HOVER_CLASSES, type PanelColor } from './panelColors';
import { DisabledReasonModal } from '@/components/DisabledReasonModal';

interface StreakPanelBaseProps {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  accentBorder: string;
  color: PanelColor;
  image?: string;
  disabled?: boolean;
  disabledReason?: string | null;
  dict?: any;
}

type StreakPanelProps = StreakPanelBaseProps &
  ({ comingSoon: true; href?: never; onClick?: never } |
   { comingSoon?: false; href: string; onClick?: never } |
   { comingSoon?: false; href?: never; onClick: () => void });

export const StreakPanel: React.FC<StreakPanelProps> = ({
  title,
  description,
  icon: Icon,
  accent,
  accentBorder,
  color,
  image,
  href,
  onClick,
  comingSoon,
  disabled,
  disabledReason,
  dict,
}) => {
  const [showDisabledModal, setShowDisabledModal] = useState(false);
  const hoverClasses = PANEL_HOVER_CLASSES[color];
  const body = (
    <>
      {image && (
        <img
          src={image}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-5 -bottom-5 h-40 w-40 rounded-2xl object-cover opacity-[0.18] dark:opacity-[0.35] [mask-image:radial-gradient(circle_at_bottom_right,black,transparent_85%)]"
        />
      )}

      <div className="relative flex items-start justify-between gap-3">
        {image ? (
          <img
            src={image}
            alt=""
            className={`h-11 w-11 rounded-xl border ${accentBorder} object-cover shadow-sm`}
          />
        ) : (
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${accentBorder} bg-slate-100 dark:bg-slate-900/60 shadow-sm`}>
            <Icon className={`h-5 w-5 ${accent}`} />
          </div>
        )}
        {disabled ? (
          <span className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-950/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            {dict?.streaks?.disabled || 'Disabled'}
          </span>
        ) : comingSoon ? (
          <span className="rounded-full border border-slate-200 bg-slate-100 dark:border-slate-700/60 dark:bg-slate-800/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {dict?.streaks?.comingSoon || 'Coming soon.'}
          </span>
        ) : (
          <ArrowRight className={`h-4 w-4 ${accent} transition-transform group-hover:translate-x-1`} />
        )}
      </div>

      <h3 className={`relative mt-4 text-sm font-extrabold tracking-wide ${comingSoon || disabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
        {title}
      </h3>
      <p className="relative mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
    </>
  );

  const base = `relative flex h-full flex-col overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition-all shadow-sm ${accentBorder}`;

  if (disabled) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowDisabledModal(true)}
          className={`text-left cursor-pointer ${base} bg-slate-100/50 dark:bg-slate-900/30 opacity-70`}
        >
          {body}
        </button>
        <DisabledReasonModal
          isOpen={showDisabledModal}
          onClose={() => setShowDisabledModal(false)}
          label={title}
          reason={disabledReason}
        />
      </>
    );
  }

  if (comingSoon) {
    return <div className={`${base} bg-slate-100/50 dark:bg-slate-900/30 opacity-70`}>{body}</div>;
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`group text-left ${base} bg-white hover:bg-slate-50 dark:bg-slate-900/50 dark:hover:bg-slate-900/80 focus:outline-none focus:ring-2 hover:shadow-lg cursor-pointer ${hoverClasses}`}
      >
        {body}
      </button>
    );
  }

  return (
    <Link
      href={href!}
      className={`group ${base} bg-white hover:bg-slate-50 dark:bg-slate-900/50 dark:hover:bg-slate-900/80 focus:outline-none focus:ring-2 hover:shadow-lg ${hoverClasses}`}
    >
      {body}
    </Link>
  );
};
```

### src/components/streaks/gauntlet/GauntletBoard.tsx
```tsx
// frontend/src/components/streaks/gauntlet/GauntletBoard.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft, Trophy, RotateCcw } from 'lucide-react';
import { Role } from '@/types/gauntletStreak';
import { Confetti, CONFETTI_LIFETIME_MS } from '../Confetti';
import { ResetConfirmModal } from '../ResetConfirmModal';
import { useGauntletRun } from './useGauntletRun';
import { useOwnedCharacters, OwnedCharacterItem } from './useOwnedCharacters';
import { sortByReleaseNumber } from '@/utils/characterUtils';
import { GauntletHeader } from './GauntletHeader';
import { ActiveTargetStage } from './ActiveTargetStage';
import { CharacterRosterGrid } from './CharacterRosterGrid';
import { GauntletStatsDrawer } from './GauntletStatsDrawer';
import { GauntletRulesModal } from './GauntletRulesModal';
import { CheckpointModal } from './CheckpointModal';

// Particle/Lottie code is heavy and only ever needed on this page, so it gets
// its own chunk rather than riding along in every route that imports GauntletBoard.
const GauntletFireBackground = dynamic(
  () => import('./GauntletFireBackground').then((mod) => mod.GauntletFireBackground),
  { ssr: false }
);

interface GauntletBoardProps {
  locale: string;
  role: Role;
  dict?: any;
}

export const GauntletBoard: React.FC<GauntletBoardProps> = ({ locale, role, dict }) => {
  const {
    run,
    stats,
    loading,
    busy,
    error,
    submitResult,
    reveal,
    reset,
    justBankedCheckpoint,
    dismissCheckpointCelebration,
  } = useGauntletRun(role);
  const { characters, loading: loadingRoster, releaseOrder } = useOwnedCharacters(role, run?.tier_info?.roster_limit);
  const frozenCharacters: OwnedCharacterItem[] = React.useMemo(() => {
    const owned = run?.owned_characters ?? [];
    return sortByReleaseNumber(
      owned.map((name) => ({ name, release_number: releaseOrder.get(name) ?? Infinity }))
    );
  }, [run?.owned_characters, releaseOrder]);
  const rosterCharacters = run ? frozenCharacters : characters;
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  // The target the reel has actually finished landing on, kept separate from
  // run.current_character_id so the roster grid can't out-race the animation.
  const [shownTarget, setShownTarget] = useState<string | null>(null);

  // Fire once when the run flips to completed, not on every later render or reload.
  const wasCompletedRef = useRef(false);
  useEffect(() => {
    const completed = run?.status === 'completed';
    if (completed && !wasCompletedRef.current) {
      setCelebrating(true);
      wasCompletedRef.current = true;
      const timer = setTimeout(() => setCelebrating(false), CONFETTI_LIFETIME_MS);
      return () => clearTimeout(timer);
    }
    if (!completed) {
      wasCompletedRef.current = false;
    }
  }, [run?.status]);

  // Rides along with the checkpoint modal. Kept for the same duration as the
  // win celebration below so the burst finishes its fall instead of being
  // unmounted mid-flight.
  useEffect(() => {
    if (justBankedCheckpoint == null) return;
    setCelebrating(true);
    const timer = setTimeout(() => setCelebrating(false), CONFETTI_LIFETIME_MS);
    return () => clearTimeout(timer);
  }, [justBankedCheckpoint]);

  const isCompleted = run?.status === 'completed';

  return (
    <div>
      <GauntletFireBackground tierLevel={isCompleted ? 0 : run?.tier_info?.tier_level ?? 0} />
      <Confetti active={celebrating} />

      <Link
        href={`/${locale}/streaks/${role}`}
        className="inline-flex items-center gap-1.5 rounded text-xs font-bold text-slate-500 hover:text-orange-500 dark:text-slate-400 dark:hover:text-orange-400 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span className="capitalize">Back to {role} streaks</span>
      </Link>

      <div className="mt-4">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-sm flex items-center justify-between shadow-lg">
            <span>{error}</span>
          </div>
        )}

        <GauntletHeader
          role={role}
          currentStreak={run?.current_streak || 0}
          bestStreak={run?.best_streak || 0}
          lastCheckpointStreak={run?.last_checkpoint_streak || 0}
          poolFrozen={run?.pool_frozen}
          onOpenStats={() => setIsStatsOpen(true)}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenReset={() => setConfirmingReset(true)}
        />

        {isCompleted ? (
          <div className="mb-8 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 to-emerald-500/[0.03] px-6 py-10 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-emerald-400 bg-emerald-500/15 text-emerald-500 dark:text-emerald-400">
              <Trophy className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {dict?.streaks?.gauntletComplete || 'Gauntlet complete!'}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              You won the {role} Gauntlet.
            </p>
            <button
              onClick={reset}
              disabled={busy}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-950/30 transition-colors hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              {dict?.streaks?.startNewRun || 'Start a new run'}
            </button>
          </div>
        ) : (
          <ActiveTargetStage
            run={run}
            role={role}
            characters={rosterCharacters}
            loading={loading || busy}
            onWin={() => submitResult('win')}
            onLoss={() => submitResult('loss')}
            onReveal={reveal}
            holdReel={justBankedCheckpoint != null}
            shownTarget={shownTarget}
            onShownTargetChange={setShownTarget}
          />
        )}

        <CharacterRosterGrid
          role={role}
          characters={rosterCharacters}
          completedCharacters={run?.completed_characters || []}
          checkpointCharacters={run?.checkpoint_characters || []}
          activeCharacterId={isCompleted ? undefined : shownTarget ?? undefined}
          loading={loadingRoster}
          dict={dict}
        />

        <ResetConfirmModal
          open={confirmingReset}
          busy={busy}
          message={`Streak, checkpoints and every cleared ${role} go back to zero. This cannot be undone.`}
          onCancel={() => setConfirmingReset(false)}
          onConfirm={() => {
            setConfirmingReset(false);
            reset();
          }}
        />

        <GauntletStatsDrawer isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} stats={stats} dict={dict} />
        <GauntletRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} role={role} dict={dict} />
        <CheckpointModal
          checkpoint={justBankedCheckpoint}
          role={role}
          nextTier={run?.tier_info || null}
          onClose={dismissCheckpointCelebration}
          dict={dict}
        />
      </div>
    </div>
  );
};
```

### src/components/admin/AdminChallengeStats.tsx
```tsx
'use client';
// frontend/src/components/admin/AdminChallengeStats.tsx

import React from 'react';
import { Trophy, Skull, Rows3, BookOpen } from 'lucide-react';
import { AdminStats, ChallengeCompletionBreakdown } from '@/types/admin';

const MODE_CARDS = [
  { key: 'gauntlet', label: 'Gauntlet', icon: Trophy, color: 'text-amber-400', border: 'border-amber-500/20' },
  { key: 'chaos', label: 'Chaos Streak', icon: Skull, color: 'text-violet-400', border: 'border-violet-500/20' },
  { key: 'history', label: 'History Streak', icon: Rows3, color: 'text-slate-400', border: 'border-slate-700' },
  { key: 'page_streak', label: 'Page Streak', icon: BookOpen, color: 'text-orange-400', border: 'border-orange-500/20' },
] as const;

const VARIANT_LABELS: Record<string, string> = {
  survivor: 'Survivor',
  killer: 'Killer',
  easy: 'Easy',
  medium: 'Medium',
  hell: 'Hell',
};

interface AdminChallengeStatsProps {
  stats: AdminStats | null;
  dict?: any;
}

const VariantRow: React.FC<{ label: string; breakdown: { completed_runs: number; unique_users: number } }> = ({
  label,
  breakdown,
}) => (
  <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-950/50 border border-slate-800/80">
    <span className="font-bold text-slate-300">{label}</span>
    <span className="font-mono text-slate-400">
      <span className="text-slate-100 font-black">{breakdown.completed_runs}</span> completions &middot;{' '}
      {breakdown.unique_users} users
    </span>
  </div>
);

export const AdminChallengeStats: React.FC<AdminChallengeStatsProps> = ({ stats, dict }) => {
  const completions = stats?.challenge_completions;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {MODE_CARDS.map(({ key, label, icon: Icon, color, border }) => {
        const breakdown: ChallengeCompletionBreakdown | undefined = completions?.[key];
        const variants = Object.entries(breakdown?.by_variant || {});

        return (
          <div key={key} className={`rounded-2xl border ${border} bg-slate-900/60 p-5 shadow-xl backdrop-blur-sm`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-200">
                <Icon className={`h-4 w-4 ${color}`} />
                {label}
              </h3>
              <div className="text-right">
                <div className="text-2xl font-black text-slate-100 font-mono">
                  {breakdown?.total.completed_runs ?? '-'}
                </div>
                <div className="text-[10px] text-slate-500">
                  {breakdown?.total.unique_users ?? '-'} unique users
                </div>
              </div>
            </div>

            {variants.length > 0 ? (
              <div className="space-y-1.5">
                {variants.map(([variant, counts]) => (
                  <VariantRow key={variant} label={VARIANT_LABELS[variant] || variant} breakdown={counts} />
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                {dict?.admin?.pageStreakCompletionsNotice || "Page Streak has one run per killer, so completions aren't broken down further here."}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
```