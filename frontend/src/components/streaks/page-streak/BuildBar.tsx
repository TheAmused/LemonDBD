'use client';

import React from 'react';

interface BuildBarProps {
  selected: string[];
  size: number;
  confirmed: boolean;
  onConfirm: () => void;
  iconByPerk?: Record<string, string>;
}

const DIAMOND = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';

export const BuildBar: React.FC<BuildBarProps> = ({ selected, size, confirmed, onConfirm, iconByPerk = {} }) => {
  const slots = Array.from({ length: size }, (_, i) => selected[i] ?? null);

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
      {slots.map((name, index) => (
        <div
          key={index}
          className={`flex min-w-[130px] flex-1 items-center gap-2 rounded-lg px-3 py-2 text-xs ${
            name
              ? 'border border-orange-500/50 bg-orange-500/10 font-semibold text-slate-100'
              : 'border border-dashed border-slate-700 font-mono text-slate-600'
          }`}
        >
          {name && (
            <span className="grid h-6 w-6 flex-none place-items-center bg-orange-400/60" style={{ clipPath: DIAMOND }}>
              <span
                className="grid h-[82%] w-[82%] place-items-center bg-gradient-to-br from-amber-900/80 to-slate-950"
                style={{ clipPath: DIAMOND }}
              >
                {iconByPerk[name] && (
                  <img src={iconByPerk[name]} alt="" className="h-[96%] w-[96%] object-contain" />
                )}
              </span>
            </span>
          )}
          {name ?? `slot ${index + 1}`}
        </div>
      ))}
      <button
        type="button"
        onClick={onConfirm}
        disabled={selected.length !== size || confirmed}
        className="rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-xs font-extrabold text-white transition-opacity disabled:opacity-40"
      >
        {confirmed ? 'Build locked' : 'Confirm build'}
      </button>
    </div>
  );
};
