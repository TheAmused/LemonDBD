# Streaks Section Scaffold — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Streaks section with Survivor/Killer sub-tabs and three killer panels, one of which (Page streak) opens an empty scaffold view for future mechanics.

**Architecture:** URL-driven sub-tabs under `frontend/src/app/[locale]/streaks/`. A client layout supplies the Sidebar shell and role tabs; leaf pages are thin server components composing presentational components from `frontend/src/components/streaks/`. Panel definitions live in one static module. No backend, no persistence, no streak logic in this iteration.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.7, Tailwind CSS v4, lucide-react.

**Spec:** `docs/superpowers/specs/2026-08-05-streaks-design.md`

## Global Constraints

- Branch: `feature/streaks`. All work commits there.
- All commands run from `frontend/` on the host (Node 22, `node_modules` already installed).
- **No test framework exists in this project** (`frontend/package.json` defines only `dev`, `build`, `start`, `lint`). The verification cycle replacing red/green TDD is: `npx tsc --noEmit` → `npm run build`. Every task uses it. Do not add Vitest/Jest — the spec rules it out for this iteration.
- **`npm run lint` is broken project-wide and must not be used as a gate.** It runs `next lint`, which Next.js 16 removed — Next now reads `lint` as a directory argument and fails with "Invalid project directory provided, no such directory: …/frontend/lint". This is pre-existing and out of scope for this plan; do not fix it, do not add ESLint config. Wherever a task step below says `npm run lint`, skip that command.
- All user-facing copy is hardcoded English in all three locales. Do **not** add keys to `src/locales/en.json`, `es.json` or `pl.json`.
- Do **not** modify `src/components/Navbar.tsx`. Sidebar only.
- Streaks accent color is orange (`text-orange-400`, `bg-orange-500/10`, `border-orange-500/20`). Every other accent is taken.
- No fetches for streak data, no `localStorage`, no `services/` file, no backend route.
- Coming-soon panels must render as non-interactive `<div>` — never `<a>`, `<Link>` or `<button>`.

---

### Task 1: Streak panel presentation components

**Files:**
- Create: `frontend/src/components/streaks/panels.ts`
- Create: `frontend/src/components/streaks/StreakPanel.tsx`
- Create: `frontend/src/components/streaks/StreakPanelGrid.tsx`
- Verify: no test file (see Global Constraints)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `StreakPanelDef` — `{ id: string; title: string; description: string; icon: LucideIcon; accent: string; accentBorder: string; slug?: string; comingSoon?: boolean }`
  - `KILLER_STREAK_PANELS: StreakPanelDef[]`
  - `StreakPanel` — React component, props `{ title: string; description: string; icon: LucideIcon; accent: string; accentBorder: string; href?: string; comingSoon?: boolean }`
  - `StreakPanelGrid` — React component, props `{ locale: string }`

All three are server-renderable (no hooks, no `'use client'`).

- [ ] **Step 1: Create the panel definitions**

Create `frontend/src/components/streaks/panels.ts`:

```ts
import { BookOpen, History, Shuffle, type LucideIcon } from 'lucide-react';

export interface StreakPanelDef {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind text color class for the icon and title accent. */
  accent: string;
  /** Tailwind border color class for the card. */
  accentBorder: string;
  /** Route segment under /[locale]/streaks/killer/. Omit for coming-soon panels. */
  slug?: string;
  comingSoon?: boolean;
}

export const KILLER_STREAK_PANELS: StreakPanelDef[] = [
  {
    id: 'page-streak',
    title: 'Page streak',
    description:
      'Win a round using perks from page 1, then move to page 2, and keep going through all 12 perk pages.',
    icon: BookOpen,
    accent: 'text-orange-400',
    accentBorder: 'border-orange-500/20',
    slug: 'page-streak',
  },
  {
    id: 'history-streak',
    title: 'History streak',
    description: 'A run built around the killer roster in release order.',
    icon: History,
    accent: 'text-slate-400',
    accentBorder: 'border-slate-700/60',
    comingSoon: true,
  },
  {
    id: 'chaos-streak',
    title: 'Chaos streak',
    description: 'A run where every match randomises your loadout.',
    icon: Shuffle,
    accent: 'text-slate-400',
    accentBorder: 'border-slate-700/60',
    comingSoon: true,
  },
];
```

