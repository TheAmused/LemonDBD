'use client';

import React from 'react';
import { PerkTile } from './PerkTile';

interface PerkPageGridProps {
  perks: string[];
  selected?: string[];
  onToggle?: (name: string) => void;
  dimmed?: boolean;
}

export const PerkPageGrid: React.FC<PerkPageGridProps> = ({ perks, selected = [], onToggle, dimmed = false }) => (
  <div className={`grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 ${dimmed ? 'pointer-events-none opacity-40 grayscale' : ''}`}>
    {perks.map((name) => (
      <PerkTile
        key={name}
        name={name}
        selected={selected.includes(name)}
        disabled={dimmed || !onToggle}
        onToggle={onToggle}
      />
    ))}
  </div>
);
