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
      <span className="grid aspect-square w-full max-w-[96px] place-items-center">
        {showImage && (
          <img
            src={iconSrc}
            alt={label}
            onError={() => setImgError(true)}
            className="h-[86%] w-[86%] object-contain drop-shadow"
          />
        )}
      </span>
      <span className={`text-center text-tiny font-semibold leading-tight ${selected ? 'text-text-primary' : 'text-text-secondary'}`}>
        {label}
      </span>
    </>
  );

  const shell = `flex flex-col items-center gap-1 rounded-xl border p-1.5 transition-all duration-150 motion-reduce:transition-none ${
    selected ? 'border-accent-red bg-bg-surface' : 'border-transparent bg-bg-surface hover:bg-bg-elevated'
  }`;

  if (disabled || !onToggle) {
    return <div className={shell}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onToggle(name)}
      aria-pressed={selected}
      className={`${shell} focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red`}
    >
      {content}
    </button>
  );
};
