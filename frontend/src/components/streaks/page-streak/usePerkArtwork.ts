'use client';

import { useEffect, useState } from 'react';

interface ApiPerk {
  name: string;
  character?: string | null;
  icon_local_path?: string | null;
  character_avatar_path?: string | null;
}

export interface PerkArtwork {
  iconByPerk: Record<string, string>;
  avatarByKiller: Record<string, string>;
}

const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/** Same URL shape the rest of the app uses: strip a leading `/` or `static/`, then prefix. */
export function staticUrl(rawPath?: string | null): string | null {
  if (!rawPath) return null;
  const cleanPath = rawPath.replace(/^\/?(static\/)?/, '');
  return `${backendBase}/static/${cleanPath}`;
}

export function usePerkArtwork(): PerkArtwork {
  const [artwork, setArtwork] = useState<PerkArtwork>({ iconByPerk: {}, avatarByKiller: {} });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${backendBase}/api/v1/perks?category=Killer&limit=200`);
        if (!res.ok) return;
        const body = await res.json();
        const perks: ApiPerk[] = body.data || [];
        if (cancelled) return;

        const iconByPerk: Record<string, string> = {};
        const avatarByKiller: Record<string, string> = {};
        for (const perk of perks) {
          const icon = staticUrl(perk.icon_local_path);
          if (icon) iconByPerk[perk.name] = icon;

          const avatar = staticUrl(perk.character_avatar_path);
          if (avatar && perk.character && perk.character !== 'General' && !avatarByKiller[perk.character]) {
            avatarByKiller[perk.character] = avatar;
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
