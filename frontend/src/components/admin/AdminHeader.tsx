'use client';
// frontend/src/components/admin/AdminHeader.tsx

import React from 'react';
import { Crown, Database, RefreshCw } from 'lucide-react';

interface AdminHeaderProps {
  isSyncing: boolean;
  syncStatus: string;
  isLoading: boolean;
  onOpenDbMaintenance: () => void;
  onTriggerSync: () => void;
  onRefreshData: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  isSyncing,
  syncStatus,
  isLoading,
  onOpenDbMaintenance,
  onTriggerSync,
  onRefreshData,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 w-full">
      <div className="flex items-center gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-600/20 border border-red-500/30 text-red-400 shadow-lg shadow-red-950/40">
          <Crown className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-wider text-slate-100 font-mono">
            Admin Control Center
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            User directory, Discord bug report dispatch, and database scraper orchestration.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenDbMaintenance}
          title="Database Maintenance & Purge Controls"
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer shadow-sm flex-1 sm:flex-initial"
        >
          <Database className="h-3.5 w-3.5 text-slate-400" />
          <span>DB Maintenance</span>
        </button>

        <button
          type="button"
          onClick={onTriggerSync}
          disabled={isSyncing}
          title="Execute Data Scraper and Database Seed"
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-red-950/30 transition-all cursor-pointer disabled:opacity-60 flex-1 sm:flex-initial"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? `Syncing (${syncStatus})` : 'Sync Database Scraper'}</span>
        </button>

        <button
          type="button"
          onClick={onRefreshData}
          title="Refresh metrics"
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer shadow-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </div>
  );
};

