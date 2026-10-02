// frontend/src/components/character-detail/components/KillerCombatStats.tsx
import React from 'react';
import { Activity, Gauge, Radio, ArrowUpDown, Eye } from 'lucide-react';

interface KillerCombatStatsProps {
  killerSpeed: string;
  killerTerrorRadius: string;
  killerHeight: string;
  onOpenTerrorRadiusModal: () => void;
  t: Record<string, string>;
}

export const KillerCombatStats: React.FC<KillerCombatStatsProps> = ({
  killerSpeed,
  killerTerrorRadius,
  killerHeight,
  onOpenTerrorRadiusModal,
  t,
}) => {
  return (
    <div className="p-4 rounded-2xl bg-bg-surface border border-border-color shadow-sm space-y-2 w-full backdrop-blur-sm">
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between text-[11px] font-bold uppercase tracking-wider text-text-secondary">
        <span className="flex items-center gap-1.5 text-accent-red">
          <Activity className="h-3.5 w-3.5" />
          {t.combatAttributes || 'Combat Attributes & Threat Scale'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Movement Speed */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-bg-elevated border border-border-color">
          <div className="h-9 w-9 rounded-xl bg-bg-surface border border-border-color flex items-center justify-center text-text-secondary shrink-0">
            <Gauge className="h-4 w-4" />
          </div>
          <div>
            <span className="block text-[10px] text-text-secondary uppercase">
              {t.movementSpeed || 'Movement Speed'}
            </span>
            <span className="block text-xs sm:text-sm font-black text-text-primary">
              {killerSpeed}
            </span>
          </div>
        </div>

        {/* Terror Radius (Visualizer disabled for now) */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-bg-elevated border border-border-color">
          <div className="h-9 w-9 rounded-xl bg-bg-surface border border-border-color flex items-center justify-center text-text-secondary shrink-0">
            <Radio className="h-4 w-4" />
          </div>
          <div>
            <span className="block text-[10px] text-text-secondary uppercase">
              {t.terrorRadius || 'Terror Radius'}
            </span>
            <span className="block text-xs sm:text-sm font-black text-text-primary">
              {killerTerrorRadius}
            </span>
          </div>
        </div>

        {/* Height */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-bg-elevated border border-border-color">
          <div className="h-9 w-9 rounded-xl bg-bg-surface border border-border-color flex items-center justify-center text-text-secondary shrink-0">
            <ArrowUpDown className="h-4 w-4" />
          </div>
          <div>
            <span className="block text-[10px] text-text-secondary uppercase">
              {t.height || 'Height'}
            </span>
            <span className="block text-xs sm:text-sm font-black text-text-primary">
              {killerHeight}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

