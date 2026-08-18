import React, { useState } from 'react';
import { BookOpen, Flame, Bookmark, Calendar, ShieldCheck } from 'lucide-react';
import { CharacterViewBaseProps, AddonItem, EquipmentItem, getAssetUrl } from './types';
import { CharacterBreadcrumbs } from './components/CharacterBreadcrumbs';
import { CharacterHeroAvatar } from './components/CharacterHeroAvatar';
import { KillerCombatStats } from './components/KillerCombatStats';
import { CharacterPerksSection } from './components/CharacterPerksSection';
import { KillerEquipmentSection } from './components/KillerEquipmentSection';
import { LoreModal } from './modals/LoreModal';
import { Model3DModal } from './modals/Model3DModal';
import { KillerPowerModal } from './modals/KillerPowerModal';
import { TerrorRadiusModal } from './modals/TerrorRadiusModal';
import { EquipmentDetailModal } from './modals/EquipmentDetailModal';
import { PerkModal } from '@/components/PerkModal';
import { Perk as PerkModalType } from '@/components/PerkCard';

export const KillerDetailView: React.FC<CharacterViewBaseProps> = ({
  currentLocale,
  dict,
  detailData,
  allCharacters = [],
}) => {
  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const t = dict?.characters || {};

  const { character, power: killerPower, perks = [], addons = [] } = detailData;

  const [isLoreModalOpen, setIsLoreModalOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isPowerModalOpen, setIsPowerModalOpen] = useState(false);
  const [isTerrorRadiusModalOpen, setIsTerrorRadiusModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<AddonItem | EquipmentItem | null>(null);
  const [selectedPerk, setSelectedPerk] = useState<PerkModalType | null>(null);

  const killerSpeed = killerPower?.movement_speed || '4.6 m/s (115%)';
  const killerTerrorRadius = killerPower?.terror_radius || '32 metres';
  const killerTRMeters = killerPower?.terror_radius_meters || 32;
  const killerHeight = killerPower?.height || 'Tall';

  const chapterName = character.chapter_name || 'Base Game';
  const releaseDate = character.release_date || String(character.release_year || '2016');
  const dlcCounterparts = character.dlc_counterparts || [];
  const rawLoreText = character.lore || "No lore records discovered in the Entity's Archives yet.";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Breadcrumbs & Character Navigator */}
      <CharacterBreadcrumbs
        currentLocale={currentLocale}
        character={character}
        roleLabel={t.killer || 'Killer'}
        isSurvivor={false}
        allCharacters={allCharacters}
        t={t}
      />

      {/* 2. Main Hero Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Avatar Showcase */}
        <CharacterHeroAvatar
          character={character}
          isSurvivor={false}
          roleLabel={t.killer || 'Killer'}
          backendBase={backendBase}
          onOpenModelModal={() => setIsModelModalOpen(true)}
          t={t}
        />

        {/* Right: Character Info & Identity */}
        <div className="lg:col-span-8 space-y-5">
          {/* Top row: power icon + name (left) | Lore & Bio + meta labels (right) */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* LEFT: power icon + name */}
            <div className="flex items-center gap-4 sm:gap-5">
              {/* Standalone Clickable Killer Power Icon */}
              {killerPower && (
                <button
                  onClick={() => setIsPowerModalOpen(true)}
                  className="group relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl bg-gradient-to-br from-rose-950 via-slate-950 to-slate-900 border-2 border-rose-500/60 hover:border-rose-400 p-2.5 flex items-center justify-center shadow-xl shadow-rose-950/50 hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer"
                  title={`${killerPower.name} - ${t.killerPower || 'Killer Power'} (Click to inspect power details)`}
                  aria-label={`${killerPower.name} Power`}
                >
                  {killerPower.icon_url || killerPower.icon_local_path ? (
                    <img
                      src={getAssetUrl(backendBase, killerPower.icon_local_path, killerPower.icon_url)}
                      alt={killerPower.name}
                      className="h-full w-full object-contain filter drop-shadow-[0_0_10px_rgba(244,63,94,0.8)] group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        if (killerPower.icon_url && img.src !== killerPower.icon_url) {
                          img.src = killerPower.icon_url;
                        }
                      }}
                    />
                  ) : (
                    <Flame className="h-10 w-10 text-rose-400 animate-pulse" />
                  )}
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-slate-950" />
                  </span>
                </button>
              )}

              <div>
                <span className="text-xs font-mono font-bold tracking-wider text-rose-500 uppercase">
                  {t.killer || 'Killer'} {character.is_licensed ? `• ${t.licensed || 'Licensed DLC'}` : `• ${t.original || 'Original'}`}
                </span>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                  {character.name}
                </h1>
                {character.real_name && character.real_name !== character.name && (
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    {t.realName || 'Full Name'}: <span className="text-slate-700 dark:text-slate-200">{character.real_name}</span>
                  </p>
                )}
              </div>
            </div>

            {/* RIGHT: Lore & Bio button + meta labels */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setIsLoreModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <BookOpen className="h-4 w-4" />
                <span>{t.viewLore || 'Lore & Bio'}</span>
              </button>

              {/* Chapter label */}
              <span className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-400 select-none">
                <Bookmark className="h-3.5 w-3.5 shrink-0" />
                {chapterName}
              </span>

              {/* Release Date label */}
              <span className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-400 select-none">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {releaseDate}
              </span>

              {/* Licensing label */}
              <span className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-400 select-none">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                {character.is_licensed ? 'Licensed Franchise' : 'Dead by Daylight Original'}
              </span>
            </div>
          </div>

          {/* Combat Stats Mini-Bar */}
          <KillerCombatStats
            killerSpeed={killerSpeed}
            killerTerrorRadius={killerTerrorRadius}
            killerHeight={killerHeight}
            onOpenTerrorRadiusModal={() => setIsTerrorRadiusModalOpen(true)}
            t={t}
          />

          {/* Perks — pure icons, centered, below meta row */}
          <CharacterPerksSection
            perks={perks}
            character={character}
            backendBase={backendBase}
            onSelectPerk={(p) => setSelectedPerk(p)}
            t={t}
          />
        </div>
      </div>

      {/* 3. Killer Add-ons Section */}
      <KillerEquipmentSection
        addons={addons}
        backendBase={backendBase}
        onSelectEquipment={(item) => setSelectedEquipment(item)}
        t={t}
      />

      {/* Modals */}
      <LoreModal
        isOpen={isLoreModalOpen}
        onClose={() => setIsLoreModalOpen(false)}
        character={character}
        rawLoreText={rawLoreText}
        t={t}
      />

      <Model3DModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        character={character}
        isSurvivor={false}
        backendBase={backendBase}
        t={t}
      />

      {killerPower && (
        <KillerPowerModal
          isOpen={isPowerModalOpen}
          onClose={() => setIsPowerModalOpen(false)}
          killerPower={killerPower}
          character={character}
          killerSpeed={killerSpeed}
          killerTerrorRadius={killerTerrorRadius}
          killerHeight={killerHeight}
          backendBase={backendBase}
          t={t}
        />
      )}

      <TerrorRadiusModal
        isOpen={isTerrorRadiusModalOpen}
        onClose={() => setIsTerrorRadiusModalOpen(false)}
        character={character}
        killerTerrorRadius={killerTerrorRadius}
        killerTRMeters={killerTRMeters}
        killerSpeed={killerSpeed}
        t={t}
      />

      <EquipmentDetailModal
        item={selectedEquipment}
        onClose={() => setSelectedEquipment(null)}
        backendBase={backendBase}
        t={t}
      />

      {selectedPerk && (
        <PerkModal
          perk={selectedPerk}
          onClose={() => setSelectedPerk(null)}
          dict={dict}
        />
      )}
    </div>
  );
};
