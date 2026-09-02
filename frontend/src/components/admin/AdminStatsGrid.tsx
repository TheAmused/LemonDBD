'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/admin/AdminStatsGrid.tsx

import React from 'react';
import { Users, Crown, Layers, Sparkles, Database } from 'lucide-react';
import { AdminStats } from '@/types/admin';

interface AdminStatsGridProps {
  stats: AdminStats | null;
  dict?: Dictionary;
}

export const AdminStatsGrid: React.FC<AdminStatsGridProps> = ({ stats, dict }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 w-full">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-4 shadow-sm dark:shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-1">
          <Users className="h-4 w-4 text-cyan-500 dark:text-cyan-400" />
          <span>{dict?.admin?.totalUsers || 'Total Users'}</span>
        </div>
        <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
          {stats?.total_users ?? '-'}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-4 shadow-sm dark:shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-1">
          <Crown className="h-4 w-4 text-rose-500 dark:text-rose-400" />
          <span>{dict?.admin?.admins || 'Admins'}</span>
        </div>
        <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
          {stats?.admin_count ?? '-'}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-4 shadow-sm dark:shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-1">
          <Layers className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
          <span>{dict?.admin?.characters || 'Characters'}</span>
        </div>
        <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
          {stats?.total_characters ?? '98'}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-4 shadow-sm dark:shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-1">
          <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400" />
          <span>{dict?.admin?.perks || 'Perks'}</span>
        </div>
        <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
          {stats?.total_perks ?? '321'}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 p-4 shadow-sm dark:shadow-xl backdrop-blur-sm col-span-2 sm:col-span-1">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-1">
          <Database className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          <span>{dict?.admin?.database || 'Database'}</span>
        </div>
        <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
          {dict?.admin?.online || 'ONLINE'}
        </p>
      </div>
    </div>
  );
};
