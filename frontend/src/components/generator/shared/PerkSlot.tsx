'use client';

import React from 'react';
import { Shield, Skull, ImageOff, EyeOff, Trash2 } from 'lucide-react';
import { Perk, RoleCategory } from '@/types/perks';
import { Dictionary } from '@/locales/types';
import { getPerkIconUrl, getCharacterAvatarUrl } from '@/utils/perkUtils';
import { cn } from '@/utils/cn';

export interface PerkSlotProps {
  perk?: Perk | null;
  role: RoleCategory;
  slotNumber?: number;
  isObscured?: boolean;
  isActive?: boolean;
  compact?: boolean;
  onClick?: () => void;
  onClear?: (e: React.MouseEvent) => void;
  dict?: Dictionary;
  backendBase?: string;
}

export const PerkSlot: React.FC<PerkSlotProps> = ({
  perk,
  role,
  slotNumber,
  isObscured = false,
  isActive = false,
  compact = false,
  onClick,
  onClear,
  dict,
  backendBase,
}) => {
  const isSurvivor = role === 'Survivor';
  const iconSrc = getPerkIconUrl(perk, backendBase);
  const avatarSrc = getCharacterAvatarUrl(perk, role, backendBase);

  const coordinate =
    perk && slotNumber !== undefined
      ? `${dict?.generator?.coordOpenPage || '[P'}${Math.floor((slotNumber - 1) / 15) + 1}${dict?.generator?.coordSlot || '/S'}${slotNumber}${dict?.generator?.coordClose || ']'}`
      : dict?.generator?.emptyCoordinate || '[-/-]';

  const glowClass = isSurvivor
    ? 'drop-shadow-[0_0_10px_rgba(16,185,129,0.55)]'
    : 'drop-shadow-[0_0_10px_rgba(244,63,94,0.55)]';

  return (
    <div
      onClick={() => {
        if (isObscured) return;
        if (perk && onClick) onClick();
      }}
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl bg-slate-900/40 backdrop-blur-md transition-all duration-200',
        compact ? 'p-2 gap-1.5' : 'p-3.5 gap-2.5',
        perk && !isObscured && 'cursor-pointer hover:bg-slate-900/70',
        isActive && 'ring-2 ring-amber-500/60'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-black text-amber-400/90">
          {coordinate}
        </span>
        {perk && onClear && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear(e);
            }}
            aria-label={dict?.generator?.clearSlotTooltip || 'Clear slot'}
            className="rounded-lg p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div
          className={cn(
            'relative flex shrink-0 items-center justify-center',
            compact ? 'h-10 w-10' : 'h-14 w-14'
          )}
        >
          {isObscured ? (
            <EyeOff className="h-6 w-6 text-purple-400 animate-pulse" />
          ) : perk && iconSrc ? (
            <img
              src={iconSrc}
              alt={perk.name}
              className={cn(
                'h-full w-full object-contain transition-transform duration-300 group-hover:scale-110',
                glowClass
              )}
            />
          ) : (
            <ImageOff className="h-6 w-6 text-slate-600" />
          )}

          {avatarSrc && !isObscured && (
            <img
              src={avatarSrc}
              alt={perk?.character || ''}
              className="absolute -bottom-1.5 -right-1.5 h-5 w-5 rounded-full object-cover shadow-md"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p
            aria-live="polite"
            className={cn(
              'font-black leading-tight text-slate-100 truncate',
              compact ? 'text-xs' : 'text-sm'
            )}
          >
            {isObscured
              ? dict?.generator?.clickToReveal || '??? (Click to Reveal)'
              : perk?.name || dict?.generator?.emptySlot || 'Empty Slot'}
          </p>
          {!compact && (
            <p className="text-[11px] font-bold text-slate-500 truncate">
              {isObscured
                ? dict?.generator?.cursedBlindness || 'Cursed Blindness'
                : perk
                  ? perk.character || 'General Perk'
                  : dict?.generator?.spinOrRollPrompt || 'Awaiting a draw'}
            </p>
          )}
        </div>

        <div
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
            isSurvivor ? 'text-emerald-400' : 'text-rose-400'
          )}
          title={role}
        >
          {isSurvivor ? <Shield className="h-4 w-4" /> : <Skull className="h-4 w-4" />}
        </div>
      </div>
    </div>
  );
};
