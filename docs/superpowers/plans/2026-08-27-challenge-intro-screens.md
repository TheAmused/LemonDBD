# Challenge Intro Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user picks a challenge (Gauntlet, Chaos, History, Page Streak) from the streaks picker grid, show a short "what is this challenge" intro plus a link to the full rules, right above the existing difficulty/mode cards, and give each card a one-line mechanic blurb.

**Architecture:** Extract a new shared presentational shell, `ChallengeIntroModalShell`, that renders the backdrop, header, a short intro paragraph with a "Full rules" trigger, and a grid of difficulty/mode tiles (each tile supports an optional custom image that falls back to a Lucide icon, matching the existing fallback pattern in `StreakPanel`). The four existing/new per-challenge mode modals (`ChaosModeModal`, `HistoryModeModal`, `GauntletModeModal`, new `PageStreakModeModal`) become thin wrappers that supply their own intro copy, tile data, and colors to the shell, and locally open the challenge's existing `*RulesModal` component when "Full rules" is clicked. This mirrors the existing `RulesModalShell` + per-mode `*RulesModal` pattern already used in this same directory, so the codebase ends up with two parallel shell/wrapper families (rules modal, intro modal) instead of one-off duplicated markup.

**Tech Stack:** Next.js App Router, React (client components), Tailwind CSS v4, lucide-react icons. No component test runner exists in this repo (no `@testing-library/react`, no `*.test.tsx` files anywhere) — verified by scanning `frontend/src/__tests__` and `frontend/package.json` before writing this plan. Verification per task is `npx tsc --noEmit` plus a manual check in the running dev server or Docker container, the same approach already used for the perks list-view fix earlier in this branch's history. Do not introduce a new test framework as part of this feature; that is a separate, larger decision outside this task's scope.

**Spec:** No separate spec document — brainstorming was explicitly skipped by the user in favor of a short Q&A. The requirements below are the full record of that Q&A (this conversation) and are restated here so this plan is self-contained for an executor with no other context.

## Requirements gathered from the user

1. **Scope:** All four challenges get an intro screen: Gauntlet, Chaos, History, and Page Streak.
   - Page Streak has no difficulty/mode concept today (confirmed: `PageStreakRun` in `frontend/src/types/pageStreak.ts` has no mode field). It gets a short intro plus a single "Normal" card. Clicking it just starts the run exactly as it does today.
   - Gauntlet's existing "Original" card gets a short line saying it is the classic, original Gauntlet ruleset. Its locked "Lemon version" card gets a short placeholder line: a lightly modified, easier take on the Gauntlet. The user said a better description will come later once that mode's design is finalized — do not invent mechanics for it.
