// frontend/src/app/[locale]/characters/[slug]/loading.tsx
import React from 'react';
import { CharacterDetailSkeleton } from '@/components/character-detail/CharactersSkeleton';

export default function CharacterDetailLoading() {
  return <CharacterDetailSkeleton />;
}
