'use client';
// frontend/src/components/admin/AdminHeader.tsx

import React from 'react';
import type { Dictionary } from '@/locales/types';
import { Crown, Database, RefreshCw, Download, Upload, LineChart } from 'lucide-react';

interface AdminHeaderProps {
  isSyncing: boolean;
  syncStatus: string;
  isLoading: boolean;
  onOpenDbMaintenance: (tab?: 'export' | 'import' | 'purge') => void;
  onTriggerSync: () => void;
  onRefreshData: () => void;
  dict?: Dictionary;
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
    process.env.NEXT_PUBLIC_PGADMIN_URL && process.env.NEXT_PUBLIC_PGADMIN_URL.trim() !== ''
      ? process.env.NEXT_PUBLIC_PGADMIN_URL
      : typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:5050`
      : 'https://localhost:5050';

  const umamiUrl =
    process.env.NEXT_PUBLIC_UMAMI_URL && process.env.NEXT_PUBLIC_UMAMI_URL.trim() !== ''
      ? process.env.NEXT_PUBLIC_UMAMI_URL.replace(/\/+$/, '')
      : typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:8117`
      : 'https://localhost:8117';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-color pb-6 w-full">
      <div className="flex items-center gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-red/15 border border-accent-red/30 text-accent-red shadow-lg shadow-accent-red/20">
          <Crown className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-wider text-text-primary font-mono">
            {dict?.sidebar?.adminControlCenter || dict?.admin?.title || 'Admin Control Center'}
          </h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onOpenDbMaintenance('export')}
          title={dict?.admin?.exportBackupTitle || 'Export Database Backup'}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-border-color bg-bg-surface hover:bg-bg-elevated text-text-primary px-3 py-2 text-xs font-bold transition-colors cursor-pointer shadow-xs"
        >
          <Download className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span className="hidden md:inline">{dict?.admin?.export || 'Export'}</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenDbMaintenance('import')}
          title={dict?.admin?.importBackupTitle || 'Import Database Backup'}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-border-color bg-bg-surface hover:bg-bg-elevated text-text-primary px-3 py-2 text-xs font-bold transition-colors cursor-pointer shadow-xs"
        >
          <Upload className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden md:inline">{dict?.admin?.import || 'Import'}</span>
        </button>

        <a
          href={pgAdminUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={dict?.admin?.pgAdminTitle || 'pgAdmin Database Manager'}
          className="flex items-center justify-center gap-2 rounded-xl border border-indigo-300 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 px-3.5 py-2 text-xs font-bold transition-all cursor-pointer shadow-xs flex-1 sm:flex-initial"
        >
          <Database className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>{dict?.admin?.pgAdmin || 'pgAdmin (DB)'}</span>
        </a>

        <button
          type="button"
          onClick={onTriggerSync}
          disabled={isSyncing}
          title={dict?.admin?.runScraperTitle || 'Sync Database'}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-red to-red-700 hover:from-red-500 hover:to-accent-red px-4 py-2 text-xs font-bold text-text-inverted shadow-md shadow-accent-red/20 transition-all cursor-pointer disabled:opacity-60 flex-1 sm:flex-initial"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>
            {isSyncing
              ? (dict?.admin?.syncingStatus || 'Syncing ({status})').replace('{status}', syncStatus)
              : dict?.admin?.syncScraper || 'Sync Scraper'}
          </span>
        </button>

        <button
          type="button"
          onClick={onRefreshData}
          title={dict?.admin?.refreshTitle || 'Refresh Data'}
          className="flex items-center justify-center gap-2 rounded-xl border border-border-color bg-bg-surface hover:bg-bg-elevated text-text-primary px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer shadow-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{dict?.admin?.refresh || 'Refresh'}</span>
        </button>

        {umamiUrl && (
          <a
            href={umamiUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={dict?.admin?.analyticsTitle || 'Analytics'}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border-color bg-bg-surface hover:bg-bg-elevated text-text-primary px-3 py-2 text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <LineChart className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="hidden md:inline">{dict?.admin?.analytics || 'Analytics'}</span>
          </a>
        )}
      </div>
    </div>
  );
};

