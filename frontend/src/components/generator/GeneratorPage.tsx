// frontend/src/components/generator/GeneratorPage.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Perk,
  DrawnSlot,
  RoleCategory,
  GeneratorMode,
  GeneratorStoredState,
} from '@/types/perks';
import { Dictionary } from '@/locales/types';
import { ChaosWheelModal, ChaosMutator } from '../ChaosWheelModal';
import { CharacterConfigModal } from '../CharacterConfigModal';
import { useAuth } from '@/context/AuthContext';
import {
  fetchGeneratorConfig,
  updateGeneratorConfig,
  fetchDrawnPerks,
  addDrawnPerks,
  resetDrawnPerks,
} from '@/services/generatorApi';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { getAudioEnabled, setAudioEnabled } from '@/utils/perkAudio';
import { computeEligiblePool, computePlayablePool } from './lib/perkPicker';
import { Toolbar } from './Toolbar';
import { ModeSwitcher } from './ModeSwitcher';
import { LoadoutHotbar } from './LoadoutHotbar';
import { StageFrame } from './shared/StageFrame';
import { WheelStage } from './modes/WheelStage';
import { InstantStage } from './modes/InstantStage';
import { SlotMachineStage } from './modes/SlotMachineStage';
import { TarotDeckStage } from './modes/TarotDeckStage';
import { LootCrateStage } from './modes/LootCrateStage';

interface GeneratorPageProps {
  allPerks: Perk[];
  onSelectPerk: (perk: Perk) => void;
  dict?: Dictionary;
}

const STORAGE_KEY = 'lemon_dbd_generator_v8';
const SURV_STORAGE_KEY = 'lemon_dbd_enabled_survs_v7';
const KILLER_STORAGE_KEY = 'lemon_dbd_enabled_killers_v7';
const PERKS_PER_PAGE = 15;

