'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, Loader2, ShieldAlert } from 'lucide-react';

interface ScraperConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScraperConfigModal: React.FC<ScraperConfigModalProps> = ({ isOpen, onClose }) => {
  const [source, setSource] = useState<'nightlight' | 'wiki'>('nightlight');
  const [fallbackToWiki, setFallbackToWiki] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(backendBase + '/api/v1/scrape/config');
      if (res.ok) {
        const data = await res.json();
        if (data.source === 'nightlight' || data.source === 'wiki') {
          setSource(data.source);
        }
        if (typeof data.fallback_to_wiki === 'boolean') {
          setFallbackToWiki(data.fallback_to_wiki);
        }
      } else {
        setError('Failed to fetch scraper config');
      }
    } catch (err) {
      console.error('Failed to fetch scraper config:', err);
      setError('Failed to load scraper configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(backendBase + '/api/v1/scrape/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source,
          fallback_to_wiki: fallbackToWiki,
        }),
      });
      if (res.ok) {
        onClose();
      } else {
        setError('Failed to save scraper configuration');
      }
    } catch (err) {
      console.error('Failed to save scraper config:', err);
      setError('Network error while saving configuration');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scraper-config-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
              <Settings className="h-4 w-4" />
            </div>
            <div>
              <h2 id="scraper-config-modal-title" className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                Scraper Configuration
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Manage data source and automatic fallback rules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Modal"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-500">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex h-32 items-center justify-center text-xs font-semibold text-slate-400">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-red-600 dark:border-slate-700 dark:border-t-red-500" />
            </div>
          ) : (
            <>
              {/* Source Radio Options */}
              <div className="space-y-3">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Primary Scraper Source
                </label>

                {/* Option 1: Nightlight.gg */}
                <div
                  className={
                    'flex items-start gap-3 p-3.5 rounded-2xl border transition-all ' +
                    (source === 'nightlight'
                      ? 'border-red-500/60 bg-red-500/5 dark:border-red-500/50 dark:bg-red-500/10 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700')
                  }
                >
                  <input
                    type="radio"
                    id="source-nightlight"
                    name="scraper-source"
                    value="nightlight"
                    checked={source === 'nightlight'}
                    onChange={() => setSource('nightlight')}
                    className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                  <label htmlFor="source-nightlight" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">Nightlight.gg</span>
                      <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        Recommended
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Fast &amp; up-to-date perk and character data scraped directly from Nightlight.gg.
                    </p>
                  </label>
                </div>

                {/* Option 2: DBD Fandom Wiki */}
                <div
                  className={
                    'flex items-start gap-3 p-3.5 rounded-2xl border transition-all ' +
                    (source === 'wiki'
                      ? 'border-red-500/60 bg-red-500/5 dark:border-red-500/50 dark:bg-red-500/10 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700')
                  }
                >
                  <input
                    type="radio"
                    id="source-wiki"
                    name="scraper-source"
                    value="wiki"
                    checked={source === 'wiki'}
                    onChange={() => setSource('wiki')}
                    className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                  <label htmlFor="source-wiki" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">DBD Fandom Wiki</span>
                      <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                        Legacy
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Community Fandom wiki source containing detailed lore &amp; perk descriptions.
                    </p>
                  </label>
                </div>
              </div>

              {/* Automatic Fallback Checkbox */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                  <input
                    type="checkbox"
                    id="fallback-checkbox"
                    checked={fallbackToWiki}
                    onChange={(e) => setFallbackToWiki(e.target.checked)}
                    className="h-4 w-4 rounded text-red-600 focus:ring-red-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                  />
                  <label htmlFor="fallback-checkbox" className="cursor-pointer flex-1">
                    <span className="text-xs font-bold block">Automatic Fallback</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Fall back to DBD Fandom Wiki automatically if primary source fails
                    </span>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-md shadow-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 transition-all cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Configuration</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
