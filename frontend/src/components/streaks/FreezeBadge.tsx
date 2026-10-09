'use client';
// frontend/src/components/streaks/FreezeBadge.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { Snowflake } from 'lucide-react';
import { tip } from '@/components/common/Tooltip';
import { useDictionary } from "@/context/DictionaryContext";

export interface FreezeBadgeProps {
  frozen: boolean;
}

export const FreezeBadge: React.FC<FreezeBadgeProps> = ({ frozen }) => {
  const dict = useDictionary();

  if (!frozen) return null;

  return (
    <div
      {...tip(dict.streaks.challengeStarted, dict.streaks.freezeNotice, 'status')}
      className="freeze-badge-in flex items-center justify-center rounded-xl bg-bg-elevated border border-border-color text-text-secondary shadow-sm px-3.5 py-3"
    >
      <Snowflake className="w-6 h-6" />
    </div>
  );
};
