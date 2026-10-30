// frontend/src/components/generator/GeneratorPage.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import type {
  Perk,
  DrawnSlot,
  RoleCategory,
  GeneratorMode,
} from '@/types/perks';

import { useAuth } from '@/context/AuthContext';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { getAudioEnabled, setAudioEnabled } from '@/utils/perkAudio';
import { computeEligiblePool, computePlayablePool, PERKS_PER_PAGE } from './lib/perkPicker';
import type {
  GeneratorStoredState} from './lib/generatorStorage';
import {
  getStoredGeneratorState,
  saveStoredGeneratorState,
  getDrawnPerksForRole,
  saveDrawnPerksForRole,
  clearDrawnPerksForRole,
  getActiveMutatorForRole,
  saveActiveMutatorForRole,
} from './lib/generatorStorage';
import { trackEvent } from '@/utils/analytics';
import { buildRollProps } from './lib/rollTracking';
import { Toolbar } from './Toolbar';
import { ModeSwitcher } from './ModeSwitcher';
import { RoleToggle } from './shared/RoleToggle';
import { motion } from 'framer-motion';
import { StageFrame } from './shared/StageFrame';
import type { ChaosMutator } from '../ChaosWheelModal';
import { formatMessage } from '@/utils/i18nFormat';
import { useLocale, useDictionary } from '@/context/DictionaryContext';
import { useIsClient } from '@/hooks/useIsClient';

const ChaosWheelModal = dynamic(() => import('../ChaosWheelModal').then((m) => m.ChaosWheelModal), { ssr: false });
const ConfirmModal = dynamic(() => import('../common/ConfirmModal').then((m) => m.ConfirmModal), { ssr: false });
const WheelStage = dynamic(() => import('./modes/WheelStage').then((m) => m.WheelStage), { ssr: false });
const InstantStage = dynamic(() => import('./modes/InstantStage').then((m) => m.InstantStage), { ssr: false });
const SlotMachineStage = dynamic(() => import('./modes/SlotMachineStage').then((m) => m.SlotMachineStage), { ssr: false });
const TarotDeckStage = dynamic(() => import('./modes/TarotDeckStage').then((m) => m.TarotDeckStage), { ssr: false });
const LootCrateStage = dynamic(() => import('./modes/LootCrateStage').then((m) => m.LootCrateStage), { ssr: false });

interface GeneratorPageProps {
  allPerks: Perk[];
  onSelectPerk: (perk: Perk) => void;
}

const KNOWN_MODES: GeneratorMode[] = ['wheel', 'instant', 'slot', 'tarot', 'crate'];
const FULL_LOADOUT_SIZE = 4;

