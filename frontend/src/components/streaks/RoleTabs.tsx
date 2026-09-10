'use client';
// frontend/src/components/streaks/RoleTabs.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Shield, Skull, Puzzle } from 'lucide-react';
import { ToggleSwitch, ToggleSwitchOption } from '@/components/common/ToggleSwitch';

interface RoleTabsProps {
  locale: string;
  dict?: Dictionary;
}

type StreakRole = 'survivor' | 'killer' | 'challenge';

const ROLE_IDS: readonly StreakRole[] = ['survivor', 'killer', 'challenge'];

const noop = () => {};

export const RoleTabs: React.FC<RoleTabsProps> = ({ locale, dict }) => {
  const pathname = usePathname();

  const activeRole: StreakRole =
    ROLE_IDS.find((id) => pathname?.startsWith(`/${locale}/streaks/${id}`)) ?? 'survivor';

  const survivorLabel = dict?.characterDetail?.roleSurvivor || 'Survivor';
  const killerLabel = dict?.characterDetail?.roleKiller || 'Killer';

  const options: readonly ToggleSwitchOption<StreakRole>[] = [
    {
      value: 'survivor',
      href: `/${locale}/streaks/survivor`,
      icon: <Shield className="h-3.5 w-3.5" />,
      label: survivorLabel,
      activeClassName: 'bg-emerald-600 text-text-inverted',
    },
    {
      value: 'killer',
      href: `/${locale}/streaks/killer`,
      icon: <Skull className="h-3.5 w-3.5" />,
      label: killerLabel,
      activeClassName: 'bg-rose-600 text-text-inverted',
    },
    {
      value: 'challenge',
      href: `/${locale}/streaks/challenge`,
      icon: <Puzzle className="h-3.5 w-3.5" />,
      label: `${survivorLabel}/${killerLabel}`,
      activeClassName: 'bg-cyan-600 text-text-inverted',
    },
  ];

  return (
    <ToggleSwitch
      ariaLabel={dict?.streaks?.streakRoleTabs || 'Streak Role Tabs'}
      value={activeRole}
      onChange={noop}
      options={options}
    />
  );
};