- [ ] **Step 2: Create the panel card**

Create `frontend/src/components/streaks/StreakPanel.tsx`:

```tsx
import React from 'react';
import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';

interface StreakPanelProps {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  accentBorder: string;
  href?: string;
  comingSoon?: boolean;
}

export const StreakPanel: React.FC<StreakPanelProps> = ({
  title,
  description,
  icon: Icon,
  accent,
  accentBorder,
  href,
  comingSoon,
}) => {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${accentBorder} bg-slate-900/60`}>
          <Icon className={`h-5 w-5 ${accent}`} />
        </div>
        {comingSoon ? (
          <span className="rounded-full border border-slate-700/60 bg-slate-800/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Coming soon
          </span>
        ) : (
          <ArrowRight className={`h-4 w-4 ${accent} transition-transform group-hover:translate-x-1`} />
        )}
      </div>

      <h3 className={`mt-4 text-sm font-extrabold tracking-wide ${comingSoon ? 'text-slate-400' : 'text-slate-100'}`}>
        {title}
      </h3>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{description}</p>
    </>
  );

  const base = `flex h-full flex-col rounded-2xl border p-5 backdrop-blur-sm transition-all ${accentBorder}`;

  if (comingSoon || !href) {
    return <div className={`${base} bg-slate-900/30 opacity-70`}>{body}</div>;
  }

  return (
    <Link
      href={href}
      className={`group ${base} bg-slate-900/50 hover:border-orange-500/50 hover:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-orange-500`}
    >
      {body}
    </Link>
  );
};
```

- [ ] **Step 3: Create the grid**

Create `frontend/src/components/streaks/StreakPanelGrid.tsx`:

```tsx
import React from 'react';
import { StreakPanel } from './StreakPanel';
import { KILLER_STREAK_PANELS } from './panels';

interface StreakPanelGridProps {
  locale: string;
}

export const StreakPanelGrid: React.FC<StreakPanelGridProps> = ({ locale }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {KILLER_STREAK_PANELS.map((panel) => (
      <StreakPanel
        key={panel.id}
        title={panel.title}
        description={panel.description}
        icon={panel.icon}
        accent={panel.accent}
        accentBorder={panel.accentBorder}
        href={panel.slug ? `/${locale}/streaks/killer/${panel.slug}` : undefined}
        comingSoon={panel.comingSoon}
      />
    ))}
  </div>
);
```

- [ ] **Step 4: Verify types and lint**

Run from `frontend/`:

```bash
npx tsc --noEmit
npm run lint
```

Expected: both clean. The components are not rendered by any route yet — that is Task 2.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/streaks/
git commit -m "feat(streaks): add streak panel components and killer panel definitions"
```

---

### Task 2: Streaks routes, layout and role tabs

**Files:**
- Create: `frontend/src/components/streaks/RoleTabs.tsx`
- Create: `frontend/src/app/[locale]/streaks/layout.tsx`
- Create: `frontend/src/app/[locale]/streaks/page.tsx`
- Create: `frontend/src/app/[locale]/streaks/survivor/page.tsx`
- Create: `frontend/src/app/[locale]/streaks/killer/page.tsx`

**Interfaces:**
- Consumes: `StreakPanelGrid` from Task 1, props `{ locale: string }`.
- Produces: routes `/[locale]/streaks`, `/[locale]/streaks/survivor`, `/[locale]/streaks/killer`. `RoleTabs` — client component, props `{ locale: string }`.

- [ ] **Step 1: Create the role tabs**

