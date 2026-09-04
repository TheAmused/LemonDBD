// frontend/src/components/user/ShowcaseCharacterModal.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Search, UserCheck, Sparkles } from 'lucide-react';
import type { RoleCategory, CharacterItem } from '@/types/perks';
import type { Dictionary } from '@/locales/types';
import { getBackendBaseUrl, getCharacterAvatarUrl } from '@/utils/perkUtils';
import { fetchCached, fetchJson } from '@/services/dataCache';
import { Modal } from '@/components/common/Modal';

interface ShowcaseCharacterModalProps {
  isOpen: boolean;
  role: RoleCategory;
  currentCharacter: string;
  onSelect: (characterName: string) => void;
  onClose: () => void;
  dict?: Dictionary | null;
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
  const avatarSrc = getCharacterAvatarUrl(
    { character: char.name, category: role },
    role
  );

  return (
    <button
      type="button"
      onClick={() => {
        onSelect(char.name);
        onClose();
      }}
      className={`relative flex flex-col items-center p-3 rounded-2xl border transition-all cursor-pointer text-center group ${
        isSelected
          ? 'border-accent-amber bg-accent-amber/15 shadow-md shadow-accent-amber/15'
          : 'border-border-color bg-bg-surface hover:border-accent-amber/50 hover:bg-bg-elevated'
      }`}
    >
      {/* Character Avatar */}
      <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-border-color group-hover:border-accent-amber/60 transition-colors bg-bg-elevated mb-2">
        {avatarSrc && !imgError ? (
          <Image
            src={avatarSrc}
            alt={char.name}
            fill
            sizes="56px"
            className="object-cover"
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-text-primary text-xs font-bold font-mono">
            <span>{char.name.slice(0, 2).toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Name */}
      <span className="text-xs font-bold font-mono text-text-primary group-hover:text-accent-amber line-clamp-1">
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

export const ShowcaseCharacterModal: React.FC<ShowcaseCharacterModalProps> = ({
  isOpen,
  role,
  currentCharacter,
  onSelect,
  onClose,
  dict,
  locale = 'en',
}) => {
  const [search, setSearch] = useState('');
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const backendBase = getBackendBaseUrl();
    const url = `${backendBase}/api/v1/characters?category=all&lang=${locale}`;

    setLoading(true);
    fetchCached<any>(url, () => fetchJson(url))
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.data || [];
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
    const query = search.trim().toLowerCase();

    return characters
      .filter((c) => {
        const cRole = (c.category || '').toLowerCase();
        return cRole === roleNormalized;
      })
      .filter((c) => {
        if (!query) return true;
        const nameMatch = c.name.toLowerCase().includes(query);
        const realNameMatch = c.real_name ? c.real_name.toLowerCase().includes(query) : false;
        return nameMatch || realNameMatch;
      });
  }, [characters, role, search]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={`${dict?.user?.selectCharacter || 'Select Character'} (${role})`}
      subtitle={dict?.user?.chooseCharacterDesc || 'Choose your primary character to showcase at the Campfire.'}
      icon={<Sparkles className={`h-5 w-5 ${role === 'Survivor' ? 'text-cyan-400' : 'text-accent-red'}`} />}
      className="max-h-[85vh] flex flex-col"
      bodyClassName="flex flex-col min-h-0 overflow-hidden"
    >
      {/* Search Bar */}
      <div className="p-4 border-b border-border-color bg-bg-elevated/40 shrink-0">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={dict?.user?.searchCharacters || 'Search characters...'}
            className="w-full pl-10 pr-4 py-2.5 bg-bg-surface border border-border-color rounded-xl text-xs sm:text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-amber/60 transition-colors font-mono"
            autoFocus
          />
        </div>
      </div>

      {/* Characters Grid */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-accent-amber border-t-transparent" />
            <p className="text-xs text-text-muted font-mono">
              {dict?.user?.loadingCharacters || 'Consulting the Fog...'}
            </p>
          </div>
        ) : filteredCharacters.length === 0 ? (
          <div className="text-center py-16 text-text-muted text-xs sm:text-sm font-mono">
            {dict?.user?.noCharactersFound || 'No matching characters found.'}
          </div>
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
