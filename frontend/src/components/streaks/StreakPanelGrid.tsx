// frontend/src/components/streaks/StreakPanelGrid.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StreakPanel } from './StreakPanel';
import { KILLER_STREAK_PANELS, SURVIVOR_STREAK_PANELS, CHALLENGE_STREAK_PANELS } from './panels';
import { GauntletModeModal } from './gauntlet/GauntletModeModal';
import { ChaosModeModal } from './chaos/ChaosModeModal';
import { HistoryModeModal } from './history/HistoryModeModal';
import { PageStreakModeModal } from './page-streak/PageStreakModeModal';
import { Difficulty } from '@/types/chaosStreak';
import { HistoryMode } from '@/types/historyStreak';
import { fetchChallengeModeStatus, type ChallengeModeStatusMap } from '@/services/challengeModesApi';
import {
  getSavedChaosDifficulty,
  saveChaosDifficulty,
  getSavedHistoryMode,
  saveHistoryMode,
  getSavedGauntletMode,
  saveGauntletMode,
  hasSeenPageStreakIntro,
  markPageStreakIntroSeen,
} from '@/utils/streakDifficultyPrefs';

/** Maps a panel's static id to its backend `ChallengeModeSetting.mode` key. */
const PANEL_ID_TO_MODE: Record<string, string> = {
  'gauntlet-streak': 'gauntlet',
  'chaos-streak': 'chaos',
  'history-streak': 'history',
  'page-streak': 'page_streak',
};

interface StreakPanelGridProps {
  locale: string;
  role: string;
}

export const StreakPanelGrid: React.FC<StreakPanelGridProps> = ({ locale, role }) => {
  const router = useRouter();
  const panels =
    role === 'killer' ? KILLER_STREAK_PANELS : role === 'challenge' ? CHALLENGE_STREAK_PANELS : SURVIVOR_STREAK_PANELS;
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const [isChaosModeModalOpen, setIsChaosModeModalOpen] = useState(false);
  const [isHistoryModeModalOpen, setIsHistoryModeModalOpen] = useState(false);
  const [isPageStreakModeModalOpen, setIsPageStreakModeModalOpen] = useState(false);
  const [modeStatus, setModeStatus] = useState<ChallengeModeStatusMap>({});

  useEffect(() => {
    fetchChallengeModeStatus().then(setModeStatus);
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {panels.map((panel) => {
        if (panel.comingSoon) {
          return (
            <StreakPanel
              key={panel.id}
              title={panel.title}
              description={panel.description}
              icon={panel.icon}
              accent={panel.accent}
              accentBorder={panel.accentBorder}
              color={panel.color}
              image={panel.image}
              comingSoon
            />
          );
        }

        const modeKey = PANEL_ID_TO_MODE[panel.id];
        const mode = modeKey ? modeStatus[modeKey] : undefined;
        const isDisabled = mode ? !mode.is_enabled : false;

        if (isDisabled) {
          return (
            <StreakPanel
              key={panel.id}
              title={panel.title}
              description={panel.description}
              icon={panel.icon}
              accent={panel.accent}
              accentBorder={panel.accentBorder}
              color={panel.color}
              image={panel.image}
              href={`/${locale}/streaks/${role}/${panel.id}`}
              disabled
              disabledReason={mode?.disabled_reason}
            />
          );
        }

        if (panel.id === 'gauntlet-streak') {
          return (
            <StreakPanel
              key={panel.id}
              title={panel.title}
              description={panel.description}
              icon={panel.icon}
              accent={panel.accent}
              accentBorder={panel.accentBorder}
              color={panel.color}
              image={panel.image}
              onClick={() => {
                const saved = getSavedGauntletMode();
                if (saved === 'original') {
                  router.push(`/${locale}/streaks/${role}/gauntlet-streak`);
                } else {
                  setIsModeModalOpen(true);
                }
              }}
            />
          );
        }

        if (panel.id === 'chaos-streak') {
          return (
            <StreakPanel
              key={panel.id}
              title={panel.title}
              description={panel.description}
              icon={panel.icon}
              accent={panel.accent}
              accentBorder={panel.accentBorder}
              color={panel.color}
              image={panel.image}
              onClick={() => {
                const saved = getSavedChaosDifficulty();
                if (saved) {
                  router.push(`/${locale}/streaks/${role}/chaos-streak?difficulty=${saved}`);
                } else {
                  setIsChaosModeModalOpen(true);
                }
              }}
            />
          );
        }

        if (panel.id === 'history-streak') {
          return (
            <StreakPanel
              key={panel.id}
              title={panel.title}
              description={panel.description}
              icon={panel.icon}
              accent={panel.accent}
              accentBorder={panel.accentBorder}
              color={panel.color}
              image={panel.image}
              onClick={() => {
                const saved = getSavedHistoryMode();
                if (saved) {
                  router.push(`/${locale}/streaks/${role}/history-streak?mode=${saved}`);
                } else {
                  setIsHistoryModeModalOpen(true);
                }
              }}
            />
          );
        }

        if (panel.id === 'page-streak') {
          return (
            <StreakPanel
              key={panel.id}
              title={panel.title}
              description={panel.description}
              icon={panel.icon}
              accent={panel.accent}
              accentBorder={panel.accentBorder}
              color={panel.color}
              image={panel.image}
              onClick={() => {
                if (hasSeenPageStreakIntro()) {
                  router.push(`/${locale}/streaks/${role}/page-streak`);
                } else {
                  setIsPageStreakModeModalOpen(true);
                }
              }}
            />
          );
        }

        return (
          <StreakPanel
            key={panel.id}
            title={panel.title}
            description={panel.description}
            icon={panel.icon}
            accent={panel.accent}
            accentBorder={panel.accentBorder}
            color={panel.color}
            image={panel.image}
            href={`/${locale}/streaks/${role}/${panel.id}`}
          />
        );
      })}

      <GauntletModeModal
        isOpen={isModeModalOpen}
        onClose={() => setIsModeModalOpen(false)}
        onSelectOriginal={() => {
          saveGauntletMode('original');
          router.push(`/${locale}/streaks/${role}/gauntlet-streak`);
        }}
        role={role as 'killer' | 'survivor'}
      />

      <ChaosModeModal
        isOpen={isChaosModeModalOpen}
        onClose={() => setIsChaosModeModalOpen(false)}
        onSelectDifficulty={(difficulty: Difficulty) => {
          saveChaosDifficulty(difficulty);
          router.push(`/${locale}/streaks/${role}/chaos-streak?difficulty=${difficulty}`);
        }}
      />

      <HistoryModeModal
        isOpen={isHistoryModeModalOpen}
        onClose={() => setIsHistoryModeModalOpen(false)}
        onSelectMode={(mode: HistoryMode) => {
          saveHistoryMode(mode);
          router.push(`/${locale}/streaks/${role}/history-streak?mode=${mode}`);
        }}
      />

      <PageStreakModeModal
        isOpen={isPageStreakModeModalOpen}
        onClose={() => setIsPageStreakModeModalOpen(false)}
        onStart={() => {
          markPageStreakIntroSeen();
          router.push(`/${locale}/streaks/${role}/page-streak`);
        }}
      />
    </div>
  );
};
