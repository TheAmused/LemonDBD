'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Skull } from 'lucide-react';

interface RoleTabsProps {
  locale: string;
}

const TABS = [
  { id: 'survivor', label: 'Survivor', icon: Shield, active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  { id: 'killer', label: 'Killer', icon: Skull, active: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
];

export const RoleTabs: React.FC<RoleTabsProps> = ({ locale }) => {
  const pathname = usePathname();

  return (
    <nav aria-label="Streak Role Tabs" className="flex items-center gap-2">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname?.startsWith(`/${locale}/streaks/${tab.id}`) ?? false;

        return (
          <Link
            key={tab.id}
            href={`/${locale}/streaks/${tab.id}`}
            aria-current={isActive ? 'page' : undefined}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 ${
              isActive
                ? tab.active
                : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900/60 hover:text-slate-200'
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
