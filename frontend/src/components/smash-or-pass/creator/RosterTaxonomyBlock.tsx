// frontend/src/components/smash-or-pass/creator/RosterTaxonomyBlock.tsx
'use client';

import React, { useState } from 'react';
import { Plus, X, User } from 'lucide-react';

import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Field';
import { useDictionary } from "@/context/DictionaryContext";
import { GENDER_QUICK_PICKS } from '@/utils/smashOrPass/constants';
import { canonicalGender, genderLabel } from '@/utils/smashOrPass/terms';
import { Badge } from '@/components/common/Badge';
import { MaskIcon } from '@/components/icons/DbdIcons';

interface RosterTaxonomyBlockProps {
  roles: string[];
  genders: string[];
  onChangeRoles: (roles: string[]) => void;
  onChangeGenders: (genders: string[]) => void;
}

export const RosterTaxonomyBlock: React.FC<RosterTaxonomyBlockProps> = ({ roles, genders, onChangeRoles, onChangeGenders }) => {
  const dict = useDictionary();
  const [newRoleInput, setNewRoleInput] = useState<string>('');
  const [newGenderInput, setNewGenderInput] = useState<string>('');

  const tx = dict.smashOrPass.taxonomies;

  const handleAddRole = (roleToAdd?: string) => {
    const val = (roleToAdd || newRoleInput).trim();
    if (!val) return;
    if (!roles.some((r) => r.toLowerCase() === val.toLowerCase())) {
      onChangeRoles([...roles, val]);
    }
    setNewRoleInput('');
  };

  const handleRemoveRole = (roleToRemove: string) => {
    onChangeRoles(roles.filter((r) => r !== roleToRemove));
  };

  const handleAddGender = (genderToAdd?: string) => {
    // Kept the way the official rosters store genders: a typed "Female" or "Monster" is the official key.
    const val = canonicalGender(genderToAdd || newGenderInput);
    if (!val) return;
    if (!genders.some((g) => canonicalGender(g).toLowerCase() === val.toLowerCase())) {
      onChangeGenders([...genders, val]);
    }
    setNewGenderInput('');
  };

  const handleRemoveGender = (genderToRemove: string) => {
    onChangeGenders(genders.filter((g) => g !== genderToRemove));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border-color">
      {/* 1. ROLES SECTION */}
      <div className="flex flex-col gap-3 pb-6 md:pb-0 md:pr-6">
        <div className="flex flex-col items-center justify-center text-center gap-1">
          <div className="flex items-center justify-center gap-2">
            <MaskIcon className="icon-md text-accent-red" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-text-primary">
              {tx.rolesTitle}
            </h3>
          </div>
        </div>

        {/* Input to add custom role */}
        <div className="flex items-center justify-center gap-2 max-w-sm xl:max-w-md wide:max-w-lg mx-auto w-full">
          <Input
            fieldSize="md"
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
          />
          <Button
            variant="primary" size="md"
            onClick={() => handleAddRole()}
            className="shrink-0"
          >
            <Plus />
            <span>{tx.add}</span>
          </Button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
          {['Survivor', 'Killer', 'Hero', 'Villain', 'Neutral'].map((preset) => {
            const isAdded = roles.some((r) => r.toLowerCase() === preset.toLowerCase());
            if (isAdded) return null;
            return (
              <Button
                key={preset}
                type="button"
                onClick={() => handleAddRole(preset)}
                variant="secondary" size="xs"
              >
                + {preset}
              </Button>
            );
          })}
        </div>

        {/* Active Roles Badge List */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 border-t border-border-color/60 empty:hidden">
          {roles.map((role) => (
              <Badge
                key={role}
                tone="red" size="md" plain square
              >
                <span>{role}</span>
                <Button
                  type="button"
                  onClick={() => handleRemoveRole(role)}
                  variant="ghost" size="xs" icon pill
                  aria-label={tx.removeRoleAria}
                >
                  <X />
                </Button>
              </Badge>
          ))}
        </div>
      </div>

      {/* 2. GENDERS SECTION */}
      <div className="flex flex-col gap-3 pt-6 md:pt-0 md:pl-6">
        <div className="flex flex-col items-center justify-center text-center gap-1">
          <div className="flex items-center justify-center gap-2">
            <User className="icon-md text-accent-green" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-text-primary">
              {tx.gendersTitle}
            </h3>
          </div>
        </div>

        {/* Input to add custom gender */}
        <div className="flex items-center justify-center gap-2 max-w-sm xl:max-w-md wide:max-w-lg mx-auto w-full">
          <Input
            fieldSize="md"
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
          />
          <Button
            variant="success" size="md"
            onClick={() => handleAddGender()}
            className="shrink-0"
          >
            <Plus />
            <span>{tx.add}</span>
          </Button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
          {GENDER_QUICK_PICKS.map((preset) => {
            const isAdded = genders.some((g) => canonicalGender(g) === preset);
            if (isAdded) return null;
            return (
              <Button
                key={preset}
                type="button"
                onClick={() => handleAddGender(preset)}
                variant="secondary" size="xs"
              >
                + {genderLabel(preset, dict.smashOrPass.filters)}
              </Button>
            );
          })}
        </div>

        {/* Active Genders Badge List */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 border-t border-border-color/60 empty:hidden">
          {genders.map((gender) => (
              <Badge
                key={gender}
                tone="green" size="md" plain square
              >
                <span>{genderLabel(gender, dict.smashOrPass.filters)}</span>
                <Button
                  type="button"
                  onClick={() => handleRemoveGender(gender)}
                  variant="ghost" size="xs" icon pill
                  aria-label={tx.removeGenderAria}
                >
                  <X />
                </Button>
              </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};
