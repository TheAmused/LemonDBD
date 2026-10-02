// frontend/src/components/minigames/creator/RoundEditorCard.tsx
'use client';

import { Button } from '@/components/common/Button';
import { Input, Select, Textarea } from '@/components/common/Field';
import React, { useMemo } from 'react';
import Image from 'next/image';
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash2,
  Sparkles,
  Check,
  Package,
} from 'lucide-react';
import type {
  RoundConfig,
  MinigameMode,
  MinigameCatalog,
  TargetType,
} from '@/types/minigame';
import type { Dictionary } from '@/locales/types';
import { CharacterAutocomplete, type AutocompleteItem } from '../CharacterAutocomplete';
import { staticUrl } from '@/utils/api';

import { tip } from '@/components/common/Tooltip';
const ALL_MODES: MinigameMode[] = [
  'classic_character',
  'classic_killer',
  'classic_perk',
  'realm_guesser',
  'pixel_avatar',
  'perk_icon',
  'killer_power',
  'voice_line',
  'hook_scream',
  'terror_radius',
  'quote_lore',
  'emoji_riddle',
  'addon_guesser',
];

interface RoundEditorCardProps {
  round: RoundConfig;
  index: number;
  totalRounds: number;
  catalog: MinigameCatalog;
  dict: Dictionary;
  onUpdate: (updated: RoundConfig) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const RoundEditorCard: React.FC<RoundEditorCardProps> = ({
  round,
  index,
  totalRounds,
  catalog,
  dict,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}) => {
  const t = dict.minigames;
  const c = t.creator;

  // Determine what target pool to search
  const targetType = useMemo<TargetType>(() => {
    const mode = round.mode;
    if (mode === 'realm_guesser') return 'realm';
    if (mode === 'classic_perk' || mode === 'perk_icon') return 'perk';
    if (mode === 'classic_killer' || mode === 'killer_power' || mode === 'terror_radius')
      return 'killer';
    if (
      mode === 'classic_character' ||
      mode === 'pixel_avatar' ||
      mode === 'quote_lore' ||
      mode === 'emoji_riddle' ||
      mode === 'voice_line' ||
      mode === 'hook_scream'
    ) {
      return 'character';
    }
    return (round.target_type as TargetType) || 'character';
  }, [round.mode, round.target_type]);

  // Find currently selected target object in catalog for visual preview
  const selectedTargetItem = useMemo(() => {
    if (!round.target_id) return null;
    const tType = round.target_type;
    if (tType === 'realm') {
      return (catalog.realms || []).find((r) => r.id === round.target_id);
    }
    if (tType === 'perk') {
      return (catalog.perks || []).find((p) => p.id === round.target_id);
    }
    if (tType === 'killer') {
      return (catalog.killers || []).find((k) => k.id === round.target_id);
    }
    if (tType === 'survivor') {
      return (catalog.survivors || []).find((s) => s.id === round.target_id);
    }
    return (
      (catalog.killers || []).find((k) => k.id === round.target_id) ||
      (catalog.survivors || []).find((s) => s.id === round.target_id)
    );
  }, [catalog, round.target_id, round.target_type]);

  const handleModeChange = (newMode: MinigameMode) => {
    let newTargetType: TargetType = 'character';
    if (newMode === 'realm_guesser') newTargetType = 'realm';
    else if (newMode === 'classic_perk' || newMode === 'perk_icon') newTargetType = 'perk';
    else if (newMode === 'classic_killer' || newMode === 'killer_power' || newMode === 'terror_radius')
      newTargetType = 'killer';

    onUpdate({
      ...round,
      mode: newMode,
      target_type: newTargetType,
      target_id: undefined, // reset target when switching mode category
    });
  };

  const handleSelectTarget = (item: AutocompleteItem) => {
    onUpdate({
      ...round,
      target_id: item.id,
      target_type: item.role ? (item.role.toLowerCase() as TargetType) : targetType,
    });
  };

  const handleCustomDataChange = (key: string, value: any) => {
    onUpdate({
      ...round,
      custom_data: {
        ...(round.custom_data || {}),
        [key]: value,
      },
    });
  };

  const targetImgSrc =
    staticUrl((selectedTargetItem as any)?.avatar_url) ||
    staticUrl((selectedTargetItem as any)?.icon_url) ||
    staticUrl((selectedTargetItem as any)?.image_url) ||
    (selectedTargetItem as any)?.avatar_url ||
    (selectedTargetItem as any)?.icon_url ||
    (selectedTargetItem as any)?.image_url;

  return (
    <div data-round-card className="w-full p-5 rounded-2xl bg-bg-surface border border-border-color shadow-lg flex flex-col gap-4">
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-3 border-b border-border-color pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent-red/20 text-accent-red type-strong flex items-center justify-center border border-accent-red/30">
            #{index + 1}
          </div>
          <span className="type-card-title text-text-primary">
            {c.roundNumber.replace('{number}', String(index + 1))}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            icon
            onClick={onMoveUp}
            disabled={index === 0}
            {...tip(c.moveUp, undefined, 'action')}
            aria-label={c.moveUp}
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon
            onClick={onMoveDown}
            disabled={index === totalRounds - 1}
            {...tip(c.moveDown, undefined, 'action')}
            aria-label={c.moveDown}
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon
            onClick={onRemove}
            {...tip(c.removeRound, undefined, 'action')}
            aria-label={c.removeRound}
            className="ml-1"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mode & Max Attempts Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="block type-strong text-text-muted mb-1.5">
            {c.selectMode}
          </label>
          <Select
            fieldSize="sm"
            value={round.mode}
            onChange={(e) => handleModeChange(e.target.value as MinigameMode)}
            className="font-semibold"
          >
            {ALL_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {(t.modes as any)[mode] || mode}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="block type-strong text-text-muted mb-1.5">
            {c.maxAttemptsLabel}
          </label>
          <Input
            fieldSize="sm"
            type="number"
            min={1}
            max={20}
            value={round.max_attempts || 6}
            onChange={(e) =>
              onUpdate({
                ...round,
                max_attempts: Math.max(1, parseInt(e.target.value, 10) || 6),
              })
            }
            className="font-semibold"
          />
        </div>
      </div>

      {/* Target Answer Selection */}
      <div>
        <label className="block type-strong text-text-muted mb-1.5">
          {c.targetItem}
        </label>

        {selectedTargetItem ? (
          <div className="flex items-center justify-between p-3 rounded-xl bg-bg-surface border border-border-color">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-bg-elevated border border-border-subtle flex-shrink-0 flex items-center justify-center">
                {targetImgSrc ? (
                  <Image
                    src={targetImgSrc}
                    alt={selectedTargetItem.name}
                    width={40}
                    height={40}
                    unoptimized
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <Sparkles className="w-4 h-4 text-text-muted" />
                )}
              </div>
              <div>
                <div className="type-card-title text-text-primary">{selectedTargetItem.name}</div>
                <div className="text-xs text-text-muted capitalize">{targetType}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onUpdate({ ...round, target_id: undefined })}
              className="type-strong text-text-muted hover:text-text-primary underline px-2 py-1"
            >
              {c.change}
            </button>
          </div>
        ) : (
          <CharacterAutocomplete
            catalog={catalog}
            targetType={targetType}
            onSelect={handleSelectTarget}
            placeholder={c.searchTargetPlaceholder}
          />
        )}
      </div>

      {/* Mode-Specific Custom Inputs */}
      {round.mode === 'quote_lore' && (
        <div className="space-y-3 pt-2 border-t border-border-color">
          <div>
            <label className="block type-strong text-text-muted mb-1">
              {c.customQuoteLabel}
            </label>
            <Textarea
              fieldSize="sm"
              rows={2}
              value={round.custom_data?.quote || ''}
              onChange={(e) => handleCustomDataChange('quote', e.target.value)}
              placeholder={c.customQuotePlaceholder}
            />
          </div>
          <div>
            <label className="block type-strong text-text-muted mb-1">
              {c.customSpeakerLabel}
            </label>
            <Input
              fieldSize="sm"
              type="text"
              value={round.custom_data?.speaker || ''}
              onChange={(e) => handleCustomDataChange('speaker', e.target.value)}
              placeholder={c.customSpeakerPlaceholder}
            />
          </div>
        </div>
      )}

      {round.mode === 'emoji_riddle' && (
        <div className="pt-2 border-t border-border-color">
          <label className="block type-strong text-text-muted mb-1">
            {c.customEmojisLabel}
          </label>
          <Input
            fieldSize="sm"
            type="text"
            value={round.custom_data?.emojis || ''}
            onChange={(e) => handleCustomDataChange('emojis', e.target.value)}
            placeholder={c.customEmojisPlaceholder}
            className="text-lg sm:text-lg tracking-widest"
          />
        </div>
      )}

      {round.mode === 'killer_power' && (
        <div className="pt-2 border-t border-border-color">
          <label className="block type-strong text-text-muted mb-1">
            {c.customPowerName}
          </label>
          <Input
            fieldSize="sm"
            type="text"
            value={round.custom_data?.power_name || ''}
            onChange={(e) => handleCustomDataChange('power_name', e.target.value)}
            placeholder={c.customPowerPlaceholder}
          />
        </div>
      )}
    </div>
  );
};
