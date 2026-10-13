# Umami click tracking: planning notes

Branch: `feature/umami-click-tracking` (off `develop`).
Status: planning, page by page. Implementation happens at the very end, all at once.

## Current state

- Only page views are tracked (`UmamiScript.tsx` injects `script.js`).
- No custom events exist anywhere yet (no `umami.track`, no `data-umami-event`).

## Shared tooling (to build at implementation time)

- `frontend/src/lib/analytics.ts`: typed `trackEvent(name, props)`.
- Safe no-op when `window.umami` is missing (blocked, not loaded yet, SSR).
- Event names as a string union, props as typed interfaces (no `dict: any`).

## Conventions

- Event names: `snake_case`, `<area>_<action>`.
- Props are small flat primitives (string, boolean, number).
- No em dashes in any copy.

## Page 1: Randomizer (`/randomizer`) [DONE]

Only ONE event on this page: `randomizer_roll`. Everything else was reviewed
and deliberately dropped.

### Event: `randomizer_roll`

Fired once per COMPLETED loadout (all 4 perks drawn), never on a start click.

| Prop | Values |
|------|--------|
| `mode` | `wheel`, `instant`, `slot`, `tarot`, `crate` |
| `role` | `survivor`, `killer` |
| `blind` | `true` / `false` (Blind mode toggle) |
| `curse` | mutator id (`no_exhaustion`, `blindness`, `solo_queue`, `meme_loadout`, `hex_boon_only`, `negative_only`, `no_slowdown`, `chase_only`, `hex_roulette`) or `none` |
| `no_repeat` | `true` / `false` |
| `sound` | `on` / `off` |

Why one event with props instead of separate events per option: Umami can
filter and break down by property, so "rolls with blind mode", "rolls per
mode", "killer vs survivor", "most played curse" are all views of the same
event, and nothing double counts. The curse is persisted per role and stays
across rolls, so `curse` here is what people actually played with.

Gotcha: `blindness`, `meme_loadout` and `negative_only` exist twice in
`chaosMutators.ts` (survivor and killer variants), so read `curse` together
with `role`. Match by id (stable), never by display name.

### Where it fires (completion point per mode, verified in code)

State (`genMode`, `role`, `blindMode`, `activeMutator`, `noRepeatPerks`,
`audioEnabled`) lives in `GeneratorPage.tsx`, which builds the props.

| Mode | Completion point |
|------|------------------|
| Wheel | `handleWheelWinSlot` in `GeneratorPage.tsx`, when the win lands on the last slot (`activeSlotIdx === 3`). Reset and role change restart the index at 0, so a half loadout is never counted. |
| Instant | `InstantStage.tsx`, where `onRollComplete(slots)` is called |
| Slot machine | `useSlotMachine.ts` `handleConfirm`, in the branch where `nextSelected.length >= SLOT_LOADOUT_SIZE` |
| Loot crate | `LootCrateStage.tsx` `handlePick`, in the branch that sets phase `complete` |
| Tarot | `TarotDeckStage.tsx` `handleFlip`, when `next.every(c => c.flipped)` (all 4 cards flipped) |

Plan: add a small `onLoadoutComplete` prop to the four non wheel stages;
`GeneratorPage` passes one callback that builds the props and calls `trackEvent`.

Do NOT reuse `onRollComplete` as the trigger: Tarot calls it twice per roll
(on shuffle and on the last flip) and it also drives No Repeat bookkeeping.

Note for the future: counting slot machine and loot crate at the START click
(`beginPull` / `beginOpen`) was considered. Owner only cares about finished
loadouts for now and may revisit.

### Decided: not tracked

- Toolbar icons (blind, no repeat, sound, reset): their state is already a
  prop on `randomizer_roll`.
- Curse wheel modal: open, spin, clear. Not needed.
- Low pool warning reset, Blind mode reveal.
- Mode switcher and role toggle clicks (users flip them constantly, would skew data).
- Perk click on a result (opens PerkModal).
- Tarot card flips (other than as the completion trigger) and crate picks.

## Page 2: Map explorer (`/maps`) [DONE]

Two events. Everything else on the page was reviewed and dropped.

### Event: `map_open`

Fired when the fullscreen map viewer opens.

| Prop | Values |
|------|--------|
| `map` | ENGLISH map name (readable in the dashboard, and stable across site languages) |
| `map_id` | numeric id, already in the API response; stable even if a name is ever renamed |
| `realm` | ENGLISH realm name |
| `via` | `browse` (clicked a card), `search` (clicked a card while a search is active), `voice` (voice command opened it), `link` (arrived with `?mapName=`) |

Where it fires:

- `browse` / `search`: `onSelect` of `MapCard` in `MapExplorer.tsx`
  (`via=search` when `isSearching` is true).
