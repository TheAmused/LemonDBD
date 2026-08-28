'use client';
import type { Dictionary } from '@/locales/types';
// frontend/src/components/ScraperConfigModal.tsx

import React, { useState, useRef } from 'react';
import {
  X,
  Trash2,
  Database,
  AlertTriangle,
  RefreshCw,
  CheckSquare,
  Square,
  Download,
  Upload,
  FileJson,
  CheckCircle2,
  Layers,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { ConfirmModal } from '@/components/ConfirmModal';

interface ScraperConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurgeSuccess?: () => void;
  initialTab?: 'export' | 'import' | 'purge';
  dict?: Dictionary;
}

interface TargetItem {
  id: string;
  label: string;
  desc: string;
  category: 'content' | 'users' | 'community' | 'settings';
}

const ALL_TARGETS: readonly TargetItem[] = [
  { id: 'characters', label: 'Characters', desc: 'Survivors, Killers, powers, stats and portraits', category: 'content' },
  { id: 'perks', label: 'Perks', desc: 'Survivor and Killer teachable & general perks', category: 'content' },
  { id: 'items', label: 'Items & Equipment', desc: 'Survivor items and tools', category: 'content' },
  { id: 'addons', label: 'Add-ons', desc: 'Killer power and survivor item add-ons', category: 'content' },
  { id: 'maps', label: 'Maps & Callouts', desc: 'Map realms, tiles, and objective landmarks', category: 'content' },
  { id: 'users', label: 'User Accounts', desc: 'Registered user profiles and roles', category: 'users' },
  { id: 'ownerships', label: 'User Ownership Records', desc: 'Unlocked perks, character prestige and favorites', category: 'users' },
  { id: 'community_builds', label: 'Community Builds', desc: 'User-created builds and upvotes', category: 'community' },
  { id: 'custom_perks', label: 'Custom Perks', desc: 'Community-designed custom perks', category: 'community' },
  { id: 'daily_quests', label: 'Daily Quests', desc: 'Daily challenges and completion states', category: 'community' },
  { id: 'bug_reports', label: 'Bug Reports', desc: 'Submitted bug reports and admin notes', category: 'community' },
  { id: 'generator_settings', label: 'Generator Settings', desc: 'Perk generator defaults and timers', category: 'settings' },
  { id: 'guesser_stats', label: 'Guesser Stats', desc: 'Streaks and guesser game records', category: 'settings' },
];

const TARGET_KEY_MAP: Record<string, string> = {
  characters: 'Characters',
  perks: 'Perks',
  items: 'Items',
  addons: 'Addons',
  maps: 'Maps',
  users: 'Users',
  ownerships: 'Ownerships',
  community_builds: 'CommunityBuilds',
  custom_perks: 'CustomPerks',
  daily_quests: 'DailyQuests',
  bug_reports: 'BugReports',
  generator_settings: 'GeneratorSettings',
  guesser_stats: 'GuesserStats',
};

