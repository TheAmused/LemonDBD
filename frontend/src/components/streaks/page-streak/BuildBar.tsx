'use client';
// frontend/src/components/streaks/page-streak/BuildBar.tsx

import { Button } from '@/components/common/Button';
import React from 'react';
import type { Dictionary } from '@/locales/types';
import { usePerkDisplayName } from '@/context/DisplayNamesContext';

interface BuildBarProps {
  selected: string[];
  size: number;
  confirmed: boolean;
  onConfirm: () => void;
  iconByPerk?: Record<string, string>;
  dict?: Dictionary;
}

const DIAMOND_CLIP_PATH = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';

export const BuildBar: React.FC<BuildBarProps> = ({
  selected,
  size,
  confirmed,
  onConfirm,
  iconByPerk = {},
  dict,
}) => {
  const displayName = usePerkDisplayName();
  const slots = Array.from({ length: size }, (_, i) => selected[i] ?? null);

  return (
    <div
      role="region"
      aria-label={dict?.streaks?.yourBuildForMatch || 'Perk Build Selection'}
      className="flex flex-wrap items-center gap-2.5 rounded-xl border border-border-color bg-bg-surface p-3 shadow-sm"
    >
      {slots.map((name, index) => (
        <div
          key={index}
          className={`flex h-16 min-w-[145px] flex-1 items-center gap-2.5 rounded-lg px-3 text-xs transition-colors ${
            name
              ? 'border border-accent-red/50 bg-accent-red/10 font-semibold text-text-primary'
              : 'border border-dashed border-border-color text-text-muted'
          }`}
        >
          {name && (
            <span
              className="grid h-11 w-11 flex-none place-items-center bg-accent-red/60"
              style={{ clipPath: DIAMOND_CLIP_PATH }}
            >
              <span
                className="grid h-[82%] w-[82%] place-items-center bg-bg-primary"
                style={{ clipPath: DIAMOND_CLIP_PATH }}
              >
                {iconByPerk[name] && (
                  <img
                    src={iconByPerk[name]}
                    alt={displayName(name)}
                    className="h-[96%] w-[96%] object-contain"
                  />
                )}
              </span>
            </span>
          )}
          <span>{name ? displayName(name) : `${dict?.streaks?.slotLabel || 'Slot'} ${index + 1}`}</span>
        </div>
      ))}

      <Button
        variant="primary"
        size="sm"
        onClick={onConfirm}
        disabled={selected.length !== size || confirmed}
      >
        {confirmed
          ? (dict?.streaks?.buildLocked || 'Build locked')
          : (dict?.streaks?.confirmBuild || 'Confirm build')}
      </Button>
    </div>
  );
};

