// frontend/src/components/user/ShowcaseCharacterModal.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Search, X, UserCheck, Sparkles } from 'lucide-react';
import type { RoleCategory, CharacterItem } from '@/types/perks';
import type { Dictionary } from '@/locales/types';
import { getBackendBaseUrl, getCharacterAvatarUrl } from '@/utils/perkUtils';
import { fetchCached, fetchJson } from '@/services/dataCache';

interface ShowcaseCharacterModalProps {
  isOpen: boolean;
  role: RoleCategory;
  currentCharacter: string;
  onSelect: (characterName: string) => void;
  onClose: () => void;
  dict?: Dictionary | null;
  locale?: string;
}

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

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="character-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${role === 'Survivor' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-red-500/20 text-red-400'}`}>
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 id="character-modal-title" className="text-base sm:text-lg font-black tracking-wide uppercase font-mono">
                {dict?.user?.selectCharacter || 'Select Character'} ({role})
              </h2>
              <p className="text-xs text-slate-400">
                {dict?.user?.chooseCharacterDesc || 'Choose your primary character to showcase at the Campfire.'}
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

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={dict?.user?.searchCharacters || 'Search characters...'}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* Characters Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              <p className="text-xs text-slate-400 font-mono">
                {dict?.user?.loadingCharacters || 'Consulting the Fog...'}
              </p>
            </div>
          ) : filteredCharacters.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs sm:text-sm">
              {dict?.user?.noCharactersFound || 'No matching characters found.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredCharacters.map((char) => {
                const isSelected = char.name.toLowerCase() === currentCharacter.toLowerCase();
                const avatarSrc = getCharacterAvatarUrl(
                  { character: char.name, category: role },
                  role
                );

                return (
                  <button
                    key={char.name}
                    type="button"
                    onClick={() => {
                      onSelect(char.name);
                      onClose();
                    }}
                    className={`relative flex flex-col items-center p-3 rounded-2xl border transition-all cursor-pointer text-center group ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-950/40'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/60'
                    }`}
                  >
                    {/* Character Avatar */}
                    <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-slate-700 group-hover:border-amber-400/60 transition-colors bg-slate-900 mb-2">
                      {avatarSrc ? (
                        <Image
                          src={avatarSrc}
                          alt={char.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-bold">
                          {char.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 line-clamp-1">
                      {char.name}
                    </span>

                    {/* Selected Checkmark */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-slate-950">
                        <UserCheck className="h-3 w-3" />
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
