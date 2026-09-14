'use client';
// frontend/src/components/admin/AdminHeader.tsx

import React from 'react';
import type { Dictionary } from '@/locales/types';
import { Crown, Database, RefreshCw, Download, Upload, LineChart } from 'lucide-react';

interface AdminHeaderProps {
  isLoading: boolean;
  onOpenDbMaintenance: (tab?: 'export' | 'import' | 'purge') => void;
  onRefreshData: () => void;
  dict?: Dictionary;
  // Legacy scraper props preserved for backward compatibility
  isSyncing?: boolean;
  syncStatus?: string;
  onTriggerSync?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  isLoading,
  onOpenDbMaintenance,
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
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-red/15 border border-accent-red/30 text-accent-red shadow-xs">
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
          <Download className="h-3.5 w-3.5 text-text-secondary" />
          <span className="hidden md:inline">{dict?.admin?.export || 'Export'}</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenDbMaintenance('import')}
          title={dict?.admin?.importBackupTitle || 'Import Database Backup'}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-border-color bg-bg-surface hover:bg-bg-elevated text-text-primary px-3 py-2 text-xs font-bold transition-colors cursor-pointer shadow-xs"
        >
          <Upload className="h-3.5 w-3.5 text-text-secondary" />
          <span className="hidden md:inline">{dict?.admin?.import || 'Import'}</span>
        </button>

        <a
          href={pgAdminUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={dict?.admin?.pgAdminTitle || 'pgAdmin Database Manager'}
          className="flex items-center justify-center gap-2 rounded-xl border border-border-color bg-bg-surface hover:bg-bg-elevated text-text-primary px-3.5 py-2 text-xs font-bold transition-all cursor-pointer shadow-xs flex-1 sm:flex-initial"
        >
          <Database className="h-3.5 w-3.5 text-text-secondary" />
          <span>{dict?.admin?.pgAdmin || 'pgAdmin (DB)'}</span>
        </a>

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
            <LineChart className="h-3.5 w-3.5 text-text-secondary" />
            <span className="hidden md:inline">{dict?.admin?.analytics || 'Analytics'}</span>
          </a>
        )}
      </div>
    </div>
  );
};

