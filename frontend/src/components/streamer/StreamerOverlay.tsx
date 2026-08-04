'use client';

import React, { useEffect, useState } from 'react';
import { Flame, Shield, Trophy } from 'lucide-react';
import { ChallengeRun } from '@/types/challenge';
import { fetchActiveRun } from '@/services/challengeApi';

export const StreamerOverlay: React.FC = () => {
  const [run, setRun] = useState<ChallengeRun | null>(null);
  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

  useEffect(() => {
    async function pollRun() {
      try {
        const data = await fetchActiveRun('survivor');
        setRun(data.run);
      } catch (e) {
        console.error(e);
      }
    }
    pollRun();
    const interval = setInterval(pollRun, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!run) return null;

  const loadout = run.current_loadout;

  return (
    <div className="p-4 bg-transparent min-h-screen flex items-start justify-start select-none">
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950/90 border-2 border-amber-500/80 shadow-2xl backdrop-blur-md text-white max-w-xl">
        {/* Active Character Portrait */}
        <div className="flex flex-col items-center shrink-0">
          <div className="w-20 h-20 rounded-xl border-2 border-amber-400 bg-slate-900 flex items-center justify-center text-xs font-bold text-amber-300 text-center p-1 shadow-lg">
            {loadout?.character || 'Target'}
          </div>
          <span className="mt-1 text-[9px] uppercase tracking-wider font-extrabold text-amber-400">Target</span>
        </div>

        {/* Perks & Stats */}
        <div className="flex-1">
          <div className="flex items-center justify-between gap-4 mb-2 pb-1 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-black">
              <Flame className="w-4 h-4 animate-pulse" />
              <span>STREAK: {run.current_streak}</span>
            </div>
            <div className="flex items-center gap-1.5 text-yellow-400 text-xs font-black">
              <Trophy className="w-4 h-4" />
              <span>BEST: {run.best_streak}</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-black">
              <Shield className="w-4 h-4" />
              <span>SAFE: {run.last_checkpoint_streak}</span>
            </div>
          </div>

          {/* Perk Icons Grid */}
          <div className="grid grid-cols-4 gap-2">
            {loadout?.perks && loadout.perks.map((perk, i) => (
              <div key={i} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="text-[9px] font-bold text-slate-200 line-clamp-1">{perk.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
