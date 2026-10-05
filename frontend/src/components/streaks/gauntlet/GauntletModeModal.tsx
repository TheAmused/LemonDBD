// frontend/src/components/streaks/gauntlet/GauntletModeModal.tsx
'use client';
import type { Dictionary } from '@/locales/types';

import React, { useEffect, useState } from 'react';
import { Swords, Sparkles, User, Users, UsersRound } from 'lucide-react';
import { ChallengeIntroTile, NEUTRAL_TILE_ACCENT } from '../ChallengeIntroModalShell';
import { ChallengeModeModal } from '../ChallengeModeModal';
import { GauntletRulesModal } from './GauntletRulesModal';
import { GAUNTLET_GAME_MODES, GauntletGameMode } from '@/types/gauntletStreak';
import { useDictionary } from "@/context/DictionaryContext";

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
}

type Stage = 'root' | 'lemon';

function lemonRootTile(role: 'killer' | 'survivor', dict: Dictionary): ChallengeIntroTile {
  return {
    value: 'lemon',
    label: role === 'killer' ? dict.streaks.lemonMode : dict.streaks.lemonVersion,
    description: role === 'killer' ? dict.streaks.gauntletLemonDesc : dict.streaks.gauntletLemonPlayersDesc,
    icon: Sparkles,
    image: '/images/streaks/modes/gauntlet-lemon.webp',
    accentClassName: NEUTRAL_TILE_ACCENT,
  };
}

function lemonPlayerTiles(dict: Dictionary): ChallengeIntroTile[] {
  return [
    {
      value: 'lemon_solo',
      label: dict.streaks.lemonSolo,
      description: dict.streaks.lemonSoloDesc,
      icon: User,
      image: '/images/streaks/modes/gauntlet-1-player.webp',
      accentClassName: NEUTRAL_TILE_ACCENT,
    },
    {
      value: 'lemon_duo',
      label: dict.streaks.lemonDuo,
      description: dict.streaks.lemonDuoDesc,
      icon: Users,
      image: '/images/streaks/modes/gauntlet-2-players.webp',
      accentClassName: NEUTRAL_TILE_ACCENT,
    },
    {
      value: 'lemon_squad',
      label: dict.streaks.lemonSquad,
      description: dict.streaks.lemonSquadDesc,
      icon: UsersRound,
      image: '/images/streaks/modes/gauntlet-4-players.webp',
      accentClassName: NEUTRAL_TILE_ACCENT,
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
    }) => {
  const dict = useDictionary();
  const [stage, setStage] = useState<Stage>('root');

  useEffect(() => {
    if (!isOpen) setStage('root');
  }, [isOpen]);

  const isLemonStage = stage === 'lemon';

  const rootTiles: ChallengeIntroTile[] = [
    {
      value: 'original',
      label: dict.streaks.original,
      description:
        dict.streaks.gauntletOriginalDesc,
      icon: Swords,
      image: '/images/streaks/modes/gauntlet-original.webp',
      accentClassName: NEUTRAL_TILE_ACCENT,
      completed: originalCompleted,
      completedCount: originalCompletedCount,
      completedFull: originalCompletedFull,
      completedFullCount: originalCompletedFullCount,
    },
    lemonRootTile(role, dict),
  ];

  const rootSelected = currentMode === 'original' ? 'original' : currentMode ? 'lemon' : undefined;

  return (
    <ChallengeModeModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isLemonStage
          ? dict.streaks.chooseLemonPlayers
          : dict.streaks.chooseMode
      }
      intro={
        isLemonStage || !showIntro
          ? undefined
          : role === 'killer'
            ? dict.streaks.gauntletIntroKiller
            : dict.streaks.gauntletIntroSurvivor
      }
      showRules={!isLemonStage && showIntro}
      tiles={isLemonStage ? lemonPlayerTiles(dict) : rootTiles}
      onSelectTile={(value) => {
        if (value === 'lemon') {
          // Killers have a single lemon mode, so there is no player count to pick.
          if (role === 'killer') onSelectMode('lemon_killer');
          else setStage('lemon');
          return;
        }
        const mode = GAUNTLET_GAME_MODES.find((candidate) => candidate === value);
        if (mode) onSelectMode(mode);
      }}
      tileGridClassName={isLemonStage ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}
      selectedValue={isLemonStage ? currentMode : rootSelected}
      onBack={isLemonStage ? () => setStage('root') : undefined}
      backLabel={dict.streaks.back}
      renderRules={(rules) => <GauntletRulesModal {...rules} role={role} />}
    />
  );
};