2. **Relation to the existing full Rules modal:** each challenge already has a comprehensive `*RulesModal` (tiers, exceptions, etc.) opened today from a "Rules" button inside the challenge board, after a difficulty/mode is already chosen. Add a second entry point: a "Full rules" link/button inside the new intro screen (before a difficulty is picked) that opens that exact same existing modal component. Do not duplicate its content into a new modal.
3. **Graphics:** leave a placeholder image slot on each difficulty/mode tile (an optional `image` field, exactly like `StreakPanelDef.image` in `frontend/src/components/streaks/panels.ts`) that falls back to a Lucide icon when unset. Do not source or generate real artwork as part of this task; the user will supply real images later.
4. **Frequency:** the intro screen shows every time the difficulty/mode picker would show today (i.e., it replaces today's bare picker in place, at the exact same trigger point). No "seen it once" dismissal/localStorage logic.
5. **Tone/format:** short (2 to 4 sentences), skimmable, not a wall of text. Each difficulty/mode card gets one short mechanic line (e.g. "checkpoint every 10 wins"), matching the blurbs Chaos and History already have today.

## Current state (verified by reading the code before writing this plan)

- The streaks picker grid, `frontend/src/components/streaks/StreakPanelGrid.tsx`, renders one `StreakPanel` card per challenge (from `frontend/src/components/streaks/panels.ts`). Clicking the Gauntlet, Chaos, or History card opens that challenge's `*ModeModal` (`GauntletModeModal`, `ChaosModeModal`, `HistoryModeModal`); clicking Page Streak's card navigates straight to `/${locale}/streaks/${role}/page-streak` via `href`, with no intermediate modal.
- `ChaosModeModal` (`frontend/src/components/streaks/chaos/ChaosModeModal.tsx`) already has 3 tiles (Easy/Medium/Hell) each with a one-line blurb, via a local `TILES` array. `HistoryModeModal` (`frontend/src/components/streaks/history/HistoryModeModal.tsx`) has 2 tiles (Medium/Hell) the same way. `GauntletModeModal` (`frontend/src/components/streaks/gauntlet/GauntletModeModal.tsx`) has 2 tiles (Original, and a locked "Lemon version" with no mechanic line, just "Coming soon."). None of the three has an intro paragraph or a rules link. All three duplicate the same backdrop/Escape-key/close markup.
- Each challenge has a full `*RulesModal` component built on a shared `RulesModalShell` (`frontend/src/components/streaks/RulesModalShell.tsx`): `ChaosRulesModal`, `HistoryRulesModal`, `GauntletRulesModal` (this one takes a required `role: 'killer' | 'survivor'` prop), and `PageStreakRulesModal`. All four already exist and are fully written; none needs new content for this task.
- `GauntletModeModal` currently has no `role` prop, but the Gauntlet panel only ever appears on `killer` or `survivor` role pages (`KILLER_STREAK_PANELS` / `SURVIVOR_STREAK_PANELS` in `panels.ts`; `CHALLENGE_STREAK_PANELS` has no gauntlet entry), so `StreakPanelGrid`'s `role: string` prop is safely `'killer' | 'survivor'` at that call site.
- `dict` (the i18n dictionary) is never fetched or passed into `StreakPanelGrid` today (`frontend/src/app/[locale]/streaks/killer/page.tsx` renders `<StreakPanelGrid locale={locale} role="killer" />` with no dict), so every string in these mode modals is already English-fallback-only in practice, wired through the `dict?.streaks?.xxx || 'English text'` pattern purely so the plumbing exists for whenever a future task wires `dict` through. This plan follows that exact same established convention: reuse existing `frontend/src/locales/en/streaks.ts` keys where they already fit (`rules`, `original`, `lemonVersion`, `comingSoon`, `pageStreak`, `chooseDifficulty`, `chooseMode`, `chooseGauntletMode`), and add exactly one new key (`normal`) rather than inventing a parallel localization scheme. New paragraph copy is hardcoded English, matching how every existing `*RulesModal`'s paragraphs are hardcoded today.
- `npm run check:i18n` and `npm run check:i18n:strict` both report zero issues on the current codebase (verified by running them before writing this plan), including on the existing `*RulesModal` files that are full of hardcoded paragraph text. New hardcoded paragraphs written in the same style will not newly trip this scanner.
- `frontend/src/components/streaks/StreakPanel.tsx` (the top-level challenge card, not to be confused with the new tile) already implements the "optional image, else icon" fallback this plan reuses: `{image ? <img src={image} ... /> : <Icon ... />}`.

## Global Constraints

- No em dashes and no hyphen ranges anywhere in UI copy (e.g. write "10 to 19", not "10-19"). This is an existing, hard house rule already followed throughout `frontend/src/components/streaks/**` (see `GauntletRulesModal`'s `streakRange: 'Streak 10 to 19'`).
- Commit messages are a single line, no body.
- Keep new/changed component props backward compatible with existing call sites unless a task explicitly says to change a call site too (`GauntletModeModal` gains a new required `role` prop; its one call site in `StreakPanelGrid.tsx` is updated in the same task).
- Every new or modified `.tsx` file must pass `npx tsc --noEmit` (run from `frontend/`) before its task is considered done.
- Do not touch `frontend/src/components/streaks/panels.ts` or the backend; this task is entirely about the intermediate picker screen, not the top-level challenge grid or the challenge boards themselves.

---

## File Structure

**Create:**
- `frontend/src/components/streaks/ChallengeIntroModalShell.tsx` — new shared shell: backdrop, Escape/close handling, header (icon + title + close button, styled like `RulesModalShell`'s header), an intro paragraph block with a "Full rules" button, and a responsive grid of tiles.
- `frontend/src/components/streaks/page-streak/PageStreakModeModal.tsx` — new wrapper around the shell for Page Streak's single "Normal" tile.

**Modify:**
- `frontend/src/components/streaks/chaos/ChaosModeModal.tsx` — rewritten to use the shared shell; adds intro copy and a "Full rules" trigger that opens `ChaosRulesModal`.
- `frontend/src/components/streaks/history/HistoryModeModal.tsx` — same treatment, opens `HistoryRulesModal`.
- `frontend/src/components/streaks/gauntlet/GauntletModeModal.tsx` — same treatment, gains a `role` prop, opens `GauntletRulesModal`; locked tile gets a description line.
- `frontend/src/components/streaks/StreakPanelGrid.tsx` — passes `role` into `GauntletModeModal`; adds a `page-streak` branch that opens the new `PageStreakModeModal` instead of navigating directly, plus the new modal's state and render call.
- `frontend/src/locales/en/streaks.ts` — adds one new key, `normal`.

---

### Task 1: Build the shared intro shell and wire it into Chaos (first, most complete consumer: 3 tiles)

**Files:**
- Create: `frontend/src/components/streaks/ChallengeIntroModalShell.tsx`
- Modify: `frontend/src/components/streaks/chaos/ChaosModeModal.tsx`

**Interfaces:**
- Produces (used by every later task): from `ChallengeIntroModalShell.tsx`,
  ```ts
  export interface ChallengeIntroTile {
    value: string;
    label: string;
    description: string;
    icon: LucideIcon;
    image?: string;
    accentClassName: string;
    disabled?: boolean;
    disabledBadge?: string;
  }

  export interface ChallengeIntroModalShellProps {
    isOpen: boolean;
    onClose: () => void;
    icon: LucideIcon;
    iconClassName: string;
    title: string;
    intro: string;
    rulesLabel: string;
    onOpenRules: () => void;
    tiles: ChallengeIntroTile[];
    onSelectTile: (value: string) => void;
    tileGridClassName: string;
  }

  export const ChallengeIntroModalShell: React.FC<ChallengeIntroModalShellProps>
  ```

- [ ] **Step 1: Create the shell component**

```tsx
// frontend/src/components/streaks/ChallengeIntroModalShell.tsx
'use client';

import React, { useEffect } from 'react';
import { X, Lock, BookOpen, type LucideIcon } from 'lucide-react';

export interface ChallengeIntroTile {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Themed artwork for this tile; falls back to `icon` when absent. */
  image?: string;
  /** Tailwind border/background/hover classes for the tile button. */
  accentClassName: string;
  disabled?: boolean;
  /** Short badge shown on a disabled tile, e.g. "Coming soon." */
  disabledBadge?: string;
}

export interface ChallengeIntroModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  icon: LucideIcon;
  /** Tailwind classes for the header icon chip, e.g. "bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400". */
  iconClassName: string;
  title: string;
  /** Short, 2 to 4 sentence description of the challenge concept. */
  intro: string;
  rulesLabel: string;
  onOpenRules: () => void;
  tiles: ChallengeIntroTile[];
  onSelectTile: (value: string) => void;
  /** Tailwind grid-cols classes for the tile row, e.g. "sm:grid-cols-3". */
  tileGridClassName: string;
}

/**
 * Shared chrome for every streak mode's intro + difficulty picker screen
 * (Gauntlet/Chaos/History/Page Streak): backdrop, header, a short concept
 * paragraph with a link to the full rules, and a row of mode/difficulty
 * tiles. Each mode only supplies its own copy, tile data, and colors,
 * instead of re-declaring this same backdrop/header/tile markup four times.
 */
export const ChallengeIntroModalShell: React.FC<ChallengeIntroModalShellProps> = ({
  isOpen,
  onClose,
  icon: Icon,
  iconClassName,
  title,
  intro,
  rulesLabel,
  onOpenRules,
  tiles,
  onSelectTile,
  tileGridClassName,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-md overflow-y-auto cursor-pointer"
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 border rounded-xl ${iconClassName}`}>
              <Icon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-5">
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 shadow-sm">
            <p className="leading-relaxed text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              {intro}
            </p>
            <button
              type="button"
              onClick={onOpenRules}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              {rulesLabel}
            </button>
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-4 px-6 pb-6 ${tileGridClassName}`}>
          {tiles.map((tile) => {
            const TileIcon = tile.icon;
            const content = (
              <>
                {tile.image ? (
                  <img
                    src={tile.image}
                    alt=""
                    className="h-10 w-10 rounded-xl object-cover shadow-sm"
                  />
                ) : (
                  <TileIcon className="w-6 h-6" />
                )}
                <span className="font-bold text-slate-900 dark:text-white">{tile.label}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{tile.description}</span>
                {tile.disabled && tile.disabledBadge && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {tile.disabledBadge}
                  </span>
                )}
              </>
            );

            if (tile.disabled) {
              return (
                <div
                  key={tile.value}
                  className="flex flex-col items-start gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 p-5 opacity-70"
                >
                  <Lock className="w-6 h-6 text-slate-400" />
                  <span className="font-bold text-slate-500 dark:text-slate-400">{tile.label}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{tile.description}</span>
                  {tile.disabledBadge && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {tile.disabledBadge}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <button
                key={tile.value}
                onClick={() => onSelectTile(tile.value)}
                className={`group flex flex-col items-start gap-2 rounded-2xl border p-5 text-left transition-colors cursor-pointer ${tile.accentClassName}`}
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Run the typechecker**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no errors referencing `ChallengeIntroModalShell.tsx`. (There will still be errors from `ChaosModeModal.tsx` if Step 3 below is not done yet, since it will not have been touched — that's expected at this point since the shell has no consumer yet.)

- [ ] **Step 3: Rewrite `ChaosModeModal` to use the shell**

Replace the entire contents of `frontend/src/components/streaks/chaos/ChaosModeModal.tsx` with:

```tsx
// frontend/src/components/streaks/chaos/ChaosModeModal.tsx
'use client';

import React, { useState } from 'react';
import { Coins, Flame, Skull } from 'lucide-react';
import { Difficulty } from '@/types/chaosStreak';
import { ChallengeIntroModalShell, ChallengeIntroTile } from '../ChallengeIntroModalShell';
import { ChaosRulesModal } from './ChaosRulesModal';

export interface ChaosModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDifficulty: (difficulty: Difficulty) => void;
  dict?: any;
}

const TILES: ChallengeIntroTile[] = [
  {
    value: 'easy',
    label: 'Easy',
    description: 'A checkpoint banks every 5 wins.',
    icon: Coins,
    accentClassName: 'border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10',
  },
  {
    value: 'medium',
    label: 'Medium',
    description: 'A checkpoint banks every 10 wins.',
    icon: Flame,
    accentClassName: 'border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10',
  },
  {
    value: 'hell',
    label: 'Hell',
    description: 'No checkpoints. One loss resets everything.',
    icon: Skull,
    accentClassName: 'border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10',
  },
];

export const ChaosModeModal: React.FC<ChaosModeModalProps> = ({ isOpen, onClose, onSelectDifficulty, dict }) => {
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  return (
    <>
      <ChallengeIntroModalShell
        isOpen={isOpen}
        onClose={onClose}
        icon={Flame}
        iconClassName="bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400"
        title={dict?.streaks?.chooseDifficulty || 'Choose a difficulty'}
        intro="Pull the lever to draw 4 random perks and 2 addon rarities from your unlocked pool, then pick which owned killer plays the round. Win 3 kills or more to keep your streak alive."
        rulesLabel={dict?.streaks?.rules || 'Chaos Rules'}
        onOpenRules={() => setIsRulesOpen(true)}
        tiles={TILES}
        onSelectTile={(value) => onSelectDifficulty(value as Difficulty)}
        tileGridClassName="sm:grid-cols-3"
      />

      <ChaosRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} dict={dict} />
    </>
  );
};
```

- [ ] **Step 4: Run the typechecker**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual check in the dev server**

Run (from `frontend/`): `npm run dev`, then in a browser go to `http://localhost:3000/en/streaks/killer` and click the Chaos Streak card.
Expected: a modal opens showing a short intro paragraph, a "Chaos Rules" link, and three tiles (Easy/Medium/Hell) each with their one-line blurb. Clicking "Chaos Rules" opens the full rules modal on top; closing it returns to the intro modal. Clicking a tile navigates to the Chaos Streak page with the right `?difficulty=` query param, exactly as it did before this change. Escape and backdrop-click both close the intro modal.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/streaks/ChallengeIntroModalShell.tsx frontend/src/components/streaks/chaos/ChaosModeModal.tsx
git commit -m "feat(streaks): add challenge intro shell and wire it into Chaos mode picker"
```

---

### Task 2: Wire the shell into History (2 tiles)

**Files:**
- Modify: `frontend/src/components/streaks/history/HistoryModeModal.tsx`

**Interfaces:**
- Consumes: `ChallengeIntroModalShell`, `ChallengeIntroTile` from `frontend/src/components/streaks/ChallengeIntroModalShell.tsx` (Task 1).
- Consumes: `HistoryRulesModal` from `frontend/src/components/streaks/history/HistoryRulesModal.tsx` (existing, unchanged).

- [ ] **Step 1: Rewrite `HistoryModeModal`**

Replace the entire contents of `frontend/src/components/streaks/history/HistoryModeModal.tsx` with:

```tsx
// frontend/src/components/streaks/history/HistoryModeModal.tsx
'use client';

