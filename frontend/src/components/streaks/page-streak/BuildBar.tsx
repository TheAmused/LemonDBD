'use client';
// frontend/src/components/streaks/page-streak/BuildBar.tsx

import { Button } from '@/components/common/Button';
import React from 'react';
import type { Dictionary } from '@/locales/types';
import { usePerkDisplayName } from '@/context/DisplayNamesContext';
import { useDictionary } from "@/context/DictionaryContext";

interface BuildBarProps {
  selected: string[];
  size: number;
  iconByPerk?: Record<string, string>;
}

export const BuildBar: React.FC<BuildBarProps> = ({ selected, size, iconByPerk = {} }) => {
  const dict = useDictionary();
  const displayName = usePerkDisplayName();
  const slots = Array.from({ length: size }, (_, i) => selected[i] ?? null);

  return (
    <div
      role="region"
      aria-label={dict.streaks.yourBuildForMatch}
      className="flex flex-wrap items-center gap-2.5 rounded-xl border border-border-color bg-bg-surface p-2 shadow-sm"
    >
      {slots.map((name, index) => (
        <div
          key={index}
          className={`flex h-12 min-w-[145px] flex-1 items-center gap-2.5 rounded-lg px-3 text-xs transition-colors ${
            name
              ? 'border border-border-color bg-bg-elevated font-semibold text-text-primary'
              : 'border border-dashed border-border-color text-text-muted'
          }`}
        >
          {name && iconByPerk[name] && (
            <img
              src={iconByPerk[name]}
              alt={displayName(name)}
              className="h-9 w-9 flex-none object-contain"
            />
          )}
          <span>{name ? displayName(name) : `${dict.streaks.slotLabel} ${index + 1}`}</span>
        </div>
      ))}
    </div>
  );
};