Create `frontend/src/components/streaks/RoleTabs.tsx`:

```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Skull } from 'lucide-react';

interface RoleTabsProps {
  locale: string;
}

const TABS = [
  { id: 'survivor', label: 'Survivor', icon: Shield, active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  { id: 'killer', label: 'Killer', icon: Skull, active: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
];

export const RoleTabs: React.FC<RoleTabsProps> = ({ locale }) => {
  const pathname = usePathname();

  return (
    <nav aria-label="Streak Role Tabs" className="flex items-center gap-2">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname?.includes(`/streaks/${tab.id}`) ?? false;

        return (
          <Link
            key={tab.id}
            href={`/${locale}/streaks/${tab.id}`}
            aria-current={isActive ? 'page' : undefined}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 ${
              isActive
                ? tab.active
                : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900/60 hover:text-slate-200'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
```

- [ ] **Step 2: Create the section layout**

Create `frontend/src/app/[locale]/streaks/layout.tsx`. It mirrors `frontend/src/app/[locale]/builds/page.tsx` — same Sidebar wiring, same stats fetch, same `Loading...` screen, same `QuestsModal`:

```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { QuestsModal } from '@/components/QuestsModal';
import { RoleTabs } from '@/components/streaks/RoleTabs';
import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/config';

export default function StreaksLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';

  const [dict, setDict] = useState<any>(null);
  const [isQuestsOpen, setIsQuestsOpen] = useState<boolean>(false);

  const [totalPerksCount, setTotalPerksCount] = useState<number>(0);
  const [survivorCount, setSurvivorCount] = useState<number>(0);
  const [killerCount, setKillerCount] = useState<number>(0);
  const [characterCount, setCharacterCount] = useState<number>(0);

  const backendBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    getDictionary(locale).then(setDict);
  }, [locale]);

  useEffect(() => {
    async function loadVaultStats() {
      try {
        const [perksRes, charsRes] = await Promise.all([
          fetch(`${backendBase}/api/v1/perks?limit=1000`),
          fetch(`${backendBase}/api/v1/characters`),
        ]);
        if (perksRes.ok) {
          const pData = await perksRes.json();
          const list = pData.data || [];
          setTotalPerksCount(pData.pagination?.total || list.length);
          setSurvivorCount(list.filter((p: any) => p.category === 'Survivor').length);
          setKillerCount(list.filter((p: any) => p.category === 'Killer').length);
        }
        if (charsRes.ok) {
          const cData = await charsRes.json();
          setCharacterCount(cData.count || (cData.data || []).length);
        }
      } catch (err) {
        console.error('Failed to load sidebar vault stats:', err);
      }
    }
    loadVaultStats();
  }, [backendBase]);

  const handleSelectCategory = () => {
    if (typeof window !== 'undefined') {
      window.location.href = `/${locale}`;
    }
  };

  if (!dict) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row dbd-fog-overlay">
      <Sidebar
        currentLocale={locale}
        dict={dict}
        activeCategory="streaks"
        onSelectCategory={handleSelectCategory}
        onOpenQuests={() => setIsQuestsOpen(true)}
        totalPerksCount={totalPerksCount}
        survivorCount={survivorCount}
        killerCount={killerCount}
        characterCount={characterCount}
      />

      <main className="flex-1 lg:pl-64 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <header className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-wide text-slate-100">🔥 Streaks</h1>
          <p className="mt-1 text-xs text-slate-500">
            Long-run challenges that carry across matches. Pick a role to see what is available.
          </p>
        </header>

        <div className="mb-6">
          <RoleTabs locale={locale} />
        </div>

        {children}

        <QuestsModal isOpen={isQuestsOpen} onClose={() => setIsQuestsOpen(false)} dict={dict} />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Create the index redirect**

Create `frontend/src/app/[locale]/streaks/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

export default async function StreaksIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/streaks/killer`);
}
```

- [ ] **Step 4: Create the survivor empty state**