export function ScraperConfigModal({
  isOpen,
  onClose,
  onPurgeSuccess,
  initialTab = 'export',
  dict,
}: ScraperConfigModalProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'purge'>(initialTab);

  const localizedTargets = React.useMemo(() => {
    const adminDict = (dict?.admin || {}) as Record<string, string>;
    return ALL_TARGETS.map((target) => {
      const pascal = TARGET_KEY_MAP[target.id];
      return {
        ...target,
        label: adminDict[`target${pascal}Label`] || target.label,
        desc: adminDict[`target${pascal}Desc`] || target.desc,
      };
    });
  }, [dict]);

  // Export State
  const [exportTargets, setExportTargets] = useState<string[]>(ALL_TARGETS.map((t) => t.id));
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<Record<string, { created: number; updated: number }> | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Purge State
  const [purgeTargets, setPurgeTargets] = useState<string[]>([]);
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);
  const [purgeSuccess, setPurgeSuccess] = useState<string | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState<boolean>(false);

  const apiBase = getBackendBaseUrl();

  if (!isOpen) return null;

  // Toggle Selection Helpers
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

  const togglePurgeTarget = (id: string) => {
    setPurgeTargets((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const toggleAllPurge = () => {
    if (purgeTargets.length === ALL_TARGETS.length) {
      setPurgeTargets([]);
    } else {
      setPurgeTargets(ALL_TARGETS.map((t) => t.id));
    }
  };

  // 1. Export Action
  const handleExecuteExport = async () => {
    if (exportTargets.length === 0) {
      setExportError('Please select at least one entity target to export.');
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('lemondbd_token') : null;
    if (!token) {
      setExportError('Unauthorized: Administrator token missing.');
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
          Authorization: `Bearer ${token}`,
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

      setExportSuccess(`Successfully exported ${exportTargets.length} categories to JSON backup.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error executing database export.';
      setExportError(msg);
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Import File Handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportError(null);
      setImportSuccess(null);
      setImportSummary(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        try {
          JSON.parse(text);
          setImportJsonText(text);
        } catch (jsonErr: any) {
          setImportError(`Uploaded file is not valid JSON: ${jsonErr.message}`);
          setImportFile(null);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleExecuteImport = () => {
    if (!importFile && !importJsonText) {
      setImportError('Please select a valid .json database backup file to import.');
      return;
    }

    if (importMode === 'replace') {
      setShowReplaceConfirm(true);
      return;
    }

    runImport();
  };

  const runImport = async () => {
    setShowReplaceConfirm(false);
    const token = typeof window !== 'undefined' ? localStorage.getItem('lemondbd_token') : null;
    if (!token) {
      setImportError('Unauthorized: Administrator token missing.');
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);
    setImportSummary(null);

    try {
      let parsedPayload: any;
      try {
        parsedPayload = JSON.parse(importJsonText);
      } catch {
        throw new Error('Unable to parse JSON backup file contents.');
      }

      const res = await fetch(`${apiBase}/api/v1/admin/database/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mode: importMode,
          data: parsedPayload.data || parsedPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Database import execution failed.');
      }

      setImportSuccess(data.message || 'Database successfully restored from backup.');
      setImportSummary(data.summary || null);

      if (onPurgeSuccess) {
        await onPurgeSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error executing database import.';
      setImportError(msg);
    } finally {
      setIsImporting(false);
    }
  };

  // 3. Purge Action
  const handleExecutePurge = () => {
    if (purgeTargets.length === 0) {
      setPurgeError('Please select at least one table target to purge.');
      return;
    }

    setShowPurgeConfirm(true);
  };

  const runPurge = async () => {
    setShowPurgeConfirm(false);
    const token = typeof window !== 'undefined' ? localStorage.getItem('lemondbd_token') : null;
    if (!token) {
      setPurgeError('Unauthorized: Administrator token missing.');
      return;
    }

    setIsPurging(true);
    setPurgeError(null);
    setPurgeSuccess(null);

    try {
      const res = await fetch(`${apiBase}/api/v1/admin/database/purge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store',
          Pragma: 'no-cache',
        },
        cache: 'no-store',
        body: JSON.stringify({ targets: purgeTargets }),
      });

      const data = await res.json();
      if (res.ok) {
        setPurgeSuccess(data.message || 'Selected tables successfully purged.');
        setPurgeTargets([]);
        if (onPurgeSuccess) {
          await onPurgeSuccess();
        }
      } else {
        setPurgeError(data.error || 'Failed to execute database purge.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error while attempting purge.';
      setPurgeError(message);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="db-modal-title"
    >
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={() => !isExporting && !isImporting && !isPurging && onClose()}
      />

      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-slate-900 dark:text-slate-100 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200 space-y-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => !isExporting && !isImporting && !isPurging && onClose()}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          aria-label={dict?.admin?.closeDbModal || 'Close database modal'}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600/10 dark:bg-red-600/20 border border-red-500/30 text-red-600 dark:text-red-400 shadow-sm">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 id="db-modal-title" className="text-lg font-black tracking-wider text-slate-900 dark:text-slate-100 font-mono">
                {dict?.admin?.dbBackupSnapshots || 'Database Backup & Snapshots'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {dict?.admin?.dbBackupSnapshotsSubtitle || 'Export complete JSON snapshots, restore backups, or manage PostgreSQL via pgAdmin'}
              </p>
            </div>
          </div>


          <a
            href={
              (process.env.NEXT_PUBLIC_PGADMIN_URL && process.env.NEXT_PUBLIC_PGADMIN_URL.trim() !== '')
                ? process.env.NEXT_PUBLIC_PGADMIN_URL
                : typeof window !== 'undefined'
                ? `${window.location.protocol}//${window.location.hostname}:5050`
                : 'https://localhost:5050'
            }
            target="_blank"
            rel="noopener noreferrer"
            title={dict?.admin?.openPgAdmin || 'Open pgAdmin Web Management Interface'}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-950/40 text-indigo-300 hover:text-white hover:border-indigo-400 text-xs font-bold transition-all"
          >
            <Database className="h-3.5 w-3.5 text-indigo-400" />
            <span>{dict?.admin?.launchPgAdmin || 'Launch pgAdmin'}</span>
          </a>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex items-center justify-center gap-2 flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Download className="h-3.5 w-3.5 text-blue-500" />
            <span>{dict?.admin?.exportJson || 'Export JSON'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex items-center justify-center gap-2 flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="h-3.5 w-3.5 text-emerald-500" />
            <span>{dict?.admin?.importJson || 'Import JSON'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('purge')}
            className={`flex items-center justify-center gap-2 flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'purge'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
            <span>{dict?.admin?.purgeReset || 'Purge & Reset'}</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: EXPORT JSON */}
        {/* ========================================================================= */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            {exportError && (
              <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{exportError}</span>
              </div>
            )}

            {exportSuccess && (
              <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{exportSuccess}</span>
              </div>
            )}

            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {dict?.admin?.selectBackupEntities || 'Select Entities to Include in JSON Backup'}
              </span>
              <button
                type="button"

                onClick={toggleAllExport}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                {exportTargets.length === ALL_TARGETS.length
                  ? dict?.admin?.deselectAll || 'Deselect All'
                  : dict?.admin?.selectAll || 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {localizedTargets.map((target) => {
                const isSelected = exportTargets.includes(target.id);
                return (
                  <div
                    key={target.id}
                    onClick={() => toggleExportTarget(target.id)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500/50 bg-blue-500/10 text-blue-900 dark:text-blue-200'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="pt-0.5">
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold">{target.label}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{target.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isExporting}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {dict?.admin?.cancel || 'Cancel'}
              </button>

              <button

                type="button"
                onClick={handleExecuteExport}
                disabled={isExporting || exportTargets.length === 0}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-950/30 transition-all cursor-pointer disabled:opacity-40"
              >
                {isExporting ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span>
                  {isExporting
                    ? dict?.admin?.exportingStatus || 'Exporting...'
                    : (dict?.admin?.downloadBackup || 'Download Backup ({count})').replace(
                        '{count}',
                        String(exportTargets.length)
                      )}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: IMPORT JSON */}
        {/* ========================================================================= */}
        {activeTab === 'import' && (
          <div className="space-y-4">
            {importError && (
              <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {importSuccess && (
              <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{importSuccess}</span>
              </div>
            )}

            {/* File Dropzone */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json,application/json"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/40 hover:border-emerald-500 hover:bg-emerald-500/5 transition-all cursor-pointer text-center group"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform mb-2">
                <FileJson className="h-6 w-6" />
              </div>
              {importFile ? (
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{importFile.name}</p>
                  <p className="text-[11px] text-emerald-500 font-semibold mt-0.5">
                    {(importFile.size / 1024).toFixed(1)} {dict?.admin?.kbReadySuffix || 'KB, ready to restore'}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {dict?.admin?.clickOrDragBackupPrefix || 'Click or drag & drop a LemonDBD'} <span className="text-emerald-500 font-mono">{'.json'}</span> {dict?.admin?.clickOrDragBackupSuffix || 'backup file'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">{dict?.admin?.jsonFormatNotice || 'Accepts full or partial JSON database exports'}</p>
                </div>

              )}
            </div>

            {/* Import Mode Options */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {dict?.admin?.chooseImportStrategy || 'Choose Import Strategy'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div

                  onClick={() => setImportMode('merge')}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    importMode === 'merge'
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">{dict?.admin?.mergeUpdate || 'Merge & Update (Safe)'}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {dict?.admin?.mergeUpdateDesc || 'Upserts entities by name/slug without deleting existing data'}
                    </p>
                  </div>
                </div>


                <div
                  onClick={() => setImportMode('replace')}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    importMode === 'replace'
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50'
                  }`}
                >
                  <RotateCcw className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">{dict?.admin?.wipeReplace || 'Wipe & Replace (Clean)'}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {dict?.admin?.wipeReplaceDesc || 'Clears target tables first, then restores uploaded records'}
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Import Summary Results Breakdown */}
            {importSummary && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 p-3 max-h-36 overflow-y-auto space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {dict?.admin?.importResultsBreakdown || 'Import Results Breakdown'}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                  {Object.entries(importSummary).map(([key, counts]) => (

                    <div key={key} className="rounded-lg bg-white dark:bg-slate-900 p-1.5 border border-slate-200 dark:border-slate-800">
                      <p className="text-[10px] font-bold text-slate-400 capitalize">{key}</p>
                      <p className="text-xs font-bold text-emerald-500">
                        {dict?.admin?.createdCountPrefix || '+'}
                        {counts.created}{' '}
                        <span className="text-slate-400 font-normal">
                          ({counts.updated} {dict?.admin?.updatedCountSuffix || 'updated)'}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isImporting}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {dict?.admin?.close || 'Close'}
              </button>

              <button

                type="button"
                onClick={handleExecuteImport}
                disabled={isImporting || !importFile}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-5 py-2 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-950/30 transition-all cursor-pointer disabled:opacity-40"
              >
                {isImporting ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                <span>{isImporting ? dict?.admin?.importingStatus || 'Importing...' : dict?.admin?.executeImport || 'Execute Import'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PURGE & RESET */}
        {/* ========================================================================= */}
        {activeTab === 'purge' && (
          <div className="space-y-4">
            {purgeError && (
              <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{purgeError}</span>
              </div>
            )}

            {purgeSuccess && (
              <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{purgeSuccess}</span>
              </div>
            )}

            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {dict?.admin?.selectTablesToWipe || 'Select Target Tables to Wipe'}
              </span>
              <button
                type="button"

                onClick={toggleAllPurge}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                {purgeTargets.length === ALL_TARGETS.length
                  ? dict?.admin?.deselectAll || 'Deselect All'
                  : dict?.admin?.selectAll || 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {localizedTargets.map((target) => {
                const isSelected = purgeTargets.includes(target.id);
                return (
                  <div
                    key={target.id}
                    onClick={() => togglePurgeTarget(target.id)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="pt-0.5">
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-red-600 dark:text-red-400" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold">{target.label}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{target.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isPurging}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {dict?.admin?.close || 'Close'}
              </button>

              <button

                type="button"
                onClick={handleExecutePurge}
                disabled={isPurging || purgeTargets.length === 0}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-red-950/30 transition-all cursor-pointer disabled:opacity-40"
              >
                {isPurging ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>
                  {isPurging
                    ? dict?.admin?.purgingStatus || 'Purging...'
                    : (dict?.admin?.purgeSelected || 'Purge Selected ({count})').replace(
                        '{count}',
                        String(purgeTargets.length)
                      )}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

    <ConfirmModal
      open={showReplaceConfirm}
      title={dict?.admin?.wipeReplaceConfirm || 'Wipe & Replace database?'}
      message='You have selected "Wipe & Replace" mode. Existing data in target tables will be wiped and replaced with the backup. Are you sure you want to proceed?'
      confirmLabel="Wipe & Replace"
      busy={isImporting}
      onConfirm={runImport}
      onCancel={() => setShowReplaceConfirm(false)}
    />

    <ConfirmModal
      open={showPurgeConfirm}
      title={dict?.admin?.purgeConfirm || 'Purge selected tables?'}
      message={`Are you sure you want to PURGE ${purgeTargets.length} table category(ies)? This action is permanent and cannot be undone.`}
      confirmLabel="Purge"
      busy={isPurging}
      onConfirm={runPurge}
      onCancel={() => setShowPurgeConfirm(false)}
    />
    </>
  );
}
