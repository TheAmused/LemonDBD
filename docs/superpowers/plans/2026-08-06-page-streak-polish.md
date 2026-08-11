# Page Streak Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply five review items from the user's first hands-on test of Page streak: move the Streaks nav entry, simplify and promote the result buttons, show real perk and killer artwork, put perk icons in the history, and celebrate a completed run.

**Architecture:** Frontend-only. Artwork follows the pattern already used by `PerkCard.tsx` and `challenge/CharacterRosterGrid.tsx` — the client fetches the perk list itself and builds `${NEXT_PUBLIC_API_URL}/static/<path>` URLs, with per-image error state falling back to the current placeholder. No backend change, no new dependency.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.7, Tailwind CSS v4, lucide-react, Canvas 2D.

**Branch:** `feature/page-streak-mechanics` (the mechanics branch, not yet merged — these fixes belong to the same feature).

## Global Constraints

- All work commits to `feature/page-streak-mechanics`.
- **Verification gate:** `npx tsc --noEmit` then `npm run build`, both from `frontend/`, both must pass.
- **Never run `npm run lint`** — Next.js 16 removed `next lint`, so it fails project-wide with "Invalid project directory provided". Not a gate, not to be fixed here.
- **Never start `npm run dev`** in a subagent session — it hangs. The build route table plus the controller's browser pass are the verification.
- No new dependencies. No frontend test framework — the project has none, deliberately.
- No backend changes: no route, service, schema or test edits under `backend/`.
- All copy hardcoded English. No keys added to `frontend/src/locales/*.json`.
- Streaks accent stays orange: `text-orange-400`, `bg-orange-500/10`, `border-orange-500/20`.
- Image URLs are built exactly as the existing components do: strip a leading `static/` or `/` from the stored path, then prefix `${backendBase}/static/`. `backendBase` is `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'`.
- Every `<img>` carries an `onError` handler that falls back to the existing placeholder. Perk icon filenames derive from perk names, so apostrophes and accents ("A Nurse's Calling", "Coup de Grâce") are the expected 404s — the fallback is load-bearing, not decoration.
- Everything animated must be inert under `prefers-reduced-motion: reduce`.

---

### Task 1: Move Streaks above Challenge in the sidebar

**Files:**
- Modify: `frontend/src/components/Sidebar.tsx` (the `navItems` array)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Move the entry**

In `frontend/src/components/Sidebar.tsx`, the `navItems` array currently ends with this order: `all`, `Survivor`, `Killer`, `generator`, `challenge`, `draft`, `swf`, `killer-calculator`, `builds`, `custom-perks`, `maps`, `streaks`, `quests`.

Cut the whole `streaks` entry:

```tsx
    {
      id: 'streaks',
      label: '🔥 Streaks',
      icon: Repeat,
      color: 'text-orange-400',
      activeBg: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
    },
```

and re-insert it immediately **before** the `challenge` entry (the one whose `label` is `'⚡ Challenge'`), so the resulting order is `… generator`, `streaks`, `challenge`, `draft`, `…`.

Change nothing else — not the entry's own fields, not the route-link whitelist (`streaks` is already in it), not any other entry.

- [ ] **Step 2: Verify**

Run from `frontend/`:

```bash
npx tsc --noEmit
npm run build
```