- `voice`: `handleSelectMap` in `maps/page.tsx` (only the voice banner calls it).
- `link`: the effect in `useMapExplorerData.ts` that opens a map from
  `initialMapName`.

Needs a backend change (English names are not in the API response today):

- `MapRealm.to_dict()` in `backend/app/models/map.py` returns a localized
  `name` and `realm`. Add `raw_name` (the English `self.name`) and
  `raw_realm` (the English realm name), same pattern `Realm.to_dict()` already
  uses with `raw_name`.
- Every response path must carry them: the ORM path, the sqlite fallback in
  `backend/app/services/maps/queries.py`, `MapRealmResponse` in
  `backend/app/schemas/map.py`, and the frontend `MapRealm` type in
  `frontend/src/types/map.ts`.
- Catalog responses are cached and ETagged, so the new fields appear after the
  cache window or a container rebuild.

### Event: `map_voice_command`

Fired when a voice command finishes processing.

| Prop | Values |
|------|--------|
| `result` | `matched`, `nomatch` |
| `engine` | `web-speech`, `client-model` |

Purpose: see whether people use voice at all, and whether they have trouble
finding a map this way.

Where it fires (`components/maps/voice/`):

- `matched`: `executeMatch` in `useVoiceSession.ts`, for the branch that opens
  a map (not for zoom/close/source commands, those are not map lookups).
- `nomatch`: ONLY where there was a transcript but no map matched:
  `useVoiceSession.ts` (the fallthrough at the end of `executeMatch`,
  `handleExecuteCommand`, the client-model path and the web-speech path in
  `stopListeningAndProcess`) and the transcript branch at the end of
  `useStartListening.ts`.
- Deliberately NOT counted as `nomatch`, even though they set that status:
  the `no-speech` error (user said nothing) and the `network` /
  `service-not-allowed` error (engine fallback). They are not a failed lookup
  and would inflate the number.
- Use one small helper for the nomatch call instead of repeating it.

Decided: `nomatch` carries NO spoken text (`result` and `engine` only), to keep
user speech out of analytics.

### Decided: not tracked

- Realm expand, layout/size/sort filters, filter clear.
- Search usage on its own (only visible through `via=search`).
- Zoom, zoom out and reset in the viewer.
- Text / Voice mode switch (use of voice is measured by `map_voice_command`).

## Page 3: About us (`/about`) [DONE]

Static content page. Two events: reaching the team, and the legal page links.

### Event: `contact_click`

| Prop | Values |
|------|--------|
| `method` | `email` (copy to clipboard), `discord` (invite link) |
| `page` | `about`, `privacy-policy`, `terms-of-service`, `rules` |

Both buttons live in the shared `components/common/ContactLinks.tsx`, which is
rendered on About (`about/page.tsx`) AND in the contact section of the legal
pages (`legal/LegalSections.tsx`: privacy policy, terms, rules). So one
instrumentation point covers four pages, and `page` tells them apart.
Derive `page` from the pathname inside `ContactLinks` (no prop plumbing
through `LegalSections`).

- `email`: fire in `EmailPill.copy` only after `copyTextWithFallback` succeeded.
- `discord`: `onClick` on the `LinkPill` (extend `LinkPill` / `ContactLinks`
  to accept an `onClick`; `LinkPill` currently has none).

This also means the legal pages' contact buttons are covered here, so the
Rules and legal pages need no separate contact tracking later.

### Event: `legal_link_click`

The three pills at the bottom of About (`LegalLinkPill` in
`components/legal/LegalPage.tsx`, used only by `about/page.tsx`).

| Prop | Values |
|------|--------|
| `target` | `terms-of-service`, `privacy-policy`, `rules` |

Shows how often visitors go from About to the legal pages (page views alone
cannot say where the visit came from). `LinkPill` has no `onClick` today, so
it gets an optional one (same change as the Discord pill), and `LegalLinkPill`
takes the `target` and fires the event.

### Not tracked

- Card open/close (`BlockCard`): reading UI, not a feature.
- Credits list: placeholder names.

## Page 4: User profile (`/user`) [DONE]

Logged in only. Events measure adoption of account features.

| Event | Props | Where |
|-------|-------|-------|
| `showcase_complete` | `role`: `survivor` / `killer` | `hooks/useUserShowcase.ts` (see below) |
| `avatar_upload` | none | `handleAvatarFileChange` in `user/page.tsx`, after `uploadAvatar` succeeds |
| `data_download` | none | `DownloadDataSection.tsx`, after `downloadAccountData` succeeds |
| `account_delete` | none | `DeleteAccountSection.tsx`, after `deleteAccount` succeeds |
| `two_factor_change` | `action`: `enabled` / `disabled` | `TwoFactorSetupModal.tsx` (after `enableTwoFactor`) and the disable flow in `TwoFactorSection.tsx` |

