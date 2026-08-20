// frontend/src/components/streaks/chaos/KillerPickerGrid.tsx
'use client';

import React, { useState } from 'react';
import { Check, Skull } from 'lucide-react';

export interface KillerPickerGridProps {
  killers: string[];
  completedKillers: string[];
  selectedKillerId: string | null;
  onSelect: (name: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const avatarUrlFor = (name: string) => {
  const sanitized = name
    .toLowerCase()
    .trim()
    .replace(/[\s\-/]+/g, '_')
    .replace(/[\\/*?:"<>|]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${backendBase}/static/avatars/killers/${sanitized}.png`;
};

const KillerTile: React.FC<{
  name: string;
  isCompleted: boolean;
  isSelected: boolean;
  disabled?: boolean;
  onSelect: (name: string) => void;
}> = ({ name, isCompleted, isSelected, disabled, onSelect }) => {
  const [failed, setFailed] = useState(false);
  const src = avatarUrlFor(name);

  const cardBorder = isCompleted
    ? 'border-emerald-500 shadow-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-950/30 border-2'
    : isSelected
    ? 'border-violet-400 bg-violet-500/10 ring-2 ring-violet-400'
    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 hover:border-violet-400/60';

  return (
    <button
      type="button"
      onClick={() => onSelect(name)}
      disabled={disabled || isCompleted}
      title={`${name}${isCompleted ? ' (Cleared)' : ''}`}
      className={`relative flex flex-col items-center gap-1.5 rounded-lg border p-1.5 transition-all cursor-pointer disabled:cursor-not-allowed ${
        isCompleted ? '' : 'disabled:opacity-40'
      } ${cardBorder}`}
    >
      {isCompleted && (
        <div className="absolute -top-2 -right-2 bg-emerald-500 text-white dark:text-slate-950 p-1 rounded-full shadow-md z-10">
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </div>
      )}
      <div className="relative w-full aspect-square rounded-md overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        {!failed ? (
          <img
            src={src}
            alt={name}
            className={`w-full h-full object-cover ${isCompleted ? 'brightness-105' : ''}`}
            onError={() => setFailed(true)}
          />
        ) : (
          <Skull className="w-6 h-6 text-slate-400" />
        )}
      </div>
      <span className="text-[11px] font-medium text-center text-slate-700 dark:text-slate-200 truncate w-full">
        {name}
      </span>
    </button>
  );
};

export const KillerPickerGrid: React.FC<KillerPickerGridProps> = ({
  killers,
  completedKillers,
  selectedKillerId,
  onSelect,
  disabled = false,
  loading = false,
}) => {
  if (loading) {
    return <p className="text-xs text-slate-500 dark:text-slate-400">Loading your killers...</p>;
  }

  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-2.5">
      {killers.map((name) => (
        <KillerTile
          key={name}
          name={name}
          isCompleted={completedKillers.includes(name)}
          isSelected={selectedKillerId === name}
          disabled={disabled}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};
