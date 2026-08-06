'use client';

import React from 'react';

interface PerkTileProps {
  name: string;
  selected?: boolean;
  disabled?: boolean;
  onToggle?: (name: string) => void;
}

const DIAMOND = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';

export const PerkTile: React.FC<PerkTileProps> = ({ name, selected = false, disabled = false, onToggle }) => {
  const content = (
    <>
      <span
        className={`grid aspect-square w-full max-w-[88px] place-items-center transition-colors ${
          selected ? 'bg-orange-400/70' : 'bg-slate-800'
        }`}
        style={{ clipPath: DIAMOND }}
      >
        <span
          className={`h-[82%] w-[82%] transition-colors ${
            selected
              ? 'bg-gradient-to-br from-amber-900/80 to-slate-950'
              : 'bg-gradient-to-br from-slate-700 to-slate-900'
          }`}
          style={{ clipPath: DIAMOND }}
        />
      </span>
      <span className={`text-center text-[10.5px] font-semibold leading-tight ${selected ? 'text-slate-100' : 'text-slate-400'}`}>
        {name}
      </span>
    </>
  );

  const shell = `flex flex-col items-center gap-2 rounded-xl border p-3 transition-all duration-150 ${
    selected ? 'border-orange-500 bg-orange-500/10 scale-[1.03]' : 'border-slate-800 bg-slate-900/50'
  }`;

  if (disabled || !onToggle) {
    return <div className={shell}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onToggle(name)}
      aria-pressed={selected}
      className={`${shell} hover:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500 motion-reduce:transition-none motion-reduce:scale-100`}
    >
      {content}
    </button>
  );
};
