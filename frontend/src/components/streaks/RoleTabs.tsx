'use client';
// frontend/src/components/streaks/RoleTabs.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Puzzle } from 'lucide-react';
import { SegmentedControl, SegmentedControlOption } from '@/components/common/SegmentedControl';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';
import { saveStreakRole, type StreakRole } from '@/utils/streakDifficultyPrefs';

interface RoleTabsProps {
  locale: string;
  dict?: Dictionary;
}

const ROLE_IDS: readonly StreakRole[] = ['survivor', 'killer', 'challenge'];

const noop = () => {};

export const RoleTabs: React.FC<RoleTabsProps> = ({ locale, dict }) => {
  const pathname = usePathname();

  const matchedRole = ROLE_IDS.find((id) => pathname?.startsWith(`/${locale}/streaks/${id}`));
  const activeRole: StreakRole = matchedRole ?? 'survivor';

  // Remembered so the bare /streaks entry reopens the tab last used.
  useEffect(() => {
    if (matchedRole) saveStreakRole(matchedRole);
  }, [matchedRole]);

  const survivorLabel = dict?.characterDetail?.roleSurvivor || 'Survivor';
  const killerLabel = dict?.characterDetail?.roleKiller || 'Killer';

  const options: readonly SegmentedControlOption<StreakRole>[] = [
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
      activeClassName: 'bg-accent-amber text-text-inverted',
    },
  ];

  return (
    <SegmentedControl
      ariaLabel={dict?.streaks?.streakRoleTabs || 'Streak Role Tabs'}
      value={activeRole}
      onChange={noop}
      options={options}
    />
  );
};
