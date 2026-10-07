'use client';
// frontend/src/components/streaks/page-streak/BuildPanel.tsx

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { KillerIcon } from '@/components/icons/DbdIcons';
import { tip } from '@/components/common/Tooltip';
import { usePerkDisplayName } from '@/context/DisplayNamesContext';
import { useDictionary } from '@/context/DictionaryContext';

interface BuildPanelProps {
  selected: string[];
  size: number;
  iconByPerk?: Record<string, string>;
  killerName: string;
  avatarSrc?: string;
}

/** Same slot positions as the signature loadout on the profile: top, right, bottom, left. */
const SLOT_POSITIONS = ['col-start-2 row-start-1', 'col-start-3 row-start-2', 'col-start-2 row-start-3', 'col-start-1 row-start-2'];

/** The killer and the build being put together, laid out like the profile's main card. */
export const BuildPanel: React.FC<BuildPanelProps> = ({ selected, size, iconByPerk = {}, killerName, avatarSrc }) => {
  const dict = useDictionary();
  const displayName = usePerkDisplayName();
  const [imgError, setImgError] = useState(false);

  return (
    <section
      aria-label={dict.streaks.yourBuildForMatch}
      className="flex items-center justify-center gap-5 rounded-2xl border border-border-color bg-bg-elevated p-4 shadow-sm"
    >
      <div className="flex min-w-0 flex-col items-center gap-2">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-border-color bg-bg-surface shadow-lg sm:h-28 sm:w-28">
          {avatarSrc && !imgError ? (
            <img
              src={avatarSrc}
              alt={killerName}
              draggable={false}
              onError={() => setImgError(true)}
              className="h-full w-full select-none object-cover"
            />
          ) : (
            <KillerIcon className="h-8 w-8 text-text-muted" aria-hidden="true" />
          )}
        </div>
        <h3 className="max-w-[8rem] truncate text-sm font-black tracking-wide text-text-primary">{killerName}</h3>
      </div>

      <div className="grid grid-cols-[repeat(3,4.25rem)] grid-rows-[repeat(3,4.25rem)] place-items-center">
        {SLOT_POSITIONS.slice(0, size).map((position, index) => {
          const name = selected[index];
          const icon = name ? iconByPerk[name] : undefined;
          return (
            <div
              key={position}
              {...(name ? tip(displayName(name), undefined, 'item') : {})}
              aria-label={name ? displayName(name) : `${dict.streaks.slotLabel} ${index + 1}`}
              className={`${position} flex h-[3.25rem] w-[3.25rem] rotate-45 items-center justify-center rounded-xl border-2 transition-colors ${
                name ? 'border-accent-red/80 bg-bg-surface shadow-md' : 'border-dashed border-border-color bg-bg-surface/40'
              }`}
            >
              <div className="-rotate-45 flex h-full w-full items-center justify-center">
                {name && icon ? (
                  <img src={icon} alt="" draggable={false} className="h-[85%] w-[85%] select-none object-contain drop-shadow-md" />
                ) : (
                  <Plus className="h-5 w-5 text-text-muted" aria-hidden="true" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
