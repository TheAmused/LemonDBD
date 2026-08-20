// frontend/src/components/streaks/StreakPanelGrid.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StreakPanel } from './StreakPanel';
import { KILLER_STREAK_PANELS, SURVIVOR_STREAK_PANELS } from './panels';
import { GauntletModeModal } from './gauntlet/GauntletModeModal';
import { ChaosModeModal } from './chaos/ChaosModeModal';
import { Difficulty } from '@/types/chaosStreak';

interface StreakPanelGridProps {
  locale: string;
  role: string;
}

export const StreakPanelGrid: React.FC<StreakPanelGridProps> = ({ locale, role }) => {
  const router = useRouter();
  const panels = role === 'killer' ? KILLER_STREAK_PANELS : SURVIVOR_STREAK_PANELS;
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const [isChaosModeModalOpen, setIsChaosModeModalOpen] = useState(false);

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
              image={panel.image}
              comingSoon
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
              image={panel.image}
              onClick={() => setIsChaosModeModalOpen(true)}
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
            href={`/${locale}/streaks/${role}/${panel.id}`}
          />
        );
      })}

      <GauntletModeModal
        isOpen={isModeModalOpen}
        onClose={() => setIsModeModalOpen(false)}
        onSelectOriginal={() => router.push(`/${locale}/streaks/${role}/gauntlet-streak`)}
      />

      <ChaosModeModal
        isOpen={isChaosModeModalOpen}
        onClose={() => setIsChaosModeModalOpen(false)}
        onSelectDifficulty={(difficulty: Difficulty) =>
          router.push(`/${locale}/streaks/${role}/chaos-streak?difficulty=${difficulty}`)
        }
      />
    </div>
  );
};
