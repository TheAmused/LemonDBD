import React from 'react';
import { StreakPanel } from './StreakPanel';
import { KILLER_STREAK_PANELS } from './panels';

interface StreakPanelGridProps {
  locale: string;
}

export const StreakPanelGrid: React.FC<StreakPanelGridProps> = ({ locale }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {KILLER_STREAK_PANELS.map((panel) =>
      panel.comingSoon ? (
        <StreakPanel
          key={panel.id}
          title={panel.title}
          description={panel.description}
          icon={panel.icon}
          accent={panel.accent}
          accentBorder={panel.accentBorder}
          comingSoon
        />
      ) : (
        <StreakPanel
          key={panel.id}
          title={panel.title}
          description={panel.description}
          icon={panel.icon}
          accent={panel.accent}
          accentBorder={panel.accentBorder}
          href={`/${locale}/streaks/killer/${panel.id}`}
        />
      )
    )}
  </div>
);
