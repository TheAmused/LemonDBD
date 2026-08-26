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
}

export const GauntletBoard: React.FC<GauntletBoardProps> = ({ locale, role }) => {
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
  // The frozen run only carries plain names (no release_number), so reorder
  // them using the role's full release order -- not just the live-owned
  // list, which drops a character the moment it's locked and would push it
  // to the end instead of its real chronological slot.
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
              Gauntlet complete!
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
              Start a new run
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

        <GauntletStatsDrawer isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} stats={stats} />
        <GauntletRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} role={role} />
        <CheckpointModal
          checkpoint={justBankedCheckpoint}
          role={role}
          nextTier={run?.tier_info || null}
          onClose={dismissCheckpointCelebration}
        />
      </div>
    </div>
  );
};
