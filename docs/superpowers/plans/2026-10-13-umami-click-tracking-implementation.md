# Umami Click Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send Umami custom events for the agreed user actions on Randomizer, Maps, About/legal, User profile, Smash or Pass, Characters and Auth, through one typed helper.

**Architecture:** One typed module `frontend/src/utils/analytics.ts` owns the event catalogue (`AnalyticsEvents`), a safe `trackEvent` (no-op when the Umami script is missing), `trackOnce` (localStorage flag) and two tiny pure helpers (`createDeduper`, `contactPageFromPath`). Each feature calls `trackEvent('<name>', props)` at the exact point listed in the spec. Per feature pure prop builders are unit tested; wiring is guarded by a source scan test.

**Tech Stack:** Next.js (frontend, `node:test` via `tsx`), Flask + SQLAlchemy + pytest (one backend field), Umami (`window.umami.track`).

**Spec:** `docs/superpowers/plans/2026-10-13-umami-click-tracking.md` (the page by page decisions; read it first, it also lists what is deliberately NOT tracked).

## Global Constraints

- Branch is `feature/umami-click-tracking` (already created off `develop`). One branch, no PR (the user opens it).
- No `any` anywhere, no `dict?: any`; everything typed.
- No em dash characters in code, comments, copy or docs. No hyphen ranges in user facing text.
- Frontend files stay at or below 600 lines (`fileLengthGuard.test.ts`).
- Reuse `@/utils/safeStorage` for localStorage, never raw `localStorage`.
- Match entities by stable id/slug, never display name, except where the spec says English name (maps).
- Analytics must never break a page: no throw, no await on tracking, no UI change.
- Commit messages: one short line plus the attribution trailer. Never open a PR.
- After the code is done, rebuild the containers (`docker compose up -d --build`) so the user can see it.
- Frontend commands run from `D:\vhost\LemonDBD\frontend`; backend from `D:\vhost\LemonDBD\backend`.

## Review Focus

- Umami script blocked or not yet loaded (ad blocker): every call is a silent no-op, nothing throws, `trackOnce` does NOT burn its flag.
- Double fire: Tarot calls `onRollComplete` twice, voice `recognition.onend` can run after `stopListeningAndProcess`, dev React StrictMode runs effects twice (dev only, check prod build).
- Private data: a custom roster name or spoken text must never reach Umami (`roster` is `custom`, no `query`).
- Old cached API payloads without `raw_name` / `raw_realm`: `map_open` must fall back to `name` / `realm`, not send `undefined`.
- Guests and admins: `showcase_complete` and `data_download` must not fire for `guest` ids or for an admin downloading someone else's data.
- `account_delete` must be sent before `logout()` redirects the page away.

## File Structure

| File | Responsibility |
|------|----------------|
| `frontend/src/utils/analytics.ts` (create) | Event catalogue types, `trackEvent`, `trackOnce`, `createDeduper`, `contactPageFromPath`, `window.umami` typing |
| `frontend/src/utils/smashOrPass/analytics.ts` (create) | `rosterTag`, `createRosterPlayTracker` |
| `frontend/src/components/generator/lib/rollTracking.ts` (create) | `buildRollProps` for `randomizer_roll` |
| `frontend/src/utils/userShowcaseAnalytics.ts` (create) | `completedShowcaseRoles`, `reportCompleteShowcaseRoles` |
| `frontend/src/__tests__/unit/analytics*.test.ts` (create) | Unit tests per helper, plus the wiring guard |
| existing feature files | One or a few `trackEvent` calls each (listed per task) |
| `backend/app/models/map.py`, `services/maps/queries.py`, `schemas/map.py` | add `raw_name`, `raw_realm` to the map payload |

---

### Task 1: Backend, English map and realm names in the payload

**Files:**
- Modify: `backend/app/models/map.py` (`MapRealm.to_dict`, around line 133)
- Modify: `backend/app/services/maps/queries.py` (sqlite fallback dict in `fetch_maps`, around line 90)
- Modify: `backend/app/schemas/map.py` (`MapRealmResponse`)
- Modify: `frontend/src/types/map.ts` (`MapRealm`)
- Test: `backend/tests/unit/models/test_map_models.py`, `backend/tests/unit/test_character_map_perk_schemas.py`

**Interfaces:**
- Produces: map payload keys `raw_name: str` (English map name) and `raw_realm: str` (English realm name); frontend `MapRealm.raw_name?: string`, `MapRealm.raw_realm?: string`.

- [ ] **Step 1: Write the failing model test**

Append to `backend/tests/unit/models/test_map_models.py`:

```python
@pytest.mark.unit
def test_map_realm_to_dict_exposes_english_names(db_session: Session) -> None:
    """raw_name / raw_realm stay English whatever `lang` is (used by analytics)."""
    realm = Realm(name="Autohaven Wreckers", translations={"de": {"name": "Autowerkstatt"}})
    source = MapSource(code="hens333", label="Hens333 12-Clock Callouts")
    db_session.add_all([realm, source])
    db_session.flush()

    azarov = MapRealm(
        name="Azarov's Resting Place",
        realm_id=realm.id,
        source_id=source.id,
        translations={"de": {"name": "Azarovs Ruhestätte"}},
    )
    db_session.add(azarov)
    db_session.commit()

    data = azarov.to_dict(lang="de")
    assert data["name"] == "Azarovs Ruhestätte"
    assert data["raw_name"] == "Azarov's Resting Place"
    assert data["realm"] == "Autowerkstatt"
    assert data["raw_realm"] == "Autohaven Wreckers"
```

Also add `"raw_name"` and `"raw_realm"` to the `required_keys` set in `test_map_realm_to_dict_keys_completeness`.

Append to `backend/tests/unit/test_character_map_perk_schemas.py`, inside the map response test class after `test_map_realm_response_image_url_mirrors_callout_image_url`:

```python
    def test_map_realm_response_carries_english_names(self) -> None:
        resp = MapRealmResponse.model_validate(
            {
                "id": 1,
                "name": "Azarovs Ruhestätte",
                "raw_name": "Azarov's Resting Place",
                "realm": "Autowerkstatt",
                "raw_realm": "Autohaven Wreckers",
                "realm_id": 1,
                "source_id": 1,
            }
        )
        assert resp.raw_name == "Azarov's Resting Place"
        assert resp.raw_realm == "Autohaven Wreckers"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/unit/models/test_map_models.py tests/unit/test_character_map_perk_schemas.py -v`
(if the local env lacks deps: `docker compose exec backend python -m pytest tests/unit/models/test_map_models.py tests/unit/test_character_map_perk_schemas.py -v` from the repo root)
Expected: FAIL (`KeyError: 'raw_name'` and a missing schema attribute).

- [ ] **Step 3: Implement**

`backend/app/models/map.py`, in `MapRealm.to_dict` add two keys next to `name` and `realm`:

```python
        return {
            "id": self.id,
            "name": name,
            "raw_name": self.name,
            "realm": self.realm.localized_name(lang) if self.realm else "",
            "raw_realm": self.realm.name if self.realm else "",
            "realm_id": self.realm_id,
```

`backend/app/services/maps/queries.py`, in the sqlite fallback dict (the one that starts `"name": r["name"],`):

```python
            "name": r["name"],
            "raw_name": r["name"],
            "realm": r["realm_name"] if "realm_name" in row_keys else "",
            "raw_realm": r["realm_name"] if "realm_name" in row_keys else "",
```

`backend/app/schemas/map.py`, in `MapRealmResponse`:

```python
    id: int
    name: str
    raw_name: str = ""
    realm: str = ""
    raw_realm: str = ""
```

