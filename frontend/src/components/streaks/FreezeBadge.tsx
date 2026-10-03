'use client';
// frontend/src/components/streaks/FreezeBadge.tsx
import type { Dictionary } from '@/locales/types';

import React, { useRef, useState } from 'react';
import { Snowflake } from 'lucide-react';
import { Popover } from '@/components/common/Popover';
import { useDictionary } from "@/context/DictionaryContext";

export interface FreezeBadgeProps {
  frozen: boolean;
}

export const FreezeBadge: React.FC<FreezeBadgeProps> = ({ frozen }) => {
  const dict = useDictionary();
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  if (!frozen) return null;

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="freeze-badge-in flex items-center justify-center rounded-xl bg-bg-elevated border border-border-color text-text-secondary shadow-sm px-3.5 py-3"
    >
      <Snowflake className="w-6 h-6" />

      <Popover
        open={hovered}
        anchorRef={ref}
        align="center"
        gap={8}
        viewportMargin={12}
        flip={false}
        passive
        closeOnOutsideClick={false}
        closeOnEscape={false}
        returnFocus={false}
        className="w-56 rounded-xl border border-border-color bg-bg-surface px-3 py-2.5 text-mini leading-snug text-text-secondary shadow-2xl backdrop-blur-md"
      >
        <span className="font-bold text-text-primary">
          {dict.streaks.challengeStarted}
        </span>{' '}
        {dict.streaks.freezeNotice}
      </Popover>
    </div>
  );
};
