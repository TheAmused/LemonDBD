'use client';
// frontend/src/components/generator/shared/RoleToggle.tsx
//
// Survivor/Killer picker as an actual toggle switch (a single track with a
// sliding amber thumb) instead of two separate pill buttons -- lives bare,
// directly over the stage, with no banner/background around it.

import React from 'react';

import type { RoleCategory } from '@/types/perks';

import { cn } from '@/utils/cn';
import { isKiller as isKillerRole } from '@/utils/characterUtils';
import { useDictionary } from "@/context/DictionaryContext";
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { CONTROL_H } from '@/components/perks/PerkSearchBox';

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
      size="fill"
      className={cn('shrink-0', CONTROL_H, className)}
      options={[
        { value: 'Survivor', label: dict.generator.survivor, activeClassName: 'bg-accent-green text-text-inverted' },
        { value: 'Killer', label: dict.generator.killer, activeClassName: 'bg-accent-red text-text-inverted' },
      ]}
    />
  );
};
