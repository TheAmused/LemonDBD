import React, { useState } from 'react';
import { BookOpen, Bookmark, Calendar, ShieldCheck } from 'lucide-react';
import { CharacterViewBaseProps, AddonItem, EquipmentItem } from './types';
import { CharacterBreadcrumbs } from './components/CharacterBreadcrumbs';
import { CharacterHeroAvatar } from './components/CharacterHeroAvatar';
import { CharacterPerksSection } from './components/CharacterPerksSection';
import { SurvivorEquipmentSection } from './components/SurvivorEquipmentSection';
import { LoreModal } from './modals/LoreModal';
import { Model3DModal } from './modals/Model3DModal';
import { EquipmentDetailModal } from './modals/EquipmentDetailModal';
import { PerkModal } from '@/components/PerkModal';
import { Perk as PerkModalType } from '@/components/PerkCard';

export const SurvivorDetailView: React.FC<CharacterViewBaseProps> = ({
  currentLocale,
  dict,
  detailData,
  allCharacters = [],
}) => {
  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const t = dict?.characters || {};

  const { character, perks = [], addons = [], items = [] } = detailData;

  const [isLoreModalOpen, setIsLoreModalOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<AddonItem | EquipmentItem | null>(null);
  const [selectedPerk, setSelectedPerk] = useState<PerkModalType | null>(null);

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
        roleLabel={t.survivor || 'Survivor'}
        isSurvivor={true}
        allCharacters={allCharacters}
        t={t}
      />

      {/* 2. Main Hero Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Avatar Showcase */}
        <CharacterHeroAvatar
          character={character}
          isSurvivor={true}
          roleLabel={t.survivor || 'Survivor'}
          backendBase={backendBase}
          onOpenModelModal={() => setIsModelModalOpen(true)}
          t={t}
        />

        {/* Right: Character Info & Identity */}
        <div className="lg:col-span-8 space-y-5">
          {/* Top row: name (left) | Lore & Bio + meta labels (right) */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* LEFT: name */}
            <div>
              <span className="text-xs font-mono font-bold tracking-wider text-emerald-500 uppercase">
                {t.survivor || 'Survivor'} {character.is_licensed ? `• ${t.licensed || 'Licensed DLC'}` : `• ${t.original || 'Original'}`}
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

          {/* Perks — pure icons, centered */}
          <CharacterPerksSection
            perks={perks}
            character={character}
            backendBase={backendBase}
            onSelectPerk={(p) => setSelectedPerk(p)}
            t={t}
          />
        </div>
      </div>

      {/* 3. Survival Equipment & Add-ons Section */}
      <SurvivorEquipmentSection
        items={items}
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
          dict={dict}
        />
      )}
    </div>
  );
};
