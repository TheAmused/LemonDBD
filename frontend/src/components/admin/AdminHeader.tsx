'use client';
// frontend/src/components/admin/AdminHeader.tsx

import React from 'react';
import { Crown, Database, RefreshCw, Download, Upload, LineChart } from 'lucide-react';

interface AdminHeaderProps {
  isSyncing: boolean;
  syncStatus: string;
  isLoading: boolean;
  onOpenDbMaintenance: (tab?: 'export' | 'import' | 'purge') => void;
  onTriggerSync: () => void;
  onRefreshData: () => void;
  dict?: any;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  isSyncing,
  syncStatus,
  isLoading,
  onOpenDbMaintenance,
  onTriggerSync,
  onRefreshData,
  dict,
}) => {
  const pgAdminUrl =
    (process.env.NEXT_PUBLIC_PGADMIN_URL && process.env.NEXT_PUBLIC_PGADMIN_URL.trim() !== '')
      ? process.env.NEXT_PUBLIC_PGADMIN_URL
      : typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:5050`
      : 'https://localhost:5050';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 w-full">
      <div className="flex items-center gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-600/20 border border-red-500/30 text-red-400 shadow-lg shadow-red-950/40">
          <Crown className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-wider text-slate-100 font-mono">
            {dict?.sidebar?.adminControlCenter || 'Admin Control Center'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {dict?.admin?.adminControlCenterSubtitle || 'User directory, JSON database export/import, and scraper orchestration.'}
          </p>
        </div>
      </div>


      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onOpenDbMaintenance('export')}
          title={dict?.admin?.exportBackupTitle || 'Export Database JSON Backup'}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer shadow-sm"
        >
          <Download className="h-3.5 w-3.5 text-blue-400" />
          <span className="hidden md:inline">{dict?.admin?.export || 'Export'}</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenDbMaintenance('import')}
          title={dict?.admin?.importBackupTitle || 'Restore Database JSON Backup'}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer shadow-sm"
        >
          <Upload className="h-3.5 w-3.5 text-emerald-400" />
          <span className="hidden md:inline">{dict?.admin?.import || 'Import'}</span>
        </button>

        <a
          href={pgAdminUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={dict?.admin?.pgAdminTitle || 'Open pgAdmin Web Management (PostgreSQL DB Manager)'}
          className="flex items-center justify-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-950/40 hover:bg-indigo-900/60 px-3.5 py-2 text-xs font-bold text-indigo-300 hover:text-white hover:border-indigo-400 transition-all cursor-pointer shadow-sm flex-1 sm:flex-initial"
        >
          <Database className="h-3.5 w-3.5 text-indigo-400" />
          <span>{dict?.admin?.pgAdmin || 'pgAdmin (DB)'}</span>
        </a>

        <button
          type="button"
          onClick={onTriggerSync}
          disabled={isSyncing}
          title={dict?.admin?.runScraperTitle || 'Execute Data Scraper and Database Seed'}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-red-950/30 transition-all cursor-pointer disabled:opacity-60 flex-1 sm:flex-initial"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? `Syncing (${syncStatus})` : 'Sync Scraper'}</span>
        </button>

        <button
          type="button"
          onClick={onRefreshData}
          title={dict?.admin?.refreshTitle || 'Refresh metrics'}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer shadow-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{dict?.admin?.refresh || 'Refresh'}</span>
        </button>

        {process.env.NEXT_PUBLIC_UMAMI_URL && (
          <a
            href={process.env.NEXT_PUBLIC_UMAMI_URL}
            target="_blank"
            rel="noopener noreferrer"
            title={dict?.admin?.analyticsTitle || 'Open the Umami analytics dashboard (page views, feature usage)'}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer shadow-sm"
          >
            <LineChart className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden md:inline">{dict?.admin?.analytics || 'Analytics'}</span>
          </a>
        )}
      </div>
    </div>
  );
};
