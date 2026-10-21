// frontend/src/components/character-detail/components/KillerCombatStats.tsx
import React from 'react';
import { Activity, Gauge, Radio, ArrowUpDown } from 'lucide-react';
import type { CharacterDetailDictionary } from '../types';
import { Surface } from '@/components/common/Surface';

interface KillerCombatStatsProps {
  killerSpeed: string;
  killerTerrorRadius: string;
  killerHeight: string;
  onOpenTerrorRadiusModal: () => void;
  t: CharacterDetailDictionary;
}

/** One stat of the threat scale: an icon tile, its label and the value. */
const StatRow: React.FC<{ icon: React.ComponentType<{ className?: string }>; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div className="flex cursor-default items-center gap-3 rounded-card bg-bg-elevated/60 p-2.5">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-bg-surface text-text-secondary">
      <Icon className="h-4 w-4" />
    </div>
    <div>
      <span className="block text-tiny text-text-secondary uppercase">{label}</span>
      <span className="block type-strong-fluid text-text-primary">{value}</span>
    </div>
  </div>
);

export const KillerCombatStats: React.FC<KillerCombatStatsProps> = ({
  killerSpeed,
  killerTerrorRadius,
  killerHeight,
  t,
}) => {
  return (
    <Surface padding="none" className="p-4 shadow-sm space-y-2 w-full backdrop-blur-sm">
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between type-label-xs text-text-secondary">
        <span className="flex items-center gap-1.5 text-accent-red">
          <Activity className="h-3.5 w-3.5" />
          {t.combatAttributes}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Movement Speed */}
        <StatRow icon={Gauge} label={t.movementSpeed} value={killerSpeed} />

        {/* Terror Radius (Visualizer disabled for now) */}
        <StatRow icon={Radio} label={t.terrorRadius} value={killerTerrorRadius} />

        {/* Height */}
        <StatRow icon={ArrowUpDown} label={t.height} value={killerHeight} />
      </div>
    </Surface>
  );
};

