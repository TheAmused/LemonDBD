// frontend/src/components/generator/GeneratorPage.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import {
  Perk,
  DrawnSlot,
  RoleCategory,
  GeneratorMode,
} from '@/types/perks';
import { Dictionary } from '@/locales/types';
import { useAuth } from '@/context/AuthContext';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { getAudioEnabled, setAudioEnabled } from '@/utils/perkAudio';
import { computeEligiblePool, computePlayablePool } from './lib/perkPicker';
import {
  GeneratorStoredState,
  getStoredGeneratorState,
  saveStoredGeneratorState,
  getDrawnPerksForRole,
  saveDrawnPerksForRole,
  clearDrawnPerksForRole,
  getActiveMutatorForRole,
  saveActiveMutatorForRole,
} from './lib/generatorStorage';
import { Toolbar } from './Toolbar';
import { ModeSwitcher } from './ModeSwitcher';
import { RoleToggle } from './shared/RoleToggle';
import { motion } from 'framer-motion';
import { StageFrame } from './shared/StageFrame';
import type { ChaosMutator } from '../ChaosWheelModal';

const ChaosWheelModal = dynamic(() => import('../ChaosWheelModal').then((m) => m.ChaosWheelModal), { ssr: false });
const ConfirmModal = dynamic(() => import('../ConfirmModal').then((m) => m.ConfirmModal), { ssr: false });
const WheelStage = dynamic(() => import('./modes/WheelStage').then((m) => m.WheelStage), { ssr: false });
const InstantStage = dynamic(() => import('./modes/InstantStage').then((m) => m.InstantStage), { ssr: false });
const SlotMachineStage = dynamic(() => import('./modes/SlotMachineStage').then((m) => m.SlotMachineStage), { ssr: false });
const TarotDeckStage = dynamic(() => import('./modes/TarotDeckStage').then((m) => m.TarotDeckStage), { ssr: false });
const LootCrateStage = dynamic(() => import('./modes/LootCrateStage').then((m) => m.LootCrateStage), { ssr: false });

