// frontend/src/app/[locale]/characters/loading.tsx
//
// Mirrors the roster page's own loading state exactly (the same skeleton), so the route-level
// spinner and the page's spinner are one continuous element. The sidebar and <main> come from
// AppShell and stay mounted.
import React from 'react';
import { CharactersGridSkeleton } from '@/components/character-detail/CharactersSkeleton';

export default function CharactersLoading() {
  return <CharactersGridSkeleton />;
}
