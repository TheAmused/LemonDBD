'use client';
// frontend/src/components/character-detail/SurvivorDetailView.tsx

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { BookOpen, Bookmark, Calendar } from 'lucide-react';
import type {
  CharacterViewBaseProps,
  AddonItem,
  EquipmentItem,
  OfferingItem} from './types';
import {
  formatLocalizedReleaseDate,
} from './types';
import { CharacterTopBar } from './components/CharacterTopBar';
import { CharacterHeroAvatar } from './components/CharacterHeroAvatar';
import { CharacterPerksSection } from './components/CharacterPerksSection';
import { SurvivorEquipmentSection } from './components/SurvivorEquipmentSection';
import { OfferingsSection } from './components/OfferingsSection';
import type { Perk } from '@/types/perks';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { Button } from '@/components/common/Button';
import { InfoChip } from '@/components/common/InfoChip';
import { WrapRow } from '@/components/common/WrapRow';
import { useDictionary } from "@/context/DictionaryContext";

const LoreModal = dynamic(() => import('./modals/LoreModal').then((m) => m.LoreModal), { ssr: false });
const Model3DModal = dynamic(() => import('./modals/Model3DModal').then((m) => m.Model3DModal), { ssr: false });
const EquipmentDetailModal = dynamic(() => import('./modals/EquipmentDetailModal').then((m) => m.EquipmentDetailModal), { ssr: false });
const PerkModal = dynamic(() => import('@/components/PerkModal').then((m) => m.PerkModal), { ssr: false });

export const SurvivorDetailView: React.FC<CharacterViewBaseProps> = ({ currentLocale, detailData, allCharacters = [] }) => {
  const dict = useDictionary();
  const backendBase = getBackendBaseUrl();
  const t = dict.characterDetail;

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
  const rawLoreText = character.lore || '';

  return (
    <article className="space-y-8 animate-in fade-in duration-300 w-full" aria-label={character.name}>
      <CharacterTopBar
        currentLocale={currentLocale}
        character={character}
        isSurvivor={true}
        allCharacters={allCharacters}
        t={t}
      />

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start lg:items-stretch">
        <CharacterHeroAvatar
          character={character}
          isSurvivor={true}
          roleLabel={t.roleSurvivor || ''}
          backendBase={backendBase}
          onOpenModelModal={() => setIsModelModalOpen(true)}
          t={t}
        />

        <div className="lg:col-span-8 flex flex-col gap-5">
          <header className="flex flex-col items-center text-center gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:text-left">
            <div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-text-primary tracking-tight">
                {character.name}
              </h1>
              {character.real_name && character.real_name !== character.name && (
                <p className="type-strong-fluid text-text-secondary mt-1.5">
                  {t.realName || ''}:{' '}
                  <span className="text-text-primary">{character.real_name}</span>
                </p>
              )}
            </div>

            <WrapRow>
              <Button
                variant="secondary"
                onClick={() => setIsLoreModalOpen(true)}
                leftIcon={<BookOpen className="icon-md" aria-hidden="true" />}
                className=""
              >
                <span>{t.viewLore || ''}</span>
              </Button>

              {chapterName && (
                <InfoChip>
                  <Bookmark className="icon-sm shrink-0" aria-hidden="true" />
                  {chapterName}
                </InfoChip>
              )}

              <InfoChip>
                <Calendar className="icon-sm shrink-0" aria-hidden="true" />
                {releaseDate}
              </InfoChip>

              <InfoChip>
                {character.is_licensed
                  ? t.dlcLicensed
                  : t.dlcOriginal}
              </InfoChip>
            </WrapRow>
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
        characterRole="Survivor"
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
        />
      )}
    </article>
  );
};