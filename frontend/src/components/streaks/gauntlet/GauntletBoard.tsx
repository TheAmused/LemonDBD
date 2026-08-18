'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Role } from '@/types/gauntletStreak';
import { useGauntletRun } from './useGauntletRun';
import { useOwnedCharacters } from './useOwnedCharacters';
import { GauntletHeader } from './GauntletHeader';
import { ActiveTargetStage } from './ActiveTargetStage';
import { CharacterRosterGrid } from './CharacterRosterGrid';
import { GauntletStatsDrawer } from './GauntletStatsDrawer';
import { GauntletRulesModal } from './GauntletRulesModal';

interface GauntletBoardProps {
  locale: string;
  role: Role;
}

export const GauntletBoard: React.FC<GauntletBoardProps> = ({ locale, role }) => {
  const { run, stats, loading, busy, error, roll, submitResult, reveal } = useGauntletRun(role);
  const { characters, loading: loadingRoster } = useOwnedCharacters(role);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  return (
    <div>
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
        />

        <ActiveTargetStage
          run={run}
          role={role}
          characters={characters}
          loading={loading || busy}
          onWin={() => submitResult('win')}
          onLoss={() => submitResult('loss')}
          onReroll={roll}
          onReveal={reveal}
        />

        <CharacterRosterGrid
          role={role}
          characters={characters}
          completedCharacters={run?.completed_characters || []}
          checkpointCharacters={run?.checkpoint_characters || []}
          activeCharacterId={run?.current_character_id}
          loading={loadingRoster}
        />

        <GauntletStatsDrawer isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} stats={stats} />
        <GauntletRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} role={role} />
      </div>
    </div>
  );
};
