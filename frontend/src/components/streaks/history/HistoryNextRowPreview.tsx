// frontend/src/components/streaks/history/HistoryNextRowPreview.tsx
'use client';

import React, { useState } from 'react';
import { ChevronDown, Skull } from 'lucide-react';
import { avatarUrlFor } from '../chaos/KillerPickerGrid';

export interface HistoryNextRowPreviewProps {
  killers: string[];
  rowSize: number;
  currentRowIndex: number;
}

const PreviewTile: React.FC<{ name: string }> = ({ name }) => {
  const [failed, setFailed] = useState(false);
  const src = avatarUrlFor(name);
  return (
    <div
      title={name}
      className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-1.5"
    >
      <div className="relative w-full aspect-square rounded-md overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        {!failed ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover opacity-70"
            onError={() => setFailed(true)}
          />
        ) : (
          <Skull className="w-6 h-6 text-slate-400" />
        )}
      </div>
      <span className="text-[11px] font-medium text-center text-slate-500 dark:text-slate-400 truncate w-full">
        {name}
      </span>
    </div>
  );
};

export const HistoryNextRowPreview: React.FC<HistoryNextRowPreviewProps> = ({
  killers,
  rowSize,
  currentRowIndex,
}) => {
  const [expanded, setExpanded] = useState(false);
  const nextRowStart = (currentRowIndex + 1) * rowSize;
  const nextRow = killers.slice(nextRowStart, nextRowStart + rowSize);

  if (nextRow.length === 0) return null;

  return (
    <div className="mt-10 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/85 backdrop-blur-sm p-4 shadow-sm">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left cursor-pointer"
      >
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Next row preview &middot; Row {currentRowIndex + 2}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="mt-4 grid grid-cols-4 sm:grid-cols-5 gap-2.5">
          {nextRow.map((name) => (
            <PreviewTile key={name} name={name} />
          ))}
        </div>
      )}
    </div>
  );
};
