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
import type { GauntletGameMode } from '@/types/gauntletStreak';
import { fetchChallengeModeStatus, type ChallengeModeStatusMap } from '@/services/challengeModesApi';
import { useStreaksDict } from '@/context/StreaksDictContext';
import { useChallengeCompletionStatus } from './useChallengeCompletionStatus';
import { isHardestTierCompleted, CHAOS_DIFFICULTY_ORDER, HISTORY_MODE_ORDER } from '@/utils/challengeTierCompletion';

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
  const completionStatus = useChallengeCompletionStatus();
  const gauntletCompletedVariants = completionStatus.completions.gauntlet ?? [];
  const chaosCompletedVariants = completionStatus.completions.chaos ?? [];
  const historyCompletedVariants = completionStatus.completions.history ?? [];
  const gauntletActiveRuns = completionStatus.active_runs.gauntlet ?? [];
  const chaosActiveRuns = completionStatus.active_runs.chaos ?? [];
  const historyActiveRuns = completionStatus.active_runs.history ?? [];
  const gauntletCounts = completionStatus.completion_counts.gauntlet ?? {};
  const chaosCounts = completionStatus.completion_counts.chaos ?? {};
  const historyCounts = completionStatus.completion_counts.history ?? {};
  const pageStreakCounts = completionStatus.completion_counts.page_streak ?? {};
  const gauntletFullRoster = completionStatus.full_roster.gauntlet ?? {};
  const chaosFullRoster = completionStatus.full_roster.chaos ?? {};
  const historyFullRoster = completionStatus.full_roster.history ?? {};
  const pageStreakFullRoster = completionStatus.full_roster.page_streak ?? {};
  const gauntletVariant = `${role}_original`;
  const gauntletHref = (mode: GauntletGameMode) =>
    `/${locale}/streaks/${role}/gauntlet-streak${mode === 'original' ? '' : `?mode=${mode}`}`;
  const chaosHardestVariant = CHAOS_DIFFICULTY_ORDER[CHAOS_DIFFICULTY_ORDER.length - 1];
  const historyHardestVariant = HISTORY_MODE_ORDER[HISTORY_MODE_ORDER.length - 1];
  const gauntletCardCompleted = gauntletCompletedVariants.includes(gauntletVariant);
  const chaosCardCompleted = isHardestTierCompleted(CHAOS_DIFFICULTY_ORDER, chaosCompletedVariants);
  const historyCardCompleted = isHardestTierCompleted(HISTORY_MODE_ORDER, historyCompletedVariants);
  const gauntletCardCount = gauntletCounts[gauntletVariant] ?? null;
  const chaosCardCount = chaosCounts[chaosHardestVariant] ?? null;
  const historyCardCount = historyCounts[historyHardestVariant] ?? null;
  const gauntletCardFullCount = gauntletFullRoster[gauntletVariant] ?? null;
  const chaosCardFullCount = chaosFullRoster[chaosHardestVariant] ?? null;
  const historyCardFullCount = historyFullRoster[historyHardestVariant] ?? null;
  const pageStreakCompletedVariants = completionStatus.completions.page_streak ?? [];
  const pageStreakCardCompleted = pageStreakCompletedVariants.includes('roster_complete');
  const pageStreakCardCount = pageStreakCounts['roster_complete'] ?? null;
  const pageStreakCardFullCount = pageStreakFullRoster['roster_complete'] ?? null;

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
              image={panel.image}
              dict={dict}
              completed={gauntletCardCompleted}
              completedCount={gauntletCardCount}
              completedFull={gauntletCardFullCount != null}
              completedFullCount={gauntletCardFullCount}
              prefetchHrefs={[`/${locale}/streaks/${role}/gauntlet-streak`]}
              onClick={() => {
                const saved = getSavedGauntletMode(role as 'killer' | 'survivor');
                const variant = `${role}_${saved}`;
                const hasActiveRun = gauntletActiveRuns.includes(variant);
                const savedCompleted = gauntletCompletedVariants.includes(variant);
                // Survivors have several modes, so they always get the picker.
                if (role !== 'survivor' && saved && (hasActiveRun || !savedCompleted)) {
                  router.push(gauntletHref(saved));
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
              image={panel.image}
              dict={dict}
              completed={chaosCardCompleted}
              completedCount={chaosCardCount}
              completedFull={chaosCardFullCount != null}
              completedFullCount={chaosCardFullCount}
              prefetchHrefs={[`/${locale}/streaks/${role}/chaos-streak`]}
              onClick={() => {
                const saved = getSavedChaosDifficulty();
                const hasActiveRun = Boolean(saved) && chaosActiveRuns.includes(saved as string);
                if (saved && (hasActiveRun || !chaosCompletedVariants.includes(saved))) {
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
              image={panel.image}
              dict={dict}
              completed={historyCardCompleted}
              completedCount={historyCardCount}
              completedFull={historyCardFullCount != null}
              completedFullCount={historyCardFullCount}
              prefetchHrefs={[`/${locale}/streaks/${role}/history-streak`]}
              onClick={() => {
                const saved = getSavedHistoryMode();
                const hasActiveRun = Boolean(saved) && historyActiveRuns.includes(saved as string);
                if (saved && (hasActiveRun || !historyCompletedVariants.includes(saved))) {
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
              image={panel.image}
              dict={dict}
              completed={pageStreakCardCompleted}
              completedCount={pageStreakCardCount}
              completedFull={pageStreakCardFullCount != null}
              completedFullCount={pageStreakCardFullCount}
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
            image={panel.image}
            href={`/${locale}/streaks/${role}/${panel.id}`}
            dict={dict}
          />
        );
      })}

      <GauntletModeModal
        isOpen={isModeModalOpen}
        onClose={() => setIsModeModalOpen(false)}
        onSelectMode={(mode) => {
          saveGauntletMode(role as 'killer' | 'survivor', mode);
          router.push(gauntletHref(mode));
        }}
        role={role as 'killer' | 'survivor'}
        currentMode={getSavedGauntletMode(role as 'killer' | 'survivor') ?? undefined}
        originalCompleted={gauntletCardCompleted}
        originalCompletedCount={gauntletCardCount}
        originalCompletedFull={gauntletCardFullCount != null}
        originalCompletedFullCount={gauntletCardFullCount}
        dict={dict}
      />

      <ChaosModeModal
        isOpen={isChaosModeModalOpen}
        onClose={() => setIsChaosModeModalOpen(false)}
        onSelectDifficulty={(difficulty: Difficulty) => {
          saveChaosDifficulty(difficulty);
          router.push(`/${locale}/streaks/${role}/chaos-streak?difficulty=${difficulty}`);
        }}
        completedCounts={chaosCounts}
        completedFullCounts={chaosFullRoster}
        dict={dict}
      />

      <HistoryModeModal
        isOpen={isHistoryModeModalOpen}
        onClose={() => setIsHistoryModeModalOpen(false)}
        onSelectMode={(mode: HistoryMode) => {
          saveHistoryMode(mode);
          router.push(`/${locale}/streaks/${role}/history-streak?mode=${mode}`);
        }}
        completedCounts={historyCounts}
        completedFullCounts={historyFullRoster}
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