import React, { useState } from 'react';
import { Shield, Skull } from 'lucide-react';
import { HistoryMode } from '@/types/historyStreak';
import { ChallengeIntroModalShell, ChallengeIntroTile } from '../ChallengeIntroModalShell';
import { HistoryRulesModal } from './HistoryRulesModal';

export interface HistoryModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: HistoryMode) => void;
  dict?: any;
}

const TILES: ChallengeIntroTile[] = [
  {
    value: 'medium',
    label: 'Medium',
    description: 'A checkpoint banks every row you clear.',
    icon: Shield,
    accentClassName: 'border-slate-400/30 bg-slate-500/5 hover:bg-slate-500/10',
  },
  {
    value: 'hell',
    label: 'Hell',
    description: 'No checkpoints. One loss resets everything.',
    icon: Skull,
    accentClassName: 'border-slate-400/30 bg-slate-500/5 hover:bg-slate-500/10',
  },
];

export const HistoryModeModal: React.FC<HistoryModeModalProps> = ({ isOpen, onClose, onSelectMode, dict }) => {
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  return (
    <>
      <ChallengeIntroModalShell
        isOpen={isOpen}
        onClose={onClose}
        icon={Shield}
        iconClassName="bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400"
        title={dict?.streaks?.chooseMode || 'Choose a mode'}
        intro="Your owned killers are grouped into rows of 5, sorted by release order. Clear a row to unlock the next one and add its teachable perks to your pool."
        rulesLabel={dict?.streaks?.rules || 'History Rules'}
        onOpenRules={() => setIsRulesOpen(true)}
        tiles={TILES}
        onSelectTile={(value) => onSelectMode(value as HistoryMode)}
        tileGridClassName="sm:grid-cols-2"
      />

      <HistoryRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} dict={dict} />
    </>
  );
};
```

- [ ] **Step 2: Run the typechecker**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual check in the dev server**

With `npm run dev` still running, go to `http://localhost:3000/en/streaks/killer` and click the History Streak card.
Expected: intro paragraph, "History Rules" link opening the full rules modal, two tiles (Medium/Hell) with their blurbs, clicking a tile navigates to the History Streak page with the right `?mode=` param.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/streaks/history/HistoryModeModal.tsx
git commit -m "feat(streaks): wire challenge intro shell into History mode picker"
```

---

### Task 3: Wire the shell into Gauntlet (2 tiles, one locked, role-aware intro)

**Files:**
- Modify: `frontend/src/components/streaks/gauntlet/GauntletModeModal.tsx`
- Modify: `frontend/src/components/streaks/StreakPanelGrid.tsx:145-149` (the `<GauntletModeModal ... />` render call)

**Interfaces:**
- Consumes: `ChallengeIntroModalShell`, `ChallengeIntroTile` (Task 1).
- Consumes: `GauntletRulesModal` from `frontend/src/components/streaks/gauntlet/GauntletRulesModal.tsx`, which requires `role: 'killer' | 'survivor'` (existing, unchanged).
- Produces: `GauntletModeModal` now requires a `role: 'killer' | 'survivor'` prop (breaking change for its one call site, fixed in Step 3 of this task).

- [ ] **Step 1: Rewrite `GauntletModeModal`**

Replace the entire contents of `frontend/src/components/streaks/gauntlet/GauntletModeModal.tsx` with:

```tsx
// frontend/src/components/streaks/gauntlet/GauntletModeModal.tsx
'use client';

