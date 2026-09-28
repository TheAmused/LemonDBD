// frontend/src/components/smash-or-pass/creator/RosterTaxonomyBlock.tsx
'use client';

import React, { useState } from 'react';
import { Tag, Plus, X, Sparkles, Shield, User } from 'lucide-react';
import { FIELD, LABEL } from './styles';

interface RosterTaxonomyBlockProps {
  roles: string[];
  genders: string[];
  onChangeRoles: (roles: string[]) => void;
  onChangeGenders: (genders: string[]) => void;
  onRegisterTerm?: (type: 'role' | 'gender', name: string) => void;
}

export const RosterTaxonomyBlock: React.FC<RosterTaxonomyBlockProps> = ({
  roles,
  genders,
  onChangeRoles,
  onChangeGenders,
  onRegisterTerm,
}) => {
  const [newRoleInput, setNewRoleInput] = useState<string>('');
  const [newGenderInput, setNewGenderInput] = useState<string>('');

  const handleAddRole = (roleToAdd?: string) => {
    const val = (roleToAdd || newRoleInput).trim();
    if (!val) return;
    if (!roles.some((r) => r.toLowerCase() === val.toLowerCase())) {
      const next = [...roles, val];
      onChangeRoles(next);
      onRegisterTerm?.('role', val);
    }
    setNewRoleInput('');
  };

  const handleRemoveRole = (roleToRemove: string) => {
    onChangeRoles(roles.filter((r) => r !== roleToRemove));
  };

  const handleAddGender = (genderToAdd?: string) => {
    const val = (genderToAdd || newGenderInput).trim();
    if (!val) return;
    if (!genders.some((g) => g.toLowerCase() === val.toLowerCase())) {
      const next = [...genders, val];
      onChangeGenders(next);
      onRegisterTerm?.('gender', val);
    }
    setNewGenderInput('');
  };

  const handleRemoveGender = (genderToRemove: string) => {
    onChangeGenders(genders.filter((g) => g !== genderToRemove));
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 font-mono">
      {/* 1. ROLES SECTION */}
      <div className="flex flex-col gap-3 p-4 sm:p-5 rounded-2xl bg-bg-primary/50 border border-border-color shadow-inner">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent-red" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-text-primary">
              Roster Roles
            </h3>
          </div>
          <span className="text-[10px] font-bold text-text-muted">
            {roles.length > 0 ? `${roles.length} Custom` : 'Default: Survivor, Killer'}
          </span>
        </div>

        <p className="text-xs text-text-secondary font-sans leading-relaxed">
          Define the roles available for characters in this roster. If left blank, standard Dead by Daylight roles (Survivor, Killer) will be used.
        </p>

        {/* Input to add custom role */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newRoleInput}
            onChange={(e) => setNewRoleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddRole();
              }
            }}
            placeholder="Add role (e.g. Hero, Villain, Killer)..."
            className={FIELD}
          />
          <button
            type="button"
            onClick={() => handleAddRole()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-accent-red hover:bg-accent-red-hover text-text-inverted text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add</span>
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] text-text-muted uppercase">Quick presets:</span>
          {['Survivor', 'Killer', 'Hero', 'Villain', 'Neutral'].map((preset) => {
            const isAdded = roles.some((r) => r.toLowerCase() === preset.toLowerCase());
            if (isAdded) return null;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handleAddRole(preset)}
                className="text-[10px] px-2 py-0.5 rounded-lg bg-bg-surface hover:bg-bg-elevated border border-border-color text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                + {preset}
              </button>
            );
          })}
        </div>

        {/* Active Roles Badge List */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border-color/60 min-h-[36px] items-center">
          {roles.length === 0 ? (
            <span className="text-xs text-text-muted italic font-sans">
              No custom roles added — using standard Survivor / Killer.
            </span>
          ) : (
            roles.map((role) => (
              <span
                key={role}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-accent-red/10 border border-accent-red/30 text-accent-red text-xs font-bold tracking-wide"
              >
                <span>{role}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveRole(role)}
                  className="hover:text-text-primary transition-colors cursor-pointer p-0.5 rounded-full hover:bg-accent-red/20"
                  aria-label={`Remove ${role}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* 2. GENDERS SECTION */}
      <div className="flex flex-col gap-3 p-4 sm:p-5 rounded-2xl bg-bg-primary/50 border border-border-color shadow-inner">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-accent-green" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-text-primary">
              Roster Genders
            </h3>
          </div>
          <span className="text-[10px] font-bold text-text-muted">
            {genders.length > 0 ? `${genders.length} Custom` : 'Default: Female, Male, Monster'}
          </span>
        </div>

        <p className="text-xs text-text-secondary font-sans leading-relaxed">
          Define genders for characters in this roster (e.g. Female, Male, ABC, Android). If left blank, standard options will be populated.
        </p>

        {/* Input to add custom gender */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newGenderInput}
            onChange={(e) => setNewGenderInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddGender();
              }
            }}
            placeholder="Add gender (e.g. Female, Male, ABC)..."
            className={FIELD}
          />
          <button
            type="button"
            onClick={() => handleAddGender()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-accent-green hover:brightness-110 text-text-inverted text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add</span>
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] text-text-muted uppercase">Quick presets:</span>
          {['Female', 'Male', 'Non-Binary', 'Monster / Other', 'ABC'].map((preset) => {
            const isAdded = genders.some((g) => g.toLowerCase() === preset.toLowerCase());
            if (isAdded) return null;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handleAddGender(preset)}
                className="text-[10px] px-2 py-0.5 rounded-lg bg-bg-surface hover:bg-bg-elevated border border-border-color text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                + {preset}
              </button>
            );
          })}
        </div>

        {/* Active Genders Badge List */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border-color/60 min-h-[36px] items-center">
          {genders.length === 0 ? (
            <span className="text-xs text-text-muted italic font-sans">
              No custom genders added — using standard Female / Male / Monster.
            </span>
          ) : (
            genders.map((gender) => (
              <span
                key={gender}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-accent-green/10 border border-accent-green/30 text-accent-green text-xs font-bold tracking-wide"
              >
                <span>{gender}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveGender(gender)}
                  className="hover:text-text-primary transition-colors cursor-pointer p-0.5 rounded-full hover:bg-accent-green/20"
                  aria-label={`Remove ${gender}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
