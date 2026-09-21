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
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-text-secondary">
        <span className="flex items-center gap-1.5 text-accent-red">
          <Activity className="h-3.5 w-3.5" />
          {t.combatAttributes || 'Combat Attributes & Threat Scale'}
        </span>
        <span className="text-[10px] text-text-muted">
          {t.clickTerrorRadiusVisualizer || 'Click Terror Radius for visualizer'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Movement Speed */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-bg-elevated border border-border-color">
          <div className="h-9 w-9 rounded-xl bg-bg-surface border border-border-color flex items-center justify-center text-text-secondary shrink-0">
            <Gauge className="h-4 w-4" />
          </div>
          <div>
            <span className="block text-[10px] font-mono text-text-secondary uppercase">
              {t.movementSpeed || 'Movement Speed'}
            </span>
            <span className="block text-xs sm:text-sm font-black text-text-primary">
              {killerSpeed}
            </span>
          </div>
        </div>

        {/* Terror Radius */}
        <button
          type="button"
          id="btn-terror-radius-modal"
          onClick={onOpenTerrorRadiusModal}
          className="group flex items-center gap-3 p-2.5 rounded-xl bg-accent-red/10 hover:bg-accent-red/15 border border-accent-red/30 hover:border-accent-red/50 transition-all cursor-pointer text-left shadow-sm active:scale-95 focus:outline-none focus:ring-1 focus:ring-accent-red"
          title={t.terrorRadiusVisualizer || 'Click to view visual terror radius scale'}
        >
          <div className="h-9 w-9 rounded-xl bg-accent-red/20 border border-accent-red/40 flex items-center justify-center text-accent-red shrink-0 group-hover:scale-110 transition-transform">
            <Radio className="h-4 w-4 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-[10px] font-mono text-accent-red font-bold uppercase flex items-center gap-1">
              {t.terrorRadius || 'Terror Radius'}
              <Eye className="h-2.5 w-2.5 opacity-80" />
            </span>
            <span className="block text-xs sm:text-sm font-black text-accent-red underline decoration-dotted underline-offset-2 truncate">
              {killerTerrorRadius}
            </span>
          </div>
        </button>

        {/* Height */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-bg-elevated border border-border-color">
          <div className="h-9 w-9 rounded-xl bg-bg-surface border border-border-color flex items-center justify-center text-text-secondary shrink-0">
            <ArrowUpDown className="h-4 w-4" />
          </div>
          <div>
            <span className="block text-[10px] font-mono text-text-secondary uppercase">
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