import React, { useState } from 'react';
import { Swords, Lock } from 'lucide-react';
import { ChallengeIntroModalShell, ChallengeIntroTile } from '../ChallengeIntroModalShell';
import { GauntletRulesModal } from './GauntletRulesModal';

export interface GauntletModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOriginal: () => void;
  role: 'killer' | 'survivor';
  dict?: any;
}

export const GauntletModeModal: React.FC<GauntletModeModalProps> = ({
  isOpen,
  onClose,
  onSelectOriginal,
  role,
  dict,
}) => {
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const tiles: ChallengeIntroTile[] = [
    {
      value: 'original',
      label: dict?.streaks?.original || 'Original',
      description: 'Classic, original Gauntlet rules. A checkpoint banks every 10 wins.',
      icon: Swords,
      accentClassName: 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10',
    },
    {
      value: 'lemon',
      label: dict?.streaks?.lemonVersion || 'Lemon version',
      description: 'A lightly modified, easier take on the Gauntlet.',
      icon: Lock,
      accentClassName: 'border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30',
      disabled: true,
      disabledBadge: dict?.streaks?.comingSoon || 'Coming soon.',
    },
  ];

  return (
    <>
      <ChallengeIntroModalShell
        isOpen={isOpen}
        onClose={onClose}
        icon={Swords}
        iconClassName="bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
        title={dict?.streaks?.chooseGauntletMode || 'Choose a Gauntlet Mode'}
        intro={`Face a random owned ${role} with a shrinking perk loadout. Win to raise your streak, lose and fall back to your last checkpoint.`}
        rulesLabel={dict?.streaks?.rules || 'Gauntlet Rules'}
        onOpenRules={() => setIsRulesOpen(true)}
        tiles={tiles}
        onSelectTile={(value) => {
          if (value === 'original') onSelectOriginal();
        }}
        tileGridClassName="sm:grid-cols-2"
      />

      <GauntletRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} role={role} dict={dict} />
    </>
  );
};
```

- [ ] **Step 2: Run the typechecker**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: errors pointing at `frontend/src/components/streaks/StreakPanelGrid.tsx` where `<GauntletModeModal>` is missing the new required `role` prop. That confirms the type change is real; fixed in the next step.

- [ ] **Step 3: Pass `role` at the call site**

In `frontend/src/components/streaks/StreakPanelGrid.tsx`, find:

```tsx
      <GauntletModeModal
        isOpen={isModeModalOpen}
        onClose={() => setIsModeModalOpen(false)}
        onSelectOriginal={() => router.push(`/${locale}/streaks/${role}/gauntlet-streak`)}
      />