`frontend/src/types/map.ts`, in `MapRealm`:

```ts
  id: number;
  name: string;
  /** English name, whatever the page language is (used by analytics). */
  raw_name?: string;
  realm: string;
  /** English realm name, whatever the page language is (used by analytics). */
  raw_realm?: string;
```

Also check `backend/app/services/perks/queries_map.py` and `backend/tests/unit/routes/test_map_routes.py`: `fetch_maps` there returns `m.to_dict()` so it inherits the keys; if a route test asserts an exact key set, add the two keys there.

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/unit/models/test_map_models.py tests/unit/test_character_map_perk_schemas.py tests/unit/routes/test_map_routes.py tests/unit/services/test_map_services.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend frontend/src/types/map.ts
git commit -m "feat(maps): expose english map and realm names" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The analytics helper and the event catalogue

**Files:**
- Create: `frontend/src/utils/analytics.ts`
- Test: `frontend/src/__tests__/unit/analytics.test.ts`

**Interfaces:**
- Produces (all later tasks use exactly these):
  - `type EventProps = Record<string, string | number | boolean>`
  - `interface AnalyticsEvents` (catalogue below), `type EventName = keyof AnalyticsEvents`
  - `trackEvent<K extends EventName>(name: K, ...args: EventArgs<K>): boolean` (true only when handed to Umami)
  - `trackOnce<K extends EventName>(storageKey: string, name: K, ...args: EventArgs<K>): boolean`
  - `createDeduper(windowMs: number, now?: () => number): () => boolean`
  - `type ContactPage`, `contactPageFromPath(pathname: string | null): ContactPage | 'other'`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/unit/analytics.test.ts`:

```ts
// frontend/src/__tests__/unit/analytics.test.ts
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { contactPageFromPath, createDeduper, trackEvent, trackOnce } from '@/utils/analytics';

type Call = { name: string; data: unknown };
const g = globalThis as { window?: unknown; localStorage?: unknown };

function installUmami(calls: Call[]): void {
  g.window = { umami: { track: (name: string, data?: unknown) => calls.push({ name, data }) } };
}

