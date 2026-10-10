'use client';
// frontend/src/components/scraper-config/ExportTab.tsx
import React from 'react';
import { CheckSquare, Download, Square } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useDictionary } from '@/context/DictionaryContext';
import { StatusBanner } from './StatusBanner';
import { TargetPicker } from './TargetPicker';
import type { useExportTab } from './useExportTab';

export function ExportTab({ tab }: { tab: ReturnType<typeof useExportTab> }) {
  const dict = useDictionary();
  const {
    exportTargets,
    isExporting,
    exportError,
    exportSuccess,
    toggleExportTarget,
    toggleAllExport,
    toggleGroupExport,
    handleExecuteExport,
  } = tab;

  return (
    <div className="space-y-4">
      {exportError && <StatusBanner tone="error" message={exportError} />}
      {exportSuccess && <StatusBanner tone="success" message={exportSuccess} />}

      <TargetPicker
        heading={dict.admin.selectBackupEntities}
        selected={exportTargets}
        SelectedIcon={CheckSquare}
        UnselectedIcon={Square}
        onToggleAll={toggleAllExport}
        onToggleGroup={toggleGroupExport}
        onToggleTarget={toggleExportTarget}
      />

      <div className="flex items-center justify-end pt-3">
        <Button
          variant="primary"
          size="sm"
          onClick={handleExecuteExport}
          loading={isExporting}
          disabled={exportTargets.length === 0}
          leftIcon={<Download className="h-3.5 w-3.5" />}
        >
          <span>
            {isExporting ? dict.admin.exportingStatus : dict.admin.downloadBackup} ({exportTargets.length})
          </span>
        </Button>
      </div>
    </div>
  );
}