Expected: both clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Sidebar.tsx
git commit -m "fix(streaks): move Streaks above Challenge in the sidebar"
```

---

### Task 2: Real perk and killer artwork

**Files:**
- Create: `frontend/src/components/streaks/page-streak/usePerkArtwork.ts`
- Modify: `frontend/src/components/streaks/page-streak/PerkTile.tsx`
- Modify: `frontend/src/components/streaks/page-streak/PerkPageGrid.tsx`
- Modify: `frontend/src/components/streaks/page-streak/BuildBar.tsx`
- Modify: `frontend/src/components/streaks/page-streak/PageStreakRunView.tsx`
- Modify: `frontend/src/components/streaks/page-streak/KillerRosterGrid.tsx`
- Modify: `frontend/src/components/streaks/page-streak/PageStreakRoster.tsx`
- Modify: `frontend/src/components/streaks/page-streak/RunHeader.tsx`

**Interfaces:**
- Consumes: the existing components as they stand.
- Produces:
  - `usePerkArtwork()` — hook returning `{ iconByPerk: Record<string, string>, avatarByKiller: Record<string, string> }`
  - `PerkTile` gains an optional `iconSrc?: string` prop
  - `PerkPageGrid` gains an optional `iconByPerk?: Record<string, string>` prop
  - `BuildBar` gains an optional `iconByPerk?: Record<string, string>` prop
  - `KillerRosterGrid` gains an optional `avatarByKiller?: Record<string, string>` prop
  - `RunHeader` gains an optional `avatarSrc?: string` prop

**Why a client-side fetch:** this mirrors what every other tab in this app already does (`PerkCard.tsx`, `challenge/CharacterRosterGrid.tsx`, and the pages that call `/api/v1/perks` directly). The user asked explicitly for the same approach.

- [ ] **Step 1: Write the artwork hook**

Create `frontend/src/components/streaks/page-streak/usePerkArtwork.ts`:

```ts
'use client';

import { useEffect, useState } from 'react';

interface ApiPerk {
  name: string;
  character?: string | null;
  icon_local_path?: string | null;
  character_avatar_path?: string | null;
}

export interface PerkArtwork {
  iconByPerk: Record<string, string>;
  avatarByKiller: Record<string, string>;
}

const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/** Same URL shape the rest of the app uses: strip a leading `/` or `static/`, then prefix. */
export function staticUrl(rawPath?: string | null): string | null {
  if (!rawPath) return null;
  const cleanPath = rawPath.replace(/^\/?(static\/)?/, '');
  return `${backendBase}/static/${cleanPath}`;
}

