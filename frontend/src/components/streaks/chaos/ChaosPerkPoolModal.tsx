'use client';
// frontend/src/components/streaks/chaos/ChaosPerkPoolModal.tsx

import { Tabs, TabPanel } from '@/components/common/Tabs';
import React, { useId, useMemo, useState } from 'react';
import { Layers, CheckCircle2, Circle, Sparkles } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import type { Perk } from '@/types/gauntletStreak';
import { perkIconUrl as perkIconFor } from '@/utils/staticUrl';
import { Modal } from '@/components/common/Modal';
import { usePerkDisplayName } from '@/context/DisplayNamesContext';

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
      <span className="text-[11px] font-medium text-center text-text-secondary leading-tight line-clamp-2">
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
  dict?: Dictionary;
}

export const ChaosPerkPoolModal: React.FC<ChaosPerkPoolModalProps> = ({
  isOpen,
  onClose,
  pool,
  usedPerkNames,
  dict,
}) => {
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
      icon={<Layers className="h-5 w-5" aria-hidden="true" />}
      title={dict?.streaks?.perkPool || 'Perk Pool'}
      subtitle={`${used.length} ${dict?.streaks?.usedLabel || 'used'} ${dict?.streaks?.middotSeparator || '·'} ${remaining.length} ${dict?.streaks?.leftThisCycle || 'left this cycle'}`}
      closeButtonAriaLabel={dict?.modal?.close || 'Close perk pool modal'}
    >
      <Tabs
        ariaLabel={dict?.streaks?.perkPoolTabs || 'Perk pool view tabs'}
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
            label: dict?.streaks?.usedTab || 'Used',
            count: used.length,
          },
          {
            value: 'remaining',
            accent: 'red',
            icon: <Circle className="w-3.5 h-3.5" aria-hidden="true" />,
            label: dict?.streaks?.remainingTab || 'Remaining',
            count: remaining.length,
          },
        ]}
      />

      <TabPanel value={tab} activeValue={tab} idBase={tabsId} className="p-5">
        {shown.length === 0 ? (
          <p className="text-xs text-text-muted">
            {tab === 'used'
              ? dict?.streaks?.noPerksDrawnYet || 'No perks drawn yet this cycle.'
              : dict?.streaks?.perkPoolEmptyFreshCycle || 'The pool is empty; the next draw starts a fresh cycle.'}
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
