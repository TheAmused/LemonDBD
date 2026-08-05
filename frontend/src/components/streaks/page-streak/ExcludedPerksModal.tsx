'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { fetchExcludedPerks, saveExcludedPerks } from '@/services/pageStreakApi';
import { PoolPerk } from '@/types/pageStreak';

interface ExcludedPerksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const ExcludedPerksModal: React.FC<ExcludedPerksModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [allPerks, setAllPerks] = useState<PoolPerk[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [perksPerPage, setPerksPerPage] = useState(15);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchExcludedPerks();
        if (cancelled) return;
        // pool excludes the excluded ones, so rebuild the full list from both
        const poolNames = data.pool.map((p) => p.name);
        const missing = data.excluded.map((name) => ({ name, character: null, icon_local_path: null }));
        setAllPerks([...data.pool, ...missing].sort((a, b) => (a.name < b.name ? -1 : 1)));
        setExcluded(data.excluded);
        if (poolNames.length > 0 && data.page_count > 0) {
          setPerksPerPage(Math.ceil(poolNames.length / data.page_count));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the perk list');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const visible = useMemo(
    () => allPerks.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase())),
    [allPerks, query]
  );

  const owned = allPerks.length - excluded.length;
  const projectedPages = perksPerPage > 0 ? Math.ceil(owned / perksPerPage) : 0;

  const toggle = (name: string) =>
    setExcluded((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveExcludedPerks(excluded);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the list');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-800 bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-4">
          <div>
            <h2 className="text-sm font-extrabold text-slate-100">Perks I don&apos;t own</h2>
            <p className="mt-1 text-xs text-slate-500">
              Unchecked perks leave the pool and the pages are renumbered. Runs already in progress keep their frozen layout.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-500 hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-slate-800 p-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search perks"
              className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {error && <p className="mb-2 text-xs text-rose-400">{error}</p>}
          <div className="flex flex-col gap-1.5">
            {visible.map((perk) => {
              const isExcluded = excluded.includes(perk.name);
              return (
                <label
                  key={perk.name}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border border-slate-800 px-3 py-2 text-xs ${
                    isExcluded ? 'text-slate-600 line-through' : 'text-slate-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!isExcluded}
                    onChange={() => toggle(perk.name)}
                    className="h-3.5 w-3.5 accent-orange-500"
                  />
                  <span>{perk.name}</span>
                </label>
              );
            })}
            {visible.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-500">No perk matches &quot;{query}&quot;.</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 p-4">
          <span className="font-mono text-[11px] text-orange-400">
            {owned} of {allPerks.length} · {projectedPages} pages
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-bold text-slate-400">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-xs font-extrabold text-white disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