export function usePerkArtwork(): PerkArtwork {
  const [artwork, setArtwork] = useState<PerkArtwork>({ iconByPerk: {}, avatarByKiller: {} });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${backendBase}/api/v1/perks?category=Killer&limit=200`);
        if (!res.ok) return;
        const body = await res.json();
        const perks: ApiPerk[] = body.data || [];
        if (cancelled) return;

        const iconByPerk: Record<string, string> = {};
        const avatarByKiller: Record<string, string> = {};
        for (const perk of perks) {
          const icon = staticUrl(perk.icon_local_path);
          if (icon) iconByPerk[perk.name] = icon;

          const avatar = staticUrl(perk.character_avatar_path);
          if (avatar && perk.character && perk.character !== 'General' && !avatarByKiller[perk.character]) {
            avatarByKiller[perk.character] = avatar;
          }
        }
        setArtwork({ iconByPerk, avatarByKiller });
      } catch (err) {
        console.error('Failed to load page streak artwork:', err);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return artwork;
}
```

- [ ] **Step 2: Put the icon inside the perk tile's diamond**

In `PerkTile.tsx`, add `iconSrc` to the props interface and destructuring, add local error state, and render the image inside the inner diamond. Replace the whole file with:

```tsx
'use client';

import React, { useState } from 'react';

interface PerkTileProps {
  name: string;
  selected?: boolean;
  disabled?: boolean;
  iconSrc?: string;
  onToggle?: (name: string) => void;
}

const DIAMOND = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';

export const PerkTile: React.FC<PerkTileProps> = ({
  name,
  selected = false,
  disabled = false,
  iconSrc,
  onToggle,
}) => {
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(iconSrc) && !imgError;

  const content = (
    <>
      <span
        className={`grid aspect-square w-full max-w-[88px] place-items-center transition-colors ${
          selected ? 'bg-orange-400/70' : 'bg-slate-800'
        }`}
        style={{ clipPath: DIAMOND }}
      >
        <span
          className={`grid h-[82%] w-[82%] place-items-center transition-colors ${
            selected
              ? 'bg-gradient-to-br from-amber-900/80 to-slate-950'
              : 'bg-gradient-to-br from-slate-700 to-slate-900'
          }`}
          style={{ clipPath: DIAMOND }}
        >
          {showImage && (
            <img
              src={iconSrc}
              alt={name}
              onError={() => setImgError(true)}
              className="h-[62%] w-[62%] object-contain drop-shadow"
            />
          )}
        </span>
      </span>
      <span className={`text-center text-[10.5px] font-semibold leading-tight ${selected ? 'text-slate-100' : 'text-slate-400'}`}>
        {name}
      </span>
    </>
  );

  const shell = `flex flex-col items-center gap-2 rounded-xl border p-3 transition-all duration-150 motion-reduce:transition-none motion-reduce:scale-100 ${
    selected ? 'border-orange-500 bg-orange-500/10 scale-[1.03]' : 'border-slate-800 bg-slate-900/50'
  }`;

  if (disabled || !onToggle) {
    return <div className={shell}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onToggle(name)}
      aria-pressed={selected}
      className={`${shell} hover:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500`}
    >
      {content}
    </button>
  );
};
```

- [ ] **Step 3: Pass icons through the grid**

In `PerkPageGrid.tsx`, add the `iconByPerk` prop and forward it. The file becomes:

```tsx
'use client';

import React from 'react';
import { PerkTile } from './PerkTile';

interface PerkPageGridProps {
  perks: string[];
  selected?: string[];
  onToggle?: (name: string) => void;
  dimmed?: boolean;
  variant?: 'enter' | 'reset' | 'none';
  iconByPerk?: Record<string, string>;
}

export const PerkPageGrid: React.FC<PerkPageGridProps> = ({
  perks,
  selected = [],
  onToggle,
  dimmed = false,
  variant = 'none',
  iconByPerk = {},
}) => {
  const animation = variant === 'enter' ? 'ps-page-enter' : variant === 'reset' ? 'ps-page-reset' : '';

  return (
    <div
      className={`grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 ${animation} ${
        dimmed ? 'pointer-events-none opacity-40 grayscale' : ''
      }`}
    >
      {perks.map((name) => (
        <PerkTile
          key={name}
          name={name}
          selected={selected.includes(name)}
          disabled={dimmed || !onToggle}
          iconSrc={iconByPerk[name]}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
};
```

- [ ] **Step 4: Show icons in the build slots**

In `BuildBar.tsx`, add `iconByPerk?: Record<string, string>` to the props interface and destructuring (defaulting to `{}`), then render the image inside the existing 24px slot diamond. Replace the filled-slot diamond block:

```tsx
          {name && (
            <span className="grid h-6 w-6 flex-none place-items-center bg-orange-400/60" style={{ clipPath: DIAMOND }}>
              <span className="h-[82%] w-[82%] bg-gradient-to-br from-amber-900/80 to-slate-950" style={{ clipPath: DIAMOND }} />
            </span>
          )}
```

with:

```tsx
          {name && (
            <span className="grid h-6 w-6 flex-none place-items-center bg-orange-400/60" style={{ clipPath: DIAMOND }}>
              <span
                className="grid h-[82%] w-[82%] place-items-center bg-gradient-to-br from-amber-900/80 to-slate-950"
                style={{ clipPath: DIAMOND }}
              >
                {iconByPerk[name] && (
                  <img src={iconByPerk[name]} alt="" className="h-[70%] w-[70%] object-contain" />
                )}
              </span>
            </span>
          )}
```

- [ ] **Step 5: Show the killer portrait in the run header**

In `RunHeader.tsx`, add `avatarSrc?: string` to the props interface and destructuring, add `const [imgError, setImgError] = useState(false);` (importing `useState`), and replace the portrait block:

```tsx
        <div className="flex h-16 w-16 flex-none items-center justify-center rounded-xl border border-slate-800 bg-slate-900">
          <Skull className="h-7 w-7 text-slate-600" />
        </div>
```

with:

```tsx
        <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          {avatarSrc && !imgError ? (
            <img
              src={avatarSrc}
              alt={run.killer}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <Skull className="h-7 w-7 text-slate-600" />
          )}
        </div>
```

- [ ] **Step 6: Wire the hook into the run view**

In `PageStreakRunView.tsx`:

Add the import next to the other local imports:

```tsx
import { usePerkArtwork } from './usePerkArtwork';
```

Call it next to the existing hook call:

```tsx
  const { iconByPerk, avatarByKiller } = usePerkArtwork();
```

Pass `avatarSrc` to the header:

```tsx
          <RunHeader run={run} avatarSrc={avatarByKiller[run.killer]} />
```

Pass `iconByPerk` to the current-page grid, the next-page preview grid, and the build bar — i.e. add `iconByPerk={iconByPerk}` to each of those three JSX elements, changing nothing else about them.

- [ ] **Step 7: Show portraits on the roster**

In `KillerRosterGrid.tsx`, add `avatarByKiller?: Record<string, string>` to the props interface and destructuring (defaulting to `{}`), convert the component body to a block so it can hold a small child component, and replace the placeholder square:

```tsx
          <div className="flex aspect-square items-center justify-center rounded-lg bg-slate-900/80">
            <Skull className={`h-7 w-7 ${done ? 'text-emerald-400/70' : 'text-slate-600'}`} />
          </div>
```

with a portrait that falls back to the skull. Because each card needs its own error state, extract the image into a component defined in the same file, above `KillerRosterGrid`:

```tsx
const KillerPortrait: React.FC<{ name: string; src?: string; done: boolean }> = ({ name, src, done }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-slate-900/80">
      {src && !imgError ? (
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Skull className={`h-7 w-7 ${done ? 'text-emerald-400/70' : 'text-slate-600'}`} />
      )}
    </div>
  );
};
```

and render it in the card:

```tsx
          <KillerPortrait name={entry.killer} src={avatarByKiller[entry.killer]} done={done} />
```

Add `useState` to the React import at the top of the file.

- [ ] **Step 8: Wire the hook into the roster screen**

In `PageStreakRoster.tsx`, import and call the hook:

```tsx
import { usePerkArtwork } from './usePerkArtwork';
```

```tsx
  const { avatarByKiller } = usePerkArtwork();
```

and pass it down:

```tsx
        <KillerRosterGrid locale={locale} roster={roster} avatarByKiller={avatarByKiller} />
```

- [ ] **Step 9: Verify**

Run from `frontend/`:

```bash
npx tsc --noEmit
npm run build
```

Expected: both clean.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/streaks/page-streak/
git commit -m "feat(page-streak): show real perk icons and killer portraits"
```

---

### Task 3: Simplify and promote the result buttons

**Files:**
- Modify: `frontend/src/components/streaks/page-streak/PageStreakRunView.tsx`

**Interfaces:**
- Consumes: `usePageStreakRun`'s `submitResult(page, perks, result)` and `busy`, plus the `confirmed` / `lastWasLoss` state already in the file.
- Produces: nothing consumed by later tasks.

**What changes:** the two result buttons currently sit *below* the build bar and are labelled with their consequence ("Win → page 4", "Loss → back to page 1"). The user wants them plain ("Win", "Loss"), larger, and *above* the perk grid so they are the first thing in view.

- [ ] **Step 1: Remove the old block**

In `PageStreakRunView.tsx`, delete the entire existing result-buttons block — the `{confirmed && ( … )}` expression that renders the `<div className="mt-3 flex flex-wrap gap-2.5 ps-rise">` wrapper with the two buttons inside. Leave the `BuildBar` and its `SectionLabel` exactly where they are.

- [ ] **Step 2: Add the promoted block**

Insert this immediately **before** the `<SectionLabel>Page {run.current_page} — pick {buildSize} perks</SectionLabel>` line, so it renders above the perk grid:

```tsx
              {confirmed && (
                <div className="mt-5 flex flex-wrap gap-3 ps-rise">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setLastWasLoss(false);
                      submitResult(run.current_page, selected, 'win');
                    }}
                    className="flex-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-8 py-4 text-base font-extrabold tracking-wide text-emerald-400 transition-colors hover:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 motion-reduce:transition-none"
                  >
                    Win
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setLastWasLoss(true);
                      submitResult(run.current_page, selected, 'loss');
                    }}
                    className="flex-1 rounded-xl border border-rose-500/35 bg-rose-500/10 px-8 py-4 text-base font-extrabold tracking-wide text-rose-400 transition-colors hover:bg-rose-500/20 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50 motion-reduce:transition-none"
                  >
                    Loss
                  </button>
                </div>
              )}