export const GeneratorPage: React.FC<GeneratorPageProps> = ({ allPerks, onSelectPerk, dict }) => {
  const { user } = useAuth();
  const backendBase = getBackendBaseUrl();

  const [role, setRole] = useState<RoleCategory>('Survivor');
  const [genMode, setGenMode] = useState<GeneratorMode>('wheel');
  const [noRepeatPerks, setNoRepeatPerks] = useState<boolean>(true);
  const [spinDurationSec, setSpinDurationSec] = useState<number>(3);
  const [audioEnabled, setAudioEnabledState] = useState<boolean>(true);

  const [drawnPerks, setDrawnPerks] = useState<string[]>([]);
  const [loadout, setLoadout] = useState<(DrawnSlot | null)[]>([null, null, null, null]);
  const [activeSlotIdx, setActiveSlotIdx] = useState<number>(0);
  const [isChaosModalOpen, setIsChaosModalOpen] = useState(false);
  const [activeMutator, setActiveMutator] = useState<ChaosMutator | null>(null);

  const [isCharModalOpen, setIsCharModalOpen] = useState(false);
  const [enabledSurvCharacters, setEnabledSurvCharacters] = useState<string[]>([]);
  const [enabledKillerCharacters, setEnabledKillerCharacters] = useState<string[]>([]);
  const [revealedSlots, setRevealedSlots] = useState<boolean[]>([false, false, false, false]);

  const characterOptions = useMemo(() => {
    const rolePerks = allPerks.filter((p) => p.category === role);
    const namesSet = new Set<string>();
    rolePerks.forEach((p) => {
      const isGeneral = !p.character || p.character === 'General' || p.is_generic_counterpart;
      if (!isGeneral && p.character) namesSet.add(p.character);
    });
    return Array.from(namesSet)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name }));
  }, [allPerks, role]);

  useEffect(() => {
    setAudioEnabledState(getAudioEnabled());

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<GeneratorStoredState>;
        if (parsed.role) setRole(parsed.role);
        if (parsed.genMode) setGenMode(parsed.genMode);
        if (typeof parsed.noRepeatPerks === 'boolean') setNoRepeatPerks(parsed.noRepeatPerks);
        if (typeof parsed.spinDurationSec === 'number') setSpinDurationSec(parsed.spinDurationSec);
        if (Array.isArray(parsed.loadout)) setLoadout(parsed.loadout);
        if (typeof parsed.activeSlotIdx === 'number') setActiveSlotIdx(parsed.activeSlotIdx);
      }

      const savedSurv = localStorage.getItem(SURV_STORAGE_KEY);
      if (savedSurv) setEnabledSurvCharacters(JSON.parse(savedSurv));

      const savedKillers = localStorage.getItem(KILLER_STORAGE_KEY);
      if (savedKillers) setEnabledKillerCharacters(JSON.parse(savedKillers));
    } catch (e) {
      console.error('Failed loading generator state from localStorage:', e);
    }
  }, []);

  useEffect(() => {
    if (characterOptions.length === 0) return;
    const allCharNames = ['General', ...characterOptions.map((c) => c.value)];

    if (role === 'Survivor' && enabledSurvCharacters.length === 0) {
      setEnabledSurvCharacters(allCharNames);
    } else if (role === 'Killer' && enabledKillerCharacters.length === 0) {
      setEnabledKillerCharacters(allCharNames);
    }
  }, [characterOptions, role, enabledSurvCharacters.length, enabledKillerCharacters.length]);

  useEffect(() => {
    fetchGeneratorConfig()
      .then((config) => {
        if (config.role === 'Survivor' || config.role === 'Killer') setRole(config.role);
        if (config.gen_mode) setGenMode(config.gen_mode as GeneratorMode);
        if (typeof config.no_repeat_perks !== 'undefined') setNoRepeatPerks(Boolean(config.no_repeat_perks));
        if (config.spin_duration_sec) setSpinDurationSec(config.spin_duration_sec);
      })
      .catch((e) => console.error('Failed fetching generator config from SQLite API:', e));
  }, []);

  useEffect(() => {
    fetchDrawnPerks(role)
      .then(setDrawnPerks)
      .catch((e) => console.error('Failed fetching drawn perks from SQLite API:', e));
  }, [role]);

  useEffect(() => {
    try {
      const payload: GeneratorStoredState = {
        role,
        genMode,
        noRepeatPerks,
        spinDurationSec,
        loadout,
        activeSlotIdx,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed saving generator state to localStorage:', e);
    }
  }, [role, genMode, noRepeatPerks, spinDurationSec, loadout, activeSlotIdx]);

  const activeEnabledChars = useMemo(
    () => (role === 'Survivor' ? enabledSurvCharacters : enabledKillerCharacters),
    [role, enabledSurvCharacters, enabledKillerCharacters]
  );

  const handleSaveEnabledCharacters = (newEnabled: string[]) => {
    if (role === 'Survivor') {
      setEnabledSurvCharacters(newEnabled);
      localStorage.setItem(SURV_STORAGE_KEY, JSON.stringify(newEnabled));
    } else {
      setEnabledKillerCharacters(newEnabled);
      localStorage.setItem(KILLER_STORAGE_KEY, JSON.stringify(newEnabled));
    }
  };

  const baseEligibleRolePerks = useMemo(
    () => computeEligiblePool(allPerks, role, activeEnabledChars, Boolean(user)),
    [allPerks, role, activeEnabledChars, user]
  );

  const ownedOrAvailableCount = baseEligibleRolePerks.length;

  const activePlayablePerks = useMemo(
    () => computePlayablePool(baseEligibleRolePerks, noRepeatPerks, drawnPerks),
    [baseEligibleRolePerks, noRepeatPerks, drawnPerks]
  );

  const totalPlayableCount = activePlayablePerks.length;
  const totalPages = Math.max(1, Math.ceil(totalPlayableCount / PERKS_PER_PAGE));
  const lastPagePerks = totalPlayableCount % PERKS_PER_PAGE || (totalPlayableCount > 0 ? PERKS_PER_PAGE : 0);

  const handleRoleChange = async (newRole: RoleCategory) => {
    setRole(newRole);
    setLoadout([null, null, null, null]);
    setRevealedSlots([false, false, false, false]);
    try {
      await updateGeneratorConfig({ role: newRole });
    } catch (e) {
      console.error('Failed updating role in SQLite:', e);
    }
  };

  const handleGenModeChange = async (newMode: GeneratorMode) => {
    setGenMode(newMode);
    try {
      await updateGeneratorConfig({ gen_mode: newMode });
    } catch (e) {
      console.error('Failed updating gen_mode in SQLite:', e);
    }
  };

  const handleToggleNoRepeat = async () => {
    const nextVal = !noRepeatPerks;
    setNoRepeatPerks(nextVal);
    try {
      await updateGeneratorConfig({ no_repeat_perks: nextVal ? 1 : 0 });
    } catch (e) {
      console.error('Failed updating no_repeat_perks in SQLite:', e);
    }
  };

  const handleToggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabledState(next);
    setAudioEnabled(next);
  };

  const handleResetAllLoadoutAndWheels = async () => {
    setLoadout([null, null, null, null]);
    setActiveSlotIdx(0);
    setRevealedSlots([false, false, false, false]);
    setActiveMutator(null);
    try {
      const updatedDrawn = await resetDrawnPerks(role);
      setDrawnPerks(updatedDrawn);
    } catch (err) {
      console.error('Failed resetting drawn perks in SQLite API:', err);
      setDrawnPerks([]);
    }
  };

  const handleClearSlot = (slotIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadout((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
    setActiveSlotIdx(slotIdx);
  };

  const handleWheelWinSlot = async (wonData: DrawnSlot) => {
    setLoadout((prev) => {
      const next = [...prev];
      next[activeSlotIdx] = wonData;
      return next;
    });
    setActiveSlotIdx((prev) => (prev + 1) % 4);

    if (wonData.perk) {
      try {
        const updatedDrawn = await addDrawnPerks(role, [wonData.perk.name]);
        setDrawnPerks(updatedDrawn);
      } catch (err) {
        console.error('Failed saving drawn perk from wheel to SQLite API:', err);
      }
    }
  };

  const handleBatchRollComplete = async (slots: DrawnSlot[]) => {
    setLoadout([slots[0] || null, slots[1] || null, slots[2] || null, slots[3] || null]);
    setActiveSlotIdx(0);
    setRevealedSlots([false, false, false, false]);

    const names = slots.map((s) => s.perk?.name).filter((n): n is string => Boolean(n));
    if (names.length > 0) {
      try {
        const updatedDrawn = await addDrawnPerks(role, names);
        setDrawnPerks(updatedDrawn);
      } catch (err) {
        console.error('Failed saving drawn perks to SQLite API:', err);
      }
    }
  };

  const handleRevealSlot = (idx: number) => {
    setRevealedSlots((prev) => {
      const next = [...prev];
      next[idx] = true;
      return next;
    });
  };

  return (
    <div className="w-full space-y-4">
      <Toolbar
        role={role}
        onRoleChange={handleRoleChange}
        noRepeatPerks={noRepeatPerks}
        onToggleNoRepeat={handleToggleNoRepeat}
        audioEnabled={audioEnabled}
        onToggleAudio={handleToggleAudio}
        onOpenCharacterConfig={() => setIsCharModalOpen(true)}
        onOpenChaosModal={() => setIsChaosModalOpen(true)}
        activeMutator={activeMutator}
        onResetAll={handleResetAllLoadoutAndWheels}
        playableCount={totalPlayableCount}
        dict={dict}
      />

      {ownedOrAvailableCount === 0 ? (
        <section aria-live="polite" className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-400 animate-bounce" />
          <h2 className="text-lg font-black text-amber-200">
            {dict?.generator?.noPerksTitle || `No Perks Available for ${role}`}
          </h2>
          <p className="text-xs text-amber-300/80 max-w-md">
            {dict?.generator?.noPerksDesc ||
              'All character teachables are currently deactivated or unowned. Please enable characters in character settings or unlock perks.'}
          </p>
          <button
            type="button"
            onClick={() => setIsCharModalOpen(true)}
            className="mt-2 px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs shadow-md hover:bg-amber-700 transition-all cursor-pointer"
          >
            {dict?.generator?.configureCharacters || 'Configure Characters'}
          </button>
        </section>
      ) : (
        <>
          <ModeSwitcher mode={genMode} onChange={handleGenModeChange} dict={dict} />

          <StageFrame role={role}>
            {genMode === 'wheel' && (
              <WheelStage
                totalPages={totalPages}
                perksPerPage={PERKS_PER_PAGE}
                lastPagePerks={lastPagePerks}
                spinDurationSec={spinDurationSec}
                role={role}
                sortedPerks={activePlayablePerks}
                activeSlotIdx={activeSlotIdx}
                activeMutator={activeMutator}
                onWinSlot={handleWheelWinSlot}
                dict={dict}
                backendBase={backendBase}
              />
            )}
            {genMode === 'instant' && (
              <InstantStage
                role={role}
                activePlayablePerks={activePlayablePerks}
                activeMutator={activeMutator}
                onRollComplete={handleBatchRollComplete}
                dict={dict}
                backendBase={backendBase}
              />
            )}
            {genMode === 'slot' && (
              <SlotMachineStage
                role={role}
                activePlayablePerks={activePlayablePerks}
                activeMutator={activeMutator}
                onRollComplete={handleBatchRollComplete}
                dict={dict}
                backendBase={backendBase}
              />
            )}
            {genMode === 'tarot' && (
              <TarotDeckStage
                role={role}
                activePlayablePerks={activePlayablePerks}
                activeMutator={activeMutator}
                onRollComplete={handleBatchRollComplete}
                dict={dict}
                backendBase={backendBase}
              />
            )}
            {genMode === 'crate' && (
              <LootCrateStage
                role={role}
                activePlayablePerks={activePlayablePerks}
                activeMutator={activeMutator}
                onRollComplete={handleBatchRollComplete}
                dict={dict}
                backendBase={backendBase}
              />
            )}
          </StageFrame>

          <LoadoutHotbar
            loadout={loadout}
            activeSlotIdx={activeSlotIdx}
            role={role}
            activeMutator={activeMutator}
            revealedSlots={revealedSlots}
            onRevealSlot={handleRevealSlot}
            onSelectPerk={onSelectPerk}
            onClearSlot={handleClearSlot}
            dict={dict}
            backendBase={backendBase}
          />
        </>
      )}

      <CharacterConfigModal
        isOpen={isCharModalOpen}
        onClose={() => setIsCharModalOpen(false)}
        role={role}
        characterOptions={characterOptions}
        enabledCharacters={activeEnabledChars}
        onSave={handleSaveEnabledCharacters}
        dict={dict}
      />

      <ChaosWheelModal
        isOpen={isChaosModalOpen}
        onClose={() => setIsChaosModalOpen(false)}
        onSelectMutator={(m) => {
          setActiveMutator(m);
          setIsChaosModalOpen(false);
        }}
        activeMutator={activeMutator}
        dict={dict}
      />
    </div>
  );
};
