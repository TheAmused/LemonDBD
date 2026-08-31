// frontend/src/components/streaks/page-streak/PerkTile.tsx
'use client';

import React, { useState } from 'react';
import { usePerkDisplayName } from '@/context/DisplayNamesContext';

interface PerkTileProps {
  name: string;
  selected?: boolean;
  disabled?: boolean;
  iconSrc?: string;
  onToggle?: (name: string) => void;
}

const DIAMOND = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';

export const PerkTile: React.FC<PerkTileProps> = ({
  name,
  selected = false,
  disabled = false,
  iconSrc,
  onToggle,
}) => {
  const label = usePerkDisplayName()(name);
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(iconSrc) && !imgError;

  const content = (
    <>
      <span
        className={`grid aspect-square w-full max-w-[88px] place-items-center transition-colors ${
          selected ? 'bg-orange-400/70' : 'bg-slate-200 dark:bg-slate-800'
        }`}
        style={{ clipPath: DIAMOND }}
      >
        <span
          className={`grid h-[82%] w-[82%] place-items-center transition-colors ${
            selected
              ? 'bg-gradient-to-br from-amber-900/80 to-slate-950'
              : 'bg-gradient-to-br from-slate-100 to-slate-300 dark:from-slate-700 dark:to-slate-900'
          }`}
          style={{ clipPath: DIAMOND }}
        >
          {showImage && (
            <img
              src={iconSrc}
              alt={label}
              onError={() => setImgError(true)}
              className="h-[96%] w-[96%] object-contain drop-shadow"
            />
          )}
        </span>
      </span>
      <span className={`text-center text-[10.5px] font-semibold leading-tight ${selected ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
        {label}
      </span>
    </>
  );

  const shell = `flex flex-col items-center gap-2 rounded-xl border p-3 transition-all duration-150 motion-reduce:transition-none motion-reduce:scale-100 shadow-sm ${
    selected ? 'border-orange-500 bg-orange-500/10 scale-[1.03]' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-800/70'
  }`;

  if (disabled || !onToggle) {
    return <div className={shell}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onToggle(name)}
      aria-pressed={selected}
      className={`${shell} hover:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500`}
    >
      {content}
    </button>
  );
};
