'use client';
// frontend/src/components/admin/AdminStatsGrid.tsx

import React from 'react';
import { Users, Crown, Layers, Sparkles, Database } from 'lucide-react';
import { AdminStats } from '@/types/admin';

interface AdminStatsGridProps {
  stats: AdminStats | null;
  dict?: any;
}

export const AdminStatsGrid: React.FC<AdminStatsGridProps> = ({ stats, dict }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 w-full">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-1">
          <Users className="h-4 w-4 text-cyan-400" />
          <span>{dict?.admin?.totalUsers || 'Total Users'}</span>
        </div>
        <p className="text-xl sm:text-2xl font-black text-slate-100 font-mono">
          {stats?.total_users ?? '-'}
        </p>
        <span className="text-[10px] text-slate-500">Active: {stats?.active_users ?? '-'}</span>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-1">
          <Crown className="h-4 w-4 text-rose-400" />
          <span>{dict?.admin?.admins || 'Admins'}</span>
        </div>
        <p className="text-xl sm:text-2xl font-black text-slate-100 font-mono">
          {stats?.admin_count ?? '-'}
        </p>
        <span className="text-[10px] text-slate-500">
          {dict?.admin?.privilegedAccounts || 'Privileged accounts'}
        </span>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-1">
          <Layers className="h-4 w-4 text-indigo-400" />
          <span>{dict?.admin?.characters || 'Characters'}</span>
        </div>
        <p className="text-xl sm:text-2xl font-black text-slate-100 font-mono">
          {stats?.total_characters ?? '98'}
        </p>
        <span className="text-[10px] text-slate-500">
          {stats?.survivors_count ?? 54} Surv / {stats?.killers_count ?? 44} Killer
        </span>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-1">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>{dict?.admin?.perks || 'Perks'}</span>
        </div>
        <p className="text-xl sm:text-2xl font-black text-slate-100 font-mono">
          {stats?.total_perks ?? '321'}
        </p>
        <span className="text-[10px] text-slate-500">
          {dict?.admin?.databaseTeachables || 'Database teachables'}
        </span>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl backdrop-blur-sm col-span-2 sm:col-span-1">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-1">
          <Database className="h-4 w-4 text-emerald-400" />
          <span>{dict?.admin?.database || 'Database'}</span>
        </div>
        <p className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
          {dict?.admin?.online || 'ONLINE'}
        </p>
        <span className="text-[10px] text-slate-500">
          {dict?.admin?.relationalStore || 'Relational Store'}
        </span>
      </div>
    </div>
  );
};
