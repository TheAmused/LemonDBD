'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Check,
  User,
  Shield,
  Skull,
  Sparkles,
  CheckCheck,
  XSquare,
} from 'lucide-react';

interface CharacterConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'Survivor' | 'Killer';
  characterOptions: { value: string; label: string }[];
  enabledCharacters: string[];
  onSave: (newEnabled: string[]) => void;
  dict: any;
}

export const CharacterConfigModal: React.FC<CharacterConfigModalProps> = ({
  isOpen,
  onClose,
  role,
  characterOptions,
  enabledCharacters,
  onSave,
  dict,
}) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set(enabledCharacters));

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Sync state whenever modal opens or enabledCharacters changes
  useEffect(() => {
    if (isOpen) {
      setSelected(new Set(enabledCharacters));
    }
  }, [isOpen, enabledCharacters]);

  // Handle ESC key & Click Outside Auto-Save
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSaveAndClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selected]);

  const handleSaveAndClose = () => {
    onSave(Array.from(selected));
    onClose();
  };

  const toggleCharacter = (charName: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(charName)) {
        next.delete(charName);
      } else {
        next.add(charName);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allNames = ['General', ...characterOptions.map((opt) => opt.value)];
    setSelected(new Set(allNames));
  };

  const handleDeselectAll = () => {
    setSelected(new Set());
  };

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return characterOptions;
    const q = search.toLowerCase();
    return characterOptions.filter(
      (opt) => opt.value.toLowerCase().includes(q) || opt.label.toLowerCase().includes(q)
    );
  }, [characterOptions, search]);

  if (!isOpen) return null;

  const isSurvivor = role === 'Survivor';

  const getAvatarSrc = (charName: string) => {
    if (charName === 'General') return null;
    const subDir = isSurvivor ? 'survivors' : 'killers';
    const sanitized = charName
      .toLowerCase()
      .trim()
      .replace(/[\s\-/]+/g, '_')
      .replace(/[\\/*?:"<>|]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    return `${backendBase}/static/avatars/${subDir}/${sanitized}.png`;
  };

  const isGeneralSelected = selected.has('General');

  return (
    <div
      onClick={handleSaveAndClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/90 text-slate-100 animate-in zoom-in-95 duration-200 cursor-default"
      >
        {/* Header Bar */}
        <div className="relative p-5 sm:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 shrink-0">
          <button
            onClick={handleSaveAndClose}
            className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            aria-label="Close and auto-save"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl border shadow-lg ${
                isSurvivor
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {isSurvivor ? <Shield className="h-6 w-6" /> : <Skull className="h-6 w-6" />}
            </div>
            <div>
              <h2 className="text-xl font-black tracking-wide text-white">
                Configure {role} Character Roster
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Click character avatar buttons to toggle them in your Perk Randomizer pool.
              </p>
            </div>
          </div>

          {/* Quick Actions & Search Bar */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            {/* Search Box */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${role} roster...`}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 py-2 pl-10 pr-4 text-xs font-medium text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none transition-colors"
              />
            </div>

            {/* Action Toggles */}
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Select All</span>
              </button>

              <button
                onClick={handleDeselectAll}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
              >
                <XSquare className="h-3.5 w-3.5" />
                <span>Deselect All</span>
              </button>
            </div>
          </div>
        </div>

        {/* Character Avatar Buttons Grid */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Active Selection: {selected.size} / {characterOptions.length + 1}
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
            {/* General Perks Avatar Button */}
            <button
              onClick={() => toggleCharacter('General')}
              title="General / Universal Perks"
              className={`group relative flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all cursor-pointer ${
                isGeneralSelected
                  ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-105'
                  : 'border-slate-800 bg-slate-950/50 opacity-40 hover:opacity-100 hover:border-slate-700'
              }`}
            >
              <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-950/40 border border-amber-500/40 text-amber-400 shadow-md">
                <Sparkles className="h-8 w-8 group-hover:scale-110 transition-transform" />
              </div>
              <span className="mt-1.5 text-[11px] font-extrabold text-amber-300 text-center truncate max-w-full">
                General
              </span>

              {/* Active Checkmark Badge */}
              <div
                className={`absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border shadow-lg transition-transform ${
                  isGeneralSelected
                    ? 'border-amber-300 bg-amber-500 text-slate-950 font-bold scale-100'
                    : 'scale-0'
                }`}
              >
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </div>
            </button>

            {/* Character Avatar Buttons */}
            {filteredOptions.map((opt) => {
              const isSelected = selected.has(opt.value);
              const avatarSrc = getAvatarSrc(opt.value);

              return (
                <button
                  key={opt.value}
                  onClick={() => toggleCharacter(opt.value)}
                  title={opt.value}
                  className={`group relative flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all cursor-pointer ${
                    isSelected
                      ? isSurvivor
                        ? 'border-emerald-400 bg-emerald-500/15 shadow-[0_0_20px_rgba(16,185,129,0.35)] scale-105'
                        : 'border-rose-500 bg-rose-500/15 shadow-[0_0_20px_rgba(244,63,94,0.35)] scale-105'
                      : 'border-slate-800 bg-slate-950/50 opacity-40 hover:opacity-100 hover:border-slate-700'
                  }`}
                >
                  {/* BIG Character Avatar */}
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={opt.value}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                      className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl object-cover border border-slate-700/80 shadow-md group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-xl bg-slate-800 text-slate-500 border border-slate-700">
                      <User className="h-8 w-8" />
                    </div>
                  )}

                  {/* Character Name Label */}
                  <span className="mt-1.5 text-[11px] font-extrabold text-slate-200 text-center truncate max-w-full group-hover:text-white">
                    {opt.value}
                  </span>

                  {/* Active Checkmark Badge */}
                  <div
                    className={`absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border shadow-lg transition-transform ${
                      isSelected
                        ? isSurvivor
                          ? 'border-emerald-300 bg-emerald-500 text-slate-950 font-bold scale-100'
                          : 'border-rose-300 bg-rose-500 text-white font-bold scale-100'
                        : 'scale-0'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-400">
            Total Active Characters: <span className="font-extrabold text-slate-200">{selected.size}</span>
          </p>

          <button
            onClick={handleSaveAndClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-xs font-black hover:from-cyan-500 hover:to-teal-500 transition-colors shadow-lg shadow-cyan-950/50 cursor-pointer"
          >
            Save & Done
          </button>
        </div>
      </div>
    </div>
  );
};
