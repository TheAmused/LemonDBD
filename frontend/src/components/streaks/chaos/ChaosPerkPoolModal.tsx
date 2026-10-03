'use client';
// frontend/src/components/streaks/chaos/ChaosPerkPoolModal.tsx

import { Tabs, TabPanel } from '@/components/common/Tabs';
import React, { useId, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Sparkles } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { Perk } from '@/types/gauntletStreak';
import { perkIconUrl as perkIconFor } from '@/utils/staticUrl';
import { Modal } from '@/components/common/Modal';
import { usePerkDisplayName } from '@/context/DisplayNamesContext';
import { useDictionary } from "@/context/DictionaryContext";

const PerkTile: React.FC<{ perk: Perk; displayName: string }> = ({ perk, displayName }) => {
  const [failed, setFailed] = useState<boolean>(false);
  const src = perkIconFor(perk);
  return (
    <div className="flex flex-col items-center gap-1.5 p-2 rounded-lg bg-bg-elevated border border-border-color">
      <div className="w-full aspect-square rounded-md overflow-hidden bg-bg-primary flex items-center justify-center">
        {src && !failed ? (
          <img
            src={src}
            alt={displayName}
            className="w-full h-full object-contain p-1.5"
            onError={() => setFailed(true)}
          />
        ) : (
          <Sparkles className="w-6 h-6 text-text-muted" aria-hidden="true" />
        )}
      </div>
      <span className="text-mini font-medium text-center text-text-secondary leading-tight line-clamp-2">
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
  const tabsId = useId();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="6xl"
      title={dict.streaks.perkPool}
      closeButtonAriaLabel={dict.modal.close}
    >
      <Tabs
        ariaLabel={dict.streaks.perkPoolTabs}
        idBase={tabsId}
        value={tab}
        onChange={setTab}
        variant="pill"
        size="sm"
        className="px-5 pt-4"
        tabs={[
          {
            value: 'used',
            accent: 'green',
            icon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />,
            label: dict.streaks.usedTab,
            count: used.length,
          },
          {
            value: 'remaining',
            accent: 'red',
            icon: <Circle className="w-3.5 h-3.5" aria-hidden="true" />,
            label: dict.streaks.remainingTab,
            count: remaining.length,
          },
        ]}
      />

      <TabPanel value={tab} activeValue={tab} idBase={tabsId} className="p-5">
        {shown.length === 0 ? (
          <p className="text-xs text-text-muted">
            {tab === 'used'
              ? dict.streaks.noPerksDrawnYet
              : dict.streaks.perkPoolEmptyFreshCycle}
          </p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2" role="list">
            {shown.map((perk) => (
              <PerkTile key={perk.id ?? perk.name} perk={perk} displayName={displayName(perk.name)} />
            ))}
          </div>
        )}
      </TabPanel>
    </Modal>
  );
};
