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
      className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-1.5 grayscale opacity-50"
    >
      <div className="relative w-full aspect-square rounded-md overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        {!failed ? (
          <img src={src} alt={name} className="w-full h-full object-cover" onError={() => setFailed(true)} />
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
    <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-center gap-1.5 text-left cursor-pointer"
      >
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Next row preview &middot; Row {currentRowIndex + 2}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {nextRow.map((name) => (
              <div key={name} className="w-32 sm:w-36">
                <PreviewTile name={name} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
