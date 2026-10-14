// frontend/src/components/user/ShowcaseCharacterModal.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { SearchInput } from '@/components/common/Field';
import Image from 'next/image';
import type { RoleCategory, CharacterItem } from '@/types/perks';
import { getBackendBaseUrl, getCharacterAvatarUrl, normalizeSearchText } from '@/utils/perkUtils';
import { CATALOG_TTL_MS, catalogKey, fetchCached, fetchJson, unwrapList, type ListPayload } from '@/services/dataCache';
import { Modal } from '@/components/common/Modal';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { cn } from '@/utils/cn';
import { useDictionary } from "@/context/DictionaryContext";

interface ShowcaseCharacterModalProps {
  isOpen: boolean;
  role: RoleCategory;
  currentCharacter: string;
  /** Matched before the name, which the list may spell in another language. */
  currentCharacterId?: number;
  onSelect: (characterName: string, characterId?: number) => void;
  onClose: () => void;
  locale?: string;
}

const CharacterGridItem: React.FC<{
  char: CharacterItem;
  role: RoleCategory;
  isSelected: boolean;
  onSelect: (name: string, characterId?: number) => void;
  onClose: () => void;
}> = ({ char, role, isSelected, onSelect, onClose }) => {
  const [imgError, setImgError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  const primaryAvatarSrc = char.avatar_local_path
    ? `${getBackendBaseUrl()}/static/${char.avatar_local_path.replace(/^\/?(static\/)?/, '')}`
    : getCharacterAvatarUrl(
        {
          character: char.name,
          character_avatar_path: char.avatar_local_path,
          category: role,
        },
        role
      );

  const activeSrc = useFallback
    ? char.portrait_url || null
    : primaryAvatarSrc || char.portrait_url || null;

  return (
    <button
      type="button"
      onClick={() => {
        onSelect(char.name, char.id);
        onClose();
      }}
      aria-pressed={isSelected}
      className="group flex flex-col items-center gap-2 rounded-xl p-1 text-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red"
    >
      <div
        className={cn(
          'relative aspect-square w-full overflow-hidden rounded-xl border bg-bg-elevated transition-colors',
          isSelected ? 'border-accent-red ring-2 ring-accent-red' : 'border-border-color group-hover:border-accent-red/60'
        )}
      >
        {activeSrc && !imgError ? (
          <Image
            src={activeSrc}
            alt=""
            fill
            sizes="(max-width: 640px) 33vw, 130px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => {
              if (!useFallback && char.portrait_url && primaryAvatarSrc !== char.portrait_url) {
                setUseFallback(true);
              } else {
                setImgError(true);
              }
            }}
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-primary type-card-title">
            <span>{char.name.slice(0, 2).toUpperCase()}</span>
          </div>
        )}
      </div>
      <span
        className={cn(
          'w-full truncate text-mini font-semibold leading-tight transition-colors',
          isSelected ? 'text-accent-red' : 'text-text-secondary group-hover:text-accent-red'
        )}
      >
        {char.name}
      </span>
    </button>
  );
};

export const ShowcaseCharacterModal: React.FC<ShowcaseCharacterModalProps> = ({ isOpen, role, currentCharacter, currentCharacterId, onSelect, onClose, locale = 'en' }) => {
  const dict = useDictionary();
  const [search, setSearch] = useState('');
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Catalog window rather than the default one: this modal is opened and
    // dismissed repeatedly while someone picks their two mains, and the roster
    // it lists cannot change in between.
    const url = catalogKey('characters', { category: 'all', lang: locale });

    setLoading(true);
    fetchCached<ListPayload<CharacterItem>>(url, () => fetchJson<ListPayload<CharacterItem>>(url), { ttlMs: CATALOG_TTL_MS })
      .then((data) => {
        const list = unwrapList(data);
        setCharacters(list);
      })
      .catch((err) => {
        console.error('Failed to load characters for showcase modal:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, locale]);

  const filteredCharacters = useMemo(() => {
    const roleNormalized = role.toLowerCase();
    const query = normalizeSearchText(search);

    return characters
      .filter((c) => {
        const cRole = (c.category || '').toLowerCase();
        return cRole === roleNormalized;
      })
      .filter((c) => {
        if (!query) return true;
        const nameMatch = normalizeSearchText(c.name).includes(query);
        const realNameMatch = c.real_name ? normalizeSearchText(c.real_name).includes(query) : false;
        return nameMatch || realNameMatch;
      });
  }, [characters, role, search]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={dict.user.selectCharacter}
      className="max-h-[85vh] flex flex-col"
      bodyClassName="flex flex-col min-h-0 overflow-hidden"
      borderless
    >
      {/* Search Bar */}
      <div className="p-4 bg-bg-elevated/40 shrink-0">
        <SearchInput
          className=""
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={dict.user.searchCharacters}
          autoFocus
        />
      </div>

      {/* Characters Grid */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Spinner size="lg" tone="accent" />
            <p className="text-xs text-text-muted">
              {dict.user.loadingCharacters}
            </p>
          </div>
        ) : filteredCharacters.length === 0 ? (
          <EmptyState variant="inline" title={dict.user.noCharactersFound} />
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {filteredCharacters.map((char) => (
              <CharacterGridItem
                key={char.name}
                char={char}
                role={role}
                isSelected={
                  currentCharacterId !== undefined && char.id !== undefined
                    ? char.id === currentCharacterId
                    : char.name.toLowerCase() === currentCharacter.toLowerCase()
                }
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
