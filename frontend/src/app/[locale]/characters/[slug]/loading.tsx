// frontend/src/app/[locale]/characters/[slug]/loading.tsx
import React from 'react';
import { PageShellFallback } from '@/components/layout/PageShellFallback';
import { CharacterDetailSkeleton } from '@/components/character-detail/CharactersSkeleton';

export default function CharacterDetailLoading() {
  return (
    <PageShellFallback
      mainClassName="overflow-y-auto text-text-primary"
      skeleton={<CharacterDetailSkeleton />}
    />
  );
}
