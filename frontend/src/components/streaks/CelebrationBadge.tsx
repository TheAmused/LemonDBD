import React from 'react';
import { Trophy } from 'lucide-react';

/** Card chrome shared by every win screen: the checkpoint modal's amber gradient, without the motion. */
export const CELEBRATION_CARD_CLASSES =
  'rounded-3xl border border-accent-amber/60 bg-gradient-to-b from-accent-amber/20 via-bg-surface to-bg-primary text-center';

/** Static amber trophy medallion that tops a win screen. */
export const CelebrationBadge: React.FC = () => (
  <div
    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-accent-amber bg-gradient-to-br from-accent-amber to-accent-amber-hover text-text-inverted"
    aria-hidden="true"
  >
    <Trophy className="h-10 w-10" />
  </div>
);

/** Small amber caps line under the badge, e.g. "Congratulations". */
export const CELEBRATION_LABEL_CLASSES = 'text-xs font-black uppercase tracking-[0.25em] text-accent-amber';