```

Replace with:

```tsx
      <GauntletModeModal
        isOpen={isModeModalOpen}
        onClose={() => setIsModeModalOpen(false)}
        onSelectOriginal={() => router.push(`/${locale}/streaks/${role}/gauntlet-streak`)}
        role={role as 'killer' | 'survivor'}
      />
```

(Safe: the Gauntlet panel is only ever rendered from `KILLER_STREAK_PANELS` or `SURVIVOR_STREAK_PANELS` in `panels.ts`, both of which are only used by pages that pass `role="killer"` or `role="survivor"`; `CHALLENGE_STREAK_PANELS` has no `gauntlet-streak` entry.)

- [ ] **Step 4: Run the typechecker**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual check in the dev server**

Go to `http://localhost:3000/en/streaks/killer` and click the Gauntlet Streak card.
Expected: intro mentions "killer"; "Original" tile is clickable and shows the classic-rules blurb; "Lemon version" tile is visibly locked (Lock icon, muted colors, not clickable) and shows the "lightly modified, easier" line plus a "Coming soon." badge; "Gauntlet Rules" link opens the full rules modal for the killer role. Then go to `http://localhost:3000/en/streaks/survivor` and repeat: intro should say "survivor" instead, and the Rules link should open the survivor variant of the rules modal.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/streaks/gauntlet/GauntletModeModal.tsx frontend/src/components/streaks/StreakPanelGrid.tsx
git commit -m "feat(streaks): wire challenge intro shell into Gauntlet mode picker"
```

---

### Task 4: Add a Page Streak intro screen (new, single "Normal" tile)

**Files:**
- Create: `frontend/src/components/streaks/page-streak/PageStreakModeModal.tsx`
- Modify: `frontend/src/components/streaks/StreakPanelGrid.tsx`
- Modify: `frontend/src/locales/en/streaks.ts`

**Interfaces:**
- Consumes: `ChallengeIntroModalShell`, `ChallengeIntroTile` (Task 1).
- Consumes: `PageStreakRulesModal` from `frontend/src/components/streaks/page-streak/PageStreakRulesModal.tsx` (existing, unchanged).
- Produces: `PageStreakModeModal` with props `{ isOpen: boolean; onClose: () => void; onStart: () => void; dict?: any }`.

- [ ] **Step 1: Add the `normal` locale key**

In `frontend/src/locales/en/streaks.ts`, add a new key. Find:

```ts
  "pageStreak": "Page streak",