export const GeneratorPage: React.FC<GeneratorPageProps> = ({ allPerks, onSelectPerk }) => {
  const dict = useDictionary();
  const locale = useLocale();
  const { user } = useAuth();
  const backendBase = getBackendBaseUrl();

  const [role, setRole] = useState<RoleCategory>('Survivor');
  const [genMode, setGenMode] = useState<GeneratorMode>('instant');
  const [noRepeatPerks, setNoRepeatPerks] = useState<boolean>(true);
  const [spinDurationSec, setSpinDurationSec] = useState<number>(3);
  const [audioEnabled, setAudioEnabledState] = useState<boolean>(true);

  const [drawnPerks, setDrawnPerks] = useState<(string | number)[]>([]);
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
  const [prevPlayableCount, setPrevPlayableCount] = useState<number | null>(null);

  // The saved generator comes back once, on the first render after hydration (the server and
  // the hydrating client render the defaults, so they agree). Saving waits for it, below.
  const isClient = useIsClient();
  const [restored, setRestored] = useState(false);
  if (isClient && !restored) {
    setRestored(true);
    setAudioEnabledState(getAudioEnabled());

    const saved = getStoredGeneratorState();
    const restoredRole: RoleCategory = saved?.role === 'Survivor' || saved?.role === 'Killer' ? saved.role : role;
    // Drawn perks and the active mutator (curse) are kept per role, so they persist until reset.
    setDrawnPerks(getDrawnPerksForRole(restoredRole));
    setActiveMutator(getActiveMutatorForRole(restoredRole));
    if (saved) {
      setRole(restoredRole);
      if (saved.genMode && KNOWN_MODES.includes(saved.genMode)) setGenMode(saved.genMode);
      if (typeof saved.noRepeatPerks === 'boolean') setNoRepeatPerks(saved.noRepeatPerks);
      if (typeof saved.spinDurationSec === 'number' && saved.spinDurationSec >= 1 && saved.spinDurationSec <= 30) {
        setSpinDurationSec(saved.spinDurationSec);
      }
      if (Array.isArray(saved.loadout) && saved.genMode === 'wheel') {
        const targetRole = saved.role || 'Survivor';
        const isValidWheelLoadout = saved.loadout.every((s) => {
          if (!s || !s.perk) return true;
          return s.perk.category === targetRole;
        });
        if (isValidWheelLoadout) {
          setLoadout(saved.loadout);
          if (typeof saved.activeSlotIdx === 'number') setActiveSlotIdx(saved.activeSlotIdx);
        }
      }
      if (typeof saved.blindMode === 'boolean') setBlindMode(saved.blindMode);
    }
  }

  useEffect(() => {
    if (!restored) return;
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
  }, [restored, role, genMode, noRepeatPerks, spinDurationSec, loadout, activeSlotIdx, blindMode, activeMutator]);

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

  // (Adjusted while rendering.) Skip until real perk data has actually loaded -- allPerks/baseEligibleRolePerks
  // start empty before the fetch resolves, which used to read as "the pool just hit
  // zero" and fire the warning on every page load before any perk had even been drawn.
  if (baseEligibleRolePerks.length > 0 && prevPlayableCount !== totalPlayableCount) {
    setPrevPlayableCount(totalPlayableCount);
    // Only the falling edge counts -- and only once we've already seen a real
    // (non-null) prior reading, so the first post-load measurement never fires by itself.
    const crossedDown =
      noRepeatPerks && totalPlayableCount < FULL_LOADOUT_SIZE && prevPlayableCount !== null && prevPlayableCount >= FULL_LOADOUT_SIZE;
    if (crossedDown) setShowLowPoolWarning(true);
  }
  // Belt-and-suspenders: if the pool is healthy again (role switch, reset, etc.),
  // never leave a stale warning open showing a live count that no longer matches it.
  if (showLowPoolWarning && baseEligibleRolePerks.length > 0 && totalPlayableCount >= FULL_LOADOUT_SIZE) {
    setShowLowPoolWarning(false);
  }

  const handleRoleChange = useCallback((newRole: RoleCategory) => {
    setRole(newRole);
    setDrawnPerks(getDrawnPerksForRole(newRole));
    setActiveMutator(getActiveMutatorForRole(newRole));
    setLoadout([null, null, null, null]);
    setActiveSlotIdx(0);
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

  /** One finished loadout (all 4 perks drawn), whichever mode produced it. */
  const trackRoll = useCallback(() => {
    trackEvent(
      'randomizer_roll',
      buildRollProps({ mode: genMode, role, blindMode, activeMutator, noRepeatPerks, audioEnabled })
    );
  }, [genMode, role, blindMode, activeMutator, noRepeatPerks, audioEnabled]);

  const handleWheelWinSlot = useCallback((wonData: DrawnSlot) => {
    // The wheel fills one slot per spin: the 4th win is the finished loadout.
    if (activeSlotIdx === 3) trackRoll();
    setLoadout((prev) => {
      const next = [...prev];
      next[activeSlotIdx] = wonData;
      return next;
    });
    setActiveSlotIdx((prev) => (prev + 1) % 4);

    // ONLY add to drawnPerks if no-repeat mode is actually ON!
    if (noRepeatPerks && wonData.perk) {
      const perkKey: string | number = wonData.perk.id ?? wonData.perk.name;
      setDrawnPerks((prev) => {
        const next = Array.from(new Set([...prev, perkKey]));
        saveDrawnPerksForRole(role, next);
        return next;
      });
    }
  }, [activeSlotIdx, noRepeatPerks, role, trackRoll]);

  const handleBatchRollComplete = useCallback((slots: DrawnSlot[]) => {
    setRevealedSlots([false, false, false, false]);

    // ONLY add to drawnPerks if no-repeat mode is actually ON!
    if (noRepeatPerks) {
      const ids = slots.map((s) => s.perk?.id).filter((id): id is number => typeof id === 'number' && id > 0);
      if (ids.length > 0) {
        setDrawnPerks((prev) => {
          const next = Array.from(new Set([...prev, ...ids]));
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

  const topLeft = <ModeSwitcher mode={genMode} onChange={handleGenModeChange} />;

  const topRight = (
    <>
      <RoleToggle role={role} onChange={handleRoleChange} className="mr-1" />
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
      />
    </>
  );

  return (
    <div className="flex w-full flex-1 min-h-0 flex-col gap-4">
      {ownedOrAvailableCount === 0 ? (
        <section aria-live="polite" className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <TriangleAlert className="h-12 w-12 text-accent-amber animate-bounce" />
          <h2 className="text-lg font-black text-accent-amber">
            {dict.generator.noPerksTitle}
          </h2>
          <p className="text-xs text-text-secondary max-w-md">
            {dict.generator.noPerksDesc}
          </p>
        </section>
      ) : (
        <>
          <StageFrame className="flex-1 min-h-0" topLeft={topLeft} topRight={topRight}>
            <motion.div
              // Remounting on every role switch used to be universal here, which is
              // what made the Wheel of Fortune feel laggy when toggling Survivor/
              // Killer: WheelStage keeps an <img> cache and a live canvas render
              // loop, and destroying + rebuilding all of that (plus re-downloading
              // every perk icon from scratch, even ones already fetched) on each
              // toggle is real, visible work. WheelStage already reacts correctly
              // to `role` as a prop -- loadout/revealedSlots are reset by the
              // parent's handleRoleChange, and drawUnifiedWheel redraws whenever
              // `role` changes -- so it doesn't need the remount at all. The other
              // modes keep it: their lighter per-draw local state (locked/scattered
              // items, flipped cards, spun reels) was written to be cleared by a
              // fresh mount on role change, not by a prop.
              key={genMode === 'wheel' ? genMode : `${genMode}-${role}`}
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
                backendBase={backendBase}
              />
            )}
            {genMode === 'instant' && (
              <InstantStage
                role={role}
                activePlayablePerks={activePlayablePerks}
                activeMutator={activeMutator}
                onRollComplete={handleBatchRollComplete}
                onLoadoutComplete={trackRoll}
                onRollStart={() => setRevealedSlots([false, false, false, false])}
                revealedSlots={revealedSlots}
                onRevealSlot={handleRevealSlot}
                onSelectPerk={onSelectPerk}
                isBlind={blindMode}
                backendBase={backendBase}
              />
            )}
            {genMode === 'slot' && (
              <SlotMachineStage
                role={role}
                activePlayablePerks={activePlayablePerks}
                activeMutator={activeMutator}
                onRollComplete={handleBatchRollComplete}
                onLoadoutComplete={trackRoll}
                revealedSlots={revealedSlots}
                onRevealSlot={handleRevealSlot}
                onSelectPerk={onSelectPerk}
                isBlind={blindMode}
                backendBase={backendBase}
              />
            )}
            {genMode === 'tarot' && (
              <TarotDeckStage
                role={role}
                activePlayablePerks={activePlayablePerks}
                activeMutator={activeMutator}
                onRollComplete={handleBatchRollComplete}
                onLoadoutComplete={trackRoll}
                revealedSlots={revealedSlots}
                onRevealSlot={handleRevealSlot}
                onSelectPerk={onSelectPerk}
                isBlind={blindMode}
                backendBase={backendBase}
              />
            )}
            {genMode === 'crate' && (
              <LootCrateStage
                role={role}
                activePlayablePerks={activePlayablePerks}
                activeMutator={activeMutator}
                onRollComplete={handleBatchRollComplete}
                onLoadoutComplete={trackRoll}
                revealedSlots={revealedSlots}
                onRevealSlot={handleRevealSlot}
                onSelectPerk={onSelectPerk}
                isBlind={blindMode}
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
        }}
        onClearMutator={() => handleSelectMutator(null)}
        activeMutator={activeMutator}
      />

      <ConfirmModal
        open={showLowPoolWarning}
        title={
          totalPlayableCount === 0
            ? dict.generator.lowPoolEmptyTitle
            : dict.generator.lowPoolTitle
        }
        message={
          totalPlayableCount === 0
            ? dict.generator.lowPoolEmptyDesc
            : totalPlayableCount === 1
              ? formatMessage((dict.generator.lowPoolDescOne), { size: FULL_LOADOUT_SIZE })
              : formatMessage((dict.generator.lowPoolDescMany), { count: totalPlayableCount, size: FULL_LOADOUT_SIZE }, locale)
        }
        confirmLabel={dict.generator.lowPoolResetButton}
        confirmIcon={<RotateCcw className="icon-md" />}
        cancelLabel={dict.generator.lowPoolCloseButton}
        onConfirm={handleResetDrawnPerksOnly}
        onCancel={() => setShowLowPoolWarning(false)}
      />
    </div>
  );
};
