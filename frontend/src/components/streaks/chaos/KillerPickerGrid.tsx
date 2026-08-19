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

const avatarUrlFor = (name: string) => {
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

  return (
    <button
      type="button"
      onClick={() => onSelect(name)}
      disabled={disabled || isCompleted}
      className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-2 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
        isSelected
          ? 'border-violet-400 bg-violet-500/10 ring-2 ring-violet-400'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 hover:border-violet-400/60'
      }`}
    >
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        {!failed ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <Skull className="w-8 h-8 text-slate-400" />
        )}
        {isCompleted && (
          <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
            <Check className="w-6 h-6 text-emerald-400" />
          </div>
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
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
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