```

Replace with:

```ts
  "pageStreak": "Page streak",
  "normal": "Normal",
```

- [ ] **Step 2: Create `PageStreakModeModal`**

```tsx
// frontend/src/components/streaks/page-streak/PageStreakModeModal.tsx
'use client';

import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { ChallengeIntroModalShell, ChallengeIntroTile } from '../ChallengeIntroModalShell';
import { PageStreakRulesModal } from './PageStreakRulesModal';

export interface PageStreakModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
  dict?: any;
}

const TILES: ChallengeIntroTile[] = [
  {
    value: 'normal',
    label: 'Normal',
    description: 'Every perk page counts. No difficulty options yet.',
    icon: BookOpen,
    accentClassName: 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10',
  },
];

export const PageStreakModeModal: React.FC<PageStreakModeModalProps> = ({ isOpen, onClose, onStart, dict }) => {
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  return (
    <>
      <ChallengeIntroModalShell
        isOpen={isOpen}
        onClose={onClose}
        icon={BookOpen}
        iconClassName="bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400"
        title={dict?.streaks?.pageStreak || 'Page streak'}
        intro="Pick a killer and build the strongest loadout you can from their current perk page. Win to move to the next page, lose and start over from page 1."
        rulesLabel={dict?.streaks?.rules || 'Page Streak Rules'}
        onOpenRules={() => setIsRulesOpen(true)}
        tiles={TILES}
        onSelectTile={() => onStart()}
        tileGridClassName="sm:grid-cols-1 max-w-xs mx-auto sm:mx-0"
      />

      <PageStreakRulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} dict={dict} />
    </>
  );
};
```

- [ ] **Step 3: Wire it into `StreakPanelGrid`**

In `frontend/src/components/streaks/StreakPanelGrid.tsx`, add the import near the other mode modal imports:

```tsx
import { PageStreakModeModal } from './page-streak/PageStreakModeModal';
```

Add a new state variable next to the other `isXModeModalOpen` ones:

```tsx
  const [isPageStreakModeModalOpen, setIsPageStreakModeModalOpen] = useState(false);
