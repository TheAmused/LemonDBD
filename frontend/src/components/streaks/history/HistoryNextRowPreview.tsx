'use client';
// frontend/src/components/streaks/history/HistoryNextRowPreview.tsx

import React, { useState } from 'react';
import { PerkIcon } from '@/components/ui/PerkIcon';
import { avatarUrlFor } from '../chaos/KillerPickerGrid';
import { PersonIcon } from '@/components/icons/DbdIcons';

import { useDictionary } from "@/context/DictionaryContext";
import { Collapsible } from '@/components/common/Collapsible';
import { DisclosureButton } from '@/components/common/DisclosureButton';

export interface HistoryNextRowPreviewProps {
  killers: string[];
  rowSize: number;
  currentRowIndex: number;
}

const PreviewTile: React.FC<{ name: string }> = ({ name }) => {
  const src = avatarUrlFor(name);
  return (
    <div
      className="flex flex-col items-center gap-1.5 rounded-chip border border-border-color bg-bg-surface p-1.5 grayscale opacity-50"
    >
      <div className="relative w-full aspect-square rounded-chip overflow-hidden bg-bg-elevated flex items-center justify-center">
        <PerkIcon
          src={src}
          alt={name}
          imageClassName="w-full h-full object-cover"
          fallbackIcon={<PersonIcon className="icon-xl text-text-muted" />}
        />
      </div>
      <span className="text-mini font-medium text-center text-text-muted truncate w-full">
        {name}
      </span>
    </div>
  );
};

export const HistoryNextRowPreview: React.FC<HistoryNextRowPreviewProps> = ({ killers, rowSize, currentRowIndex }) => {
  const dict = useDictionary();
  const [expanded, setExpanded] = useState(false);
  const nextRowStart = (currentRowIndex + 1) * rowSize;
  const nextRow = killers.slice(nextRowStart, nextRowStart + rowSize);

  if (nextRow.length === 0) return null;

  return (
    <div className="mt-4">
      <DisclosureButton open={expanded} onClick={() => setExpanded((v) => !v)} className="w-full justify-center gap-1.5">
        <span className="type-label-sm text-text-muted">
          {dict.streaks.nextRowPreviewLabel}{' '}
          {dict.streaks.middotSeparator} {dict.streaks.rowLabel} {currentRowIndex + 2}
        </span>
      </DisclosureButton>

      <Collapsible
        open={expanded}
        contentClassName="mt-4 flex flex-wrap justify-center gap-2"
      >
        {nextRow.map((name) => (
          <div key={name} className="w-third-gap sm:w-fifth-gap sm:max-w-36">
            <PreviewTile name={name} />
          </div>
        ))}
      </Collapsible>
    </div>
  );
};
