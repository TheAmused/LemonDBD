'use client';
// frontend/src/components/character-detail/SurvivorDetailView.tsx

import React, { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { BookOpen, Bookmark, Calendar, ShieldCheck } from 'lucide-react';
import {
  CharacterViewBaseProps,
  AddonItem,
  EquipmentItem,
  OfferingItem,
  formatLocalizedReleaseDate,
} from './types';
import { CharacterBreadcrumbs } from './components/CharacterBreadcrumbs';
import { CharacterHeroAvatar } from './components/CharacterHeroAvatar';
import { CharacterPerksSection } from './components/CharacterPerksSection';
import { SurvivorEquipmentSection } from './components/SurvivorEquipmentSection';
import { OfferingsSection } from './components/OfferingsSection';
import { Perk, PerkDictionary } from '@/types/perks';
import { getBackendBaseUrl } from '@/utils/perkUtils';

const LoreModal = dynamic(() => import('./modals/LoreModal').then((m) => m.LoreModal), { ssr: false });
const Model3DModal = dynamic(() => import('./modals/Model3DModal').then((m) => m.Model3DModal), { ssr: false });
const EquipmentDetailModal = dynamic(() => import('./modals/EquipmentDetailModal').then((m) => m.EquipmentDetailModal), { ssr: false });
const PerkModal = dynamic(() => import('@/components/PerkModal').then((m) => m.PerkModal), { ssr: false });

export const SurvivorDetailView: React.FC<CharacterViewBaseProps> = ({
  currentLocale,
  dict,
  detailData,
  allCharacters = [],
}) => {
  const backendBase = getBackendBaseUrl();
  const rawDict = (dict || {}) as Record<string, Record<string, string>>;
  const t: Record<string, string> = rawDict.characterDetail || rawDict.characters || {};

  const character = detailData?.character || { name: '', category: 'Survivor' };
  const perks = Array.isArray(detailData?.perks) ? detailData.perks : [];
  const addons = Array.isArray(detailData?.addons) ? detailData.addons : [];
  const items = Array.isArray(detailData?.items) ? detailData.items : [];
  const offerings = Array.isArray(detailData?.offerings) ? detailData.offerings : [];

  const [isLoreModalOpen, setIsLoreModalOpen] = useState<boolean>(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState<boolean>(false);
  const [selectedEquipment, setSelectedEquipment] = useState<AddonItem | EquipmentItem | OfferingItem | null>(null);
  const [selectedPerk, setSelectedPerk] = useState<Perk | null>(null);

  const chapterName = character.chapter_name || t.baseGame || '';
  const releaseDate = formatLocalizedReleaseDate(
    character.release_date || String(character.release_year || '2016'),
    currentLocale
  );
  const rawLoreText = character.lore || t.noLoreFound || '';

  const articleAriaLabel = t.characterDetails
    ? `${character.name} - ${t.characterDetails}`
    : character.name;

  return (
    <article className="space-y-8 animate-in fade-in duration-300 w-full" aria-label={articleAriaLabel}>
      <CharacterBreadcrumbs
        currentLocale={currentLocale}
        character={character}
        roleLabel={t.roleSurvivor || ''}
        isSurvivor={true}
        allCharacters={allCharacters}
        t={t}
      />

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <CharacterHeroAvatar
          character={character}
          isSurvivor={true}
          roleLabel={t.roleSurvivor || ''}
          backendBase={backendBase}
          onOpenModelModal={() => setIsModelModalOpen(true)}
          t={t}
        />

        <div className="lg:col-span-8 space-y-5">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase">
                {t.roleSurvivor || ''}{' '}
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

          <CharacterPerksSection
            perks={perks}
            character={character}
            backendBase={backendBase}
            onSelectPerk={(p) => setSelectedPerk(p as unknown as Perk)}
            t={t}
          />
        </div>
      </section>

      <SurvivorEquipmentSection
        items={items}
        addons={addons}
        backendBase={backendBase}
        onSelectEquipment={(item) => setSelectedEquipment(item)}
        t={t}
      />

      <OfferingsSection
        offerings={offerings}
        role="Survivor"
        backendBase={backendBase}
        onSelectOffering={(item) => setSelectedEquipment(item as unknown as EquipmentItem)}
        t={t}
      />

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
        isSurvivor={true}
        backendBase={backendBase}
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