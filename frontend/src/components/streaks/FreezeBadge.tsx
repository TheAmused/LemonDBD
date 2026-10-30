'use client';
// frontend/src/components/streaks/FreezeBadge.tsx

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
      className="freeze-badge-in flex shrink-0 items-center justify-center rounded-card bg-bg-elevated border border-border-color text-text-secondary shadow-sm h-11 px-3 sm:w-10 sm:px-0 lg:w-11"
    >
      <Snowflake className="icon-xl" />
    </div>
  );
};
