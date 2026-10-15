'use client';
// frontend/src/components/generator/shared/RoleToggle.tsx
//
// Survivor/Killer picker as an actual toggle switch (a single track with a
// sliding amber thumb) instead of two separate pill buttons -- lives bare,
// directly over the stage, with no banner/background around it.

import React from 'react';

import { RoleCategory } from '@/types/perks';
import { Dictionary } from '@/locales/types';
import { cn } from '@/utils/cn';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';
import { isKiller as isKillerRole } from '@/utils/characterUtils';
import { useDictionary } from "@/context/DictionaryContext";
import { SegmentedControl } from '@/components/common/SegmentedControl';

export interface RoleToggleProps {
  role: RoleCategory;
  onChange: (role: RoleCategory) => void;
  className?: string;
}

export const RoleToggle: React.FC<RoleToggleProps> = ({ role, onChange, className }) => {
  const dict = useDictionary();
  const isKiller = isKillerRole(role);

  return (
    <SegmentedControl<'Survivor' | 'Killer'>
      ariaLabel={dict.generator.selectRole}
      value={isKiller ? 'Killer' : 'Survivor'}
      onChange={onChange}
      className={cn('shrink-0', className)}
      options={[
        { value: 'Survivor', label: dict.generator.survivor, icon: <SurvivorIcon className="h-4 w-4 shrink-0" />, activeClassName: 'bg-accent-green text-text-inverted' },
        { value: 'Killer', label: dict.generator.killer, icon: <KillerIcon className="h-4 w-4 shrink-0" />, activeClassName: 'bg-accent-red text-text-inverted' },
      ]}
    />
  );
};
