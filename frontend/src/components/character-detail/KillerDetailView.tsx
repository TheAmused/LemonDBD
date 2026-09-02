'use client';
// frontend/src/components/character-detail/KillerDetailView.tsx

import React, { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { BookOpen, Flame, Bookmark, Calendar, ShieldCheck } from 'lucide-react';
import {
  CharacterViewBaseProps,
  AddonItem,
  EquipmentItem,
  OfferingItem,
  getAssetUrl,
  formatLocalizedReleaseDate,
  formatKillerHeight,
  localizeTerrorRadiusText,
} from './types';
import { CharacterBreadcrumbs } from './components/CharacterBreadcrumbs';
import { CharacterHeroAvatar } from './components/CharacterHeroAvatar';
import { KillerCombatStats } from './components/KillerCombatStats';
import { CharacterPerksSection } from './components/CharacterPerksSection';
import { KillerEquipmentSection } from './components/KillerEquipmentSection';
import { OfferingsSection } from './components/OfferingsSection';
import { Perk, PerkDictionary } from '@/types/perks';
import { getBackendBaseUrl } from '@/utils/perkUtils';

const LoreModal = dynamic(() => import('./modals/LoreModal').then((m) => m.LoreModal), { ssr: false });
const Model3DModal = dynamic(() => import('./modals/Model3DModal').then((m) => m.Model3DModal), { ssr: false });
const KillerPowerModal = dynamic(() => import('./modals/KillerPowerModal').then((m) => m.KillerPowerModal), { ssr: false });
const TerrorRadiusModal = dynamic(() => import('./modals/TerrorRadiusModal').then((m) => m.TerrorRadiusModal), { ssr: false });
const EquipmentDetailModal = dynamic(() => import('./modals/EquipmentDetailModal').then((m) => m.EquipmentDetailModal), { ssr: false });
const PerkModal = dynamic(() => import('@/components/PerkModal').then((m) => m.PerkModal), { ssr: false });

export const KillerDetailView: React.FC<CharacterViewBaseProps> = ({
  currentLocale,
  dict,
  detailData,
  allCharacters = [],
}) => {
  const backendBase = getBackendBaseUrl();
  const rawDict = (dict || {}) as Record<string, Record<string, string>>;
  const t: Record<string, string> = rawDict.characterDetail || rawDict.characters || {};

  const character = detailData?.character || { name: '', category: 'Killer' };
  const killerPower = detailData?.power;
  const perks = detailData?.perks || [];
  const addons = detailData?.addons || [];
  const offerings = detailData?.offerings || [];

  const [isLoreModalOpen, setIsLoreModalOpen] = useState<boolean>(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState<boolean>(false);
  const [isPowerModalOpen, setIsPowerModalOpen] = useState<boolean>(false);
  const [isTerrorRadiusModalOpen, setIsTerrorRadiusModalOpen] = useState<boolean>(false);
  const [selectedEquipment, setSelectedEquipment] = useState<AddonItem | EquipmentItem | OfferingItem | null>(null);
  const [selectedPerk, setSelectedPerk] = useState<Perk | null>(null);

  const killerSpeed = killerPower?.movement_speed || '4.6 m/s (115%)';
  const killerTerrorRadius = localizeTerrorRadiusText(killerPower?.terror_radius || '32 metres', currentLocale);
  const killerTRMeters = killerPower?.terror_radius_meters || 32;
  const killerHeight = formatKillerHeight(killerPower?.height, t);

  const chapterName = character.chapter_name || t.baseGame || '';
  const releaseDate = formatLocalizedReleaseDate(
    character.release_date || String(character.release_year || '2016'),
    currentLocale
  );
  const rawLoreText = character.lore || t.noLoreFound || '';

  const articleAriaLabel = t.characterDetails
    ? `${character.name} - ${t.characterDetails}`
    : character.name;

  const powerTitle = killerPower
    ? t.inspectPowerMechanics
      ? `${killerPower.name} (${t.inspectPowerMechanics})`
      : killerPower.name
    : '';

  const powerAriaLabel = killerPower
    ? t.powerDetails
      ? `${killerPower.name} - ${t.powerDetails}`
      : killerPower.name
    : '';

  return (
    <article className="space-y-8 animate-in fade-in duration-300 w-full" aria-label={articleAriaLabel}>
      {/* 1. Breadcrumbs & Character Navigator */}
      <CharacterBreadcrumbs
        currentLocale={currentLocale}
        character={character}
        roleLabel={t.roleKiller || ''}
        isSurvivor={false}
        allCharacters={allCharacters}
        t={t}
      />

      {/* 2. Main Hero Showcase */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Avatar Showcase */}
        <CharacterHeroAvatar
          character={character}
          isSurvivor={false}
          roleLabel={t.roleKiller || ''}
          backendBase={backendBase}
          onOpenModelModal={() => setIsModelModalOpen(true)}
          t={t}
        />

        {/* Right: Character Info & Identity */}
        <div className="lg:col-span-8 space-y-5">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-5">
              {killerPower && (
                <button
                  type="button"
                  onClick={() => setIsPowerModalOpen(true)}
                  className="group relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl bg-gradient-to-br from-rose-950 via-slate-950 to-slate-900 border-2 border-rose-500/60 hover:border-rose-400 p-2.5 flex items-center justify-center shadow-xl shadow-rose-950/50 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                  title={powerTitle}
                  aria-label={powerAriaLabel}
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
                    <Flame className="h-10 w-10 text-rose-400 animate-pulse" aria-hidden="true" />
                  )}
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4" aria-hidden="true">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-slate-950" />
                  </span>
                </button>
              )}

              <div>
                <span className="text-xs font-mono font-bold tracking-wider text-rose-500 uppercase">
                  {t.roleKiller || ''}{' '}
                  {character.is_licensed
                    ? `• ${t.dlcLicensed || ''}`
                    : `• ${t.dlcOriginal || ''}`}
                </span>
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                  {character.name}
                </h1>
                {character.real_name && character.real_name !== character.name && (
                  <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    {t.realName || ''}:{' '}
                    <span className="text-slate-700 dark:text-slate-200">{character.real_name}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsLoreModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                <span>{t.viewLore || ''}</span>
              </button>

              {chapterName && (
                <span className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-400 select-none">
                  <Bookmark className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {chapterName}
                </span>
              )}

              <span className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-400 select-none">
                <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {releaseDate}
              </span>

              <span className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-400 select-none">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {character.is_licensed
                  ? t.licensedFranchise || t.dlcLicensed || ''
                  : t.originalChapter || t.dlcOriginal || ''}
              </span>
            </div>
          </header>

          {/* Combat Stats Mini-Bar */}
          <KillerCombatStats
            killerSpeed={killerSpeed}
            killerTerrorRadius={killerTerrorRadius}
            killerHeight={killerHeight}
            onOpenTerrorRadiusModal={() => setIsTerrorRadiusModalOpen(true)}
            t={t}
          />

          {/* Perks Section */}
          <CharacterPerksSection
            perks={perks}
            character={character}
            backendBase={backendBase}
            onSelectPerk={(p) => setSelectedPerk(p as unknown as Perk)}
            t={t}
          />
        </div>
      </section>

      {/* 3. Killer Add-ons Section */}
      <KillerEquipmentSection
        addons={addons}
        backendBase={backendBase}
        onSelectEquipment={(item) => setSelectedEquipment(item)}
        t={t}
      />

      {/* 4. Dedicated Killer Offerings Section */}
      <OfferingsSection
        offerings={offerings}
        role="Killer"
        backendBase={backendBase}
        onSelectOffering={(item) => setSelectedEquipment(item as unknown as EquipmentItem)}
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
          dict={dict as PerkDictionary}
        />
      )}
    </article>
  );
};