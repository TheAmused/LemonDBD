'use client';
// frontend/src/components/maps/VariantSwitcherBar.tsx

import React from 'react';
import { Layers, Check } from 'lucide-react';

export interface VariantSwitcherBarProps {
  variants: string[];
  activeMapName: string;
  onSelectVariant: (variantName: string) => void;
  className?: string;
}

export const VariantSwitcherBar: React.FC<VariantSwitcherBarProps> = ({
  variants,
  activeMapName,
  onSelectVariant,
  className = '',
}) => {
  if (!variants || variants.length <= 1) {
    return null;
  }

  const isVariantActive = (variant: string): boolean => {
    if (!activeMapName) return false;
    const normActive = activeMapName.toLowerCase().trim();
    const normVariant = variant.toLowerCase().trim();
    return normActive === normVariant;
  };

  return (
    <div
      role="group"
      aria-label="Map Realm Variants"
      className={`flex flex-wrap items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20 p-2.5 backdrop-blur-sm shadow-sm ${className}`}
      data-testid="variant-switcher-bar"
    >
      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 pl-1 pr-2 select-none">
        <Layers className="h-3.5 w-3.5" />
        <span>Map Variants:</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {variants.map((v) => {
          const isActive = isVariantActive(v);
          return (
            <button
              key={v}
              type="button"
              onClick={() => onSelectVariant(v)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer min-h-[36px] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-extrabold scale-105 ring-2 ring-amber-400'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400 hover:text-slate-900 dark:hover:text-white shadow-sm'
              }`}
              data-testid={`variant-pill-${v.toLowerCase().replace(/\s+/g, '-')}`}
              aria-pressed={isActive}
            >
              <span>{v}</span>
              {isActive && (
                <Check className="h-3.5 w-3.5 text-slate-950" data-testid="variant-active-check" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
