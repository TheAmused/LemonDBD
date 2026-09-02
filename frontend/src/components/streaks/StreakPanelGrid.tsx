// frontend/src/components/streaks/StreakPanelGrid.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { StreakPanel } from './StreakPanel';
import {
  getKillerStreakPanels,
  getSurvivorStreakPanels,
  getChallengeStreakPanels,
} from './panels';
import { Difficulty } from '@/types/chaosStreak';
import { HistoryMode } from '@/types/historyStreak';
import { fetchChallengeModeStatus, type ChallengeModeStatusMap } from '@/services/challengeModesApi';
import { useStreaksDict } from '@/context/StreaksDictContext';

const GauntletModeModal = dynamic(
  () => import('./gauntlet/GauntletModeModal').then((m) => m.GauntletModeModal),
  { ssr: false }
);
const ChaosModeModal = dynamic(
  () => import('./chaos/ChaosModeModal').then((m) => m.ChaosModeModal),
  { ssr: false }
);
const HistoryModeModal = dynamic(
  () => import('./history/HistoryModeModal').then((m) => m.HistoryModeModal),
  { ssr: false }
);
const PageStreakModeModal = dynamic(
  () => import('./page-streak/PageStreakModeModal').then((m) => m.PageStreakModeModal),
  { ssr: false }
);
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
  const dict = useStreaksDict();

  const panels = useMemo(() => {
    if (role === 'killer') return getKillerStreakPanels(dict);
    if (role === 'challenge') return getChallengeStreakPanels(dict);
    return getSurvivorStreakPanels(dict);
  }, [role, dict]);

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
              icon={panel.icon}
              accent={panel.accent}
              accentBorder={panel.accentBorder}
              color={panel.color}
              image={panel.image}
              comingSoon
              dict={dict}
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
              icon={panel.icon}
              accent={panel.accent}
              accentBorder={panel.accentBorder}
              color={panel.color}
              image={panel.image}
              href={`/${locale}/streaks/${role}/${panel.id}`}
              disabled
              disabledReason={mode?.disabled_reason}
              dict={dict}
            />
          );
        }

        if (panel.id === 'gauntlet-streak') {
          return (
            <StreakPanel
              key={panel.id}
              title={panel.title}
              icon={panel.icon}
              accent={panel.accent}
              accentBorder={panel.accentBorder}
              color={panel.color}
              image={panel.image}
              dict={dict}
              prefetchHrefs={[`/${locale}/streaks/${role}/gauntlet-streak`]}
              onClick={() => {
                const saved = getSavedGauntletMode(role as 'killer' | 'survivor');
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
              icon={panel.icon}
              accent={panel.accent}
              accentBorder={panel.accentBorder}
              color={panel.color}
              image={panel.image}
              dict={dict}
              prefetchHrefs={[`/${locale}/streaks/${role}/chaos-streak`]}
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
              icon={panel.icon}
              accent={panel.accent}
              accentBorder={panel.accentBorder}
              color={panel.color}
              image={panel.image}
              dict={dict}
              prefetchHrefs={[`/${locale}/streaks/${role}/history-streak`]}
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
              icon={panel.icon}
              accent={panel.accent}
              accentBorder={panel.accentBorder}
              color={panel.color}
              image={panel.image}
              dict={dict}
              prefetchHrefs={[`/${locale}/streaks/${role}/page-streak`]}
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
            icon={panel.icon}
            accent={panel.accent}
            accentBorder={panel.accentBorder}
            color={panel.color}
            image={panel.image}
            href={`/${locale}/streaks/${role}/${panel.id}`}
            dict={dict}
          />
        );
      })}

      <GauntletModeModal
        isOpen={isModeModalOpen}
        onClose={() => setIsModeModalOpen(false)}
        onSelectOriginal={() => {
          saveGauntletMode(role as 'killer' | 'survivor', 'original');
          router.push(`/${locale}/streaks/${role}/gauntlet-streak`);
        }}
        role={role as 'killer' | 'survivor'}
        dict={dict}
      />

      <ChaosModeModal
        isOpen={isChaosModeModalOpen}
        onClose={() => setIsChaosModeModalOpen(false)}
        onSelectDifficulty={(difficulty: Difficulty) => {
          saveChaosDifficulty(difficulty);
          router.push(`/${locale}/streaks/${role}/chaos-streak?difficulty=${difficulty}`);
        }}
        dict={dict}
      />

      <HistoryModeModal
        isOpen={isHistoryModeModalOpen}
        onClose={() => setIsHistoryModeModalOpen(false)}
        onSelectMode={(mode: HistoryMode) => {
          saveHistoryMode(mode);
          router.push(`/${locale}/streaks/${role}/history-streak?mode=${mode}`);
        }}
        dict={dict}
      />

      <PageStreakModeModal
        isOpen={isPageStreakModeModalOpen}
        onClose={() => setIsPageStreakModeModalOpen(false)}
        onStart={() => {
          markPageStreakIntroSeen();
          router.push(`/${locale}/streaks/${role}/page-streak`);
        }}
        dict={dict}
      />
    </div>
  );
};