Create `frontend/src/app/[locale]/streaks/survivor/page.tsx`:

```tsx
import React from 'react';
import { Shield } from 'lucide-react';

export default function SurvivorStreaksPage() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-6 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/20 bg-slate-900/60">
        <Shield className="h-5 w-5 text-emerald-500/70" />
      </div>
      <h2 className="mt-4 text-sm font-extrabold tracking-wide text-slate-300">
        No survivor streaks yet
      </h2>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">
        Survivor challenges are still on the drawing board. The killer tab has three to choose from.
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Create the killer panel page**

Create `frontend/src/app/[locale]/streaks/killer/page.tsx`:

```tsx
import React from 'react';
import { StreakPanelGrid } from '@/components/streaks/StreakPanelGrid';

export default async function KillerStreaksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <StreakPanelGrid locale={locale} />;
}
```

- [ ] **Step 6: Verify types, lint and build**

Run from `frontend/`:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Expected: all clean. `npm run build` output must list `/[locale]/streaks`, `/[locale]/streaks/survivor` and `/[locale]/streaks/killer` in the route table.

- [ ] **Step 7: Verify in the browser**

Run `npm run dev` from `frontend/`, then check:

1. `http://localhost:3000/en/streaks` redirects to `/en/streaks/killer`.
2. The killer tab shows three cards; "Page streak" has an arrow, the other two show a "Coming soon" badge.
3. Clicking "History streak" or "Chaos streak" does nothing, and pressing Tab never focuses them.
4. Clicking "Survivor" switches to the empty state; the tab highlight follows.
5. Browser back returns to the killer tab.

Note: "Page streak" links to a route that does not exist yet and will 404 — Task 3 creates it.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/[locale]/streaks/ frontend/src/components/streaks/RoleTabs.tsx
git commit -m "feat(streaks): add streaks routes, section layout and role tabs"
```

---

### Task 3: Page streak scaffold view

**Files:**
- Create: `frontend/src/components/streaks/PageStreakBoard.tsx`
- Create: `frontend/src/app/[locale]/streaks/killer/page-streak/page.tsx`

**Interfaces:**
- Consumes: the section layout from Task 2 (supplies Sidebar, header and role tabs — this view adds only its own content).
- Produces: route `/[locale]/streaks/killer/page-streak`. `PageStreakBoard` — server-renderable component, props `{ locale: string }`.

- [ ] **Step 1: Create the board scaffold**

Create `frontend/src/components/streaks/PageStreakBoard.tsx`:

```tsx
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';

interface PageStreakBoardProps {
  locale: string;
}

export const PageStreakBoard: React.FC<PageStreakBoardProps> = ({ locale }) => (
  <div>
    <Link
      href={`/${locale}/streaks/killer`}
      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition-colors hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      <span>Back to killer streaks</span>
    </Link>

    <div className="mt-4 flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange-500/20 bg-slate-900/60">
        <BookOpen className="h-5 w-5 text-orange-400" />
      </div>
      <div>
        <h2 className="text-lg font-extrabold tracking-wide text-slate-100">Page streak</h2>
        <p className="text-xs text-slate-500">
          Win a round using perks from page 1, then move to page 2, and keep going through all 12 perk pages.
        </p>
      </div>
    </div>

    <div className="mt-6 flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 px-6 text-center">
      <p className="text-sm font-extrabold tracking-wide text-slate-400">
        Challenge mechanics coming next
      </p>
      <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-600">
        Page tracking, win and loss handling and reset rules land in the next iteration.
      </p>
    </div>
  </div>
);
```

- [ ] **Step 2: Create the route**

Create `frontend/src/app/[locale]/streaks/killer/page-streak/page.tsx`:

```tsx
import React from 'react';
import { PageStreakBoard } from '@/components/streaks/PageStreakBoard';

