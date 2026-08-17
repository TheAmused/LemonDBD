'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, CheckSquare, Square, Save, RotateCcw, Filter } from 'lucide-react';
import { Role } from '@/types/challenge';
import { CharacterItem } from './CharacterRosterGrid';

export interface CharacterPoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role;
  characters: CharacterItem[];
  disabledCharacters: string[];
  onSave: (disabledCharacters: string[]) => Promise<void> | void;
}

export const CharacterPoolModal: React.FC<CharacterPoolModalProps> = ({
  isOpen,
  onClose,
  role,
  characters,
  disabledCharacters,
  onSave,
}) => {
  const [disabledSet, setDisabledSet] = useState<Set<string>>(new Set(disabledCharacters));
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisabledSet(new Set(disabledCharacters));
  }, [disabledCharacters, isOpen]);

  if (!isOpen) return null;

  const toggleCharacter = (charName: string) => {
    setDisabledSet((prev) => {
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
    setDisabledSet(new Set());
  };

  const handleDeselectAll = () => {
    const allNames = characters.map((c) => c.name);
    setDisabledSet(new Set(allNames));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(Array.from(disabledSet));
      onClose();
    } catch (err) {
      console.error('Failed to save character pool:', err);
    } finally {
      setSaving(false);
    }
  };

  const filteredCharacters = characters.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const enabledCount = characters.length - disabledSet.size;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-md overflow-y-auto cursor-pointer"
    >
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Character Pool Configuration</span>
                <span className="text-xs uppercase font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-amber-700 dark:text-amber-400 border border-slate-300 dark:border-slate-700">
                  {role}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Exclude DLC characters you do not own from challenge roll selection ({enabledCount} / {characters.length} active)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Controls */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search characters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500/50 shadow-inner"
            />
            <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Enable All</span>
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Square className="w-3.5 h-3.5 text-slate-400" />
              <span>Disable All</span>
            </button>
          </div>
        </div>

        {/* Character Grid */}
        <div className="p-6 overflow-y-auto">
          {filteredCharacters.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No characters found matching "{searchQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredCharacters.map((char) => {
                const isDisabled = disabledSet.has(char.name);
                return (
                  <button
                    key={char.name}
                    onClick={() => toggleCharacter(char.name)}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-left ${isDisabled
                        ? 'bg-slate-100/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 opacity-60 hover:opacity-80'
                        : 'bg-white dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 hover:border-amber-500/40 text-slate-800 dark:text-slate-200 shadow-sm'
                      }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${isDisabled
                          ? 'border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-900 text-transparent'
                          : 'border-amber-500 bg-amber-500 text-slate-950'
                        }`}
                    >
                      {!isDisabled && <CheckSquare className="w-4 h-4 fill-amber-500 text-slate-950" />}
                    </div>
                    <span className={`text-xs font-bold truncate ${isDisabled ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                      {char.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={() => setDisabledSet(new Set(disabledCharacters))}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Changes</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-500/20"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Character Pool'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
