'use client';
// frontend/src/components/admin/AdminStatsGrid.tsx

import React from 'react';
import type { Dictionary } from '@/locales/types';
import { Users, Crown, Layers, Sparkles, Database } from 'lucide-react';
import { AdminStats } from '@/types/admin';

interface AdminStatsGridProps {
  stats: AdminStats | null;
  dict?: Dictionary;
}

export const AdminStatsGrid: React.FC<AdminStatsGridProps> = ({ stats, dict }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 w-full">
      <div className="rounded-2xl border border-border-color bg-bg-surface p-4 shadow-xs backdrop-blur-sm transition-colors duration-200">
        <div className="flex items-center gap-2 text-text-secondary text-xs font-bold uppercase mb-1">
          <Users className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          <span>{dict?.admin?.totalUsers || 'Total Users'}</span>
        </div>
        <p className="text-xl sm:text-2xl font-black text-text-primary font-mono">
          {stats?.total_users ?? '-'}
        </p>
      </div>

      <div className="rounded-2xl border border-border-color bg-bg-surface p-4 shadow-xs backdrop-blur-sm transition-colors duration-200">
        <div className="flex items-center gap-2 text-text-secondary text-xs font-bold uppercase mb-1">
          <Crown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          <span>{dict?.admin?.admins || 'Admins'}</span>
        </div>
        <p className="text-xl sm:text-2xl font-black text-text-primary font-mono">
          {stats?.admin_count ?? '-'}
        </p>
      </div>

      <div className="rounded-2xl border border-border-color bg-bg-surface p-4 shadow-xs backdrop-blur-sm transition-colors duration-200">
        <div className="flex items-center gap-2 text-text-secondary text-xs font-bold uppercase mb-1">
          <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span>{dict?.admin?.characters || 'Characters'}</span>
        </div>
        <p className="text-xl sm:text-2xl font-black text-text-primary font-mono">
          {stats?.total_characters ?? '0'}
        </p>
      </div>

      <div className="rounded-2xl border border-border-color bg-bg-surface p-4 shadow-xs backdrop-blur-sm transition-colors duration-200">
        <div className="flex items-center gap-2 text-text-secondary text-xs font-bold uppercase mb-1">
          <Sparkles className="h-4 w-4 text-accent-amber" />
          <span>{dict?.admin?.perks || 'Perks'}</span>
        </div>
        <p className="text-xl sm:text-2xl font-black text-text-primary font-mono">
          {stats?.total_perks ?? '0'}
        </p>
      </div>

      <div className="rounded-2xl border border-border-color bg-bg-surface p-4 shadow-xs backdrop-blur-sm col-span-2 sm:col-span-1 transition-colors duration-200">
        <div className="flex items-center gap-2 text-text-secondary text-xs font-bold uppercase mb-1">
          <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>{dict?.admin?.database || 'Database'}</span>
        </div>
        <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
          {dict?.admin?.online || 'ONLINE'}
        </p>
      </div>
    </div>
  );
};