```

The gating is unchanged: the block only exists once `confirmed` is true, and both buttons disable while `busy`.

- [ ] **Step 3: Verify**

Run from `frontend/`:

```bash
npx tsc --noEmit
npm run build
```

Expected: both clean. In particular `setLastWasLoss` and `busy` must still resolve — they are declared earlier in the same component and only the JSX moved.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/streaks/page-streak/PageStreakRunView.tsx
git commit -m "feat(page-streak): promote result buttons above the perk grid"
```

---

### Task 4: Perk icons in the history

**Files:**
- Modify: `frontend/src/components/streaks/page-streak/RunHistory.tsx`
- Modify: `frontend/src/components/streaks/page-streak/PageStreakRunView.tsx` (pass the icon map)

**Interfaces:**
- Consumes: `iconByPerk` from `usePerkArtwork()` (Task 2).
- Produces: nothing consumed by later tasks.

**Sizing rule from the user:** the history icons are the **same size as the build-bar slot icons** — the 24px (`h-6 w-6`) diamond, not smaller.

- [ ] **Step 1: Render icons instead of joined names**

In `RunHistory.tsx`, add the icon map prop and swap the text cell for icon diamonds. Replace the whole file with:

```tsx
'use client';

import React from 'react';
import { HistoryEntry } from '@/types/pageStreak';

interface RunHistoryProps {
  history: HistoryEntry[];
  iconByPerk?: Record<string, string>;
}

const DIAMOND = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';

export const RunHistory: React.FC<RunHistoryProps> = ({ history, iconByPerk = {} }) => {
  if (history.length === 0) {
    return <p className="py-6 text-center text-xs text-slate-600">No matches reported yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-slate-600">
            <th className="border-b border-slate-800 px-2 py-2 font-semibold">Attempt</th>
            <th className="border-b border-slate-800 px-2 py-2 font-semibold">Page</th>
            <th className="border-b border-slate-800 px-2 py-2 font-semibold">Build</th>
            <th className="border-b border-slate-800 px-2 py-2 font-semibold">Result</th>
            <th className="border-b border-slate-800 px-2 py-2 font-semibold">When</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry, index) => (
            <tr key={`${entry.attempt}-${entry.page_number}-${index}`} className="text-slate-400">
              <td className="border-b border-slate-900 px-2 py-2 font-mono tabular-nums">{entry.attempt}</td>
              <td className="border-b border-slate-900 px-2 py-2 font-mono tabular-nums">{entry.page_number}</td>
              <td className="border-b border-slate-900 px-2 py-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {entry.perks.map((perk) => (
                    <span
                      key={perk}
                      title={perk}
                      className="grid h-6 w-6 flex-none place-items-center bg-orange-400/60"
                      style={{ clipPath: DIAMOND }}
                    >
                      <span
                        className="grid h-[82%] w-[82%] place-items-center bg-gradient-to-br from-amber-900/80 to-slate-950"
                        style={{ clipPath: DIAMOND }}
                      >
                        {iconByPerk[perk] && (
                          <img src={iconByPerk[perk]} alt={perk} className="h-[70%] w-[70%] object-contain" />
                        )}
                      </span>
                    </span>
                  ))}
                </div>
              </td>
              <td className="border-b border-slate-900 px-2 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-extrabold ${
                    entry.result === 'win' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                  }`}
                >
                  {entry.result}
                </span>
              </td>
              <td className="border-b border-slate-900 px-2 py-2 font-mono tabular-nums">
                {new Date(entry.timestamp).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

The perk name survives as the `title` attribute and the image `alt`, so hovering still identifies a perk and the row stays readable when an icon 404s.

- [ ] **Step 2: Pass the map in**

In `PageStreakRunView.tsx`, change the history render to:

```tsx
          <RunHistory history={run.history} iconByPerk={iconByPerk} />
```

- [ ] **Step 3: Verify**

Run from `frontend/`:

```bash
npx tsc --noEmit
npm run build
```

Expected: both clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/streaks/page-streak/RunHistory.tsx frontend/src/components/streaks/page-streak/PageStreakRunView.tsx
git commit -m "feat(page-streak): show perk icons in the run history"
```

---

### Task 5: Confetti on a completed run

**Files:**
- Create: `frontend/src/components/streaks/page-streak/Confetti.tsx`
- Modify: `frontend/src/components/streaks/page-streak/PageStreakRunView.tsx`

**Interfaces:**
- Consumes: `run.status` from the run view.
- Produces: `Confetti` — client component, props `{ active: boolean }`.

**Why Canvas:** the project already animates with a raw canvas in `WheelOfFortune.tsx`, and a confetti npm package would be a new dependency, which the constraints forbid.

- [ ] **Step 1: Write the confetti component**

Create `frontend/src/components/streaks/page-streak/Confetti.tsx`:

```tsx
'use client';

import React, { useEffect, useRef } from 'react';

interface ConfettiProps {
  active: boolean;
}

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
}

