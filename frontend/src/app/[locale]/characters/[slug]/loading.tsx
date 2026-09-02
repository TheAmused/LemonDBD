// frontend/src/app/[locale]/characters/[slug]/loading.tsx
//
// Route-level loading state, shown while the /characters/[slug] segment and its
// client bundle are fetched.
//
// This deliberately renders the SAME skeleton, in a <main> with the SAME
// classes, as the page's own `loading` branch. Previously the two differed --
// different label, different vertical centring, different left gutter -- so a
// single navigation read as two separate spinners that jumped between frames.
// Keeping them identical makes the handover invisible: one spinner, one place.
import React from 'react';
import { CharacterDetailSkeleton } from '@/components/character-detail/CharactersSkeleton';

export default function CharacterDetailLoading() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
      <div
        aria-hidden="true"
        className="lemon-shell-aside hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-64 border-r border-slate-800/60 bg-slate-950/60"
      />
      {/* Stands in for the sidebar's mobile header so nothing shifts vertically. */}
      <div aria-hidden="true" className="h-16 shrink-0 border-b border-slate-800/60 lg:hidden" />
      <main className="flex-1 w-full overflow-y-auto p-4 sm:p-6 lg:p-8 lemon-shell-main">
        <CharacterDetailSkeleton />
      </main>
    </div>
  );
}
