// frontend/src/components/scraper-config/useExportTab.ts
import { useState } from 'react';
import { useDictionary } from '@/context/DictionaryContext';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { authHeaders, getAuthToken, getErrorMessage } from '@/utils/api';
import { ALL_TARGETS, type TargetItem } from './scraperTargets';

/** Which tables to export, and the download of the resulting JSON snapshot. */
export function useExportTab() {
  const dict = useDictionary();
  const apiBase = getBackendBaseUrl();
  const [exportTargets, setExportTargets] = useState<string[]>(ALL_TARGETS.map((t) => t.id));
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const toggleExportTarget = (id: string) => {
    setExportTargets((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const toggleAllExport = () => {
    if (exportTargets.length === ALL_TARGETS.length) {
      setExportTargets([]);
    } else {
      setExportTargets(ALL_TARGETS.map((t) => t.id));
    }
  };

  const toggleGroupExport = (groupKey: TargetItem['category']) => {
    const groupTargetIds = ALL_TARGETS.filter((t) => t.category === groupKey).map((t) => t.id);
    const allSelected = groupTargetIds.every((id) => exportTargets.includes(id));
    if (allSelected) {
      setExportTargets((prev) => prev.filter((id) => !groupTargetIds.includes(id)));
    } else {
      setExportTargets((prev) => Array.from(new Set([...prev, ...groupTargetIds])));
    }
  };

  const handleExecuteExport = async () => {
    if (exportTargets.length === 0) {
      setExportError(dict.admin.tokenNotFound);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setExportError(dict.admin.tokenNotFound);
      return;
    }

    setIsExporting(true);
    setExportError(null);
    setExportSuccess(null);

    try {
      const query = new URLSearchParams({
        targets: exportTargets.join(','),
      });

      const res = await fetch(`${apiBase}/api/v1/admin/database/export?${query.toString()}`, {
        headers: {
          ...authHeaders(token),
          'Cache-Control': 'no-cache',
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Export failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

      const link = document.createElement('a');
      link.href = url;
      link.download = `lemondbd_backup_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess(`Successfully exported ${exportTargets.length} categories.`);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, dict.admin.networkError);
      setExportError(msg);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportTargets,
    isExporting,
    exportError,
    exportSuccess,
    toggleExportTarget,
    toggleAllExport,
    toggleGroupExport,
    handleExecuteExport,
  };
}