const COLORS = ['#fb923c', '#f97316', '#34d399', '#fbbf24', '#f87171', '#e2e8f0'];
const PIECE_COUNT = 140;
const DURATION_MS = 3200;

export const Confetti: React.FC<ConfettiProps> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    const start = performance.now();

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const pieces: Piece[] = Array.from({ length: PIECE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.6,
      vx: (Math.random() - 0.5) * 1.6,
      vy: 2 + Math.random() * 3,
      size: 5 + Math.random() * 6,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    const draw = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fade the whole burst out over its final second.
      ctx.globalAlpha = elapsed > DURATION_MS - 1000
        ? Math.max(0, (DURATION_MS - elapsed) / 1000)
        : 1;

      for (const piece of pieces) {
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.vy += 0.02;
        piece.rotation += piece.spin;

        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rotation);
        ctx.fillStyle = piece.color;
        ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.6);
        ctx.restore();
      }

      if (elapsed < DURATION_MS) {
        frame = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
};
```

- [ ] **Step 2: Fire it once, when the run turns completed**

In `PageStreakRunView.tsx`:

Add the import:

```tsx
import { Confetti } from './Confetti';
```

Add state next to the other `useState` declarations:

```tsx
  const [celebrating, setCelebrating] = useState(false);
```

Add an effect that fires on the transition into `completed` — place it after the existing effect that clears `selected` / `confirmed`:

```tsx
  // Fire once when the run flips to completed, not on every later render or reload.
  const wasCompletedRef = useRef(false);
  useEffect(() => {
    const isCompleted = run?.status === 'completed';
    if (isCompleted && !wasCompletedRef.current) {
      setCelebrating(true);
      const timer = setTimeout(() => setCelebrating(false), 3500);
      wasCompletedRef.current = true;
      return () => clearTimeout(timer);
    }
    if (!isCompleted) {
      wasCompletedRef.current = false;
    }
  }, [run?.status]);
