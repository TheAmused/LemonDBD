// frontend/src/components/streaks/page-streak/usePerkArtwork.ts
'use client';

import { useEffect, useState } from 'react';

interface ApiPerk {
  name: string;
  character?: string | null;
  icon_local_path?: string | null;
  character_avatar_path?: string | null;
}

interface ApiCharacter {
  name: string;
  avatar_local_path?: string | null;
  portrait_url?: string | null;
  avatar_url?: string | null;
}

export interface PerkArtwork {
  iconByPerk: Record<string, string>;
  avatarByKiller: Record<string, string>;
}

const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/** Same URL shape the rest of the app uses: strip a leading `/` or `static/`, then prefix. */
export function staticUrl(rawPath?: string | null): string | null {
  if (!rawPath) return null;
  if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) return rawPath;
  const cleanPath = rawPath.replace(/^\/?(static\/)?/, '');
  return `${backendBase}/static/${cleanPath}`;
}

export function usePerkArtwork(): PerkArtwork {
  const [artwork, setArtwork] = useState<PerkArtwork>({ iconByPerk: {}, avatarByKiller: {} });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [perksRes, charsRes] = await Promise.all([
          fetch(`${backendBase}/api/v1/perks?category=Killer&limit=500`),
          fetch(`${backendBase}/api/v1/characters?category=Killer`),
        ]);

        if (cancelled) return;

        const iconByPerk: Record<string, string> = {};
        const avatarByKiller: Record<string, string> = {};

        if (charsRes.ok) {
          const charsBody = await charsRes.json();
          const characters: ApiCharacter[] = charsBody.data || [];
          for (const char of characters) {
            const avatar = staticUrl(char.avatar_local_path || char.portrait_url || char.avatar_url);
            if (avatar) {
              avatarByKiller[char.name] = avatar;
            } else {
              const sanitized = char.name
                .toLowerCase()
                .trim()
                .replace(/[\s\-/]+/g, '_')
                .replace(/[\\/*?:"<>|]/g, '')
                .replace(/_+/g, '_')
                .replace(/^_+|_+$/g, '');
              avatarByKiller[char.name] = `${backendBase}/static/avatars/killers/${sanitized}.png`;
            }
          }
        }

        if (perksRes.ok) {
          const perksBody = await perksRes.json();
          const perks: ApiPerk[] = perksBody.data || [];
          for (const perk of perks) {
            const icon = staticUrl(perk.icon_local_path);
            if (icon) iconByPerk[perk.name] = icon;

            const avatar = staticUrl(perk.character_avatar_path);
            if (avatar && perk.character && perk.character !== 'General' && !avatarByKiller[perk.character]) {
              avatarByKiller[perk.character] = avatar;
            }
          }
        }

        setArtwork({ iconByPerk, avatarByKiller });
      } catch (err) {
        console.error('Failed to load page streak artwork:', err);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return artwork;
}
