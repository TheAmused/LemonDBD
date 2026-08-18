import React from 'react';
import { Activity, Gauge, Radio, ArrowUpDown, Eye } from 'lucide-react';

interface KillerCombatStatsProps {
  killerSpeed: string;
  killerTerrorRadius: string;
  killerHeight: string;
  onOpenTerrorRadiusModal: () => void;
  t: any;
}

export const KillerCombatStats: React.FC<KillerCombatStatsProps> = ({
  killerSpeed,
  killerTerrorRadius,
  killerHeight,
  onOpenTerrorRadiusModal,
  t,
}) => {
  return (
    <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-rose-500/20 dark:border-rose-900/30 shadow-md space-y-2">
      <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400">
          <Activity className="h-3.5 w-3.5" />
          Combat Attributes & Threat Scale
        </span>
        <span className="text-[10px] text-slate-400">Click Terror Radius for visualizer</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Movement Speed */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80">
          <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
            <Gauge className="h-4 w-4" />
          </div>
          <div>
            <span className="block text-[10px] font-mono text-slate-400 uppercase">
              {t.movementSpeed || 'Movement Speed'}
            </span>
            <span className="block text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
              {killerSpeed}
            </span>
          </div>
        </div>

        {/* Terror Radius */}
        <button
          id="btn-terror-radius-modal"
          onClick={onOpenTerrorRadiusModal}
          className="group flex items-center gap-3 p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border border-rose-500/30 hover:border-rose-400 transition-all cursor-pointer text-left shadow-xs active:scale-95"
          title={t.terrorRadiusVisualizer || 'Click to view visual terror radius scale'}
        >
          <div className="h-9 w-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500 dark:text-rose-400 shrink-0 group-hover:scale-110 transition-transform">
            <Radio className="h-4 w-4 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="block text-[10px] font-mono text-rose-500 dark:text-rose-400 font-bold uppercase flex items-center gap-1">
              {t.terrorRadius || 'Terror Radius'}
              <Eye className="h-2.5 w-2.5 opacity-80" />
            </span>
            <span className="block text-xs sm:text-sm font-black text-rose-700 dark:text-rose-300 underline decoration-dotted underline-offset-2">
              {killerTerrorRadius}
            </span>
          </div>
        </button>

        {/* Height */}
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80">
          <div className="h-9 w-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-500 shrink-0">
            <ArrowUpDown className="h-4 w-4" />
          </div>
          <div>
            <span className="block text-[10px] font-mono text-slate-400 uppercase">
              {t.height || 'Height'}
            </span>
            <span className="block text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
              {killerHeight}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
