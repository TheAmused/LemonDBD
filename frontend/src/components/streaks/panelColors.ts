// frontend/src/components/streaks/panelColors.ts
export type PanelColor = 'amber' | 'orange' | 'slate' | 'violet' | 'emerald' | 'rose' | 'sky' | 'cyan';

export const PANEL_HOVER_CLASSES: Record<PanelColor, string> = {
  amber: 'hover:border-amber-500/50 focus:ring-amber-500',
  orange: 'hover:border-orange-500/50 focus:ring-orange-500',
  slate: 'hover:border-slate-500/50 focus:ring-slate-500',
  violet: 'hover:border-violet-500/50 focus:ring-violet-500',
  emerald: 'hover:border-emerald-500/50 focus:ring-emerald-500',
  rose: 'hover:border-rose-500/50 focus:ring-rose-500',
  sky: 'hover:border-sky-500/50 focus:ring-sky-500',
  cyan: 'hover:border-cyan-500/50 focus:ring-cyan-500',
};
