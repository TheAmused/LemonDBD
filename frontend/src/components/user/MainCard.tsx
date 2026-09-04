// frontend/src/components/user/MainCard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Shield, Skull, Plus, Minus, UserCheck, Sparkles } from 'lucide-react';
import { PerkDiamondSlot } from './PerkDiamondSlot';
import type { MainLoadout } from '@/types/userShowcase';
import type { RoleCategory, Perk } from '@/types/perks';
import type { Dictionary } from '@/locales/types';
import { getBackendBaseUrl, getCharacterAvatarUrl } from '@/utils/perkUtils';
import { fetchCached, fetchJson } from '@/services/dataCache';

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

  // Pre-load perks mapping so slot icons render with images
  useEffect(() => {
    const backendBase = getBackendBaseUrl();
    const url = `${backendBase}/api/v1/perks?limit=1000&lang=${locale}`;
    fetchCached<any>(url, () => fetchJson(url))
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

  const handlePrestigeDelta = (delta: number) => {
    const next = Math.max(1, Math.min(100, loadout.prestige + delta));
    onPrestigeChange(next);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border p-5 sm:p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-6 ${
        isSurvivor
          ? 'border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 via-slate-900/80 to-slate-950/90'
          : 'border-red-500/30 bg-gradient-to-br from-red-950/20 via-slate-900/80 to-slate-950/90'
      }`}
    >
      {/* Background Accent Glow */}
      <div
        className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl ${
          isSurvivor ? 'bg-cyan-500/10' : 'bg-red-600/10'
        }`}
      />

      {/* Top Bar: Role Label & Prestige Badge */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-xl ${
              isSurvivor ? 'bg-cyan-500/20 text-cyan-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {isSurvivor ? <Shield className="h-4 w-4" /> : <Skull className="h-4 w-4" />}
          </div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono">
            {isSurvivor
              ? dict?.user?.survivorMain || 'Survivor Main'
              : dict?.user?.killerMain || 'Killer Main'}
          </h3>
        </div>

        {/* Prestige Level Control */}
        <div className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-950/40 px-2 py-1 text-slate-100 shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-red-400">
            {dict?.user?.prestige || 'Prestige'}
          </span>
          <button
            type="button"
            onClick={() => handlePrestigeDelta(-1)}
            disabled={loadout.prestige <= 1}
            className="h-5 w-5 flex items-center justify-center rounded bg-slate-900/80 text-red-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer text-xs"
            title={dict?.user?.decreasePrestige || 'Decrease Prestige'}
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="font-mono text-xs font-black text-red-200 min-w-[20px] text-center">
            {loadout.prestige}
          </span>
          <button
            type="button"
            onClick={() => handlePrestigeDelta(1)}
            disabled={loadout.prestige >= 100}
            className="h-5 w-5 flex items-center justify-center rounded bg-slate-900/80 text-red-300 hover:bg-slate-800 disabled:opacity-40 cursor-pointer text-xs"
            title={dict?.user?.increasePrestige || 'Increase Prestige'}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Center Row: Character Portrait & Selector */}
      <div className="relative z-10 flex items-center gap-4">
        {/* Character Portrait */}
        <div
          onClick={onOpenCharacterModal}
          className="relative group w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-slate-700 hover:border-amber-400 cursor-pointer shadow-lg bg-slate-950 shrink-0 transition-all hover:scale-102"
        >
          {avatarSrc ? (
            <Image
              src={avatarSrc}
              alt={loadout.characterName}
              fill
              sizes="96px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-lg">
              {loadout.characterName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-xs">
            {dict?.user?.changeMain || 'Change'}
          </div>
        </div>

        {/* Character Info */}
        <div className="space-y-2 flex-1">
          <div>
            <h4 className="text-base sm:text-lg font-black text-slate-100 font-mono tracking-wide line-clamp-1">
              {loadout.characterName}
            </h4>
            <p className="text-[11px] text-slate-400">
              {(dict?.user?.prestigeProgress || 'Prestige level {level} of 100').replace('{level}', String(loadout.prestige))}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCharacterModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            <UserCheck className="h-3.5 w-3.5 text-amber-400" />
            <span>{dict?.user?.changeMain || 'Change Character'}</span>
          </button>
        </div>
      </div>

      {/* Diamond Perk Loadout Layout */}
      <div className="relative z-10 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between pb-3">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
            <Sparkles className="h-3 w-3 text-purple-400" />
            <span>{dict?.user?.signatureLoadout || '4-Perk Signature Loadout'}</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {(dict?.user?.equippedCount || '{count}/4 equipped').replace('{count}', String(loadout.perkIds.filter(Boolean).length))}
          </span>
        </div>

        {/* Iconic Dead by Daylight Diamond Perk Cluster:
            Slot 0: Top
            Slot 3: Left,  Slot 1: Right
            Slot 2: Bottom
        */}
        <div className="flex flex-col items-center justify-center py-2">
          {/* Top Slot (Slot 0) */}
          <div className="mb-2">
            <PerkDiamondSlot
              slotIndex={0}
              perk={perksBySlot[0]}
              perkId={loadout.perkIds[0]}
              onClick={() => onOpenPerkModal(0)}
              onClear={() => onPerkChange(0, null)}
              emptyLabel={dict?.user?.emptySlot || 'Slot 1'}
              clearLabel={dict?.user?.clearPerk || 'Clear'}
            />
          </div>

          {/* Middle Row: Left Slot (Slot 3) & Right Slot (Slot 1) */}
          <div className="flex items-center justify-center gap-12 sm:gap-16 my-1">
            <PerkDiamondSlot
              slotIndex={3}
              perk={perksBySlot[3]}
              perkId={loadout.perkIds[3]}
              onClick={() => onOpenPerkModal(3)}
              onClear={() => onPerkChange(3, null)}
              emptyLabel={dict?.user?.emptySlot || 'Slot 4'}
              clearLabel={dict?.user?.clearPerk || 'Clear'}
            />
            <PerkDiamondSlot
              slotIndex={1}
              perk={perksBySlot[1]}
              perkId={loadout.perkIds[1]}
              onClick={() => onOpenPerkModal(1)}
              onClear={() => onPerkChange(1, null)}
              emptyLabel={dict?.user?.emptySlot || 'Slot 2'}
              clearLabel={dict?.user?.clearPerk || 'Clear'}
            />
          </div>

          {/* Bottom Slot (Slot 2) */}
          <div className="mt-2">
            <PerkDiamondSlot
              slotIndex={2}
              perk={perksBySlot[2]}
              perkId={loadout.perkIds[2]}
              onClick={() => onOpenPerkModal(2)}
              onClear={() => onPerkChange(2, null)}
              emptyLabel={dict?.user?.emptySlot || 'Slot 3'}
              clearLabel={dict?.user?.clearPerk || 'Clear'}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
