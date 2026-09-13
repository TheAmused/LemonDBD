// frontend/src/components/user/MainCard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Shield, Skull, Sparkles } from 'lucide-react';
import { PerkDiamondSlot } from './PerkDiamondSlot';
import type { MainLoadout } from '@/types/userShowcase';
import type { RoleCategory, Perk } from '@/types/perks';
import type { Dictionary } from '@/locales/types';
import { getCharacterAvatarUrl } from '@/utils/perkUtils';
import { CATALOG_TTL_MS, catalogKey, fetchCached, fetchJson } from '@/services/dataCache';

interface MainCardProps {
  role: RoleCategory;
  loadout: MainLoadout;
  onCharacterChange: (name: string) => void;
  onPrestigeChange: (prestige: number) => void;
  onPerkChange: (slotIndex: number, perkId: number | null) => void;
  onOpenCharacterModal: () => void;
  onOpenPerkModal: (slotIndex: number) => void;
  dict?: Dictionary | null;
  locale?: string;
}

export const MainCard: React.FC<MainCardProps> = ({
  role,
  loadout,
  onCharacterChange,
  onPrestigeChange,
  onPerkChange,
  onOpenCharacterModal,
  onOpenPerkModal,
  dict,
  locale = 'en',
}) => {
  const isSurvivor = role === 'Survivor';
  const [allPerks, setAllPerks] = useState<Perk[]>([]);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [loadout.characterName]);

  // Pre-load perks mapping so slot icons render with images. This is the whole
  // perk table for four icons, so it leans on the catalog window: the showcase
  // is reachable from several places and none of them should pay for it twice.
  useEffect(() => {
    const url = catalogKey('perks', { limit: 1000, lang: locale });
    fetchCached<any>(url, () => fetchJson(url), { ttlMs: CATALOG_TTL_MS })
      .then((data) => {
        const list: Perk[] = Array.isArray(data) ? data : data?.data || [];
        setAllPerks(list);
      })
      .catch(() => {});
  }, [locale]);

  const perksBySlot = loadout.perkIds.map((id) =>
    id !== null ? allPerks.find((p) => p.id === id) || null : null
  );

  const avatarSrc = getCharacterAvatarUrl(
    { character: loadout.characterName, category: role },
    role
  );

  return (
    <div
      aria-label={isSurvivor ? (dict?.user?.survivorMain || 'Survivor Main') : (dict?.user?.killerMain || 'Killer Main')}
      className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 backdrop-blur-xl shadow-md transition-all ${
        isSurvivor
          ? 'border-cyan-500/35 bg-bg-surface hover:border-cyan-500/50'
          : 'border-accent-red/35 bg-bg-surface hover:border-accent-red/50'
      }`}
    >
      {/* Background Accent Glow */}
      <div
        className={`pointer-events-none absolute -top-16 h-48 w-48 rounded-full blur-3xl opacity-20 ${
          isSurvivor ? '-left-16 bg-cyan-500' : '-right-16 bg-accent-red'
        }`}
      />

      {/* Side-by-side: Survivor (Left = Avatar, Right = Perks) vs Killer (Left = Perks, Right = Avatar) */}
      <div
        className={`relative z-10 flex flex-col sm:flex-row items-center justify-around gap-4 sm:gap-6 ${
          !isSurvivor ? 'sm:flex-row-reverse' : ''
        }`}
      >
        {/* Left: Bigger Character Portrait & Name */}
        <div className="flex flex-col items-center text-center gap-3 shrink-0">
          <div
            role="button"
            tabIndex={0}
            onClick={onOpenCharacterModal}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onOpenCharacterModal();
              }
            }}
            title={dict?.user?.changeMain || 'Change Main'}
            aria-label={dict?.user?.changeMain || 'Change Main'}
            className="relative group w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-2 border-border-color hover:border-accent-red cursor-pointer shadow-lg bg-bg-elevated shrink-0 transition-all hover:scale-102 focus:outline-none focus:ring-2 focus:ring-accent-red"
          >
            {avatarSrc && !imgError ? (
              <Image
                src={avatarSrc}
                alt={loadout.characterName}
                fill
                sizes="(max-width: 640px) 112px, 144px"
                className="object-cover"
                onError={() => setImgError(true)}
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-bg-elevated text-text-muted font-bold font-mono">
                <span className="text-2xl sm:text-3xl tracking-wider text-text-primary">
                  {loadout.characterName.slice(0, 2).toUpperCase()}
                </span>
                <span className="text-[10px] font-mono text-text-muted">
                  {role.toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-white uppercase tracking-wider backdrop-blur-xs font-mono">
              {dict?.user?.changeMain || 'Change'}
            </div>
          </div>

          <h3 className="text-base sm:text-lg font-black text-text-primary font-mono tracking-wide truncate max-w-[180px]">
            {loadout.characterName}
          </h3>
        </div>

        {/* Right: 4-Perk Signature Diamond Loadout */}
        <div
          aria-label={dict?.user?.signatureLoadout || '4-Perk Signature Loadout'}
          className="relative flex flex-col items-center justify-center p-2 shrink-0"
        >
          {/* Subtle diamond connector crosshairs */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rotate-45 border border-border-color/25 rounded-2xl" />
          </div>

          {/* Top Slot (Slot 0) */}
          <div className="relative z-10 mb-2">
            <PerkDiamondSlot
              slotIndex={0}
              perk={perksBySlot[0]}
              perkId={loadout.perkIds[0]}
              onClick={() => onOpenPerkModal(0)}
              onClear={() => onPerkChange(0, null)}
              emptyLabel={dict?.user?.emptySlot || 'Empty Slot'}
              clearLabel={dict?.user?.clearPerk || 'Clear'}
            />
          </div>

          {/* Middle Row: Left Slot (Slot 3) & Right Slot (Slot 1) */}
          <div className="relative z-10 flex items-center justify-center gap-8 sm:gap-12 my-1">
            <PerkDiamondSlot
              slotIndex={3}
              perk={perksBySlot[3]}
              perkId={loadout.perkIds[3]}
              onClick={() => onOpenPerkModal(3)}
              onClear={() => onPerkChange(3, null)}
              emptyLabel={dict?.user?.emptySlot || 'Empty Slot'}
              clearLabel={dict?.user?.clearPerk || 'Clear'}
            />
            <PerkDiamondSlot
              slotIndex={1}
              perk={perksBySlot[1]}
              perkId={loadout.perkIds[1]}
              onClick={() => onOpenPerkModal(1)}
              onClear={() => onPerkChange(1, null)}
              emptyLabel={dict?.user?.emptySlot || 'Empty Slot'}
              clearLabel={dict?.user?.clearPerk || 'Clear'}
            />
          </div>

          {/* Bottom Slot (Slot 2) */}
          <div className="relative z-10 mt-2">
            <PerkDiamondSlot
              slotIndex={2}
              perk={perksBySlot[2]}
              perkId={loadout.perkIds[2]}
              onClick={() => onOpenPerkModal(2)}
              onClear={() => onPerkChange(2, null)}
              emptyLabel={dict?.user?.emptySlot || 'Empty Slot'}
              clearLabel={dict?.user?.clearPerk || 'Clear'}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
