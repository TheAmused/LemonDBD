// frontend/src/components/generator/GeneratorPage.tsx
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import {
  Perk,
  DrawnSlot,
  RoleCategory,
  GeneratorMode,
  GeneratorStoredState,
} from '@/types/perks';
import { Dictionary } from '@/locales/types';
import { ChaosWheelModal, ChaosMutator } from '../ChaosWheelModal';
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
import { RoleToggle } from './shared/RoleToggle';
import { motion } from 'framer-motion';
import { StageFrame } from './shared/StageFrame';
import { ConfirmModal } from '../ConfirmModal';
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
const PERKS_PER_PAGE = 15;
const KNOWN_MODES: GeneratorMode[] = ['wheel', 'instant', 'slot', 'tarot', 'crate'];
const FULL_LOADOUT_SIZE = 4;

export const GeneratorPage: React.FC<GeneratorPageProps> = ({ allPerks, onSelectPerk, dict }) => {
  const { user } = useAuth();
  const backendBase = getBackendBaseUrl();

  const [role, setRole] = useState<RoleCategory>('Survivor');
  const [genMode, setGenMode] = useState<GeneratorMode>('instant');
  const [noRepeatPerks, setNoRepeatPerks] = useState<boolean>(true);
  const [spinDurationSec, setSpinDurationSec] = useState<number>(3);
  const [audioEnabled, setAudioEnabledState] = useState<boolean>(true);

  const [drawnPerks, setDrawnPerks] = useState<string[]>([]);
  const [loadout, setLoadout] = useState<(DrawnSlot | null)[]>([null, null, null, null]);
  const [activeSlotIdx, setActiveSlotIdx] = useState<number>(0);
  const [isChaosModalOpen, setIsChaosModalOpen] = useState(false);
  const [activeMutator, setActiveMutator] = useState<ChaosMutator | null>(null);
  const [blindMode, setBlindMode] = useState<boolean>(false);

  const [revealedSlots, setRevealedSlots] = useState<boolean[]>([false, false, false, false]);

  // Safeguard for No-Repeat mode grinding the playable pool down below what
  // a full loadout needs: pop a warning (not just silently give a short
  // loadout) offering a one-click reset of drawn-perk memory. Triggered on
  // the falling edge (pool just dropped under the threshold) rather than on
  // every render at a low count, so closing it doesn't just reopen it.
  const [showLowPoolWarning, setShowLowPoolWarning] = useState(false);
  const prevPlayableCountRef = useRef<number | null>(null);

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
        if (typeof parsed.blindMode === 'boolean') setBlindMode(parsed.blindMode);
      }
    } catch (e) {
      console.error('Failed loading generator state from localStorage:', e);
    }
  }, []);

  useEffect(() => {
    fetchGeneratorConfig()
      .then((config) => {
        if (config.role === 'Survivor' || config.role === 'Killer') setRole(config.role);
        if (config.gen_mode && KNOWN_MODES.includes(config.gen_mode as GeneratorMode)) {
          setGenMode(config.gen_mode as GeneratorMode);
        }
        if (typeof config.no_repeat_perks !== 'undefined') setNoRepeatPerks(Boolean(config.no_repeat_perks));
        if (config.spin_duration_sec) setSpinDurationSec(config.spin_duration_sec);
      })
      .catch((e) => console.error('Failed fetching generator config from backend API:', e));
  }, []);

  useEffect(() => {
    fetchDrawnPerks(role)
      .then(setDrawnPerks)
      .catch((e) => console.error('Failed fetching drawn perks from backend API:', e));
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
        blindMode,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed saving generator state to localStorage:', e);
    }
  }, [role, genMode, noRepeatPerks, spinDurationSec, loadout, activeSlotIdx, blindMode]);

  const baseEligibleRolePerks = useMemo(
    () => computeEligiblePool(allPerks, role, Boolean(user)),
    [allPerks, role, user]
  );

  const ownedOrAvailableCount = baseEligibleRolePerks.length;

  const activePlayablePerks = useMemo(
    () => computePlayablePool(baseEligibleRolePerks, noRepeatPerks, drawnPerks),
    [baseEligibleRolePerks, noRepeatPerks, drawnPerks]
  );

  const totalPlayableCount = activePlayablePerks.length;
  const totalPages = Math.max(1, Math.ceil(totalPlayableCount / PERKS_PER_PAGE));
  const lastPagePerks = totalPlayableCount % PERKS_PER_PAGE || (totalPlayableCount > 0 ? PERKS_PER_PAGE : 0);

  useEffect(() => {
    // Skip until real perk data has actually loaded -- allPerks/baseEligibleRolePerks
    // start empty before the fetch resolves, which used to read as "the pool just hit
    // zero" and fire the warning on every page load before any perk had even been drawn.
    if (baseEligibleRolePerks.length === 0) return;

    const prev = prevPlayableCountRef.current;
    // Only the falling edge counts -- and only once we've already seen a real
    // (non-null) prior reading, so the first post-load measurement never fires by itself.
    const crossedDown = noRepeatPerks && totalPlayableCount < FULL_LOADOUT_SIZE && prev !== null && prev >= FULL_LOADOUT_SIZE;
    if (crossedDown) setShowLowPoolWarning(true);
    // Belt-and-suspenders: if the pool is healthy again (role switch, reset, etc.),
    // never leave a stale warning open showing a live count that no longer matches it.
    if (totalPlayableCount >= FULL_LOADOUT_SIZE) setShowLowPoolWarning(false);
    prevPlayableCountRef.current = totalPlayableCount;
  }, [totalPlayableCount, noRepeatPerks, baseEligibleRolePerks.length]);

  const handleRoleChange = async (newRole: RoleCategory) => {
    setRole(newRole);
    setLoadout([null, null, null, null]);
    setRevealedSlots([false, false, false, false]);
    try {
      await updateGeneratorConfig({ role: newRole });
    } catch (e) {
      console.error('Failed updating role in backend:', e);
    }
  };

  const handleGenModeChange = async (newMode: GeneratorMode) => {
    setGenMode(newMode);
    try {
      await updateGeneratorConfig({ gen_mode: newMode });
    } catch (e) {
      console.error('Failed updating gen_mode in backend:', e);
    }
  };

  const handleToggleNoRepeat = async () => {
    const nextVal = !noRepeatPerks;
    setNoRepeatPerks(nextVal);
    try {
      await updateGeneratorConfig({ no_repeat_perks: nextVal ? 1 : 0 });
    } catch (e) {
      console.error('Failed updating no_repeat_perks in backend:', e);
    }
  };

  const handleToggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabledState(next);
    setAudioEnabled(next);
  };

  const handleToggleBlindMode = () => {
    setBlindMode((prev) => !prev);
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
      console.error('Failed resetting drawn perks via backend API:', err);
      setDrawnPerks([]);
    }
  };

  /** Just the drawn-perk memory, from the low-pool warning modal's Reset
   * button -- keeps the current loadout/mutator intact rather than wiping
   * the whole board, since all the player actually needs is the pool back. */
  const handleResetDrawnPerksOnly = async () => {
    try {
      const updatedDrawn = await resetDrawnPerks(role);
      setDrawnPerks(updatedDrawn);
    } catch (err) {
      console.error('Failed resetting drawn perks via backend API:', err);
      setDrawnPerks([]);
    }
    setShowLowPoolWarning(false);
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
        console.error('Failed saving drawn perk from wheel to backend API:', err);
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
        console.error('Failed saving drawn perks to backend API:', err);
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

  const topLeft = <ModeSwitcher mode={genMode} onChange={handleGenModeChange} dict={dict} />;

  const topRight = (
    <>
      <RoleToggle role={role} onChange={handleRoleChange} className="mr-1" dict={dict} />
      <Toolbar
        noRepeatPerks={noRepeatPerks}
        onToggleNoRepeat={handleToggleNoRepeat}
        playableCount={totalPlayableCount}
        ownedCount={ownedOrAvailableCount}
        blindMode={blindMode}
        onToggleBlindMode={handleToggleBlindMode}
        audioEnabled={audioEnabled}
        onToggleAudio={handleToggleAudio}
        onOpenChaosModal={() => setIsChaosModalOpen(true)}
        activeMutator={activeMutator}
        onResetAll={handleResetAllLoadoutAndWheels}
        dict={dict}
      />
    </>
  );

  return (
    <div className="flex w-full flex-1 min-h-0 flex-col gap-4">
      {ownedOrAvailableCount === 0 ? (
        <section aria-live="polite" className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-400 animate-bounce" />
          <h2 className="text-lg font-black text-amber-200">
            {dict?.generator?.noPerksTitle || `No Perks Available for ${role}`}
          </h2>
          <p className="text-xs text-amber-300/80 max-w-md">
            {dict?.generator?.noPerksDesc ||
              'You don\'t own any unlocked perks for this role yet.'}
          </p>
        </section>
      ) : (
        <>
          <StageFrame role={role} className="flex-1 min-h-0" topLeft={topLeft} topRight={topRight}>
            <motion.div
              key={`${genMode}-${role}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="flex h-full w-full flex-1 min-h-0 flex-col items-center justify-center"
            >
            {genMode === 'wheel' && (
              <WheelStage
                totalPages={totalPages}
                perksPerPage={PERKS_PER_PAGE}
                lastPagePerks={lastPagePerks}
                spinDurationSec={spinDurationSec}
                role={role}
                sortedPerks={activePlayablePerks}
                loadout={loadout}
                activeSlotIdx={activeSlotIdx}
                activeMutator={activeMutator}
                onWinSlot={handleWheelWinSlot}
                revealedSlots={revealedSlots}
                onRevealSlot={handleRevealSlot}
                onSelectPerk={onSelectPerk}
                isBlind={blindMode}
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
                revealedSlots={revealedSlots}
                onRevealSlot={handleRevealSlot}
                onSelectPerk={onSelectPerk}
                isBlind={blindMode}
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
                revealedSlots={revealedSlots}
                onRevealSlot={handleRevealSlot}
                onSelectPerk={onSelectPerk}
                isBlind={blindMode}
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
                revealedSlots={revealedSlots}
                onRevealSlot={handleRevealSlot}
                onSelectPerk={onSelectPerk}
                isBlind={blindMode}
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
                revealedSlots={revealedSlots}
                onRevealSlot={handleRevealSlot}
                onSelectPerk={onSelectPerk}
                isBlind={blindMode}
                dict={dict}
                backendBase={backendBase}
              />
            )}
            </motion.div>
          </StageFrame>
        </>
      )}

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

      <ConfirmModal
        open={showLowPoolWarning}
        title={
          totalPlayableCount === 0
            ? dict?.generator?.lowPoolEmptyTitle || "You're out of perks"
            : dict?.generator?.lowPoolTitle || 'Running low on perks'
        }
        message={
          totalPlayableCount === 0
            ? dict?.generator?.lowPoolEmptyDesc ||
              "No-Repeat Mode has drawn every playable perk. There's nothing left to pull, so reset your drawn-perk memory to open the pool back up."
            : totalPlayableCount === 1
              ? (dict?.generator?.lowPoolDescOne || 'Only 1 perk left in the pool with No-Repeat Mode on, not enough for a full loadout of {size}. Reset your drawn-perk memory to open the pool back up.').replace('{size}', String(FULL_LOADOUT_SIZE))
              : (dict?.generator?.lowPoolDescMany || 'Only {count} perks left in the pool with No-Repeat Mode on, not enough for a full loadout of {size}. Reset your drawn-perk memory to open the pool back up.')
                  .replace('{count}', String(totalPlayableCount))
                  .replace('{size}', String(FULL_LOADOUT_SIZE))
        }
        confirmLabel={dict?.generator?.lowPoolResetButton || 'Reset Drawn Perks'}
        confirmIcon={<RotateCcw className="h-4 w-4" />}
        cancelLabel={dict?.generator?.lowPoolCloseButton || 'Close'}
        onConfirm={handleResetDrawnPerksOnly}
        onCancel={() => setShowLowPoolWarning(false)}
      />
    </div>
  );
};
