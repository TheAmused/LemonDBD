'use client';
import { PerkHexIcon } from '@/components/icons/DbdIcons';
// frontend/src/components/streaks/chaos/ChaosPerkPoolModal.tsx

import { SegmentedControl } from '@/components/common/SegmentedControl';
import React, { useMemo, useState } from 'react';
import { useProgressiveList } from '@/hooks/useProgressiveList';
import { PerkIcon } from '@/components/ui/PerkIcon';
import type { Perk } from '@/types/gauntletStreak';
import { perkIconUrl as perkIconFor } from '@/utils/staticUrl';
import { getIconThumbUrl } from '@/utils/thumbUrl';
import { Modal } from '@/components/common/Modal';
import { usePerkDisplayName } from '@/context/DisplayNamesContext';
import { useDictionary } from "@/context/DictionaryContext";

const PerkTile: React.FC<{ perk: Perk; displayName: string }> = ({ perk, displayName }) => {
  return (
    <div className="flex h-full flex-col items-center overflow-hidden rounded-control border border-border-color bg-bg-surface">
      <div className="relative w-full aspect-square overflow-hidden bg-bg-primary flex items-center justify-center">
        <PerkIcon
          perk={perk}
          src={getIconThumbUrl(perkIconFor(perk), 128) || undefined}
          alt={displayName}
          imageClassName="w-full h-full object-cover"
          fallbackIcon={<PerkHexIcon className="icon-xl text-text-muted" aria-hidden="true" />}
        />
      </div>
      <span className="text-mini leading-tight font-medium text-center text-text-secondary line-clamp-2 min-h-two-lines w-full flex-1 px-1.5 py-2">
        {displayName}
      </span>
    </div>
  );
};

export interface ChaosPerkPoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  pool: Perk[];
  usedPerkNames: string[];
}

export const ChaosPerkPoolModal: React.FC<ChaosPerkPoolModalProps> = ({ isOpen, onClose, pool, usedPerkNames }) => {
  const dict = useDictionary();
  const displayName = usePerkDisplayName();
  const [tab, setTab] = useState<'used' | 'remaining'>('used');

  const usedSet = useMemo(() => new Set(usedPerkNames), [usedPerkNames]);
  const used = useMemo(() => pool.filter((p) => usedSet.has(p.name)), [pool, usedSet]);
  const remaining = useMemo(() => pool.filter((p) => !usedSet.has(p.name)), [pool, usedSet]);
  const shown = tab === 'used' ? used : remaining;
  // A pool has a couple of hundred perks, each with an icon: the grid fills in as it is scrolled.
  const { limit, rootRef, sentinelRef } = useProgressiveList(shown.length, tab);
  const visible = useMemo(() => shown.slice(0, limit), [shown, limit]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="3xl"
      title={dict.streaks.perkPool}
      closeButtonAriaLabel={dict.modal.close}
    >
      <div className="flex justify-center px-5 pt-4">
        <SegmentedControl<'used' | 'remaining'>
          ariaLabel={dict.streaks.perkPoolTabs}
          size="sm"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'used', label: `${dict.streaks.usedTab} (${used.length})` },
            { value: 'remaining', label: `${dict.streaks.remainingTab} (${remaining.length})` },
          ]}
        />
      </div>

      <div ref={rootRef} className="max-h-112 overflow-y-auto p-5">
        {shown.length === 0 ? (
          <p className="text-xs text-text-muted">
            {tab === 'used'
              ? dict.streaks.noPerksDrawnYet
              : dict.streaks.perkPoolEmptyFreshCycle}
          </p>
        ) : (
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {visible.map((perk) => (
              <li key={perk.id ?? perk.name}>
                <PerkTile perk={perk} displayName={displayName(perk.name)} />
              </li>
            ))}
            <li ref={sentinelRef} aria-hidden="true" className="col-span-full h-px" />
          </ul>
        )}
      </div>
    </Modal>
  );
};