Notes:

- `account_delete` must fire BEFORE the logout and redirect that follow a
  successful delete, or the event is lost with the page.
- `data_download` is also rendered with `iconOnly` elsewhere (same component),
  so hooking the component covers every place it appears.
- Disabling 2FA: check how `TwoFactorConfirmModal` reports success before
  wiring `action=disabled` (regenerate recovery codes is NOT a change, skip it).

### `showcase_complete`: how it counts

"Complete" for a role = all 4 `perkIds` of that main are non null. The
character is NOT part of the test: `DEFAULT_SHOWCASE_STATE` already has Feng
Min and The Blight, so a character is always set.

To avoid inflating the number on every later edit:

- Fire only when a role goes from incomplete to complete, never on a perk
  change inside an already complete build.
- A localStorage flag per user id and role (`lemondbd_umami_showcase_complete_<userId>_<role>`)
  makes it fire once, so clear a slot then refill does not count twice.
- Existing users who are already complete are counted too: on showcase load,
  if a role is complete and the flag is missing, fire once and set the flag.
- Do not fire from the unauthenticated/guest case.
- Only user driven or loaded state counts; the check lives next to
  `updateState` / the initial DB load in `useUserShowcase.ts`.

Known limit: Umami counts browsers, not accounts (cleared storage or another
device counts again). Good enough for a trend. No DB script wanted.

### Not tracked

- `showcase_edit` (every change), specific character or perk chosen.
- Profile edits (login, e-mail, password).
- `bug_report_submit` (shared modal with the sidebar, not for now).
- Drawer open/close, Vault Mastery dials (not interactive), admin panel link.

## Page 5: Smash or Pass (`/smash-or-pass`, `/smash-or-pass/create`) [proposal, one open point]

Privacy rule for every event below: `roster` is the slug of an OFFICIAL roster
(`canon`, `hooked_on_you`, ...) or the literal `custom` for a roster the user
made. Never send the name of a custom roster (user content, may be NSFW).

| Event | Props | Where |
|-------|-------|-------|
| `smash_vote` | `vote`: `smash`/`pass`, `roster` | `handleVote` in `hub/useSmashVoting.ts`, after the early return guard (no current card, or card already exiting). One place covers swipe, keyboard, buttons and the How to play modal. Local rosters count too. |
| `smash_roster_play` | `roster` | see "Roster popularity" below |
| `smash_roster_create` | `mode`: `simple`/`full`, `nsfw`: bool | `creator/useRosterSubmit.ts`, only the NEW local roster branch (`createCustomRosterId`), not edits, not admin official publish |
| `smash_roster_import` | `via`: `link` (share payload) / `manual` | `onImported` in `hub/RosterModals.tsx`; `SmashRosterImportModal` knows `sharePayload` |
| `smash_roster_export` | `method`: `link` / `json_copy` / `file` | shared `common/ExportModal.tsx` (also used by tier-lists later): add an optional `onExport(method)` prop, `SmashRosterExportModal` passes the tracker. Fire only when copy succeeded or the file download was triggered |
| `smash_persona_share` | `method`: `copy_link` / `native` / network (`whatsapp`, `telegram`, ...) | `RomancePersonaModal.tsx` (`handleCopyLinkOnly`, `handleShare`) and `persona/socialLinks.tsx` |
| `smash_persona_open` | none | one place: `isPersonaOpen` opening in `hub/useHubOverlays` / `setIsPersonaOpen(true)` (two entry points: header dock and card arena) |
| `smash_leaderboard_open` | none | `setIsLeaderboardOpen(true)` |
| `smash_stats_open` | none | `setSelectedStatCharacter(char)` with a non null character (hotkey, How to play, leaderboard) |
| `smash_reset` | none | `handleResetAllVotes` in `SmashOrPassHub.tsx`, the confirmed reset |
| `smash_effects_choice` | `effects`: `on`/`off` | `useSmashPrefs` when the viewer saves their choice (see note) |

Notes:

- `smash_persona_open` and `smash_stats_open` must fire when the modal OPENS,
  not on every render of the open state (watch the `isOpen` transition).
- `smash_effects_choice`: the first visit shows a mandatory preference modal
  (`prefs === null`); fire when a choice is saved, not on cancel. Read
  `useSmashPrefs.ts` before wiring.
- Already default (no event): the viewer is always on a roster; `canon` is the
  default and is never "selected" from the picker.

### Roster popularity (the two biases)

1. Canon is the default roster, so a "roster select" event would never count
   people who just play canon.
2. Counting per vote makes a roster with more characters look more popular.

Fix: do NOT use a select event. `smash_roster_play` fires ONCE per roster per
page visit, on the first vote cast on that roster (a `Set` of rosters in a ref
inside `useSmashVoting`, reset on page load). It counts a roster the viewer
really played (default canon included) regardless of how many cards it has.
Reading the data:

