// frontend/src/components/user/ShowcasePerkModal.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { SearchInput } from '@/components/common/Field';
import Image from 'next/image';
import { Sparkles, Check } from 'lucide-react';
import type { RoleCategory, Perk } from '@/types/perks';
import { getBackendBaseUrl, getPerkIconUrl, matchesPerkSearch } from '@/utils/perkUtils';
import { fetchCached, fetchJson, unwrapList, type ListPayload } from '@/services/dataCache';
import { Modal } from '@/components/common/Modal';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { useDictionary } from "@/context/DictionaryContext";

/** The slots sit clockwise from the top (top, right, bottom, left); the build fills them the other way round. */
const FILL_ORDER = [0, 3, 2, 1] as const;

interface ShowcasePerkModalProps {
  isOpen: boolean;
  role: RoleCategory;
  /** The four slots of the main's build; null is an empty slot. */
  perkIds: (number | null)[];
  /** Applied straight away, so the build behind the panel updates with every pick. */
  onSetPerk: (slotIndex: number, perkId: number | null) => void;
  onClose: () => void;
  locale?: string;
}

const PerkGridItem: React.FC<{
  perk: Perk;
  isSelected: boolean;
  onToggle: (perk: Perk) => void;
}> = ({ perk, isSelected, onToggle }) => {
  const [imgError, setImgError] = useState(false);
  const iconSrc = getPerkIconUrl(perk);

  return (
    <button
      type="button"
      onClick={() => onToggle(perk)}
      aria-pressed={isSelected}
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
      <span className="type-strong text-text-primary group-hover:text-accent-red line-clamp-1">
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

export const ShowcasePerkModal: React.FC<ShowcasePerkModalProps> = ({ isOpen, role, perkIds, onSetPerk, onClose, locale = 'en' }) => {
  const dict = useDictionary();
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
    fetchCached<ListPayload<Perk>>(url, () => fetchJson<ListPayload<Perk>>(url))
      .then((data) => {
        const list = unwrapList(data);
        setPerks(list);
      })
      .catch((err) => {
        console.error('Failed to load perks for showcase modal:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, locale]);

  // The role's perks are listed right away; the search only narrows them down.
  const sortedPerks = useMemo(
    () => perks.filter((p) => matchesPerkSearch(p, '', role)).sort((a, b) => a.name.localeCompare(b.name, locale)),
    [perks, role, locale]
  );
  const filteredPerks = useMemo(
    () => (search.trim() ? sortedPerks.filter((p) => matchesPerkSearch(p, search, role)) : sortedPerks),
    [sortedPerks, search, role]
  );

  // Picking fills the first free slot, picking a chosen perk again frees its slot; a full build ignores new picks.
  const togglePerk = (perk: Perk) => {
    if (!perk.id) return;
    const slot = perkIds.indexOf(perk.id);
    if (slot >= 0) {
      onSetPerk(slot, null);
      return;
    }
    const freeSlot = FILL_ORDER.find((s) => perkIds[s] === null);
    if (freeSlot !== undefined) onSetPerk(freeSlot, perk.id);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      centerTitle
      title={dict.user.selectPerk}
      className="max-h-[85vh] flex flex-col"
      bodyClassName="flex flex-col min-h-0 overflow-hidden"
      borderless
    >
      {/* Search Bar */}
      <div className="p-4 bg-bg-elevated/40 shrink-0">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={dict.filters.searchPlaceholder}
          autoFocus
        />
      </div>

      {/* Perks Grid */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Spinner size="lg" tone="accent" />
            <p className="text-xs text-text-muted">
              {dict.user.loadingPerks}
            </p>
          </div>
        ) : filteredPerks.length === 0 ? (
          <EmptyState variant="inline" title={dict.user.noPerksFound} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredPerks.map((perk) => (
              <PerkGridItem
                key={perk.id ?? perk.name}
                perk={perk}
                isSelected={perk.id !== undefined && perkIds.includes(perk.id)}
                onToggle={togglePerk}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
