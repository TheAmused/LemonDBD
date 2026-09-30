// frontend/src/components/smash-or-pass/creator/RosterTaxonomyBlock.tsx
'use client';

import React, { useState } from 'react';
import { Tag, Plus, X, Sparkles, Shield, User } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import { FIELD, LABEL } from './styles';

interface RosterTaxonomyBlockProps {
  roles: string[];
  genders: string[];
  onChangeRoles: (roles: string[]) => void;
  onChangeGenders: (genders: string[]) => void;
  onRegisterTerm?: (type: 'role' | 'gender', name: string) => void;
  dict?: Dictionary;
}

export const RosterTaxonomyBlock: React.FC<RosterTaxonomyBlockProps> = ({
  roles,
  genders,
  onChangeRoles,
  onChangeGenders,
  onRegisterTerm,
  dict,
}) => {
  const [newRoleInput, setNewRoleInput] = useState<string>('');
  const [newGenderInput, setNewGenderInput] = useState<string>('');

  const tx = dict?.smashOrPass?.taxonomies || {
    rolesTitle: 'Roster Roles',
    rolesDesc: 'Define the roles available for characters in this roster. If left blank, standard Dead by Daylight roles (Survivor, Killer) will be used.',
    customCount: 'Custom',
    defaultRoles: 'Default: Survivor, Killer',
    addRolePlaceholder: 'Add role (e.g. Hero, Villain, Killer)...',
    add: 'Add',
    quickPresets: 'Quick presets:',
    noCustomRoles: 'No custom roles added — using standard Survivor / Killer.',
    removeRoleAria: 'Remove',
    gendersTitle: 'Roster Genders',
    gendersDesc: 'Define genders for characters in this roster (e.g. Female, Male, ABC, Android). If left blank, standard options will be populated.',
    defaultGenders: 'Default: Female, Male, Monster',
    addGenderPlaceholder: 'Add gender (e.g. Female, Male, ABC)...',
    noCustomGenders: 'No custom genders added — using standard Female / Male / Monster.',
    removeGenderAria: 'Remove',
  };

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
    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border-color font-mono">
      {/* 1. ROLES SECTION */}
      <div className="flex flex-col gap-3 pb-6 md:pb-0 md:pr-6">
        <div className="flex flex-col items-center justify-center text-center gap-1">
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-4 w-4 text-accent-red" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-text-primary">
              {tx.rolesTitle}
            </h3>
          </div>
          <span className="text-[10px] font-bold text-text-muted">
            {roles.length > 0 ? `${roles.length} ${tx.customCount}` : tx.defaultRoles}
          </span>
        </div>

        <p className="text-xs text-text-secondary font-sans leading-relaxed text-center">
          {tx.rolesDesc}
        </p>

        {/* Input to add custom role */}
        <div className="flex items-center justify-center gap-2 max-w-sm xl:max-w-md wide:max-w-lg mx-auto w-full">
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
            placeholder={tx.addRolePlaceholder}
            className={FIELD}
          />
          <button
            type="button"
            onClick={() => handleAddRole()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-accent-red hover:bg-accent-red-hover text-text-inverted text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{tx.add}</span>
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
          <span className="text-[10px] text-text-muted uppercase">{tx.quickPresets}</span>
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
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 border-t border-border-color/60 min-h-[36px]">
          {roles.length === 0 ? (
            <span className="text-xs text-text-muted italic font-sans text-center w-full">
              {tx.noCustomRoles}
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
                  aria-label={tx.removeRoleAria}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* 2. GENDERS SECTION */}
      <div className="flex flex-col gap-3 pt-6 md:pt-0 md:pl-6">
        <div className="flex flex-col items-center justify-center text-center gap-1">
          <div className="flex items-center justify-center gap-2">
            <User className="h-4 w-4 text-accent-green" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-text-primary">
              {tx.gendersTitle}
            </h3>
          </div>
          <span className="text-[10px] font-bold text-text-muted">
            {genders.length > 0 ? `${genders.length} ${tx.customCount}` : tx.defaultGenders}
          </span>
        </div>

        <p className="text-xs text-text-secondary font-sans leading-relaxed text-center">
          {tx.gendersDesc}
        </p>

        {/* Input to add custom gender */}
        <div className="flex items-center justify-center gap-2 max-w-sm xl:max-w-md wide:max-w-lg mx-auto w-full">
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
            placeholder={tx.addGenderPlaceholder}
            className={FIELD}
          />
          <button
            type="button"
            onClick={() => handleAddGender()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-accent-green hover:brightness-110 text-text-inverted text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{tx.add}</span>
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
          <span className="text-[10px] text-text-muted uppercase">{tx.quickPresets}</span>
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
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 border-t border-border-color/60 min-h-[36px]">
          {genders.length === 0 ? (
            <span className="text-xs text-text-muted italic font-sans text-center w-full">
              {tx.noCustomGenders}
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
                  aria-label={tx.removeGenderAria}
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
