// frontend/src/components/character-detail/components/KillerCombatStats.tsx
import React from 'react';
import { Gauge, Radio, ArrowUpDown } from 'lucide-react';
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
  <Surface tone="flat" padding="none" className="flex cursor-default items-center gap-3 p-3 shadow-sm backdrop-blur-sm">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-bg-elevated text-text-secondary">
      <Icon className="icon-md" />
    </div>
    <div>
      <span className="block text-tiny text-text-secondary uppercase">{label}</span>
      <span className="block type-strong-fluid text-text-primary">{value}</span>
    </div>
  </Surface>
);

export const KillerCombatStats: React.FC<KillerCombatStatsProps> = ({
  killerSpeed,
  killerTerrorRadius,
  killerHeight,
  t,
}) => {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Movement Speed */}
        <StatRow icon={Gauge} label={t.movementSpeed} value={killerSpeed} />

        {/* Terror Radius (Visualizer disabled for now) */}
        <StatRow icon={Radio} label={t.terrorRadius} value={killerTerrorRadius} />

        {/* Height */}
        <StatRow icon={ArrowUpDown} label={t.height} value={killerHeight} />
      </div>
    </div>
  );
};

