'use client';
// frontend/src/components/streaks/RoleTabs.tsx
import type { Dictionary } from '@/locales/types';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Puzzle } from 'lucide-react';
import { KillerIcon, SurvivorIcon } from '@/components/icons/DbdIcons';
import { saveStreakRole, type StreakRole } from '@/utils/streakDifficultyPrefs';

interface RoleTabsProps {
  locale: string;
  dict?: Dictionary;
}


const ROLE_IDS: readonly StreakRole[] = ['survivor', 'killer', 'challenge'];

interface RoleTabOption {
  value: StreakRole;
  href: string;
  icon: React.ReactNode;
  label: string;
  activeClassName: string;
}

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

  const options: readonly RoleTabOption[] = [
    {
      value: 'survivor',
      href: `/${locale}/streaks/survivor`,
      icon: <SurvivorIcon className="h-3.5 w-3.5" />,
      label: survivorLabel,
      activeClassName: 'bg-accent-green border-accent-green text-text-inverted',
    },
    {
      value: 'killer',
      href: `/${locale}/streaks/killer`,
      icon: <KillerIcon className="h-3.5 w-3.5" />,
      label: killerLabel,
      activeClassName: 'bg-accent-red border-accent-red text-text-inverted',
    },
    {
      value: 'challenge',
      href: `/${locale}/streaks/challenge`,
      icon: <Puzzle className="h-3.5 w-3.5" />,
      label: `${survivorLabel}/${killerLabel}`,
      activeClassName: 'bg-accent-amber border-accent-amber text-text-inverted',
    },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={dict?.streaks?.streakRoleTabs || 'Streak Role Tabs'}
      className="flex flex-wrap items-center gap-2"
    >
      {options.map((opt) => {
        const isActive = opt.value === activeRole;
        return (
          <Link
            key={opt.value}
            href={opt.href}
            role="radio"
            aria-checked={isActive}
            aria-current={isActive ? 'page' : undefined}
            className={`flex items-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-xl border px-3 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-xs font-black shadow-sm transition-colors cursor-pointer ${
              isActive
                ? opt.activeClassName
                : 'border-border-color bg-bg-elevated text-text-secondary hover:text-text-primary hover:border-text-secondary'
            }`}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </Link>
        );
      })}
    </div>
  );
};
