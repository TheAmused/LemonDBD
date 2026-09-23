# Sidebar & Workspace Layout Refactoring Design

## Overview
This design refactors the `Sidebar` and App Shell architecture in LemonDBD from a disconnected `position: fixed` desktop overlay with brittle hardcoded margin compensations into an in-flow, CSS variable-driven flex layout.

It addresses the fundamental issue where in-workspace full-screen overlays (notably `FullscreenMapEngine` on `/maps`) either collided with the desktop `Sidebar`'s stacking context or were forced to portal to `document.body`, obscuring the sidebar entirely.

## Key Changes

### 1. App Shell Geometry & CSS Variable (`globals.css`)
- Introduce `--sidebar-width`:
  - Mobile (`< 1024px`): `--sidebar-width: 0rem`
  - Desktop (`>= 1024px`): `--sidebar-width: 16rem`
  - Collapsed Desktop (`:root[data-sidebar="collapsed"]`): `--sidebar-width: 0rem`
- Desktop `Sidebar` becomes an in-flow flex item:
  - Sticky to viewport top (`sticky top-0 h-screen shrink-0`).
  - Width dynamically controlled by `--sidebar-width` with smooth transition (`transition-[width] 300ms ease-in-out`).
  - Content container maintains fixed width (`w-64`) with `overflow-hidden` so inner navigation items do not wrap or squash during collapse animation.
  - The toggle chevron button (`absolute top-1/2 -right-6`) remains accessible at `x = 16rem` (expanded) and `x = 0` (collapsed).
- `<main>`:
  - Flex child (`flex-1 min-w-0 min-h-screen`).
  - Naturally starts at the right boundary of `<aside>` without needing hardcoded `margin-left: 16rem`.
  - Automatically expands to 100% viewport width when sidebar collapses.

### 2. Workspace Overlays (`FullscreenMapEngine.tsx`, Floating Action Bars)
- `FullscreenMapEngine`:
  - Desktop PC: Positioned at `fixed inset-y-0 right-0 left-[var(--sidebar-width)] z-40 transition-[left] 300ms ease-in-out`.
  - Sits to the right of the visible sidebar. When the user collapses the sidebar, it smoothly animates to cover the full viewport width.
  - Mobile: Automatically `fixed inset-0 z-50` since `--sidebar-width` is 0, providing full viewport touch real-estate.
- Floating bottom docks (`CharactersHub.tsx`, `ChaosBoard.tsx`):
  - Aligned to workspace using `left-[var(--sidebar-width)] right-0 bottom-0`.

### 3. Verification & Playwright Automated Tests
- Playwright responsive testing across all routes (`/`, `/perks`, `/randomizer`, `/characters`, `/maps`, `/smash-or-pass`, `/streaks`, `/achievements`, `/about`):
  - Desktop (1280x800): Sidebar visible on left (256px), main content beside it, collapse toggle hides sidebar and main content expands to 100%, `/maps` engine sits to right of sidebar and expands on collapse.
  - Mobile (375x667): Desktop sidebar hidden, mobile top bar and hamburger drawer functional, `/maps` engine takes 100% mobile screen.
