// frontend/src/components/streaks/gauntlet/GauntletModeModal.tsx
'use client';
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useState } from 'react';
import { Swords, Lock, Sparkles, User, Users, UsersRound } from 'lucide-react';
import { ChallengeIntroModalShell, ChallengeIntroTile } from '../ChallengeIntroModalShell';
import { GauntletRulesModal } from './GauntletRulesModal';
import { GAUNTLET_GAME_MODES, GauntletGameMode } from '@/types/gauntletStreak';

const LEMON_ACCENT = 'border-accent-amber/30 bg-accent-amber/5 hover:bg-accent-amber/10 text-accent-amber';

export interface GauntletModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: GauntletGameMode) => void;
  role: 'killer' | 'survivor';
  currentMode?: GauntletGameMode;
  /** This role's Original Gauntlet has already been fully cleared. */
  originalCompleted?: boolean;
  /** Killer count frozen at that completion. */
  originalCompletedCount?: number | null;
  /** This role's Original Gauntlet was cleared with the entire game roster -- upgrades the badge to red. */
  originalCompletedFull?: boolean;
  /** Killer count frozen at that full-roster completion. */
  originalCompletedFullCount?: number | null;
  /** Hide the intro box when the player is switching mode mid-run. */
  showIntro?: boolean;
  dict?: Dictionary;
}

type Stage = 'root' | 'lemon';

function lemonRootTile(role: 'killer' | 'survivor', dict?: Dictionary): ChallengeIntroTile {
  const label = dict?.streaks?.lemonVersion || 'Lemon version';
  if (role !== 'survivor') {
    return {
      value: 'lemon',
      label,
      description: dict?.streaks?.gauntletLemonDesc || 'A lightly modified, easier take on the Gauntlet.',
      icon: Lock,
      accentClassName: 'border-border-color bg-bg-elevated/50',
      disabled: true,
      disabledBadge: dict?.streaks?.comingSoon || 'Coming soon.',
    };
  }
  return {
    value: 'lemon',
    label,
    description: dict?.streaks?.gauntletLemonPlayersDesc || 'Our own version of the Gauntlet.',
    icon: Sparkles,
    accentClassName: LEMON_ACCENT,
  };
}

function lemonPlayerTiles(dict?: Dictionary): ChallengeIntroTile[] {
  return [
    {
      value: 'lemon_solo',
      label: dict?.streaks?.lemonSolo || 'Solo',
      description: dict?.streaks?.lemonSoloDesc || '1 player',
      icon: User,
      accentClassName: LEMON_ACCENT,
    },
    {
      value: 'lemon_duo',
      label: dict?.streaks?.lemonDuo || 'Duo',
      description: dict?.streaks?.lemonDuoDesc || '2 players',
      icon: Users,
      accentClassName: LEMON_ACCENT,
    },
    {
      value: 'lemon_squad',
      label: dict?.streaks?.lemonSquad || 'Squad',
      description: dict?.streaks?.lemonSquadDesc || '4 players',
      icon: UsersRound,
      accentClassName: LEMON_ACCENT,
    },
  ];
}

export const GauntletModeModal: React.FC<GauntletModeModalProps> = ({
  isOpen,
  onClose,
  onSelectMode,
  role,
  currentMode,
  originalCompleted = false,
  originalCompletedCount = null,
  originalCompletedFull = false,
  originalCompletedFullCount = null,
  showIntro = true,
  dict,
}) => {
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [stage, setStage] = useState<Stage>('root');

  useEffect(() => {
    if (!isOpen) setStage('root');
  }, [isOpen]);

  const isLemonStage = stage === 'lemon';

  const rootTiles: ChallengeIntroTile[] = [
    {
      value: 'original',
      label: dict?.streaks?.original || 'Original',
      description:
        dict?.streaks?.gauntletOriginalDesc || 'Classic, original Gauntlet rules. A checkpoint every 10 wins.',
      icon: Swords,
      accentClassName: 'border-accent-red/30 bg-accent-red/5 hover:bg-accent-red/10 text-accent-red',
      completed: originalCompleted,
      completedCount: originalCompletedCount,
      completedFull: originalCompletedFull,
      completedFullCount: originalCompletedFullCount,
    },
    lemonRootTile(role, dict),
  ];

  const rootSelected = currentMode === 'original' ? 'original' : currentMode ? 'lemon' : undefined;

  return (
    <>
      <ChallengeIntroModalShell
        isOpen={isOpen}
        onClose={onClose}
        icon={isLemonStage ? Sparkles : Swords}
        iconClassName={
          isLemonStage
            ? 'bg-accent-amber/10 border-accent-amber/20 text-accent-amber'
            : 'bg-accent-red/10 border-accent-red/20 text-accent-red'
        }
        title={
          isLemonStage
            ? dict?.streaks?.chooseLemonPlayers || 'How many players?'
            : dict?.streaks?.chooseGauntletMode || 'Choose a Gauntlet Mode'
        }
        intro={
          isLemonStage || !showIntro
            ? undefined
            : role === 'killer'
              ? dict?.streaks?.gauntletIntroKiller ||
                'Face a random owned killer with a shrinking perk loadout. Win to raise your streak, lose and fall back to your last checkpoint.'
              : dict?.streaks?.gauntletIntroSurvivor ||
                'Face a random owned survivor with a shrinking perk loadout. Win to raise your streak, lose and fall back to your last checkpoint.'
        }
        rulesLabel={dict?.streaks?.rules || 'Rules'}
        onOpenRules={isLemonStage || !showIntro ? undefined : () => setIsRulesOpen(true)}
        tiles={isLemonStage ? lemonPlayerTiles(dict) : rootTiles}
        onSelectTile={(value) => {
          if (value === 'lemon') {
            setStage('lemon');
            return;
          }
          const mode = GAUNTLET_GAME_MODES.find((candidate) => candidate === value);
          if (mode) onSelectMode(mode);
        }}
        tileGridClassName={isLemonStage ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}
        escapeDisabled={isRulesOpen}
        selectedValue={isLemonStage ? currentMode : rootSelected}
        currentLabel={dict?.streaks?.current || 'Current'}
        onBack={isLemonStage ? () => setStage('root') : undefined}
        backLabel={dict?.streaks?.back || 'Back'}
        dict={dict}
      />

      <GauntletRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} role={role} dict={dict} />
    </>
  );
};
