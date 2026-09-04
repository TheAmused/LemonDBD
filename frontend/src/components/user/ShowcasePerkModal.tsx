// frontend/src/components/user/ShowcasePerkModal.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Search, X, Trash2, Sparkles, Check } from 'lucide-react';
import type { RoleCategory, Perk } from '@/types/perks';
import type { Dictionary } from '@/locales/types';
import { getBackendBaseUrl, getPerkIconUrl } from '@/utils/perkUtils';
import { fetchCached, fetchJson } from '@/services/dataCache';

interface ShowcasePerkModalProps {
  isOpen: boolean;
  role: RoleCategory;
  currentPerkId?: number | null;
  slotIndex: number;
  onSelect: (perkId: number) => void;
  onClear: () => void;
  onClose: () => void;
  dict?: Dictionary | null;
  locale?: string;
}

export const ShowcasePerkModal: React.FC<ShowcasePerkModalProps> = ({
  isOpen,
  role,
  currentPerkId,
  slotIndex,
  onSelect,
  onClear,
  onClose,
  dict,
  locale = 'en',
}) => {
  const [search, setSearch] = useState('');
  const [perks, setPerks] = useState<Perk[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const backendBase = getBackendBaseUrl();
    const url = `${backendBase}/api/v1/perks?limit=1000&lang=${locale}`;

    setLoading(true);
    fetchCached<any>(url, () => fetchJson(url))
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.data || [];
        setPerks(list);
      })
      .catch((err) => {
        console.error('Failed to load perks for showcase modal:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, locale]);

  const filteredPerks = useMemo(() => {
    const roleNormalized = role.toLowerCase();
    const query = search.trim().toLowerCase();

    return perks
      .filter((p) => {
        const pRole = (p.category || '').toLowerCase();
        return pRole === roleNormalized;
      })
      .filter((p) => {
        if (!query) return true;
        const nameMatch = p.name.toLowerCase().includes(query);
        const charMatch = p.character ? p.character.toLowerCase().includes(query) : false;
        return nameMatch || charMatch;
      });
  }, [perks, role, search]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="perk-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-purple-800/40 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 id="perk-modal-title" className="text-base sm:text-lg font-black tracking-wide uppercase font-mono">
                {dict?.user?.selectPerk || 'Select Perk'} ({role})
              </h2>
              <p className="text-xs text-slate-400">
                {dict?.user?.choosePerkDesc || 'Choose a perk to equip into your signature 4-perk diamond loadout.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={dict?.user?.searchPerks || 'Search perks...'}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/60 transition-colors"
              autoFocus
            />
          </div>

          {currentPerkId && (
            <button
              type="button"
              onClick={() => {
                onClear();
                onClose();
              }}
              className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-rose-500/30 bg-rose-950/40 text-xs font-bold text-rose-400 hover:bg-rose-900/60 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{dict?.user?.clearPerk || 'Clear Slot'}</span>
            </button>
          )}
        </div>

        {/* Perks Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
              <p className="text-xs text-slate-400 font-mono">
                {dict?.user?.loadingPerks || 'Channeling teachable knowledge...'}
              </p>
            </div>
          ) : filteredPerks.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs sm:text-sm">
              {dict?.user?.noPerksFound || 'No matching perks found.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredPerks.map((perk) => {
                const perkId = perk.id ?? 0;
                const isSelected = currentPerkId === perkId;
                const iconSrc = getPerkIconUrl(perk);

                return (
                  <button
                    key={perkId || perk.name}
                    type="button"
                    onClick={() => {
                      if (perkId) {
                        onSelect(perkId);
                        onClose();
                      }
                    }}
                    className={`relative flex flex-col items-center p-3 rounded-2xl border transition-all cursor-pointer text-center group ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/20 shadow-lg shadow-purple-950/40'
                        : 'border-slate-800 bg-slate-950/60 hover:border-purple-500/50 hover:bg-slate-800/60'
                    }`}
                  >
                    {/* Perk Diamond Icon */}
                    <div className="w-12 h-12 rotate-45 rounded-lg border border-purple-500/60 bg-gradient-to-br from-purple-900 via-slate-900 to-purple-950 flex items-center justify-center shadow-md mb-2 group-hover:scale-105 transition-transform">
                      <div className="-rotate-45 relative w-8 h-8 flex items-center justify-center pointer-events-none">
                        {iconSrc ? (
                          <Image
                            src={iconSrc}
                            alt={perk.name}
                            width={32}
                            height={32}
                            className="object-contain"
                            unoptimized
                          />
                        ) : (
                          <Sparkles className="h-4 w-4 text-purple-300" />
                        )}
                      </div>
                    </div>

                    {/* Name */}
                    <span className="text-xs font-bold text-slate-200 group-hover:text-purple-300 line-clamp-1">
                      {perk.name}
                    </span>

                    {/* Character / Teachable Origin */}
                    <span className="text-[10px] text-slate-400 line-clamp-1">
                      {perk.character || 'General'}
                    </span>

                    {/* Selected Indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-slate-950">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
