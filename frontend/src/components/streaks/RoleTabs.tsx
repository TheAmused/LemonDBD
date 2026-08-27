// frontend/src/components/streaks/RoleTabs.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Skull, Puzzle } from 'lucide-react';

interface RoleTabsProps {
  locale: string;
  dict?: any;
}

export const RoleTabs: React.FC<RoleTabsProps> = ({ locale, dict }) => {
  const pathname = usePathname();

  const tabs = [
    {
      id: 'survivor',
      label: dict?.filters?.survivor || 'Survivor',
      icon: Shield,
      active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 shadow-sm',
      hover: 'hover:border-emerald-500/50 hover:text-emerald-700 dark:hover:text-emerald-400',
      ring: 'focus:ring-emerald-500',
    },
    {
      id: 'killer',
      label: dict?.filters?.killer || 'Killer',
      icon: Skull,
      active: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/40 shadow-sm',
      hover: 'hover:border-rose-500/50 hover:text-rose-700 dark:hover:text-rose-400',
      ring: 'focus:ring-rose-500',
    },
    {
      id: 'challenge',
      label: `${dict?.filters?.survivor || 'Survivor'}/${dict?.filters?.killer || 'Killer'}`,
      icon: Puzzle,
      active: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/40 shadow-sm',
      hover: 'hover:border-cyan-500/50 hover:text-cyan-700 dark:hover:text-cyan-400',
      ring: 'focus:ring-cyan-500',
    },
  ];

  return (
    <nav aria-label={dict?.streaks?.streakRoleTabs || 'Streak Role Tabs'} className="flex items-center gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname?.startsWith(`/${locale}/streaks/${tab.id}`) ?? false;

        return (
          <Link
            key={tab.id}
            href={`/${locale}/streaks/${tab.id}`}
            aria-current={isActive ? 'page' : undefined}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-all focus:outline-none focus:ring-2 ${tab.ring} ${
              isActive
                ? tab.active
                : `border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:bg-slate-900/80 shadow-sm ${tab.hover}`
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
