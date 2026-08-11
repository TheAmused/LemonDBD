# Streaks Tab — Design

**Date:** 2026-08-05
**Branch:** `feature/streaks`
**Status:** Approved

## Goal

Add a top-level **Streaks** section to LemonDBD holding long-run challenge modes,
split by role. This iteration ships navigation and panel scaffolding only — the
challenge mechanics land in a later iteration.

## Scope

In scope:

- Sidebar entry "Streaks".
- Routes for the Streaks section with Survivor / Killer sub-tabs.
- Killer sub-tab: three panels — Page streak (enterable), History streak and
  Chaos streak (both "Coming soon", not clickable).
- Survivor sub-tab: empty state.
- Page streak view: header, one-line description, placeholder for mechanics.

Out of scope (deferred):

- Any streak logic, progress tracking, win/loss handling or reset rules.
- Persistence (localStorage, backend, SQLite) — nothing to store yet.
- Backend endpoints and `services/` client code.
- Survivor streak content.
- History streak and Chaos streak content.
- Navbar entry (Sidebar only, by user decision).

## Domain note

**Page streak** is a challenge built on the in-game perk grid pages. The player
wins a round using perks from page 1, then moves to page 2, and so on. There are
currently 12 pages. Exact rules — what counts as a win, what resets the streak —
are deliberately undecided and will be designed in the next iteration.

## Routes

All under `frontend/src/app/[locale]/streaks/`:

| Route | File | Responsibility |
|---|---|---|
| `/[locale]/streaks` | `page.tsx` | `redirect()` to `/[locale]/streaks/killer` |
| `/[locale]/streaks/*` | `layout.tsx` | Sidebar + section header + role tabs |
| `/[locale]/streaks/survivor` | `survivor/page.tsx` | Empty state |
| `/[locale]/streaks/killer` | `killer/page.tsx` | Three-panel grid |
| `/[locale]/streaks/killer/page-streak` | `killer/page-streak/page.tsx` | Page streak scaffold |

The layout is a client component (`'use client'`): `Sidebar` is a client
component, and the role tabs need `usePathname` for active highlighting. It
mirrors `builds/page.tsx` — loads the dictionary with `getDictionary(locale)`,
renders the same `Loading...` screen until it resolves, fetches the perk and
character counts the Sidebar shows in its stats panel, and hosts `QuestsModal`
for the Sidebar's Quests entry. It renders `Sidebar` with
`activeCategory="streaks"` and a `<main>` wrapper matching the other pages;
`Navbar` is not used on these pages (the language and theme switchers live in
the Sidebar).

Rationale for URL-based sub-tabs over local state: streak views are
linkable/bookmarkable, browser back works, and the Page streak view gets its own
route so it can grow without bloating a shared file — avoiding the situation in
`challenge/page.tsx` (340 lines).

## Components

New directory `frontend/src/components/streaks/`:

- **`panels.ts`** — static array describing the killer panels (id, title,
  description, icon, accent color, and either `href` or `comingSoon: true`).
  Single place to edit when a fourth streak is added.
- **`RoleTabs.tsx`** — Survivor / Killer links; active tab derived from
  `usePathname` and marked with `aria-current="page"`.
- **`StreakPanel.tsx`** — one card. Props: `title`, `description`, `icon`,
  `accent`, plus either `href` (renders a `Link`) or `comingSoon` (renders a
  non-interactive `div`, dimmed, with a "Coming soon" badge). Coming-soon panels
  are not links or buttons, so they are not focusable and need no
  `aria-disabled`.
- **`StreakPanelGrid.tsx`** — responsive grid, 1 column on mobile → 3 on desktop,
  driven by `panels.ts`.
- **`PageStreakBoard.tsx`** — scaffold: "Page streak" heading, one sentence of
  context (12 perk pages, a win advances to the next page), and a dashed-border
  placeholder reading "Challenge mechanics coming next".

Page files stay thin — they compose components, matching `maps/page.tsx` and
`builds/page.tsx`.

## Navigation

Add a `streaks` entry to `navItems` in `frontend/src/components/Sidebar.tsx`,
following the existing shape (`id`, `label`, `icon`, `color`, `activeBg`).
Label: `🔥 Streaks`. Accent: orange (`text-orange-400`,
`bg-orange-500/10`, `border-orange-500/20`) — unused by other sections, which
occupy amber, rose, emerald, purple, red, pink and cyan.

**Navbar.tsx is not modified.**

## Copy and i18n

Feature names follow the existing convention of hardcoded English strings in
navigation and new modules (`'⚡ Challenge'`, `'🗺️ Map Explorer'` in
`Sidebar.tsx`; all of `MapExplorer`). So "Streaks", "Page streak", "History
streak", "Chaos streak" and "Coming soon" are hardcoded English across all three
locales. No new keys in `locales/en.json`, `es.json` or `pl.json`.

Survivor empty state: "No survivor streaks yet — coming soon".

## Data flow

No streak data of any kind — no user state, no persistence. Panels render from a
static module and routes are static. The only runtime data is what the Sidebar
itself needs: the locale dictionary and the perk/character counts, loaded in the
layout exactly as `builds/page.tsx` does it.

## Error handling

- `/[locale]/streaks` without a sub-tab → server-side `redirect()` to `killer`.
- Unknown sub-route → default Next.js 404.
- Dictionary not yet loaded → `Loading...` screen, same as `builds/page.tsx`.
- Sidebar stats fetch fails → logged to console and counts stay at 0, same as
  `builds/page.tsx`; the section itself still renders.

## Verification

The frontend has no test framework — `package.json` defines only `dev`, `build`,
`start` and `lint`. Adding one for a static scaffold would be scope creep.
Verification for this iteration:

1. `npm run build` passes (catches type and routing errors).
2. `npm run lint` clean.
3. Manual pass over all five routes: sidebar entry highlights, `/streaks`
   redirects to killer, role tabs switch, Page streak opens, the two coming-soon
   panels do not navigate and are not focusable via keyboard.

Tests get added in the next iteration, alongside the streak logic that is worth
testing.
