'use client';
// frontend/src/components/streaks/RoleTabs.tsx
import type { Dictionary } from '@/locales/types';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Puzzle } from 'lucide-react';
import { ToggleSwitch, ToggleSwitchOption } from '@/components/common/ToggleSwitch';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';

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
      icon: <SurvivorIcon className="h-3.5 w-3.5" />,
      label: survivorLabel,
      activeClassName: 'bg-accent-green text-text-inverted',
    },
    {
      value: 'killer',
      href: `/${locale}/streaks/killer`,
      icon: <KillerIcon className="h-3.5 w-3.5" />,
      label: killerLabel,
      activeClassName: 'bg-accent-red text-text-inverted',
    },
    {
      value: 'challenge',
      href: `/${locale}/streaks/challenge`,
      icon: <Puzzle className="h-3.5 w-3.5" />,
      label: `${survivorLabel}/${killerLabel}`,
      activeClassName: 'bg-bg-elevated border border-border-color text-text-primary',
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
