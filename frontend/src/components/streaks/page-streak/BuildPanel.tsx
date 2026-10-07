'use client';
// frontend/src/components/streaks/page-streak/BuildPanel.tsx

import React, { useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { KillerIcon } from '@/components/icons/DbdIcons';
import { tip } from '@/components/common/Tooltip';
import { usePerkDisplayName } from '@/context/DisplayNamesContext';
import { useDictionary } from '@/context/DictionaryContext';

interface BuildPanelProps {
  selected: string[];
  size: number;
  iconByPerk?: Record<string, string>;
  killerName: string;
  avatarSrc?: string;
}

/** Slot centres on the profile's diamond, in half-diamond steps from the middle: top, right, bottom, left. */
const SLOT_OFFSETS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];
/** One diamond's width. */
const SLOT_SIZE = 4.5;
/** Distance between neighbouring diamonds' edges. */
const SLOT_GAP = 0.5;
/** Centre-to-centre distance along each axis, so neighbouring diamonds sit a gap apart. */
const STEP = (SLOT_SIZE + SLOT_GAP) / 2;
const BOX = SLOT_SIZE + 2 * STEP;

/** The killer and the build being put together, laid out like the profile's main card. */
export const BuildPanel: React.FC<BuildPanelProps> = ({ selected, size, iconByPerk = {}, killerName, avatarSrc }) => {
  const dict = useDictionary();
  const displayName = usePerkDisplayName();
  const [imgError, setImgError] = useState(false);

  return (
    <section
      aria-label={dict.streaks.yourBuildForMatch}
      className="flex items-center justify-center gap-6 py-2 lg:border-l lg:border-border-color lg:pl-6"
    >
      <div className="flex min-w-0 flex-col items-center gap-2">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-border-color bg-bg-surface shadow-lg sm:h-28 sm:w-28">
          {avatarSrc && !imgError ? (
            <img
              src={avatarSrc}
              alt={killerName}
              draggable={false}
              onError={() => setImgError(true)}
              className="h-full w-full select-none object-cover"
            />
          ) : (
            <KillerIcon className="h-8 w-8 text-text-muted" aria-hidden="true" />
          )}
        </div>
        <h3 className="max-w-[8rem] truncate text-sm font-black tracking-wide text-text-primary">{killerName}</h3>
      </div>

      <MotionConfig reducedMotion="user">
        <div className="relative shrink-0" style={{ width: `${BOX}rem`, height: `${BOX}rem` }}>
          {SLOT_OFFSETS.slice(0, size).map((offset, index) => {
            const name = selected[index];
            const icon = name ? iconByPerk[name] : undefined;
            return (
              <div
                key={index}
                {...(name ? tip(displayName(name), undefined, 'item') : {})}
                aria-label={name ? displayName(name) : `${dict.streaks.slotLabel} ${index + 1}`}
                className="absolute"
                style={{
                  width: `${SLOT_SIZE}rem`,
                  height: `${SLOT_SIZE}rem`,
                  left: `${STEP + offset.x * STEP}rem`,
                  top: `${STEP + offset.y * STEP}rem`,
                }}
              >
                <svg viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-0 h-full w-full text-border-color">
                  <polygon
                    points="50,4 96,50 50,96 4,50"
                    fill="currentColor"
                    fillOpacity="0.12"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray="6 5"
                  />
                </svg>
                {!name && <Plus className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />}
                <AnimatePresence>
                  {name && icon && (
                    <motion.img
                      key={name}
                      src={icon}
                      alt=""
                      draggable={false}
                      initial={{ scale: 0.3, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.3, opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="absolute inset-0 h-full w-full select-none object-contain"
                    />
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </MotionConfig>
    </section>
  );
};
