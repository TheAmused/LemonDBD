// frontend/src/components/minigames/CharacterAutocomplete.tsx
'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Search, ChevronDown, Sparkles } from 'lucide-react';
import type { MinigameCatalog, TargetType, GuessedItem } from '@/types/minigame';
import { staticUrl } from '@/utils/api';

export type AutocompleteItem = GuessedItem;

interface CharacterAutocompleteProps {
  catalog: MinigameCatalog;
  targetType?: TargetType;
  onSelect: (item: AutocompleteItem) => void;
  disabled?: boolean;
  placeholder?: string;
  excludeIds?: (number | string)[];
  excludeKeys?: string[];
  autoFocus?: boolean;
}

export const CharacterAutocomplete: React.FC<CharacterAutocompleteProps> = ({
  catalog,
  targetType = 'character',
  onSelect,
  disabled = false,
  placeholder = 'Search item...',
  excludeIds = [],
  excludeKeys = [],
  autoFocus = false,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pool of searchable items based on targetType
  const pool = useMemo<AutocompleteItem[]>(() => {
    const excludedSet = new Set(excludeIds.map(String));
    const excludedKeySet = new Set(excludeKeys.map((k) => k.toLowerCase()));

    const isExcluded = (role: string, id: number | string, name: string) => {
      const lowerRole = (role || '').toLowerCase();
      const strId = String(id);
      return (
        excludedSet.has(strId) ||
        excludedKeySet.has(`${lowerRole}:${strId}`) ||
        excludedKeySet.has(name.toLowerCase())
      );
    };

    const rawKillers = (catalog.killers && catalog.killers.length > 0)
      ? catalog.killers
      : ((catalog as any).characters || []).filter((c: any) => c.role === 'Killer' || c.type === 'killer');

    const rawSurvivors = (catalog.survivors && catalog.survivors.length > 0)
      ? catalog.survivors
      : ((catalog as any).characters || []).filter((c: any) => c.role === 'Survivor' || c.type === 'survivor');

    if (targetType === 'realm') {
      return (catalog.realms || [])
        .filter((r) => !isExcluded('realm', r.id, r.name))
        .map((r) => ({
          id: r.id,
          name: r.name,
          role: 'Realm',
          image_url: r.image_url,
          subtitle: 'Realm',
        }));
    }

    if (targetType === 'perk') {
      return (catalog.perks || [])
        .filter((p) => !isExcluded('perk', p.id, p.name))
        .map((p) => ({
          id: p.id,
          name: p.name,
          role: p.role,
          icon_url: p.icon_url,
          subtitle: `${p.role} Perk • ${p.character_name || 'General'}`,
        }));
    }

    if (targetType === 'killer') {
      return rawKillers
        .filter((k: any) => !isExcluded('killer', k.id, k.name))
        .map((k: any) => ({
          id: k.id,
          name: k.name,
          role: 'Killer',
          avatar_url: k.avatar_url,
          subtitle: `Killer • ${k.chapter_name || ''}`,
        }));
    }

    if (targetType === 'survivor') {
      return rawSurvivors
        .filter((s: any) => !isExcluded('survivor', s.id, s.name))
        .map((s: any) => ({
          id: s.id,
          name: s.name,
          role: 'Survivor',
          avatar_url: s.avatar_url,
          subtitle: `Survivor • ${s.chapter_name || ''}`,
        }));
    }

    // Default & 'character': both Killers & Survivors
    const combined: AutocompleteItem[] = [];
    rawKillers.forEach((k: any) => {
      if (!isExcluded('killer', k.id, k.name)) {
        combined.push({
          id: k.id,
          name: k.name,
          role: 'Killer',
          avatar_url: k.avatar_url,
          subtitle: `Killer • ${k.chapter_name || ''}`,
        });
      }
    });
    rawSurvivors.forEach((s: any) => {
      if (!isExcluded('survivor', s.id, s.name)) {
        combined.push({
          id: s.id,
          name: s.name,
          role: 'Survivor',
          avatar_url: s.avatar_url,
          subtitle: `Survivor • ${s.chapter_name || ''}`,
        });
      }
    });
    return combined.sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog, targetType, excludeIds, excludeKeys]);

  // Filter items matching query
  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      return pool.slice(0, 12);
    }
    const clean = query.toLowerCase().trim();
    return pool
      .filter(
        (item) =>
          item.name.toLowerCase().includes(clean) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(clean))
      )
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(clean);
        const bStarts = b.name.toLowerCase().startsWith(clean);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 15);
  }, [pool, query]);

  const handleSelect = useCallback(
    (item: AutocompleteItem) => {
      onSelect(item);
      setQuery('');
      setIsOpen(false);
      setHighlightedIndex(0);
      inputRef.current?.blur();
    },
    [onSelect]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev <= 0 ? Math.max(0, filteredItems.length - 1) : prev - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[highlightedIndex]) {
        handleSelect(filteredItems[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xl mx-auto z-40">
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-text-muted pointer-events-none">
          <Search className="w-5 h-5" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            if (query.trim().length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-11 pr-10 py-3 rounded-xl bg-bg-surface border border-border-color text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-red/50 focus:border-accent-red shadow-lg transition-all text-base disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen((prev) => !prev)}
          className="absolute right-3 text-text-muted hover:text-text-primary"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {isOpen && filteredItems.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 mt-2 max-h-72 overflow-y-auto rounded-xl bg-bg-surface border border-border-color shadow-2xl divide-y divide-border-color/60 z-50 backdrop-blur-md"
        >
          {filteredItems.map((item, idx) => {
            const isHighlighted = idx === highlightedIndex;
            const imgSrc =
              staticUrl(item.avatar_url) ||
              staticUrl(item.icon_url) ||
              staticUrl(item.image_url) ||
              item.avatar_url ||
              item.icon_url ||
              item.image_url;

            return (
              <li
                key={`${item.id}-${item.name}`}
                role="option"
                aria-selected={isHighlighted}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => handleSelect(item)}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                  isHighlighted ? 'bg-accent-red/20 text-text-primary font-bold' : 'text-text-secondary hover:bg-bg-elevated'
                }`}
              >
                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-bg-elevated border border-border-color flex-shrink-0 flex items-center justify-center">
                  {imgSrc ? (
                    <Image
                      src={imgSrc}
                      alt={item.name}
                      width={40}
                      height={40}
                      unoptimized
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <Sparkles className="w-5 h-5 text-text-muted" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate text-text-primary">{item.name}</div>
                  {item.subtitle && (
                    <div className="text-xs text-text-muted truncate">{item.subtitle}</div>
                  )}
                </div>

                {item.role && (
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      item.role === 'Killer'
                        ? 'bg-accent-red/20 text-accent-red border border-accent-red/40'
                        : item.role === 'Survivor'
                        ? 'bg-accent-green/20 text-accent-green border border-accent-green/40'
                        : 'bg-bg-elevated text-text-secondary border border-border-color'
                    }`}
                  >
                    {item.role}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
