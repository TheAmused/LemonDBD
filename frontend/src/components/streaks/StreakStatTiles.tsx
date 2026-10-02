'use client';
// frontend/src/components/streaks/StreakStatTiles.tsx
import React, { useEffect, useRef, useState } from 'react';
import { StatTile } from './ChallengePanel';
import {
  deriveStreakStatEffects,
  initialRecord,
  type StatFlash,
  type StreakStatSnapshot,
} from '@/utils/streakStatEffects';

const BURST_MS = 1200;
const FLASH_MS = 900;

const FLASH_VALUE_CLASSES: Record<Exclude<StatFlash, null>, string> = {
  win: 'text-accent-green stat-bump',
  record: 'text-accent-amber stat-bump',
  loss: 'text-accent-red',
};

export interface StreakStatTilesProps {
  current: number;
  best: number;
  currentLabel: string;
  bestLabel: string;
  currentIcon: React.ReactNode;
  bestIcon: React.ReactNode;
}

/**
 * The Current / Best pair shared by every challenge header. Best turns amber while the running
 * streak is the record (with a burst the moment a win sets it). Current flashes green on a win and
 * red on a loss (amber when the win sets a record); only its icon stays amber during a record. Nothing fires on first
 * render, only on changes after it.
 */
export const StreakStatTiles: React.FC<StreakStatTilesProps> = ({
  current,
  best,
  currentLabel,
  bestLabel,
  currentIcon,
  bestIcon,
}) => {
  const previous = useRef<StreakStatSnapshot | null>(null);
  const [record, setRecord] = useState(() => initialRecord({ current, best }));
  const [burstKey, setBurstKey] = useState(0);
  const [flash, setFlash] = useState<{ type: StatFlash; key: number }>({ type: null, key: 0 });
  const [bursting, setBursting] = useState(false);

  useEffect(() => {
    const before = previous.current;
    previous.current = { current, best };
    if (!before) return;
    const effects = deriveStreakStatEffects(before, { current, best }, record);
    setRecord(effects.record);
    if (effects.burst) {
      setBurstKey((k) => k + 1);
      setBursting(true);
    }
    if (effects.flash) setFlash((f) => ({ type: effects.flash, key: f.key + 1 }));
    // `record` is state this effect owns; re-running on it would re-derive from stale snapshots.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, best]);

  useEffect(() => {
    if (!bursting) return;
    const timer = setTimeout(() => setBursting(false), BURST_MS);
    return () => clearTimeout(timer);
  }, [bursting, burstKey]);

  useEffect(() => {
    if (!flash.type) return;
    const timer = setTimeout(() => setFlash((f) => ({ ...f, type: null })), FLASH_MS);
    return () => clearTimeout(timer);
  }, [flash.type, flash.key]);

  const flashClass = flash.type ? FLASH_VALUE_CLASSES[flash.type] : '';
  const bestClass = record
    ? `border-accent-amber/60 bg-accent-amber/10 stat-record-shimmer ${bursting ? 'stat-record-burst' : ''}`
    : '';

  return (
    <>
      <StatTile
        icon={currentIcon}
        iconClassName={record ? 'text-accent-amber' : ''}
        label={currentLabel}
        value={
          <span key={flash.key} className={`inline-block transition-colors duration-300 ${flashClass}`}>
            {current}
          </span>
        }
      />
      <StatTile
        key={burstKey}
        icon={bestIcon}
        label={bestLabel}
        value={best}
        className={bestClass}
        iconClassName={record ? 'text-accent-amber' : ''}
        valueClassName={record ? 'text-accent-amber' : ''}
      />
    </>
  );
};
