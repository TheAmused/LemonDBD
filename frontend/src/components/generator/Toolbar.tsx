'use client';

import React from 'react';
import { Shield, Skull, Users, Repeat, Sparkles, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { RoleCategory } from '@/types/perks';
import { ChaosMutator } from '@/types/chaos';
import { Dictionary } from '@/locales/types';
import { SegmentedControl } from './shared/SegmentedControl';
import { IconToggleButton } from './shared/IconToggleButton';

export interface ToolbarProps {
  role: RoleCategory;
  onRoleChange: (role: RoleCategory) => void;
  noRepeatPerks: boolean;
  onToggleNoRepeat: () => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenCharacterConfig: () => void;
  onOpenChaosModal: () => void;
  activeMutator: ChaosMutator | null;
  onResetAll: () => void;
  playableCount: number;
  dict?: Dictionary;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  role,
  onRoleChange,
  noRepeatPerks,
  onToggleNoRepeat,
  audioEnabled,
  onToggleAudio,
  onOpenCharacterConfig,
  onOpenChaosModal,
  activeMutator,
  onResetAll,
  playableCount,
  dict,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-900/30 px-3 py-2">
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-black uppercase tracking-wide text-slate-200">
          {role} {dict?.generator?.titleSuffix || 'Perk Randomizer'}
        </h1>
        <SegmentedControl
          value={role}
          onChange={onRoleChange}
          ariaLabel={dict?.generator?.selectRole || 'Select Role'}
          options={[
            { value: 'Survivor', label: dict?.generator?.survivor || 'Survivor', icon: <Shield className="h-3.5 w-3.5" /> },
            { value: 'Killer', label: dict?.generator?.killer || 'Killer', icon: <Skull className="h-3.5 w-3.5" /> },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <IconToggleButton
          icon={<Users className="h-4 w-4" />}
          label={dict?.generator?.charactersTooltip || 'Configure Characters'}
          badge={playableCount}
          onClick={onOpenCharacterConfig}
        />
        <IconToggleButton
          icon={<Repeat className="h-4 w-4" />}
          label={dict?.generator?.noRepeatTooltip || 'Toggle No-Repeat Perks'}
          isActive={noRepeatPerks}
          onClick={onToggleNoRepeat}
        />
        <IconToggleButton
          icon={<span className="text-base leading-none">{activeMutator ? activeMutator.icon : '🔮'}</span>}
          label={activeMutator ? activeMutator.name : (dict?.generator?.chaosMutatorTooltip || 'Chaos Mutator')}
          isActive={Boolean(activeMutator)}
          onClick={onOpenChaosModal}
        />
        <IconToggleButton
          icon={audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          label={
            audioEnabled
              ? dict?.generator?.audioOnLabel || 'Sound On'
              : dict?.generator?.audioOffLabel || 'Sound Muted'
          }
          isActive={audioEnabled}
          onClick={onToggleAudio}
        />
        <IconToggleButton
          icon={<RotateCcw className="h-4 w-4" />}
          label={dict?.generator?.resetAllTooltip || 'Reset wheels, loadout slots, and memory'}
          onClick={onResetAll}
        />
      </div>
    </div>
  );
};