```

Add a new branch right after the `history-streak` branch (before the final default `return`):

```tsx
        if (panel.id === 'page-streak') {
          return (
            <StreakPanel
              key={panel.id}
              title={panel.title}
              description={panel.description}
              icon={panel.icon}
              accent={panel.accent}
              accentBorder={panel.accentBorder}
              color={panel.color}
              image={panel.image}
              onClick={() => setIsPageStreakModeModalOpen(true)}
            />
          );
        }
```

Add the modal render next to the other three, after the `<HistoryModeModal ... />` block:

```tsx
      <PageStreakModeModal
        isOpen={isPageStreakModeModalOpen}
        onClose={() => setIsPageStreakModeModalOpen(false)}
        onStart={() => router.push(`/${locale}/streaks/${role}/page-streak`)}
      />
```

- [ ] **Step 4: Run the typechecker**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual check in the dev server**

Go to `http://localhost:3000/en/streaks/killer` and click the Page Streak card.
Expected: it no longer navigates straight to the Page Streak page. Instead, a modal opens with a short intro, a "Page Streak Rules" link (opens the existing full rules modal), and a single "Normal" tile. Clicking "Normal" navigates to `/en/streaks/killer/page-streak`, same destination as before this change.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/streaks/page-streak/PageStreakModeModal.tsx frontend/src/components/streaks/StreakPanelGrid.tsx frontend/src/locales/en/streaks.ts
git commit -m "feat(streaks): add Page Streak intro screen with a single Normal mode"
```

---

### Task 5: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Typecheck the whole frontend**

Run (from `frontend/`): `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Run the i18n hardcoded-string scanner**

