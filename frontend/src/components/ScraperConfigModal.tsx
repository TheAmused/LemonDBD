'use client';
// frontend/src/components/ScraperConfigModal.tsx

import React, { useState } from 'react';
import { X, Trash2, Database, AlertTriangle, RefreshCw, CheckSquare, Square } from 'lucide-react';
import { getBackendBaseUrl } from '@/utils/perkUtils';

interface ScraperConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurgeSuccess?: () => void;
}

interface PurgeTarget {
  id: string;
  label: string;
  desc: string;
}

const PURGE_TARGETS: readonly PurgeTarget[] = [
  { id: 'characters', label: 'Characters', desc: 'Purges character records and portraits' },
  { id: 'perks', label: 'Perks', desc: 'Purges all teachable and general perks' },
  { id: 'items', label: 'Items', desc: 'Purges survivor items and equipment' },
  { id: 'addons', label: 'Add-ons', desc: 'Purges killer and survivor add-ons' },
  { id: 'maps', label: 'Maps & Callouts', desc: 'Purges map realms, tiles, and callouts' },
  { id: 'ownerships', label: 'User Ownership Records', desc: 'Resets all user-unlocked perks and characters' },
  { id: 'game_runs', label: 'Match & Streak Logs', desc: 'Clears Gauntlet and Page Streak run histories' },
];

export function ScraperConfigModal({ isOpen, onClose, onPurgeSuccess }: ScraperConfigModalProps) {
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);
  const [purgeSuccess, setPurgeSuccess] = useState<string | null>(null);

  const apiBase = getBackendBaseUrl();

  if (!isOpen) return null;

  const toggleTarget = (id: string) => {
    setSelectedTargets((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTargets.length === PURGE_TARGETS.length) {
      setSelectedTargets([]);
    } else {
      setSelectedTargets(PURGE_TARGETS.map((t) => t.id));
    }
  };

  const handleExecutePurge = async () => {
    if (selectedTargets.length === 0) {
      setPurgeError('Please select at least one table target to purge.');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to PURGE ${selectedTargets.length} table category(ies)? This action is permanent and cannot be undone.`
      )
    ) {
      return;
    }

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
        body: JSON.stringify({ targets: selectedTargets }),
      });

      const data = await res.json();
      if (res.ok) {
        setPurgeSuccess(data.message || 'Selected tables successfully purged.');
        setSelectedTargets([]);
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scraper-modal-title"
    >
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={() => !isPurging && onClose()}
      />

      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-slate-900 dark:text-slate-100 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200 space-y-5">
        <button
          type="button"
          onClick={() => !isPurging && onClose()}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          aria-label="Close database modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/10 dark:bg-red-600/20 border border-red-500/30 text-red-600 dark:text-red-400 shadow-sm">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 id="scraper-modal-title" className="text-base font-black tracking-wider text-slate-900 dark:text-slate-100 font-mono">
              Database Maintenance &amp; Purge
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select specific tables to wipe before running a fresh sync
            </p>
          </div>
        </div>

        {purgeError && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400 flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{purgeError}</span>
          </div>
        )}

        {purgeSuccess && (
          <div
            role="status"
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400"
          >
            {purgeSuccess}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Select Target Tables
            </span>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              {selectedTargets.length === PURGE_TARGETS.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
            {PURGE_TARGETS.map((target) => {
              const isSelected = selectedTargets.includes(target.id);
              return (
                <div
                  key={target.id}
                  onClick={() => toggleTarget(target.id)}
                  className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
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
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{target.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isPurging}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleExecutePurge}
            disabled={isPurging || selectedTargets.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-red-950/30 transition-all cursor-pointer disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            {isPurging ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            <span>{isPurging ? 'Purging...' : `Purge Selected (${selectedTargets.length})`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
