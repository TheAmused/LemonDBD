// frontend/src/components/streaks/StreakPanelGrid.tsx
import React from 'react';
import { StreakPanel } from './StreakPanel';
import { StreakPanelDef } from './panels';

interface StreakPanelGridProps {
  locale: string;
  role: string;
  panels: StreakPanelDef[];
}

export const StreakPanelGrid: React.FC<StreakPanelGridProps> = ({ locale, role, panels }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {panels.map((panel) =>
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
          href={`/${locale}/streaks/${role}/${panel.id}`}
        />
      )
    )}
  </div>
);
