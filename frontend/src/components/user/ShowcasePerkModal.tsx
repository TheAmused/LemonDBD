// frontend/src/components/user/ShowcasePerkModal.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Search, Trash2, Sparkles, Check } from 'lucide-react';
import type { RoleCategory, Perk } from '@/types/perks';
import type { Dictionary } from '@/locales/types';
import { getBackendBaseUrl, getPerkIconUrl, matchesPerkSearch } from '@/utils/perkUtils';
import { fetchCached, fetchJson } from '@/services/dataCache';
import { Modal } from '@/components/common/Modal';

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

const PerkGridItem: React.FC<{
  perk: Perk;
  isSelected: boolean;
  onSelect: (id: number) => void;
  onClose: () => void;
}> = ({ perk, isSelected, onSelect, onClose }) => {
  const [imgError, setImgError] = useState(false);
  const perkId = perk.id ?? 0;
  const iconSrc = getPerkIconUrl(perk);

  return (
    <button
      type="button"
      onClick={() => {
        if (perkId) {
          onSelect(perkId);
          onClose();
        }
      }}
      className={`relative flex flex-col items-center p-3 rounded-2xl transition-all cursor-pointer text-center group ${
        isSelected ? 'bg-accent-red/20' : 'bg-bg-surface hover:bg-bg-elevated'
      }`}
    >
      {/* Perk Icon — just the icon, no shape/background/border behind it */}
      <div className="relative w-[84px] h-[84px] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform pointer-events-none">
        {iconSrc && !imgError ? (
          <Image
            src={iconSrc}
            alt={perk.name}
            width={84}
            height={84}
            className="object-contain"
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          <Sparkles className="h-8 w-8 text-accent-red" />
        )}
      </div>

      {/* Name */}
      <span className="text-xs font-bold font-mono text-text-primary group-hover:text-accent-red line-clamp-1">
        {perk.name}
      </span>

      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent-red text-text-inverted">
          <Check className="h-2.5 w-2.5 stroke-[3]" />
        </div>
      )}
    </button>
  );
};

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
    if (isOpen) {
      setSearch('');
    }
  }, [isOpen]);

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

  const cleanQuery = search.trim();
  const isSearchActive = cleanQuery.length >= 3;

  const filteredPerks = useMemo(() => {
    if (!isSearchActive) return [];
    return perks.filter((p) => matchesPerkSearch(p, cleanQuery, role));
  }, [perks, role, cleanQuery, isSearchActive]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={`${dict?.user?.selectPerk || 'Select Perk'} (${role})`}
      icon={<Sparkles className="h-5 w-5 text-accent-red" />}
      className="max-h-[85vh] flex flex-col"
      bodyClassName="flex flex-col min-h-0 overflow-hidden"
      borderless
    >
      {/* Search & Actions Bar */}
      <div className="p-4 bg-bg-elevated/40 flex flex-col sm:flex-row items-center gap-3 shrink-0">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={dict?.user?.searchPerks || 'Search perks...'}
            className="w-full pl-10 pr-4 py-2.5 bg-bg-surface rounded-xl text-xs sm:text-sm text-text-primary placeholder-text-muted focus:outline-none transition-colors"
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
            className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-accent-red/10 text-xs font-bold text-accent-red hover:bg-accent-red/20 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{dict?.user?.clearPerk || 'Clear Slot'}</span>
          </button>
        )}
      </div>

      {/* Perks Grid */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-accent-red border-t-transparent" />
            <p className="text-xs text-text-muted font-mono">
              {dict?.user?.loadingPerks || 'Channeling teachable knowledge...'}
            </p>
          </div>
        ) : !isSearchActive ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-red/10 border border-accent-red/25">
              <Search className={`h-6 w-6 text-accent-red ${cleanQuery.length > 0 ? 'animate-pulse' : ''}`} />
            </div>
            <p className="text-xs sm:text-sm font-mono text-text-secondary">
              {cleanQuery.length === 0
                ? dict?.user?.searchPerksPrompt || 'Type at least 3 characters to search perks...'
                : (dict?.user?.searchPerksMinChars || 'Type {count} more character(s) to search...').replace(
                    '{count}',
                    String(3 - cleanQuery.length)
                  )}
            </p>
          </div>
        ) : filteredPerks.length === 0 ? (
          <div className="text-center py-16 text-text-muted text-xs sm:text-sm font-mono">
            {dict?.user?.noPerksFound || 'No matching perks found.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredPerks.map((perk) => (
              <PerkGridItem
                key={perk.id ?? perk.name}
                perk={perk}
                isSelected={currentPerkId === perk.id}
                onSelect={onSelect}
                onClose={onClose}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
