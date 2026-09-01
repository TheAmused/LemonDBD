// frontend/src/app/[locale]/characters/[slug]/loading.tsx
import React from 'react';
import { DbdSpinner } from '@/components/DbdSpinner';

export default function CharacterDetailLoading() {
  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col lg:flex-row dbd-fog-overlay transition-colors duration-300">
      <div className="hidden lg:block w-72 shrink-0 border-r border-slate-800/60 bg-slate-950/60" />
      <main className="flex-1 w-full min-h-[500px] flex items-center justify-center p-6 lg:p-8 lg:pl-72">
        <DbdSpinner
          size="responsive"
          layout="inline"
          accent="blood"
          needleSpeed={1.3}
          label="Decrypting Character Lore..."
          sublabel="Loading unique perks, power stats, and bio"
        />
      </main>
    </div>
  );
}
