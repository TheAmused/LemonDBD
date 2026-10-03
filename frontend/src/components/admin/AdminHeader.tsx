'use client';
// frontend/src/components/admin/AdminHeader.tsx

import React from 'react';
import { Button } from '@/components/common/Button';
import type { Dictionary } from '@/locales/types';
import { Database, RefreshCw, Download, Upload, LineChart, ScanText } from 'lucide-react';
import { OverseerEyeIcon } from '@/components/icons/DbdIcons';

import { tip } from '@/components/common/Tooltip';
import { useDictionary } from "@/context/DictionaryContext";

interface AdminHeaderProps {
  isLoading: boolean;
  onOpenDbMaintenance: (tab?: 'export' | 'import' | 'purge') => void;
  onRefreshData: () => void;
  onOpenOcrCheck: () => void;
  // Legacy scraper props preserved for backward compatibility
  isSyncing?: boolean;
  syncStatus?: string;
  onTriggerSync?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ isLoading, onOpenDbMaintenance, onRefreshData, onOpenOcrCheck }) => {
  const dict = useDictionary();
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
          <OverseerEyeIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-wider text-text-primary">
            {dict.sidebar.adminControlCenter}
          </h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          onClick={() => onOpenDbMaintenance('export')}
          {...tip(dict.admin.exportBackupTitle, undefined, 'action')} aria-label={dict.admin.exportBackupTitle}
          leftIcon={<Download className="h-3.5 w-3.5 text-text-secondary" />}
        >
          <span className="hidden md:inline">{dict.admin.export}</span>
        </Button>

        <Button
          size="sm"
          onClick={() => onOpenDbMaintenance('import')}
          {...tip(dict.admin.importBackupTitle, undefined, 'action')} aria-label={dict.admin.importBackupTitle}
          leftIcon={<Upload className="h-3.5 w-3.5 text-text-secondary" />}
        >
          <span className="hidden md:inline">{dict.admin.import}</span>
        </Button>

        <Button
          size="sm"
          onClick={onOpenOcrCheck}
          {...tip(dict.admin.ocrCheck, undefined, 'action')} aria-label={dict.admin.ocrCheck}
          leftIcon={<ScanText className="h-3.5 w-3.5 text-text-secondary" />}
        >
          <span className="hidden md:inline">{dict.admin.ocrCheck}</span>
        </Button>

        <a
          href={pgAdminUrl}
          target="_blank"
          rel="noopener noreferrer"
          {...tip(dict.admin.pgAdminTitle, undefined, 'action')} aria-label={dict.admin.pgAdminTitle}
          className="flex items-center justify-center gap-2 rounded-xl border border-border-color bg-bg-surface hover:bg-bg-elevated text-text-primary px-3.5 py-2 type-strong transition-all cursor-pointer shadow-xs flex-1 sm:flex-initial"
        >
          <Database className="h-3.5 w-3.5 text-text-secondary" />
          <span>{dict.admin.pgAdmin}</span>
        </a>

        <Button
          size="sm"
          onClick={onRefreshData}
          {...tip(dict.admin.refreshTitle, undefined, 'action')} aria-label={dict.admin.refreshTitle}
          leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
        >
          <span className="hidden sm:inline">{dict.admin.refresh}</span>
        </Button>

        {umamiUrl && (
          <a
            href={umamiUrl}
            target="_blank"
            rel="noopener noreferrer"
            {...tip(dict.admin.analyticsTitle, undefined, 'action')} aria-label={dict.admin.analyticsTitle}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border-color bg-bg-surface hover:bg-bg-elevated text-text-primary px-3 py-2 type-strong transition-colors cursor-pointer shadow-xs"
          >
            <LineChart className="h-3.5 w-3.5 text-text-secondary" />
            <span className="hidden md:inline">{dict.admin.analytics}</span>
          </a>
        )}
      </div>
    </div>
  );
};