export default async function PageStreakPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <PageStreakBoard locale={locale} />;
}
```

- [ ] **Step 3: Verify types, lint and build**

Run from `frontend/`:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Expected: all clean, and `/[locale]/streaks/killer/page-streak` appears in the build route table.

- [ ] **Step 4: Verify in the browser**

With `npm run dev` running:

1. `/en/streaks/killer` → click "Page streak" → lands on `/en/streaks/killer/page-streak`.
2. The Sidebar and role tabs are still visible (layout applies to the nested route).
3. "Back to killer streaks" returns to the panel grid.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/streaks/PageStreakBoard.tsx "frontend/src/app/[locale]/streaks/killer/page-streak/"
git commit -m "feat(streaks): add page streak scaffold view"
```

---

### Task 4: Sidebar navigation entry

**Files:**
- Modify: `frontend/src/components/Sidebar.tsx` (import list at lines 7-28, `navItems` array ending at line ~217, route-link whitelist at line 259)

**Interfaces:**
- Consumes: route `/[locale]/streaks` from Task 2.
- Produces: nothing consumed by later tasks.

**Why last:** the entry points at routes that must already exist, so every earlier task leaves the app in a working state.

- [ ] **Step 1: Import the icon**

In `frontend/src/components/Sidebar.tsx`, add `Repeat` to the existing `lucide-react` import block (the one ending with `Compass,`):

```tsx
  Compass,
  Repeat,
} from 'lucide-react';
```

- [ ] **Step 2: Add the nav item**

In the `navItems` array, insert this entry directly after the `maps` entry and before the `quests` entry:

```tsx
    {
      id: 'streaks',
      label: '🔥 Streaks',
      icon: Repeat,
      color: 'text-orange-400',
      activeBg: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
    },
```

- [ ] **Step 3: Register the id as a route link**

This is the step that is easy to miss. `Sidebar.tsx` decides between `<Link>` and `<button>` using an explicit id whitelist. Without this change the Streaks entry renders as a button that calls `onSelectCategory` and navigates nowhere.

Find the condition on line ~259:

```tsx
            if (item.id === 'challenge' || item.id === 'draft' || item.id === 'swf' || item.id === 'killer-calculator' || item.id === 'builds' || item.id === 'custom-perks' || item.id === 'maps') {
```

Replace it with:

```tsx
            if (item.id === 'challenge' || item.id === 'draft' || item.id === 'swf' || item.id === 'killer-calculator' || item.id === 'builds' || item.id === 'custom-perks' || item.id === 'maps' || item.id === 'streaks') {
```

The `href` is built as `/${currentLocale}/${item.id}` → `/en/streaks`, which the Task 2 redirect sends to the killer tab.

- [ ] **Step 4: Verify types, lint and build**

Run from `frontend/`:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Expected: all clean.

- [ ] **Step 5: Verify in the browser**

With `npm run dev` running:

1. On `/en` the Sidebar shows "🔥 Streaks" between "🗺️ Map Explorer" and "📜 Quests".
2. Clicking it navigates to `/en/streaks` and lands on the killer tab.
3. While inside the section the entry is highlighted orange (`activeCategory="streaks"` from the layout).
4. Open the mobile drawer (narrow viewport), click Streaks — it navigates and the drawer closes.
5. Repeat step 2 on `/pl` and `/es` — the link keeps the locale prefix and the section renders in English copy, as specified.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Sidebar.tsx
git commit -m "feat(streaks): add Streaks entry to sidebar navigation"
```

---

## Done criteria

- `npm run build` and `npm run lint` clean from `frontend/`.
- Five routes reachable: `/[locale]/streaks` (redirects), `/streaks/survivor`, `/streaks/killer`, `/streaks/killer/page-streak`.
- Sidebar entry present, highlighted inside the section, working on desktop and mobile.
- History streak and Chaos streak show "Coming soon", are not clickable and are not keyboard-focusable.
- No new locale keys, no `Navbar.tsx` change, no backend change, no streak logic.
