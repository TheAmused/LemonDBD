'use client';
// frontend/src/components/character-detail/CharactersClient.tsx

import React, { Suspense } from 'react';
import { CharactersHub } from '@/components/CharactersHub';
import { CharactersGridSkeleton } from '@/components/character-detail/CharactersSkeleton';

export function CharactersClient() {
  return (
    <div className="relative z-10">
      <Suspense fallback={<CharactersGridSkeleton />}>
        <CharactersHub />
      </Suspense>
    </div>
  );
}
