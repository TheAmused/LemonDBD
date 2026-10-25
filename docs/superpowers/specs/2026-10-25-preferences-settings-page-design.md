# Design Specification: Dedicated Settings Page, Global Preferences & Campfire Optimization

**Date**: 2026-10-25  
**Topic**: Unified Site Preferences, Dedicated Settings Page, Non-Intrusive Prompt Modal, and High-Performance Background Particles

---

## 1. Context & Motivation

Currently, user preferences (audio, motion effects, and mature/NSFW content) are fragmented across the site:
* **Smash or Pass** opens an `EffectsPreferenceModal` on first load (`needsChoice`).
* **Tier Lists** and **Minigames** each independently launch `NsfwOnboardingModal` on first visit (`!hasSeenNsfwOnboarding()`).
* These popups present 4 switches directly on the feature screens, interrupting user flow.
* There is no single dedicated `/settings` page where visitors can inspect and adjust all preferences in one place.
* The background ember animation (`CampfireParticles.tsx`) executes expensive canvas filters (`ctx.shadowBlur`) inside a 60/120 FPS render loop on every frame, which severely taxes mobile GPUs, weaker laptops, and drains battery. It cannot currently be configured or disabled.
* Authenticated users need their choices persisted in the database so their preferences follow them across browsers and devices, with database preferences taking precedence on login and fetching once per session without redundant network calls.

---

## 2. Architecture & Design

### 2.1 Backend Data Model & API

#### Database Schema
* Create table `user_preferences` (or extend `smash_user_preferences` with dual-mapping) to store account-level preferences:
  * `user_id`: Integer, Primary Key, Foreign Key (`users.id`, `ondelete="CASCADE"`)
  * `effects_enabled`: Boolean, default `True` (game animations, card fling physics, celebration confetti)
  * `sounds_enabled`: Boolean, default `True` (game audio cues, UI clicks, skill checks)
  * `music_enabled`: Boolean, default `True` (terror radius tracks & background music)
  * `nsfw_enabled`: Boolean, default `False` (18+ / mature roster & template filter)
  * `background_animation`: String(16), default `'on'` (`'on' | 'eco' | 'off'`)
  * `chosen_at`: BigInteger, milliseconds epoch timestamp
  * `updated_at`: DateTime(timezone=True)
* Ensure existing `/api/v1/smash-or-pass/preferences` remains functional for backward compatibility with existing unit tests.

#### Endpoints
* **`GET /api/v1/user/preferences`**:
  * Authenticated endpoint (`@login_required`).
  * Returns `{ "data": { "effects": bool, "sounds": bool, "music": bool, "nsfw": bool, "background_animation": str, "chosen_at": int } | null }`.
  * Returns `null` if the account has never configured preferences.
* **`PUT /api/v1/user/preferences`**:
  * Authenticated endpoint (`@login_required`).
  * Payload: `{ effects: bool, sounds: bool, music: bool, nsfw: bool, background_animation: str, chosen_at: int }`.
  * Idempotently saves preferences, updating both `user_preferences` and `smash_user_preferences`.

---

### 2.2 Frontend Preferences Store & Synchronization

#### State Structure (`PreferencesContext` & `usePreferences`)
```ts
export type BackgroundAnimationMode = 'on' | 'eco' | 'off';

export interface SitePreferences {
  effects: boolean;
  sounds: boolean;
  music: boolean;
  nsfw: boolean;
  backgroundAnimation: BackgroundAnimationMode;
  chosenAt: number;
}
```

#### Smart Synchronization Rules (No Repeats, DB Precedence)
1. **Unauthenticated / Local**:
   * Initial state reads from `localStorage` (`lemondbd_preferences_v2`).
   * If absent, defaults are computed (with `prefers-reduced-motion` defaulting motion/effects to `false` and background animation to `'eco'`).
   * Any change immediately updates React state and `localStorage`.
2. **Authenticated Sign-In**:
   * A ref `syncedUserIdRef` tracks the active `user.id`.
   * When `user?.id` becomes available, fetch `/api/v1/user/preferences` **exactly once**.
   * If remote data exists:
     * **Database takes precedence over localStorage**.
     * Local state and `localStorage` are updated with the remote data.
   * If remote data is `null` (first login for an account):
     * The local preferences are synced up to the database via `PUT` so they are saved to the account.
   * `syncedUserIdRef.current = user.id` prevents any duplicate requests on subsequent route changes or renders.
3. **Changes While Authenticated**:
   * State and `localStorage` update optimistically.
   * A debounced/immediate `PUT /api/v1/user/preferences` persists changes to the database.