- popularity = `smash_roster_play` count per `roster` (size independent)
- engagement = `smash_vote` count divided by `smash_roster_play` count for
  the same roster (votes per play)
- `smash_vote` totals per roster alone must NOT be read as popularity.

Custom rosters: every roster the user made or imported (slug starts with
`local:`) is reported as `roster=custom`, whatever it is called. The dedupe
set inside `useSmashVoting` still keys on the REAL slug, so two different
custom rosters played in one visit count as two plays, both under `custom`.
Result: `custom` is one aggregate bucket ("how much do people play their own
rosters vs official ones"); individual custom rosters cannot be compared and
nothing identifying them leaves the browser. Official rosters published by an
admin keep their own slug.

Optional, not planned: `smash_roster_complete` when a deck runs out.

### Not tracked

- Shuffle, filters, How to play open, NSFW acknowledgement.
- Picker open / cancel.

## Page 6: Characters (`/characters`, `/characters/[slug]`) [DONE]

Per character popularity needs NO event: Umami already records the path
`/characters/<slug>` as a page view. Hence no `character_open` for card clicks.

| Event | Props | Where |
|-------|-------|-------|
| `ownership_mode_enter` | none | `useCharacterOwnership.ts` `handleToggleOwnershipMode`, after the ownership data loaded and `setOwnershipMode(true)` (so blocked attempts do not count) |
| `ownership_save` | `characters_changed`: number, `perks_changed`: number | `handleSaveOwnership`, only when both bulk updates succeeded |
| `ownership_blocked` | `reason`: `login` (not signed in) / `verify` (signed in, e-mail not verified) | the `onLoginRequired` / `onVerificationRequired` branches of `handleToggleOwnershipMode` |

`ownership_save` gotcha: `characterUpdates` is already a diff
(`changedCharacterUpdates`), but `perkUpdates` is built from EVERY entry of
`perkUnlockDraft`, not only the changed ones. For `perks_changed` compare the
draft with the loaded `allPerks[].is_unlocked` and count real differences;
do not use `perkUpdates.length`. Compute both counts BEFORE
`handleCancelOwnershipMode()` clears the drafts.

### Not tracked

- Character detail page interactions (lore, power, terror radius, equipment, perks): the page is read only information, nothing worth measuring beyond its page views.
- Card clicks, Survivor/Killer tab, search, breadcrumb prev/next.
- "3D model" modal: `Model3DModal` is only an enlarged portrait (the site has
  no 3D models), so it is left out.
- Disabled character / perk reason modals, drawers, category picker.

## Page 7: Auth (sign in / sign up modal, e-mail verification) [DONE]

All successful session starts go through functions in `context/AuthContext.tsx`,
so tracking there covers every caller (the modal is opened from the sidebar,
characters, streaks, the user page and onboarding), not only `AuthModal`.

| Event | Props | Where |
|-------|-------|-------|
| `signup` | `method`: `password` / `google` | `register` on success; `loginWithGoogle` when it created the account |
| `login` | `method`: `password` / `google` / `two_factor` | `login` and `loginWithGoogle` on success; `completeTwoFactorLogin` on success (`two_factor`) |
| `email_verified` | none | `verifyEmail` on success |
| `forgot_password_request` | none | `AuthModal.tsx`, forgot branch of `handleSubmit`, when `forgotPassword` succeeded (the `forgot-sent` notice) |
| `legal_preview_open` | `doc`: `terms` / `rules` | `AuthModal.tsx`, when `setLegalDoc` is set to a document (the Terms / Rules links in the register form) |

Notes:

- Google gives no explicit "new account" flag. Treat the Google result as a
  signup when `onboarding_completed_at` is empty (the same condition that
  sends a new user to `/welcome`), otherwise as a login. Known noise: an old
  user who never finished onboarding counts as a signup once.
- A password login that returns `two_factor_required` is NOT a login yet. It
  counts when `completeTwoFactorLogin` succeeds, as `method=two_factor`.
- `forgot_password_request` is only the "reset e-mail sent" step. Completing
  the reset on `/reset-password` is not tracked.
- `legal_preview_open` fires on open, not on every render of the open state.

### Not tracked

- Switching between Login / Register / Forgot tabs, modal open/close, and
  therefore no `source` of the modal.
- Password reset completion, failed logins, logout, resend verification code,
  demo accounts (dev only).

## Out of scope (user visible pages only)

welcome (almost empty), admin, minigames, achievements.
Home is skipped for now (may still be redesigned).

## Pages still to go through

perks and tier-lists (on hold, may still change), streaks, rules.
(Rules is mostly covered by `contact_click`; check what else it has.)