function installStorage(): Map<string, string> {
  const store = new Map<string, string>();
  g.localStorage = {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  return store;
}

describe('trackEvent', () => {
  beforeEach(() => {
    delete g.window;
    delete g.localStorage;
  });
  afterEach(() => {
    delete g.window;
    delete g.localStorage;
  });

  it('is a silent no-op without a window (SSR)', () => {
    assert.equal(trackEvent('avatar_upload'), false);
  });

  it('is a silent no-op when the Umami script is not loaded', () => {
    g.window = {};
    assert.equal(trackEvent('avatar_upload'), false);
  });

  it('hands the name and props to umami.track', () => {
    const calls: Call[] = [];
    installUmami(calls);
    assert.equal(trackEvent('smash_vote', { vote: 'smash', roster: 'canon' }), true);
    assert.deepEqual(calls, [{ name: 'smash_vote', data: { vote: 'smash', roster: 'canon' } }]);
  });

  it('swallows an error thrown by umami.track', () => {
    g.window = {
      umami: {
        track: () => {
          throw new Error('boom');
        },
      },
    };
    assert.equal(trackEvent('avatar_upload'), false);
  });
});

describe('trackOnce', () => {
  beforeEach(() => {
    delete g.window;
    delete g.localStorage;
  });
  afterEach(() => {
    delete g.window;
    delete g.localStorage;
  });

  it('sends once and remembers it', () => {
    const calls: Call[] = [];
    installUmami(calls);
    installStorage();
    assert.equal(trackOnce('k1', 'showcase_complete', { role: 'killer' }), true);
    assert.equal(trackOnce('k1', 'showcase_complete', { role: 'killer' }), false);
    assert.equal(calls.length, 1);
  });

  it('does not burn the flag when Umami is not loaded yet', () => {
    const store = installStorage();
    assert.equal(trackOnce('k2', 'showcase_complete', { role: 'survivor' }), false);
    assert.equal(store.has('k2'), false);
    const calls: Call[] = [];
    installUmami(calls);
    assert.equal(trackOnce('k2', 'showcase_complete', { role: 'survivor' }), true);
    assert.equal(calls.length, 1);
  });
});

describe('createDeduper', () => {
  it('lets the first call through and blocks calls inside the window', () => {
    let t = 1000;
    const allow = createDeduper(1500, () => t);
    assert.equal(allow(), true);
    t = 2000;
    assert.equal(allow(), false);
    t = 2600;
    assert.equal(allow(), true);
  });
});

describe('contactPageFromPath', () => {
  it('maps the four pages that render ContactLinks', () => {
    assert.equal(contactPageFromPath('/en/about'), 'about');
    assert.equal(contactPageFromPath('/pl/privacy-policy'), 'privacy-policy');
    assert.equal(contactPageFromPath('/de/terms-of-service'), 'terms-of-service');
    assert.equal(contactPageFromPath('/ja/rules'), 'rules');
  });

  it('falls back to other', () => {
    assert.equal(contactPageFromPath('/en/maps'), 'other');
    assert.equal(contactPageFromPath(null), 'other');
    assert.equal(contactPageFromPath(''), 'other');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx --test src/__tests__/unit/analytics.test.ts`
Expected: FAIL, cannot find module `@/utils/analytics`.

- [ ] **Step 3: Write the helper**

Create `frontend/src/utils/analytics.ts`:

```ts
// frontend/src/utils/analytics.ts
//
// The one place Umami custom events are sent from. Analytics is best effort: it must never
// throw, block or change the UI, and it does nothing when the Umami script is missing
// (ad blocker, not loaded yet, server render).
import { safeGetItem, safeSetItem } from '@/utils/safeStorage';

/** What Umami accepts as event data: flat primitives only. */
export type EventProps = Record<string, string | number | boolean>;

type Role = 'survivor' | 'killer';

/** Every event the site sends, with its exact props. `undefined` means "no props". */
export interface AnalyticsEvents {
  // Randomizer
  randomizer_roll: {
    mode: 'wheel' | 'instant' | 'slot' | 'tarot' | 'crate';
    role: Role;
    blind: boolean;
    /** Active curse id, or 'none'. Read together with `role`. */
    curse: string;
    no_repeat: boolean;
    sound: 'on' | 'off';
  };
  // Maps
  map_open: { map: string; map_id: number; realm: string; via: 'browse' | 'search' | 'voice' | 'link' };
  map_voice_command: { result: 'matched' | 'nomatch'; engine: 'web-speech' | 'client-model' };
  // About and legal pages
  contact_click: { method: 'email' | 'discord'; page: ContactPage | 'other' };
  legal_link_click: { target: 'terms-of-service' | 'privacy-policy' | 'rules' };
  // User profile
  showcase_complete: { role: Role };
  avatar_upload: undefined;
  data_download: undefined;
  account_delete: undefined;
  two_factor_change: { action: 'enabled' | 'disabled' };
  // Smash or Pass
  smash_vote: { vote: 'smash' | 'pass'; roster: string };
  smash_roster_play: { roster: string };
  smash_roster_create: { mode: 'simple' | 'full'; nsfw: boolean };
  smash_roster_import: { via: 'link' | 'manual' };
  smash_roster_export: { method: 'link' | 'json_copy' | 'file' };
  smash_persona_share: { method: string };
  smash_persona_open: undefined;
  smash_leaderboard_open: undefined;
  smash_stats_open: undefined;
  smash_reset: undefined;
  smash_effects_choice: { effects: 'on' | 'off' };
  // Characters
  ownership_mode_enter: undefined;
  ownership_save: { characters_changed: number; perks_changed: number };
  ownership_blocked: { reason: 'login' | 'verify' };
  // Auth
  signup: { method: 'password' | 'google' };
  login: { method: 'password' | 'google' | 'two_factor' };
  email_verified: undefined;
  forgot_password_request: undefined;
  legal_preview_open: { doc: 'terms' | 'rules' };
}

export type EventName = keyof AnalyticsEvents;
type EventArgs<K extends EventName> = AnalyticsEvents[K] extends undefined ? [] : [props: AnalyticsEvents[K]];

declare global {
  interface Window {
    umami?: { track: (name: string, data?: EventProps) => unknown };
  }
}

/** Sends an event. Returns true only when it was handed to Umami. */
export function trackEvent<K extends EventName>(name: K, ...args: EventArgs<K>): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const umami = window.umami;
    if (!umami || typeof umami.track !== 'function') return false;
    umami.track(name, args[0] as EventProps | undefined);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sends an event once per browser: `storageKey` is remembered in localStorage only after the
 * event really went out, so an event attempted before Umami loaded is tried again later.
 */
export function trackOnce<K extends EventName>(storageKey: string, name: K, ...args: EventArgs<K>): boolean {
  if (safeGetItem(storageKey) !== null) return false;
  if (!trackEvent(name, ...args)) return false;
  safeSetItem(storageKey, '1');
  return true;
}

/** `allow()` is true at most once per `windowMs`; used to drop an accidental double report. */
export function createDeduper(windowMs: number, now: () => number = Date.now): () => boolean {
  let last = Number.NEGATIVE_INFINITY;
  return () => {
    const t = now();
    if (t - last < windowMs) return false;
    last = t;
    return true;
  };
}

const CONTACT_PAGES = ['about', 'privacy-policy', 'terms-of-service', 'rules'] as const;
export type ContactPage = (typeof CONTACT_PAGES)[number];

/** Which page the contact buttons are on, from a `/<locale>/<page>` path. */
export function contactPageFromPath(pathname: string | null): ContactPage | 'other' {
  const segment = (pathname ?? '').split('/')[2] ?? '';
  return (CONTACT_PAGES as readonly string[]).includes(segment) ? (segment as ContactPage) : 'other';
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx tsx --test src/__tests__/unit/analytics.test.ts`
Expected: PASS, then `npx tsc --noEmit` Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/analytics.ts frontend/src/__tests__/unit/analytics.test.ts
git commit -m "feat(analytics): typed trackEvent helper and event catalogue" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Randomizer, `randomizer_roll`

**Files:**
- Create: `frontend/src/components/generator/lib/rollTracking.ts`
- Modify: `frontend/src/components/generator/GeneratorPage.tsx`
- Modify: `frontend/src/components/generator/modes/InstantStage.tsx`
- Modify: `frontend/src/components/generator/modes/SlotMachineStage.tsx`, `modes/slot-machine/useSlotMachine.ts`
- Modify: `frontend/src/components/generator/modes/TarotDeckStage.tsx`
- Modify: `frontend/src/components/generator/modes/LootCrateStage.tsx`
- Test: `frontend/src/__tests__/unit/analyticsRollProps.test.ts`

**Interfaces:**
- Consumes: `trackEvent`, `AnalyticsEvents['randomizer_roll']` (Task 2).
- Produces: `buildRollProps(setup: RollSetup): AnalyticsEvents['randomizer_roll']`; optional prop `onLoadoutComplete?: () => void` on the four non wheel stages.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/unit/analyticsRollProps.test.ts`:

```ts
// frontend/src/__tests__/unit/analyticsRollProps.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildRollProps } from '@/components/generator/lib/rollTracking';

describe('buildRollProps', () => {
  it('describes a plain survivor roll', () => {
    assert.deepEqual(
      buildRollProps({
        mode: 'tarot',
        role: 'Survivor',
        blindMode: false,
        activeMutator: null,
        noRepeatPerks: true,
        audioEnabled: true,
      }),
      { mode: 'tarot', role: 'survivor', blind: false, curse: 'none', no_repeat: true, sound: 'on' }
    );
  });

  it('reports the active curse id, blind mode and sound off for a killer', () => {
    assert.deepEqual(
      buildRollProps({
        mode: 'wheel',
        role: 'Killer',
        blindMode: true,
        activeMutator: { id: 'hex_roulette' },
        noRepeatPerks: false,
        audioEnabled: false,
      }),
      { mode: 'wheel', role: 'killer', blind: true, curse: 'hex_roulette', no_repeat: false, sound: 'off' }
    );
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx --test src/__tests__/unit/analyticsRollProps.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the builder**

Create `frontend/src/components/generator/lib/rollTracking.ts`:

```ts
// frontend/src/components/generator/lib/rollTracking.ts
import type { GeneratorMode, RoleCategory } from '@/types/perks';
import type { ChaosMutator } from '@/types/chaos';
import type { AnalyticsEvents } from '@/utils/analytics';

export interface RollSetup {
  mode: GeneratorMode;
  role: RoleCategory;
  blindMode: boolean;
  activeMutator: Pick<ChaosMutator, 'id'> | null;
  noRepeatPerks: boolean;
  audioEnabled: boolean;
}

/** The setup a finished loadout was rolled with, as the `randomizer_roll` event props. */
export function buildRollProps(setup: RollSetup): AnalyticsEvents['randomizer_roll'] {
  return {
    mode: setup.mode,
    role: setup.role === 'Killer' ? 'killer' : 'survivor',
    blind: setup.blindMode,
    curse: setup.activeMutator?.id ?? 'none',
    no_repeat: setup.noRepeatPerks,
    sound: setup.audioEnabled ? 'on' : 'off',
  };
}
```

Run: `npx tsx --test src/__tests__/unit/analyticsRollProps.test.ts` Expected: PASS. If `GeneratorMode` is not exactly `'wheel' | 'instant' | 'slot' | 'tarot' | 'crate'`, fix the event type in `analytics.ts` to match `@/types/perks`.

- [ ] **Step 4: Wire `GeneratorPage.tsx`**

Add imports:

```ts
import { trackEvent } from '@/utils/analytics';
import { buildRollProps } from './lib/rollTracking';
```

Add above `handleWheelWinSlot`:

```ts
  /** One finished loadout (all 4 perks drawn), whichever mode produced it. */
  const trackRoll = useCallback(() => {
    trackEvent(
      'randomizer_roll',
      buildRollProps({ mode: genMode, role, blindMode, activeMutator, noRepeatPerks, audioEnabled })
    );
  }, [genMode, role, blindMode, activeMutator, noRepeatPerks, audioEnabled]);
```

In `handleWheelWinSlot`, first line of the callback body (the wheel finishes a loadout when its 4th slot is won), and add `trackRoll` to its dependency array:

```ts
  const handleWheelWinSlot = useCallback((wonData: DrawnSlot) => {
    if (activeSlotIdx === 3) trackRoll();
    setLoadout((prev) => {
```

Pass `onLoadoutComplete={trackRoll}` to `InstantStage`, `SlotMachineStage`, `TarotDeckStage` and `LootCrateStage` in the JSX (next to their `onRollComplete`).

- [ ] **Step 5: Wire the four stages (completion points)**

For each stage add `onLoadoutComplete?: () => void;` to its props interface and destructure it.

- `InstantStage.tsx`, inside the `finalTimeoutId` callback after `onRollComplete(slots);` add `onLoadoutComplete?.();`
- `modes/slot-machine/useSlotMachine.ts`: add `onLoadoutComplete?: () => void;` to `SlotMachineInput`, destructure in `useSlotMachine({...})`, and in `handleConfirm` right after `onRollComplete(nextSelected);` (inside the `nextSelected.length >= SLOT_LOADOUT_SIZE` branch) add `onLoadoutComplete?.();`. In `SlotMachineStage.tsx` accept the prop and pass it: `useSlotMachine({ role, activePlayablePerks, activeMutator, onRollComplete, onLoadoutComplete })`.
- `TarotDeckStage.tsx`, in `handleFlip` inside `if (next.every((c) => c.flipped)) {` after `onRollComplete(next.map((c) => c.slot));` add `onLoadoutComplete?.();`. Do NOT add it to `handleShuffle` (that is the first of the two `onRollComplete` calls).
- `LootCrateStage.tsx`, in `handlePick` inside the `nextSelected.length >= LOADOUT_SIZE || remainingPool.length === 0` branch after `onRollComplete(nextSelected);` add `onLoadoutComplete?.();`

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit` (no errors) and `npm run test:unit` (PASS; fix any existing test that renders a stage if the new optional prop breaks it).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/generator frontend/src/__tests__/unit/analyticsRollProps.test.ts
git commit -m "feat(analytics): track completed randomizer rolls" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Maps, `map_open` and `map_voice_command`

**Files:**
- Modify: `frontend/src/utils/mapUtils.ts` (add `MapOpenVia`, `mapOpenProps`)
- Modify: `frontend/src/hooks/useMapExplorerData.ts`
- Modify: `frontend/src/components/maps/MapExplorer.tsx`
- Modify: `frontend/src/app/[locale]/maps/page.tsx`
- Modify: `frontend/src/components/maps/voice/useVoiceSession.ts`, `voice/useStartListening.ts`
- Test: `frontend/src/__tests__/unit/analyticsMapOpen.test.ts`

**Interfaces:**
- Consumes: `trackEvent`, `createDeduper`, `MapRealm.raw_name/raw_realm` (Tasks 1, 2).
- Produces: `type MapOpenVia = 'browse' | 'search' | 'voice' | 'link'`; `mapOpenProps(map, via)`; `useMapExplorerData` option `onAutoOpen?: (map: MapRealm, via: 'voice' | 'link') => void`; `selectedMap` object gains `via?: 'voice' | 'link'`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/unit/analyticsMapOpen.test.ts`:

```ts
// frontend/src/__tests__/unit/analyticsMapOpen.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapOpenProps } from '@/utils/mapUtils';

describe('mapOpenProps', () => {
  it('uses the English names, not the localized ones', () => {
    assert.deepEqual(
      mapOpenProps(
        { id: 7, name: 'Azarovs Ruhestätte', raw_name: "Azarov's Resting Place", realm: 'Autowerkstatt', raw_realm: 'Autohaven Wreckers' },
        'browse'
      ),
      { map: "Azarov's Resting Place", map_id: 7, realm: 'Autohaven Wreckers', via: 'browse' }
    );
  });

  it('falls back to name and realm for an old cached payload without raw fields', () => {
    assert.deepEqual(mapOpenProps({ id: 3, name: 'The Game', realm: 'Gideon Meat Plant' }, 'voice'), {
      map: 'The Game',
      map_id: 3,
      realm: 'Gideon Meat Plant',
      via: 'voice',
    });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx --test src/__tests__/unit/analyticsMapOpen.test.ts` Expected: FAIL, `mapOpenProps` is not exported.

- [ ] **Step 3: Add `mapOpenProps`**

In `frontend/src/utils/mapUtils.ts` add (import the types at the top, `import type { MapRealm } from '@/types/map';` if not present, and `import type { AnalyticsEvents } from '@/utils/analytics';`):

```ts
export type MapOpenVia = AnalyticsEvents['map_open']['via'];

/** `map_open` props: English names (readable in the dashboard, stable across site languages). */
export function mapOpenProps(
  map: Pick<MapRealm, 'id' | 'name' | 'realm'> & Partial<Pick<MapRealm, 'raw_name' | 'raw_realm'>>,
  via: MapOpenVia
): AnalyticsEvents['map_open'] {
  return { map: map.raw_name ?? map.name, map_id: map.id, realm: map.raw_realm ?? map.realm, via };
}
```

Run the test again. Expected: PASS.

- [ ] **Step 4: Carry the open source through `useMapExplorerData`**

In `frontend/src/hooks/useMapExplorerData.ts`:

```ts
export interface UseMapExplorerDataOptions {
  initialMapName?: string;
  selectedMap?: { mapName: string; timestamp: number; via?: 'voice' | 'link' } | string;
  onAvailableMapsLoaded?: (maps: MapRealm[]) => void;
  /** Called when a map opens by itself (a voice command or a `?mapName=` link), not from a card click. */
  onAutoOpen?: (map: MapRealm, via: 'voice' | 'link') => void;
  locale?: string;
}
```

Destructure `onAutoOpen`, then next to `onAvailableMapsLoadedRef` add:

```ts
  const onAutoOpenRef = useRef(onAutoOpen);
  useEffect(() => {
    onAutoOpenRef.current = onAutoOpen;
  }, [onAutoOpen]);
  const openMapIdRef = useRef<number | null>(null);
  openMapIdRef.current = openMapId;
```

(`openMapId` is declared above this point; keep the new lines after its `useState`.) Replace the `if (match) {...}` block of the selectedMap effect with:

```ts
    const match = findMapByName(maps, targetMapName);
    if (match) {
      // Opening the map that is already open is not an open (a voice command can repeat itself).
      const alreadyOpen = openMapIdRef.current === match.id;
      setOpenMapId(match.id);
      lastHandledTargetRef.current = targetKey;
      if (!alreadyOpen) {
        const via = typeof rawTarget === 'object' && rawTarget !== null ? rawTarget.via ?? 'link' : 'link';
        onAutoOpenRef.current?.(match, via);
      }
    }
```

- [ ] **Step 5: `MapExplorer.tsx` and `maps/page.tsx`**

`MapExplorer.tsx`: add imports `import { trackEvent } from '@/utils/analytics';` and extend the existing `@/utils/mapUtils` import with `mapOpenProps`. Widen the prop type: `selectedMap?: { mapName: string; timestamp: number; via?: 'voice' | 'link' } | string;`. Pass `onAutoOpen` to the hook:

```ts
  } = useMapExplorerData({
    initialMapName,
    selectedMap,
    onAvailableMapsLoaded,
    onAutoOpen: (map, via) => trackEvent('map_open', mapOpenProps(map, via)),
    locale,
  });
```

Replace the card's `onSelect` (currently `onSelect={(map) => setOpenMapId(map.id)}`):

```tsx
<MapCard
  key={m.id}
  map={m}
  backendBase={backendBase}
  onSelect={(map) => {
    trackEvent('map_open', mapOpenProps(map, isSearching ? 'search' : 'browse'));
    setOpenMapId(map.id);
  }}
/>
```

`maps/page.tsx`: widen the state and mark the source.

```ts
  const [selectedMap, setSelectedMap] = useState<{
    mapName: string;
    timestamp: number;
    via?: 'voice' | 'link';
  }>({
    mapName: initialMapName,
    timestamp: Date.now(),
    via: 'link',
  });
  useEffect(() => {
    if (initialMapName) {
      setSelectedMap({ mapName: initialMapName, timestamp: Date.now(), via: 'link' });
    }
  }, [initialMapName]);
```

and

```ts
  const handleSelectMap = useCallback((name: string) => {
    setSelectedMap({ mapName: name, timestamp: Date.now(), via: 'voice' });
  }, []);
```

- [ ] **Step 6: Voice command outcomes**

In `voice/useVoiceSession.ts` add imports `import { createDeduper, trackEvent } from '@/utils/analytics';`. After the `propsRef` block (before `executeMatch`) add:

```ts
  const engineRef = useRef<VoiceEngineType>(activeEngine);
  engineRef.current = activeEngine;
  // recognition.onend can run again after stopListeningAndProcess already reported the same
  // command, so one command is reported at most once per 1.5 s.
  const outcomeDedupeRef = useRef(createDeduper(1500));
  const reportVoiceOutcome = useCallback((result: 'matched' | 'nomatch') => {
    if (!outcomeDedupeRef.current()) return;
    trackEvent('map_voice_command', { result, engine: engineRef.current });
  }, []);
```

Then call it:
- in `executeMatch`, inside the `if (result.matchedMapName) {` branch, first line: `reportVoiceOutcome('matched');` (not in the switch_source / zoom / close branches);
- in `executeMatch`, at the final fallthrough just before `setVoiceStatus('nomatch');` (line ~203): `reportVoiceOutcome('nomatch');`
- add `reportVoiceOutcome` to `executeMatch`'s dependency array (`[]` becomes `[reportVoiceOutcome]`);
- in `handleExecuteCommand`, in the `else` branch next to `setVoiceStatus('nomatch');`: `reportVoiceOutcome('nomatch');` and add it to that callback's deps;
- in `stopListeningAndProcess`, next to BOTH `setVoiceStatus('nomatch');` calls that follow a transcript (the client-model branch and the web-speech `else` branch) add `reportVoiceOutcome('nomatch');`, and add it to the deps;
- pass `reportVoiceOutcome` into the `useStartListening({...})` call.

In `voice/useStartListening.ts` add `reportVoiceOutcome: (result: 'matched' | 'nomatch') => void;` to the options interface, destructure it, and in `recognition.onend`, after the `if (currentText) { ... }` block that returns on a match, add inside that same `if (currentText)` block (after the `if (matchToExecute) {...}`):

```ts
            reportVoiceOutcome('nomatch');
```

Add `reportVoiceOutcome` to the hook's `useCallback` dependency array. The text itself is never sent.

- [ ] **Step 7: Verify and commit**

Run: `npx tsc --noEmit` and `npm run test:unit` (PASS; `mapVoice*` and map explorer tests must still pass).

```bash
git add frontend/src
git commit -m "feat(analytics): track map opens and voice commands" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: About and legal pages, `contact_click` and `legal_link_click`

**Files:**
- Modify: `frontend/src/components/common/LinkPill.tsx` (`onClick` on `LinkPill`)
- Modify: `frontend/src/components/common/ContactLinks.tsx`
- Modify: `frontend/src/components/legal/LegalPage.tsx` (`LegalLinkPill`)
- Modify: `frontend/src/app/[locale]/about/page.tsx`

**Interfaces:**
- Consumes: `trackEvent`, `contactPageFromPath` (Task 2).
- Produces: `LinkPill` optional `onClick?: () => void`; `LegalLinkPill` prop `target: 'terms-of-service' | 'privacy-policy' | 'rules'`.

- [ ] **Step 1: Give `LinkPill` an `onClick`**

In `LinkPill.tsx` change the signature and both anchors:

```tsx
export function LinkPill({ href, icon, children, className, onClick }: PillBase & { href: string; onClick?: () => void }) {
```

and `<a href={href} target="_blank" rel="noopener noreferrer" className={cn(PILL_CLASS, className)} onClick={onClick}>` and `<Link href={href} className={cn(PILL_CLASS, className)} onClick={onClick}>`.

- [ ] **Step 2: `ContactLinks.tsx`**

Add imports `import { usePathname } from 'next/navigation';` and `import { contactPageFromPath, trackEvent } from '@/utils/analytics';`.

`EmailPill` becomes (only the `copy` function and the signature change):

```tsx
function EmailPill({ email }: { email: string }) {
  const dict = useDictionary();
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    if (!(await copyTextWithFallback(email))) return;
    trackEvent('contact_click', { method: 'email', page: contactPageFromPath(pathname) });
    setCopied(true);
```

In `ContactLinks` add `const pathname = usePathname();` and on the Discord pill:

```tsx
      <LinkPill
        href={DISCORD_INVITE_URL}
        icon={<DiscordIcon className="h-4 w-4 text-brand-discord" />}
        onClick={() => trackEvent('contact_click', { method: 'discord', page: contactPageFromPath(pathname) })}
      >
```

- [ ] **Step 3: `LegalLinkPill` and the About page**

`LegalPage.tsx`:

```tsx
interface LegalLinkPillProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  target: 'terms-of-service' | 'privacy-policy' | 'rules';
}

export function LegalLinkPill({ href, icon, children, target }: LegalLinkPillProps) {
  return (
    <LinkPill
      href={href}
      icon={icon}
      className="text-xs sm:text-sm font-bold uppercase tracking-widest"
      onClick={() => trackEvent('legal_link_click', { target })}
    >
      {children}
    </LinkPill>
  );
}
```

(import `trackEvent` from `@/utils/analytics`). In `about/page.tsx` add `target="terms-of-service"`, `target="privacy-policy"` and `target="rules"` to the three `LegalLinkPill` elements.

- [ ] **Step 4: Verify and commit**

Run: `npx tsc --noEmit`; `npm run test:unit` (the About formatting test reads the page source; keep it green).

```bash
git add frontend/src
git commit -m "feat(analytics): track contact and legal link clicks" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: User profile events

**Files:**
- Create: `frontend/src/utils/userShowcaseAnalytics.ts`
- Modify: `frontend/src/hooks/useUserShowcase.ts`
- Modify: `frontend/src/app/[locale]/user/page.tsx`
- Modify: `frontend/src/components/user/DownloadDataSection.tsx`, `DeleteAccountSection.tsx`, `TwoFactorSetupModal.tsx`, `TwoFactorConfirmModal.tsx`
- Test: `frontend/src/__tests__/unit/analyticsShowcase.test.ts`

**Interfaces:**
- Consumes: `trackOnce`, `trackEvent`, `UserShowcaseState` (`@/types/userShowcase`).
- Produces: `completedShowcaseRoles(showcase): ('survivor' | 'killer')[]`; `reportCompleteShowcaseRoles(userId: number | string | null | undefined, showcase: UserShowcaseState): void`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/unit/analyticsShowcase.test.ts`:

```ts
// frontend/src/__tests__/unit/analyticsShowcase.test.ts
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { completedShowcaseRoles, reportCompleteShowcaseRoles } from '@/utils/userShowcaseAnalytics';
import { DEFAULT_SHOWCASE_STATE, type UserShowcaseState } from '@/types/userShowcase';

const g = globalThis as { window?: unknown; localStorage?: unknown };
afterEach(() => {
  delete g.window;
  delete g.localStorage;
});

const withPerks = (survivor: (number | null)[], killer: (number | null)[]): UserShowcaseState => ({
  ...DEFAULT_SHOWCASE_STATE,
  survivorMain: { ...DEFAULT_SHOWCASE_STATE.survivorMain, perkIds: survivor },
  killerMain: { ...DEFAULT_SHOWCASE_STATE.killerMain, perkIds: killer },
});

describe('completedShowcaseRoles', () => {
  it('needs all 4 perks of a role, the character does not count', () => {
    assert.deepEqual(completedShowcaseRoles(DEFAULT_SHOWCASE_STATE), []);
    assert.deepEqual(completedShowcaseRoles(withPerks([1, 2, 3, null], [4, 5, 6, 7])), ['killer']);
    assert.deepEqual(completedShowcaseRoles(withPerks([1, 2, 3, 4], [4, 5, 6, 7])), ['survivor', 'killer']);
  });
});

describe('reportCompleteShowcaseRoles', () => {
  function install(): { names: string[]; store: Map<string, string> } {
    const names: string[] = [];
    const store = new Map<string, string>();
    g.window = { umami: { track: (name: string) => names.push(name) } };
    g.localStorage = {
      getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    return { names, store };
  }

  it('reports each complete role once per user, even if perks change later', () => {
    const { names } = install();
    reportCompleteShowcaseRoles(5, withPerks([1, 2, 3, 4], [null, null, null, null]));
    reportCompleteShowcaseRoles(5, withPerks([9, 2, 3, 4], [null, null, null, null]));
    assert.deepEqual(names, ['showcase_complete']);
  });

  it('ignores guests and missing users', () => {
    const { names } = install();
    reportCompleteShowcaseRoles('guest', withPerks([1, 2, 3, 4], [1, 2, 3, 4]));
    reportCompleteShowcaseRoles(null, withPerks([1, 2, 3, 4], [1, 2, 3, 4]));
    reportCompleteShowcaseRoles(undefined, withPerks([1, 2, 3, 4], [1, 2, 3, 4]));
    assert.deepEqual(names, []);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx --test src/__tests__/unit/analyticsShowcase.test.ts` Expected: FAIL, module not found.

- [ ] **Step 3: Implement the helper**

Create `frontend/src/utils/userShowcaseAnalytics.ts`:

```ts
// frontend/src/utils/userShowcaseAnalytics.ts
import type { UserShowcaseState } from '@/types/userShowcase';
import { trackOnce } from '@/utils/analytics';

type ShowcaseRole = 'survivor' | 'killer';

const isFull = (perkIds: (number | null)[]): boolean => perkIds.length === 4 && perkIds.every((id) => id !== null);

/** Roles whose main has all 4 perks set. The character is always set (it has a default), so it does not count. */
export function completedShowcaseRoles(showcase: UserShowcaseState): ShowcaseRole[] {
  const roles: ShowcaseRole[] = [];
  if (isFull(showcase.survivorMain.perkIds)) roles.push('survivor');
  if (isFull(showcase.killerMain.perkIds)) roles.push('killer');
  return roles;
}

/**
 * `showcase_complete` once per user and role per browser. Called on every load and edit, so a
 * user who was already complete is counted too, and refilling a slot later is not counted again.
 */
export function reportCompleteShowcaseRoles(
  userId: number | string | null | undefined,
  showcase: UserShowcaseState
): void {
  if (userId === null || userId === undefined || userId === 'guest') return;
  for (const role of completedShowcaseRoles(showcase)) {
    trackOnce(`lemondbd_umami_showcase_complete_${userId}_${role}`, 'showcase_complete', { role });
  }
}
```

Run the test. Expected: PASS.

- [ ] **Step 4: Call it from `useUserShowcase.ts`**

Add `import { reportCompleteShowcaseRoles } from '@/utils/userShowcaseAnalytics';`. In `updateState`, after `setShowcase(next);` add `reportCompleteShowcaseRoles(userId, next);`. In the database load `.then` block, inside `if (!hasUserModifiedRef.current) {` after `setShowcase(dbData);` add `reportCompleteShowcaseRoles(userId, dbData);`.

- [ ] **Step 5: The four single events**

- `user/page.tsx`, in `handleAvatarFileChange` right after `await uploadAvatar(file);` add `trackEvent('avatar_upload');` (import `trackEvent`).
- `DownloadDataSection.tsx`, in `handleDownload` after `await downloadAccountData(userId);` add `if (own) trackEvent('data_download');` (`own` is `userId === undefined`, so an admin downloading someone else's data is not counted).
- `DeleteAccountSection.tsx`, in `confirm` after `await deleteAccount(...)` and BEFORE `logout();` add `trackEvent('account_delete');`.
- `TwoFactorSetupModal.tsx`, in `confirm` after `setCodes(await enableTwoFactor(code));` add `trackEvent('two_factor_change', { action: 'enabled' });`.
- `TwoFactorConfirmModal.tsx`, in `submit`, in the `action === 'disable'` branch after `await disableTwoFactor(password, code.trim());` add `trackEvent('two_factor_change', { action: 'disabled' });` (regenerating recovery codes is not a change).

Each file imports `trackEvent` from `@/utils/analytics`.

- [ ] **Step 6: Verify and commit**

Run: `npx tsc --noEmit`; `npm run test:unit`.

```bash
git add frontend/src
git commit -m "feat(analytics): track user profile actions" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Smash or Pass

**Files:**
- Create: `frontend/src/utils/smashOrPass/analytics.ts`
- Modify: `frontend/src/components/smash-or-pass/hub/useSmashVoting.ts`
- Modify: `frontend/src/components/smash-or-pass/SmashOrPassHub.tsx`
- Modify: `frontend/src/components/smash-or-pass/prefs/useSmashPrefs.ts`
- Modify: `frontend/src/components/smash-or-pass/creator/useRosterSubmit.ts`
- Modify: `frontend/src/components/smash-or-pass/SmashRosterImportModal.tsx`
- Modify: `frontend/src/components/common/ExportModal.tsx`, `frontend/src/components/smash-or-pass/SmashRosterExportModal.tsx`
- Modify: `frontend/src/components/smash-or-pass/RomancePersonaModal.tsx`, `persona/socialLinks.tsx`
- Test: `frontend/src/__tests__/unit/analyticsSmash.test.ts`

**Interfaces:**
- Consumes: `trackEvent`; `isLocalRosterSlug` (`@/utils/smashOrPass/localRoster`).
- Produces: `rosterTag(slug: string): string` (`'custom'` for local rosters); `createRosterPlayTracker(): (slug: string) => boolean`; `ExportModalProps.onExport?: (method: 'link' | 'json_copy' | 'file') => void`; `SocialLink.id: string`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/unit/analyticsSmash.test.ts`:

```ts
// frontend/src/__tests__/unit/analyticsSmash.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRosterPlayTracker, rosterTag } from '@/utils/smashOrPass/analytics';

describe('rosterTag', () => {
  it('keeps the slug of an official roster', () => {
    assert.equal(rosterTag('canon'), 'canon');
    assert.equal(rosterTag('hooked_on_you'), 'hooked_on_you');
  });

  it('never leaks anything about a custom roster', () => {
    assert.equal(rosterTag('local:abc123'), 'custom');
  });
});

describe('createRosterPlayTracker', () => {
  it('is true once per real slug, so two custom rosters are two plays', () => {
    const first = createRosterPlayTracker();
    assert.equal(first('canon'), true);
    assert.equal(first('canon'), false);
    assert.equal(first('local:a'), true);
    assert.equal(first('local:b'), true);
    assert.equal(first('local:a'), false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx --test src/__tests__/unit/analyticsSmash.test.ts` Expected: FAIL, module not found.

- [ ] **Step 3: Implement the helper**

Create `frontend/src/utils/smashOrPass/analytics.ts`:

```ts
// frontend/src/utils/smashOrPass/analytics.ts
import { isLocalRosterSlug } from './localRoster';

/** What the roster is called in analytics: the slug of an official one, 'custom' for any user made one. */
export function rosterTag(slug: string): string {
  return isLocalRosterSlug(slug) ? 'custom' : slug;
}

/** `play(slug)` is true the first time a roster is voted on in this page visit. Keyed on the real slug. */
export function createRosterPlayTracker(): (slug: string) => boolean {
  const seen = new Set<string>();
  return (slug) => {
    if (seen.has(slug)) return false;
    seen.add(slug);
    return true;
  };
}
```

Run the test. Expected: PASS.

- [ ] **Step 4: Votes and roster plays**

In `hub/useSmashVoting.ts` add imports `import { trackEvent } from '@/utils/analytics';` and `import { createRosterPlayTracker, rosterTag } from '@/utils/smashOrPass/analytics';`. Inside the hook add `const rosterPlayedRef = useRef(createRosterPlayTracker());`. In `handleVote`, directly after the `if (!currentCharacter || isExiting) return;` guard:

```ts
      trackEvent('smash_vote', { vote, roster: rosterTag(selectedRosterSlug) });
      if (rosterPlayedRef.current(selectedRosterSlug)) {
        trackEvent('smash_roster_play', { roster: rosterTag(selectedRosterSlug) });
      }
```

- [ ] **Step 5: Hub level events (`SmashOrPassHub.tsx`)**

Add `import { trackEvent } from '@/utils/analytics';`. The existing effect that reloads the leaderboard stays as it is. Add, after it, three effects that fire on the OPEN transition only:

```ts
  // Opening events fire on the closed to open transition, not whenever a dependency changes.
  const isOwnPersonaOpen = overlays.isPersonaOpen && !overlays.sharedPayload;
  useEffect(() => {
    if (isOwnPersonaOpen) trackEvent('smash_persona_open');
  }, [isOwnPersonaOpen]);

  useEffect(() => {
    if (isLeaderboardOpen) trackEvent('smash_leaderboard_open');
  }, [isLeaderboardOpen]);

  const isStatsOpen = Boolean(overlays.selectedStatCharacter);
  useEffect(() => {
    if (isStatsOpen) trackEvent('smash_stats_open');
  }, [isStatsOpen]);
```

In `handleResetAllVotes`, after `await clearVotes();` add `trackEvent('smash_reset');`.

- [ ] **Step 6: Effects choice (`prefs/useSmashPrefs.ts`)**

Import `trackEvent`. In `update`, after `setPrefs(next);` add:

```ts
      // A first choice (the mandatory modal) or a flip of the effects switch; sound and music
      // switches are not this event.
      if (prefs === null || change.effects !== undefined) {
        trackEvent('smash_effects_choice', { effects: next.effects ? 'on' : 'off' });
      }
```

- [ ] **Step 7: Create, import, export**

- `creator/useRosterSubmit.ts`, in the NEW local roster branch (after `const saveResult = saveCustomRoster({ id, ...result.doc, createdAt: Date.now() });` and its `if (!saveResult.ok) {...}` guard, before the `try { localStorage.removeItem(DRAFT_KEY)`):
  `trackEvent('smash_roster_create', { mode: isSimpleMode ? 'simple' : 'full', nsfw: Boolean(result.doc.is_nsfw) });`
  Not in the edit branch and not in the admin publish branch.
- `SmashRosterImportModal.tsx`, in `doImport` after the `saveResult.ok` guard and before `onImported(...)`: `trackEvent('smash_roster_import', { via: sharePayload ? 'link' : 'manual' });`
- `common/ExportModal.tsx`: add `onExport?: (method: 'link' | 'json_copy' | 'file') => void;` to `ExportModalProps` and to the destructured props. Replace the three handlers:

```tsx
  const copyLink = async () => {
    const ok = await copyTextWithFallback(shareUrl);
    setLinkCopy(ok ? 'copied' : 'failed');
    if (ok) onExport?.('link');
  };
  const copyJson = async () => {
    const ok = await copyTextWithFallback(json);
    setJsonCopy(ok ? 'copied' : 'failed');
    if (ok) onExport?.('json_copy');
  };
  const downloadJson = () => {
    downloadTextFile(json, fileName(doc));
    onExport?.('file');
  };
```

  and use them: the share link button `onClick={copyLink}`, the download button `onClick={downloadJson}`, the copy JSON button `onClick={copyJson}`. Define them after `if (!doc) return null;`.
- `SmashRosterExportModal.tsx`: add `onExport={(method) => trackEvent('smash_roster_export', { method })}` to `<ExportModal ...>`.

- [ ] **Step 8: Persona sharing**

- `persona/socialLinks.tsx`: add `id: string;` to `SocialLink`, and `id: 'twitter'`, `'reddit'`, `'whatsapp'`, `'telegram'`, `'discord'` to the five objects in order.
- `RomancePersonaModal.tsx`: import `trackEvent`. After `handleCopyLinkOnly`'s `if (success) {` add `trackEvent('smash_persona_share', { method: 'copy_link' });`. In `handleShare`, after `await navigator.share({...});` and before `return;` add `trackEvent('smash_persona_share', { method: 'native' });`. Wrap the social links where they are built:

```ts
  const socialLinks = useMemo(
    () =>
      buildSocialLinks({ ...same options as today... }).map((link) => ({
        ...link,
        onClick: async (e: React.MouseEvent) => {
          trackEvent('smash_persona_share', { method: link.id });
          await link.onClick?.(e);
        },
      })),
    [shareUrl, shareText, shareTitle, rawSmash, locale]
  );
```

Check with `grep -rn "SocialLink\b" frontend/src` that nothing else builds `SocialLink` objects without an `id`.

- [ ] **Step 9: Verify and commit**

Run: `npx tsc --noEmit`; `npm run test:unit`; `npm run test:guards` (smash icon and file length guards).

```bash
git add frontend/src
git commit -m "feat(analytics): track smash or pass actions" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Characters, ownership events

**Files:**
- Modify: `frontend/src/utils/characterUtils.ts` (add `countChangedPerks`)
- Modify: `frontend/src/components/characters/hub/useCharacterOwnership.ts`
- Test: `frontend/src/__tests__/unit/analyticsOwnership.test.ts`

**Interfaces:**
- Consumes: `trackEvent`.
- Produces: `countChangedPerks(perks: { perk_id: number; is_unlocked: boolean }[], draft: Record<number, boolean>): number`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/unit/analyticsOwnership.test.ts`:

```ts
// frontend/src/__tests__/unit/analyticsOwnership.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { countChangedPerks } from '@/utils/characterUtils';

describe('countChangedPerks', () => {
  const perks = [
    { perk_id: 1, is_unlocked: true },
    { perk_id: 2, is_unlocked: false },
    { perk_id: 3, is_unlocked: true },
  ];

  it('counts only perks whose draft differs from what was loaded', () => {
    assert.equal(countChangedPerks(perks, { 1: true, 2: true, 3: false }), 2);
  });

  it('is zero when the draft equals the loaded state', () => {
    assert.equal(countChangedPerks(perks, { 1: true, 2: false, 3: true }), 0);
  });

  it('treats a missing draft entry as unchanged', () => {
    assert.equal(countChangedPerks(perks, {}), 0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx --test src/__tests__/unit/analyticsOwnership.test.ts` Expected: FAIL, `countChangedPerks` is not exported.

- [ ] **Step 3: Implement and wire**

Add to `frontend/src/utils/characterUtils.ts`:

```ts
/** How many perks the draft changed compared with what was loaded. The save request sends every perk, so its length is not this number. */
export function countChangedPerks(
  perks: { perk_id: number; is_unlocked: boolean }[],
  draft: Record<number, boolean>
): number {
  return perks.filter((p) => (draft[p.perk_id] ?? p.is_unlocked) !== p.is_unlocked).length;
}
```

In `useCharacterOwnership.ts` import `trackEvent` and add `countChangedPerks` to the existing `@/utils/characterUtils` import.

- `handleToggleOwnershipMode`: before `onLoginRequired();` add `trackEvent('ownership_blocked', { reason: 'login' });`; before `onVerificationRequired();` add `trackEvent('ownership_blocked', { reason: 'verify' });`; right after `setOwnershipMode(true);` add `trackEvent('ownership_mode_enter');`.
- `handleSaveOwnership`: after the `if (!charactersOk || !perksOk) {...return;}` guard and BEFORE `handleCancelOwnershipMode();` (it clears the drafts) add:

```ts
      trackEvent('ownership_save', {
        characters_changed: characterUpdates.length,
        perks_changed: countChangedPerks(allPerks, perkUnlockDraft),
      });
```

- [ ] **Step 4: Verify and commit**

Run: `npx tsx --test src/__tests__/unit/analyticsOwnership.test.ts` (PASS); `npx tsc --noEmit`.

```bash
git add frontend/src
git commit -m "feat(analytics): track character ownership actions" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Auth

**Files:**
- Modify: `frontend/src/context/AuthContext.tsx`
- Modify: `frontend/src/components/AuthModal.tsx`

**Interfaces:**
- Consumes: `trackEvent`.

- [ ] **Step 1: `AuthContext.tsx`**

Add `import { trackEvent } from '@/utils/analytics';`. Add the event right after the session is set, inside each success path:

- `login`: after `if (data.ownership) setOwnership(data.ownership);` add `trackEvent('login', { method: 'password' });`
- `loginWithGoogle`: after `if (data.ownership) setOwnership(data.ownership);` add:

```ts
      // The API has no "new account" flag; a user without a finished onboarding is the one
      // the app sends to /welcome, so that is what counts as a signup.
      if (data.user?.onboarding_completed_at) trackEvent('login', { method: 'google' });
      else trackEvent('signup', { method: 'google' });
```


- `completeTwoFactorLogin`: after `if (data.ownership) setOwnership(data.ownership);` add `trackEvent('login', { method: 'two_factor' });`
- `register`: after `if (data.ownership) setOwnership(data.ownership);` add `trackEvent('signup', { method: 'password' });`
- `verifyEmail`: before `return { success: true, user: data.user as UserProfile };` add `trackEvent('email_verified');`

A password login that answers `two_factor_required` returns earlier and is deliberately not counted.

- [ ] **Step 2: `AuthModal.tsx`**

Add `import { trackEvent } from '@/utils/analytics';`. In the `mode === 'forgot'` branch, in `if (res.success) {` before `setNotice({ type: 'forgot-sent' });` add `trackEvent('forgot_password_request');`. Replace the inline legal link handler:

```tsx
onClick={() => {
  const doc = part === '{terms}' ? 'terms' : 'rules';
  trackEvent('legal_preview_open', { doc });
  setLegalDoc(doc);
}}
```

(keep the surrounding JSX exactly as it is; only the handler changes).

- [ ] **Step 3: Verify and commit**

Run: `npx tsc --noEmit`; `npm run test:unit` (`authModalVerificationFlow`, `authOnboarding` and `apiAuthHelpers` read these files; keep them green).

```bash
git add frontend/src
git commit -m "feat(analytics): track signup, login and verification" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Wiring guard, full verification and rebuild

**Files:**
- Create: `frontend/src/__tests__/unit/analyticsWiring.test.ts`

- [ ] **Step 1: Write the guard**

It fails if an event in the catalogue is never sent, or if code sends an event that is not in the catalogue.

```ts
// frontend/src/__tests__/unit/analyticsWiring.test.ts
//
// Every event in the AnalyticsEvents catalogue is sent from somewhere, and nothing sends an
// event the catalogue does not know.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '../..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const catalogue = fs.readFileSync(path.join(SRC, 'utils/analytics.ts'), 'utf8');
// Only the event lines of the interface are indented exactly two spaces and end in a colon.
const declared = [...catalogue.matchAll(/^ {2}([a-z0-9_]+): /gm)].map((m) => m[1]);

const sources = walk(SRC)
  .filter((f) => !f.endsWith(path.join('utils', 'analytics.ts')))
  .map((f) => fs.readFileSync(f, 'utf8'))
  .join('\n');
const sent = new Set([
  ...[...sources.matchAll(/trackEvent\(\s*'([a-z0-9_]+)'/g)].map((m) => m[1]),
  ...[...sources.matchAll(/trackOnce\([^,]+,\s*'([a-z0-9_]+)'/g)].map((m) => m[1]),
]);

describe('analytics wiring', () => {
  it('declares the events it should', () => {
    assert.ok(declared.length >= 30, `only ${declared.length} events parsed from the catalogue`);
  });

  it('sends every event in the catalogue', () => {
    assert.deepEqual(declared.filter((n) => !sent.has(n)), []);
  });

  it('sends no event that is not in the catalogue', () => {
    assert.deepEqual([...sent].filter((n) => !declared.includes(n)), []);
  });

  it('never writes an em dash in the analytics module', () => {
    assert.equal(catalogue.includes('—'), false);
  });
});
```

- [ ] **Step 2: Run everything**

Run from `frontend`:

```bash
npx tsc --noEmit
npm run test:unit
npm run test:guards
npm run lint
```

Expected: all PASS. From `backend`: `python -m pytest tests/unit -q` (or the `docker compose exec backend` form). Expected: PASS.

- [ ] **Step 3: Rebuild the containers**

From the repo root: `docker compose up -d --build`
Expected: frontend and backend rebuilt and healthy (`docker compose ps`).

- [ ] **Step 4: Manual smoke check (the user)**

Open the site, then Umami Events (realtime). Per page, do the listed action and confirm the event and props: Randomizer (finish a loadout in each mode), Maps (open a map by card, search, voice), About (copy e-mail, Discord, legal pills), User (avatar, download, 2FA), Smash or Pass (vote, switch roster, share persona), Characters (My characters, save), Auth (sign up, log in, forgot password). Dev React StrictMode double runs effects, so check opening events on the production build.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/__tests__/unit/analyticsWiring.test.ts
git commit -m "test(analytics): guard that every event is wired" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage** (spec: `2026-10-13-umami-click-tracking.md`): `randomizer_roll` (T3); `map_open` incl. English names and `via` link/voice/browse/search, `map_voice_command` matched and nomatch without text (T1, T4); `contact_click`, `legal_link_click` (T5); `showcase_complete`, `avatar_upload`, `data_download`, `account_delete`, `two_factor_change` (T6); `smash_vote`, `smash_roster_play`, `smash_roster_create`, `smash_roster_import`, `smash_roster_export`, `smash_persona_share`, `smash_persona_open`, `smash_leaderboard_open`, `smash_stats_open`, `smash_reset`, `smash_effects_choice` (T7); `ownership_mode_enter`, `ownership_save`, `ownership_blocked` (T8); `signup`, `login`, `email_verified`, `forgot_password_request`, `legal_preview_open` (T9). Perks, tier-lists, streaks, home are out of scope per the spec. No gaps.

**Placeholder scan:** none; every step has the code or the exact anchor line.

**Type consistency:** `trackEvent`/`trackOnce` signatures, `AnalyticsEvents` keys and props are defined once in Task 2 and used as defined; `mapOpenProps`, `buildRollProps`, `rosterTag`, `countChangedPerks`, `reportCompleteShowcaseRoles`, `onLoadoutComplete`, `onAutoOpen`, `onExport` have the same names in definition and use.

**Review Focus coverage:** blocked Umami and unburnt flag (T2 tests); double fire (T3 Tarot rule, T4 deduper and `alreadyOpen`, T10 prod build note); private data (T7 `rosterTag` test, no `query` in T4); old payloads (T4 test); guests/admin (T6 test and `own` guard); delete ordering (T6 Step 5).
