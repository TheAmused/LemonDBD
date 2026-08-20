// frontend/src/components/streaks/history/HistoryPerkModal.tsx
'use client';

import React from 'react';
import { PartyPopper, Sparkles } from 'lucide-react';

export interface HistoryPerkModalProps {
  killerName: string | null;
  perkNames: string[];
  onClose: () => void;
}

export const HistoryPerkModal: React.FC<HistoryPerkModalProps> = ({ killerName, perkNames, onClose }) => {
  if (!killerName) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border-2 border-emerald-400 bg-gradient-to-b from-emerald-500/15 via-slate-900 to-slate-950 p-8 text-center shadow-2xl shadow-emerald-500/20 cursor-default"
      >
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-emerald-400 bg-emerald-500/15 text-emerald-400">
          <PartyPopper className="h-8 w-8" />
        </div>

        <h2 className="text-xl font-black tracking-tight text-white">{killerName} beaten!</h2>
        <p className="mt-1 text-xs text-slate-400 uppercase tracking-wider font-bold">Perks unlocked</p>

        <div className="mt-4 space-y-2">
          {perkNames.length === 0 ? (
            <p className="text-sm text-slate-300">No new perks this time.</p>
          ) : (
            perkNames.map((name, i) => (
              <div
                key={name}
                className="chaos-badge-pop flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-slate-950/60 px-3 py-2 text-left"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <Sparkles className="h-4 w-4 shrink-0 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-100">{name}</span>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-emerald-500 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 cursor-pointer"
        >
          Keep going
        </button>
      </div>
    </div>
  );
};
