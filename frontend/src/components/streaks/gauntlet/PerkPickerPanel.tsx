'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Role } from '@/types/gauntletStreak';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle, Lock } from 'lucide-react';

interface UnlockedPerk {
  id: number;
  name: string;
  character?: string | null;
}

export interface PerkPickerPanelProps {
  role: Role;
  targetCharacter: string;
  perkLimit: number;
  busy?: boolean;
  onSubmit: (perkIds: number[]) => void;
}

const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const PerkPickerPanel: React.FC<PerkPickerPanelProps> = ({
  role,
  targetCharacter,
  perkLimit,
  busy = false,
  onSubmit,
}) => {
  const { token, user } = useAuth();
  const [perks, setPerks] = useState<UnlockedPerk[]>([]);
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    if (!token || !user) return;
    const dbRole = role === 'killer' ? 'Killer' : 'Survivor';
    fetch(`${backendBase}/api/v1/users/${user.id}/perks?category=${dbRole}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const unlocked = (data.data || []).filter((p: any) => p.is_unlocked);
        setPerks(unlocked);
      });
    setSelected([]);
  }, [token, user, role, targetCharacter]);

  const targetPerks = useMemo(() => perks.filter((p) => p.character === targetCharacter), [perks, targetCharacter]);

  const pickSlot = (index: number, perkId: number) => {
    setSelected((prev) => {
      const next = [...prev];
      next[index] = perkId;
      return next;
    });
  };

  const isValid =
    selected.length === perkLimit &&
    selected.every((v) => v !== undefined) &&
    new Set(selected).size === perkLimit;

  if (perkLimit === 0) return null;

  return (
    <div className="mb-8 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
        Choose Your Loadout ({perkLimit} Perk{perkLimit !== 1 ? 's' : ''})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {Array.from({ length: perkLimit }).map((_, idx) => {
          const options = idx === 0 ? targetPerks : perks;
          return (
            <select
              key={idx}
              value={selected[idx] ?? ''}
              onChange={(e) => pickSlot(idx, Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
            >
              <option value="" disabled>
                {idx === 0 ? `Slot 1 — ${targetCharacter} perk` : `Slot ${idx + 1} — any unlocked perk`}
              </option>
              {options.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          );
        })}
      </div>
      <button
        onClick={() => onSubmit(selected)}
        disabled={!isValid || busy}
        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm py-3 px-6 rounded-xl transition-all cursor-pointer"
      >
        {isValid ? <CheckCircle className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
        Confirm Loadout
      </button>
    </div>
  );
};
