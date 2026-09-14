// frontend/src/app/[locale]/characters/loading.tsx
//
// Mirrors the roster page's own loading state exactly -- same skeleton, same
// <main> classes -- so the route-level spinner and the page's spinner are one
// continuous element rather than two that swap and re-centre.
import React from 'react';
import { CharactersGridSkeleton } from '@/components/character-detail/CharactersSkeleton';

export default function CharactersLoading() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
      <div
        aria-hidden="true"
        className="lemon-shell-aside hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-64 border-r border-border-color bg-bg-surface"
      />
      <div aria-hidden="true" className="h-16 shrink-0 border-b border-border-color lg:hidden" />
      <main className="flex-1 w-full overflow-y-auto p-4 sm:p-6 lg:p-8 lemon-shell-main">
        <CharactersGridSkeleton />
      </main>
    </div>
  );
}
