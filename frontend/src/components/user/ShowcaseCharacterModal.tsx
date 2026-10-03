// frontend/src/components/user/ShowcaseCharacterModal.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { SearchInput } from '@/components/common/Field';
import Image from 'next/image';
import { UserCheck, Sparkles } from 'lucide-react';
import type { RoleCategory, CharacterItem } from '@/types/perks';
import type { Dictionary } from '@/locales/types';
import { getBackendBaseUrl, getCharacterAvatarUrl, normalizeSearchText } from '@/utils/perkUtils';
import { CATALOG_TTL_MS, catalogKey, fetchCached, fetchJson, unwrapList, type ListPayload } from '@/services/dataCache';
import { Modal } from '@/components/common/Modal';
import { Spinner } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { isSurvivor } from '@/utils/characterUtils';
import { useDictionary } from "@/context/DictionaryContext";

interface ShowcaseCharacterModalProps {
  isOpen: boolean;
  role: RoleCategory;
  currentCharacter: string;
  onSelect: (characterName: string) => void;
  onClose: () => void;
  locale?: string;
}

const CharacterGridItem: React.FC<{
  char: CharacterItem;
  role: RoleCategory;
  isSelected: boolean;
  onSelect: (name: string) => void;
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
        onSelect(char.name);
        onClose();
      }}
      className={`relative flex flex-col items-center p-3 rounded-2xl transition-all cursor-pointer text-center group ${
        isSelected ? 'bg-accent-amber/15' : 'bg-bg-surface hover:bg-bg-elevated'
      }`}
    >
      {/* Character Avatar — the only border on this card */}
      <div className="relative w-[84px] h-[84px] rounded-full overflow-hidden border-2 border-border-color group-hover:border-accent-amber/60 transition-colors bg-bg-elevated mb-2">
        {activeSrc && !imgError ? (
          <Image
            src={activeSrc}
            alt={char.name}
            fill
            sizes="84px"
            className="object-cover"
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
          <div className="w-full h-full flex flex-col items-center justify-center text-text-primary type-card-title">
            <span>{char.name.slice(0, 2).toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Name */}
      <span className="type-strong text-text-primary group-hover:text-accent-amber line-clamp-1">
        {char.name}
      </span>

      {/* Selected Checkmark */}
      {isSelected && (
        <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent-amber text-text-inverted">
          <UserCheck className="h-3 w-3" />
        </div>
      )}
    </button>
  );
};

export const ShowcaseCharacterModal: React.FC<ShowcaseCharacterModalProps> = ({ isOpen, role, currentCharacter, onSelect, onClose, locale = 'en' }) => {
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
      title={`${dict.user.selectCharacter} (${role})`}
      icon={<Sparkles className={`h-5 w-5 ${isSurvivor(role) ? 'text-accent-green' : 'text-accent-red'}`} />}
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
            <Spinner size="lg" tone="amber" />
            <p className="text-xs text-text-muted">
              {dict.user.loadingCharacters}
            </p>
          </div>
        ) : filteredCharacters.length === 0 ? (
          <EmptyState variant="inline" title={dict.user.noCharactersFound} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredCharacters.map((char) => (
              <CharacterGridItem
                key={char.name}
                char={char}
                role={role}
                isSelected={char.name.toLowerCase() === currentCharacter.toLowerCase()}
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