```

Add `useRef` to the React import at the top of the file.

Render the canvas just inside the component's outermost `<div>`, as its first child:

```tsx
      <Confetti active={celebrating} />
```

**Note on the ref:** `wasCompletedRef` starts `false`, so opening an already-completed run fires the burst once on mount. That is intentional — a reset clears the ref, so a later completion celebrates again.

- [ ] **Step 3: Verify**

Run from `frontend/`:

```bash
npx tsc --noEmit
npm run build
```

Expected: both clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/streaks/page-streak/Confetti.tsx frontend/src/components/streaks/page-streak/PageStreakRunView.tsx
git commit -m "feat(page-streak): celebrate a completed run with confetti"
```

---

## Manual verification (controller, after Task 5)

Rebuild and check at `http://localhost/en/streaks/killer/page-streak`:

1. The sidebar lists 🔥 Streaks directly above ⚡ Challenge.
2. The roster shows killer portraits; any killer whose image fails still shows the skull placeholder, not a broken-image icon.
3. Inside a run, perk tiles show real perk artwork inside the diamond.
4. Perks whose names contain apostrophes or accents ("A Nurse's Calling", "Coup de Grâce", "Onryō"'s perks) either load or fall back cleanly — no broken-image glyphs.
5. Confirming a build reveals two large buttons, "Win" and "Loss", above the perk grid.
6. History rows show 24px perk diamonds; hovering one reveals the perk name.
7. Winning the final page rains confetti once; reloading the completed run replays it, and it does not loop.
8. With OS "reduce motion" enabled, no confetti and no tile scaling.

## Done criteria

- `npx tsc --noEmit` and `npm run build` clean from `frontend/`.
- The eight manual checks above pass.
- No backend change, no new dependency, no locale keys, no test framework.
