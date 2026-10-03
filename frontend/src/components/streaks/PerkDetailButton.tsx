'use client';
// frontend/src/components/streaks/PerkDetailButton.tsx
//
// Wraps a challenge perk in the same hover tooltip and click-through modal the perks page uses.

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import type { Perk as ChallengePerk } from '@/types/gauntletStreak';
import type { Perk } from '@/types/perks';
import { tip } from '@/components/common/Tooltip';
import { usePerkLabel } from '@/context/DisplayNamesContext';

const PerkModal = dynamic(() => import('@/components/PerkModal').then((m) => m.PerkModal), { ssr: false });

/** A challenge perk in the shape the shared perk modal expects, with localized name and description. */
function toModalPerk(perk: ChallengePerk, label: { name: string; description?: string } | undefined): Perk {
  return {
    id: perk.id,
    name: label?.name ?? perk.name,
    alternate_name: perk.alternate_name,
    is_generic_counterpart: perk.is_generic_counterpart,
    character: perk.character ?? 'General',
    category: perk.category ?? perk.role ?? 'Survivor',
    description: label?.description ?? perk.description ?? '',
    icon_url: perk.icon_url ?? '',
    icon_local_path: perk.icon_local_path ?? '',
  };
}

interface PerkDetailButtonProps {
  perk: ChallengePerk;
  className?: string;
  children: React.ReactNode;
}

export const PerkDetailButton: React.FC<PerkDetailButtonProps> = ({ perk, className, children }) => {
  const perkLabel = usePerkLabel();
  const [open, setOpen] = useState(false);
  const modalPerk = toModalPerk(perk, perkLabel(perk));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        {...tip(modalPerk.name, undefined, 'item')}
        aria-label={modalPerk.name}
        className={`cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red ${className ?? ''}`}
      >
        {children}
      </button>
      {open && <PerkModal perk={modalPerk} onClose={() => setOpen(false)} />}
    </>
  );
};