interface GeneratorPageProps {
  allPerks: Perk[];
  onSelectPerk: (perk: Perk) => void;
  dict?: Dictionary;
}

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

    const saved = getStoredGeneratorState();
    if (saved) {
      if (saved.role) setRole(saved.role);
      if (saved.genMode) setGenMode(saved.genMode);
      if (typeof saved.noRepeatPerks === 'boolean') setNoRepeatPerks(saved.noRepeatPerks);
      if (typeof saved.spinDurationSec === 'number') setSpinDurationSec(saved.spinDurationSec);
      if (Array.isArray(saved.loadout)) setLoadout(saved.loadout);
      if (typeof saved.activeSlotIdx === 'number') setActiveSlotIdx(saved.activeSlotIdx);
      if (typeof saved.blindMode === 'boolean') setBlindMode(saved.blindMode);
      if (saved.activeMutator) setActiveMutator(saved.activeMutator);
    }
  }, []);

  useEffect(() => {
    // 1. Restore local drawn perks immediately so all modes and tabs share state instantly
    setDrawnPerks(getDrawnPerksForRole(role));

    // 2. Restore active mutator (curse) for this role so it persists until reset
    setActiveMutator(getActiveMutatorForRole(role));
  }, [role]);

  useEffect(() => {
    const payload: GeneratorStoredState = {
      role,
      genMode,
      noRepeatPerks,
      spinDurationSec,
      loadout,
      activeSlotIdx,
      blindMode,
      activeMutator,
    };
    saveStoredGeneratorState(payload);
  }, [role, genMode, noRepeatPerks, spinDurationSec, loadout, activeSlotIdx, blindMode, activeMutator]);

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

  const handleRoleChange = useCallback((newRole: RoleCategory) => {
    setRole(newRole);
    setLoadout([null, null, null, null]);
    setRevealedSlots([false, false, false, false]);
  }, []);

  const handleGenModeChange = useCallback((newMode: GeneratorMode) => {
    setGenMode(newMode);
  }, []);

  const handleToggleNoRepeat = useCallback(() => {
    setNoRepeatPerks((prev) => !prev);
  }, []);

  const handleToggleAudio = useCallback(() => {
    setAudioEnabledState((prev) => {
      const next = !prev;
      setAudioEnabled(next);
      return next;
    });
  }, []);

  const handleToggleBlindMode = useCallback(() => {
    setBlindMode((prev) => !prev);
  }, []);

  const handleSelectMutator = useCallback((m: ChaosMutator | null) => {
    setActiveMutator(m);
    saveActiveMutatorForRole(role, m);
  }, [role]);

  const handleResetAllLoadoutAndWheels = useCallback(() => {
    setLoadout([null, null, null, null]);
    setActiveSlotIdx(0);
    setRevealedSlots([false, false, false, false]);
    setActiveMutator(null);
    saveActiveMutatorForRole(role, null);
    setDrawnPerks([]);
    clearDrawnPerksForRole(role);
  }, [role]);

  /** Just the drawn-perk memory, from the low-pool warning modal's Reset
   * button -- keeps the current loadout/mutator intact rather than wiping
   * the whole board, since all the player actually needs is the pool back. */
  const handleResetDrawnPerksOnly = useCallback(() => {
    setDrawnPerks([]);
    clearDrawnPerksForRole(role);
    setShowLowPoolWarning(false);
  }, [role]);

  const handleWheelWinSlot = useCallback((wonData: DrawnSlot) => {
    setLoadout((prev) => {
      const next = [...prev];
      next[activeSlotIdx] = wonData;
      return next;
    });
    setActiveSlotIdx((prev) => (prev + 1) % 4);

    // ONLY add to drawnPerks if no-repeat mode is actually ON!
    if (noRepeatPerks && wonData.perk) {
      const perkName = wonData.perk.name;
      setDrawnPerks((prev) => {
        const next = Array.from(new Set([...prev, perkName]));
        saveDrawnPerksForRole(role, next);
        return next;
      });
    }
  }, [activeSlotIdx, noRepeatPerks, role]);

  const handleBatchRollComplete = useCallback((slots: DrawnSlot[]) => {
    setLoadout([slots[0] || null, slots[1] || null, slots[2] || null, slots[3] || null]);
    setActiveSlotIdx(0);
    setRevealedSlots([false, false, false, false]);

    // ONLY add to drawnPerks if no-repeat mode is actually ON!
    if (noRepeatPerks) {
      const names = slots.map((s) => s.perk?.name).filter((n): n is string => Boolean(n));
      if (names.length > 0) {
        setDrawnPerks((prev) => {
          const next = Array.from(new Set([...prev, ...names]));
          saveDrawnPerksForRole(role, next);
          return next;
        });
      }
    }
  }, [noRepeatPerks, role]);

  const handleRevealSlot = useCallback((idx: number) => {
    setRevealedSlots((prev) => {
      const next = [...prev];
      next[idx] = true;
      return next;
    });
  }, []);

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
          <AlertTriangle className="h-12 w-12 text-accent-amber animate-bounce" />
          <h2 className="text-lg font-black text-accent-amber">
            {dict?.generator?.noPerksTitle || `No Perks Available for ${role}`}
          </h2>
          <p className="text-xs text-text-secondary max-w-md">
            {dict?.generator?.noPerksDesc ||
              'You don\'t own any unlocked perks for this role yet.'}
          </p>
        </section>
      ) : (
        <>
          <StageFrame className="flex-1 min-h-0" topLeft={topLeft} topRight={topRight}>
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
        role={role}
        onClose={() => setIsChaosModalOpen(false)}
        onSelectMutator={(m) => {
          handleSelectMutator(m);
          setIsChaosModalOpen(false);
        }}
        onClearMutator={() => handleSelectMutator(null)}
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
