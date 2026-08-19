'use client';
// frontend/src/components/character-detail/CharacterSubpageView.tsx

import React from 'react';
import { CharacterDetailPayload, CharacterItem } from './types';
import { SurvivorDetailView } from './SurvivorDetailView';
import { KillerDetailView } from './KillerDetailView';

export * from './types';
export * from './SurvivorDetailView';
export * from './KillerDetailView';

interface CharacterSubpageViewProps {
  currentLocale: string;
  dict: Record<string, Record<string, string>>;
  detailData: CharacterDetailPayload;
  allCharacters?: CharacterItem[];
}

export const CharacterSubpageView: React.FC<CharacterSubpageViewProps> = (props) => {
  const { detailData } = props;
  const role = (detailData.character.category || detailData.character.role || '').toLowerCase();
  const isSurvivor = role === 'survivor';

  if (isSurvivor) {
    return <SurvivorDetailView {...props} />;
  }

  return <KillerDetailView {...props} />;
};

export default CharacterSubpageView;