4. **Sign-Out**:
   * `syncedUserIdRef.current = null`.
   * Preferences remain in `localStorage` for guest mode.

---

### 2.3 Non-Intrusive Prompt Modal (`PreferencesPromptModal`)

* Replace `EffectsPreferenceModal` in `SmashOrPassHub.tsx` and `NsfwOnboardingModal` in `TierListHub.tsx` and `MinigamesHub.tsx`.
* Check `!isConfigured`:
  * If the user has neither saved preferences nor dismissed the prompt, show `PreferencesPromptModal`.
  * Uses the codebase shared `<Modal>` component with `backdrop="blur"`, triggering the blurred background overlay.
  * Message: Briefly lets the visitor know that audio, motion effects, and mature content filters can be personalized.
  * Primary Button: **"Go to Settings"** (navigates to `/[locale]/settings`).
  * Secondary Button: **"Continue with Defaults"** (dismisses and marks `isConfigured: true` with default settings, preventing the modal from popping up again).
* Toolbar icon buttons on Smash or Pass, Tier Lists, and Minigames hubs navigate directly to `/[locale]/settings`.

---

### 2.4 Dedicated Settings Page (`/[locale]/settings`)

* **File Location**: `frontend/src/app/[locale]/settings/page.tsx` and `loading.tsx`.
* **Guard Compliance**:
  * Add entry `{ prefix: ['settings'], effect: 'campfire' }` to `ROUTE_BACKGROUND_EFFECTS` in `backgroundEffects.ts`.
  * Add entry `{ prefix: ['settings'], shell: { padding: 'spacious', mainClassName: 'relative overflow-y-auto max-w-4xl mx-auto w-full' } }` in `shellRoutes.ts`.
  * Add metadata export using `pageMetadata('/settings', ...)`.
  * Add dictionary keys to all 5 locale files (`en`, `pl`, `es`, `de`, `ja`).
* **Sidebar Link**:
  * Add `settings` item to `Sidebar.tsx` navigation with the `Settings` icon from `lucide-react`.
* **Page Layout Sections**:
  * **Audio Settings**:
    * Sound Effects Switch (UI clicks, game feedback, skill checks)
    * Music Switch (Background music & terror radius audio)
  * **Visuals & Motion**:
    * Interactive Animations Switch (Card flings, confetti, particle celebrations)
    * Background Campfire Particles Toggle:
      * `Full`: Standard embers with full atmospheric motion.
      * `Eco`: Battery-saver / low-spec mode with 50% fewer particles and 30 FPS cap.
      * `Off`: Completely unmounts the background canvas (0% CPU/GPU overhead).
  * **Content & Filters**:
    * NSFW / 18+ Content Switch
  * **Sync Status Badge**:
    * Visual badge displaying "Synced with account" (when logged in) or "Saved to this browser" (when guest).

---

### 2.5 Campfire Particle Optimization (`CampfireParticles.tsx`)

#### Performance Bottlenecks Eliminated
1. **Remove `ctx.shadowBlur`**:
   * Replace `ctx.shadowBlur` inside the frame loop with soft radial particle rendering (or lightweight cached offscreen canvas sprites). This removes the heavy multi-pass Gaussian rasterization entirely.
2. **Page Visibility Listener**:
   * Subscribe to `visibilitychange`. If `document.hidden === true`, cancel `requestAnimationFrame` and freeze the loop. Resume when visible.
3. **FPS Throttling**:
   * In `full` mode, cap rendering at 60 FPS (preventing 120Hz/144Hz battery drain).
   * In `eco` mode, cap rendering at 30 FPS and halve particle count.
4. **Complete Off Unmount**:
   * In `AppBackground.tsx`, if `backgroundAnimation === 'off'`, render `null` so zero canvas elements or loops exist.

---

## 3. Testing & Verification

1. **Guard Tests**: Run `npm run test:guards` to verify:
   * `backgroundEffects.test.ts` (all routes in `app/[locale]` mapped)
   * `fileLengthGuard.test.ts` (no file > 600 lines)
   * `codeQualityGuards.test.ts` (no `any`, no `console.log`, reachable imports)
   * `i18nArchitecture.test.ts` & `i18nHygiene.test.ts` (dictionary strings, page metadata)
   * `uiGuards.test.ts` (shared `<Modal>` usage, touch targets, accessible names)
2. **Unit Tests**:
   * Test preferences reducer and localStorage serialization.
   * Test database sync precedence (account overrides localStorage, single download per sign-in).
   * Backend test suite: `pytest backend/tests/unit/test_user_preferences.py` and `test_smash_preferences.py`.
3. **Type & Lint Verification**:
   * `npm run typecheck`
   * `npm run lint`
