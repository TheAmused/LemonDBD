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
          selected ? 'bg-accent-red/70' : 'bg-bg-elevated'
        }`}
        style={{ clipPath: DIAMOND }}
      >
        <span
          className={`grid h-[82%] w-[82%] place-items-center transition-colors ${
            selected ? 'bg-bg-primary' : 'bg-bg-elevated'
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
      <span className={`text-center text-[10.5px] font-semibold leading-tight ${selected ? 'text-text-primary' : 'text-text-secondary'}`}>
        {label}
      </span>
    </>
  );

  const shell = `flex flex-col items-center gap-2 rounded-xl border p-3 transition-all duration-150 motion-reduce:transition-none motion-reduce:scale-100 shadow-sm ${
    selected ? 'border-accent-red bg-accent-red/10 scale-[1.03]' : 'border-border-color bg-bg-surface hover:bg-bg-elevated'
  }`;

  if (disabled || !onToggle) {
    return <div className={shell}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onToggle(name)}
      aria-pressed={selected}
      className={`${shell} hover:border-accent-red/50 focus:outline-none focus:ring-2 focus:ring-accent-red`}
    >
      {content}
    </button>
  );
};
