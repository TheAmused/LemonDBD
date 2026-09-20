'use client';
// frontend/src/components/streaks/chaos/KillerPickerGrid.tsx
import type { Dictionary } from '@/locales/types';

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { avatarUrlForCharacter } from '@/utils/staticUrl';
import { useCharacterDisplayName } from '@/context/DisplayNamesContext';
import { KillerIcon } from '@/components/icons/DbdIcons';

export const avatarUrlFor = (name: string) => avatarUrlForCharacter(name, 'killers');

const KillerTile: React.FC<{
  name: string;
  displayName: string;
  isCompleted: boolean;
  isSelected: boolean;
  disabled?: boolean;
  onSelect: (name: string) => void;
}> = ({ name, displayName, isCompleted, isSelected, disabled, onSelect }) => {
  const [failed, setFailed] = useState(false);
  const src = avatarUrlFor(name);

  const cardBorder = isCompleted
    ? 'border-accent-green bg-accent-green/10 border-2'
    : isSelected
    ? 'border-accent-red bg-accent-red/10 ring-2 ring-accent-red'
    : 'border-border-color bg-bg-surface hover:border-accent-red/60';

  return (
    <button
      type="button"
      onClick={() => onSelect(name)}
      disabled={disabled || isCompleted}
      title={`${displayName}${isCompleted ? ' (Cleared)' : ''}`}
      className={`relative flex flex-col items-center gap-1.5 rounded-lg border p-1.5 transition-all cursor-pointer disabled:cursor-not-allowed ${
        isCompleted ? '' : 'disabled:opacity-40'
      } ${cardBorder}`}
    >
      {isCompleted && (
        <div className="absolute -top-2 -right-2 bg-accent-green text-text-inverted p-1 rounded-full shadow-xs z-10">
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </div>
      )}
      <div className="relative w-full aspect-square rounded-md overflow-hidden bg-bg-primary flex items-center justify-center">
        {!failed ? (
          <img
            src={src}
            alt={displayName}
            className={`w-full h-full object-cover ${isCompleted ? 'brightness-105' : ''}`}
            onError={() => setFailed(true)}
          />
        ) : (
          <KillerIcon className="w-6 h-6 text-text-muted" />
        )}
      </div>
      <span className="text-[11px] font-medium text-center text-text-secondary truncate w-full">
        {displayName}
      </span>
    </button>
  );
};

export interface KillerPickerGridProps {
  killers: string[];
  completedKillers: string[];
  selectedKillerId: string | null;
  onSelect: (killerId: string) => void;
  disabled?: boolean;
  loading?: boolean;
  center?: boolean;
  dict?: Dictionary;
}

export const KillerPickerGrid: React.FC<KillerPickerGridProps> = ({
  killers,
  completedKillers,
  selectedKillerId,
  onSelect,
  disabled = false,
  loading = false,
  center = false,
  dict,
}) => {
  const displayName = useCharacterDisplayName();

  if (loading) {
    return (
      <p className="text-xs text-text-secondary">
        {dict?.streaks?.loadingKillers || 'Loading your killers...'}
      </p>
    );
  }

  const tiles = killers.map((name) => (
    <KillerTile
      key={name}
      name={name}
      displayName={displayName(name)}
      isCompleted={completedKillers.includes(name)}
      isSelected={selectedKillerId === name}
      disabled={disabled}
      onSelect={onSelect}
    />
  ));

  if (center) {
    return <div className="flex flex-wrap justify-center gap-3">
      {killers.map((name, i) => (
        <div key={name} className="w-32 sm:w-36">
          {tiles[i]}
        </div>
      ))}
    </div>;
  }

  return (
    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
      {tiles}
    </div>
  );
};