Run (from `frontend/`): `npm run check:i18n`
Expected: `✅ No hardcoded strings found! All .tsx files are properly localized.` — the same clean result as the baseline recorded in this plan's "Current state" section, confirming the new intro paragraphs did not regress it.

- [ ] **Step 3: Rebuild and restart the frontend container**

Run (from the repo root):
```bash
docker compose build frontend
docker compose up -d --no-deps frontend
```
Then check: `curl -sk -o /dev/null -w "%{http_code}\n" https://localhost/en/streaks/killer --max-time 5` should print `200`.

- [ ] **Step 4: Manual pass through all four challenges in the container**

Using a browser against `https://localhost/en/streaks/killer` and `https://localhost/en/streaks/survivor`, click each of Gauntlet, Chaos, History, and Page Streak and confirm for each:
- The intro paragraph is short (not a wall of text) and matches the challenge.
- The "Rules" link opens the correct existing full rules modal, and closing it returns cleanly to the intro modal underneath.
- Every enabled tile is clickable and navigates to the same destination it did before this change (compare against `git show HEAD~4:frontend/src/components/streaks/StreakPanelGrid.tsx` if in doubt about the pre-change routes).
- The Gauntlet "Lemon version" tile is visibly locked and not clickable.
- Escape and clicking the backdrop both close the intro modal without errors.
- No new errors in the browser console (open devtools before clicking through).

- [ ] **Step 5: Report results**

Summarize what was checked and any deviations found. Do not commit anything in this task; it is verification only.

---

## Self-review notes (from writing this plan)

- **Spec coverage:** all 5 numbered requirements above map to a task: scope (Tasks 1 to 4), rules-modal link (built into the shell in Task 1, used by every wrapper), image-with-icon-fallback placeholder (built into the shell's tile rendering in Task 1), no dismissal/localStorage logic (deliberately absent from every task), short tone (intro copy is 2 to 3 sentences everywhere, checked against the "no wall of text" requirement while drafting).
- **Known follow-up, not part of this plan:** `dict` is never actually fetched or passed into `StreakPanelGrid` today, so every string added here is English-only in practice despite being wired through `dict?.streaks?.xxx || 'fallback'`. Wiring real dict fetching into the streaks picker page, and translating the new copy into `de`/`es`/`ja`/`pl`, is a separate, larger task the user did not ask for here and should not be bundled in.
