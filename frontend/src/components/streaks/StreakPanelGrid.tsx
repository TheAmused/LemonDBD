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
              onClick={() => setIsModeModalOpen(true)}
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
              onClick={() => setIsChaosModeModalOpen(true)}
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
              onClick={() => setIsHistoryModeModalOpen(true)}
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
              onClick={() => setIsPageStreakModeModalOpen(true)}
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
        onSelectOriginal={() => router.push(`/${locale}/streaks/${role}/gauntlet-streak`)}
        role={role as 'killer' | 'survivor'}
      />

      <ChaosModeModal
        isOpen={isChaosModeModalOpen}
        onClose={() => setIsChaosModeModalOpen(false)}
        onSelectDifficulty={(difficulty: Difficulty) =>
          router.push(`/${locale}/streaks/${role}/chaos-streak?difficulty=${difficulty}`)
        }
      />

      <HistoryModeModal
        isOpen={isHistoryModeModalOpen}
        onClose={() => setIsHistoryModeModalOpen(false)}
        onSelectMode={(mode: HistoryMode) =>
          router.push(`/${locale}/streaks/${role}/history-streak?mode=${mode}`)
        }
      />

      <PageStreakModeModal
        isOpen={isPageStreakModeModalOpen}
        onClose={() => setIsPageStreakModeModalOpen(false)}
        onStart={() => router.push(`/${locale}/streaks/${role}/page-streak`)}
      />
    </div>
  );
};
