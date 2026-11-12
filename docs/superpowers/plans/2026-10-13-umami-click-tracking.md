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
| `sign_out_everywhere` | none | `SignOutEverywhereSection.tsx`, after the sign out of all devices succeeded |
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

## Buy me a coffee modal (sidebar) [DONE]

| Event | Props | Where |
|-------|-------|-------|
| `coffee_modal_open` | none | `Sidebar.tsx`, `onOpenCoffeeModal` handler (the only entry point) |
| `coffee_link_click` | `provider`: `buy_me_a_coffee` / `ko_fi` | `sidebar/BuyCoffeeModal.tsx`, `onClick` of each gateway link |

| `coffee_ad_start` | none | `sidebar/RewardedAdSection.tsx`, the rewarded ad was started |
| `coffee_ad_result` | `result`: `rewarded` / `dismissed` / `failed` | `RewardedAdSection.tsx`, how the ad ended (`rewarded` ran to the end, `dismissed` was closed early, `failed` is an ad network error) |

Reading the data: open count vs click count per provider gives the conversion
and which platform people prefer. Only gateways the admin left enabled are
rendered, so a provider with no link simply has no clicks.

## Bard Insults modal (sidebar) [DONE]

| Event | Props | Where |
|-------|-------|-------|
| `bard_insults_open` | none | `Sidebar.tsx`, `onOpenInsults` handler (the only entry point, the button in `SidebarUserSection`) |

Counts clicks on the button, so the same visitor opening it twice counts twice (Umami's unique visitors
view gives the number of people). Not tracked: the Survivor / Killer switch and copying an insult
inside the modal.

## Bug report modal [DONE]

Shared modal (`sidebar/BugReportModal.tsx`), opened from the sidebar and from the
reports drawer on `/user`. It is mounted only while open, so the events live in
the modal and a `source` prop tells the two entry points apart.

| Event | Props | Where |
|-------|-------|-------|
| `bug_report_open` | `source`: `sidebar` / `profile`, `access`: `member` / `guest` / `guest_blocked` | effect on show, once per opening |
| `bug_report_start` | `access`: `member` / `guest` | first edit of any field (title, description, e-mail, screenshot added), once per opening |
| `bug_report_submit` | `access`, `screenshots`: number attached | after the server accepted the report |

Funnel: open, start, submit. `guest_blocked` counts signed out visitors who hit
the "sign in first" message when guest reports are off.

Screenshots: `screenshots` on `bug_report_submit` answers whether people attach
pictures. Attempts that are abandoned are NOT tracked (no signal worth a
separate event). Not tracked: validation errors, server errors, cancel.

## Language, theme and welcome wizard [DONE]

Added after the review of the whole list: the sidebar pickers and the onboarding that follows a signup had
no event, so the funnel (signup, `/welcome` page views, finished wizard) and the audience language were blind.

| Event | Props | Where |
|-------|-------|-------|
| `language_change` | `from`, `to` (locale codes), `via`: `sidebar` / `onboarding` | `SidebarBottomControls` language menu and `useOnboardingLanguage.handleLanguageSelect`; only a real switch (picking the current language is not reported) |
| `theme_change` | `theme`: `light`, `light-lemon`, `dark`, `system` | `SidebarBottomControls` theme menu; only a real change |
| `onboarding_complete` | `characters_owned` | `useOnboardingCompletion.handleContinue`, after `markOnboardingComplete` succeeded |

Notes:

- `characters_owned` counts non free characters marked as owned (free ones are owned by everyone), see `components/onboarding/onboardingTracking.ts`.
- Onboarding funnel: `signup` count, then `/welcome` page views, then `onboarding_complete`. The wizard's steps are not events.
- A visitor who flips through several languages in a row sends one `language_change` per switch.
- Default theme is `dark`; someone who never opens the menu sends nothing, so read `theme_change` as "who changed it", not as the split of all visitors.

## Page 8: Perks (`/perks`) [DONE]

Branch `feature/umami-perks-challenges-tracking`. All events fire from `PerksClient.tsx`
(not from `PerkSearchBox` / `PerkFilterMenu`, which the profile loadout picker and the
ID, Please picker share). Helpers and tests: `components/perks/perkTracking.ts`,
`__tests__/unit/analytics/analyticsPerks.test.ts`.

| Event | Props | Where |
|-------|-------|-------|
| `perk_open` | `perk_id`, `perk` (English name), `role`, `via`: `grid` / `search` | `handleSelectPerk`; `via=search` while a search text is active |
| `perk_search` | `role`, `query` (the typed term), `results`, and `perk_id` + `perk` only when the search narrowed to exactly one perk | `useSettledPerkSearch` |
| `perk_type_filter` | `type`, `role` | `handleTypesChange` (Filters popover, suggestions, Enter) and `#chase` / `type:chase` written in the search text |
| `perk_scope_filter` | `scope`: `owned` / `general` | `setOwnershipFilter` / `setScope`; going back to All is not an event |
| `perk_sort` | `order`: `asc` / `desc` | `setOrder`, only on a real change |
| `perk_page_size` | `limit` | `onLimitChange`, only on a real change |

Decisions:

- The typed search term IS sent, as `query`: lower case, single spaces, at most 40 characters
  (`normalizeSearchTerm`). A search is reported once the text stayed put for 3 s and has at
  least 3 characters, once per distinct text. "What do people type to find a perk" is read from
  `query`; "which perks" from `perk` (searches that ended on one perk) and `perk_open` with
  `via=search`. Searches with `results=0` show missing aliases.
- Free text can in theory hold anything, so the privacy policy line about collected data
  (`locales/*/privacy.ts`, section analytics) should mention search terms.
- Needs a backend field: `Perk.to_dict()` now returns `raw_name` (the English name), same
  pattern as maps. All perk catalog, ownership and character paths go through `to_dict`.
  Cached catalogs from before the change have no `raw_name`; the frontend falls back to `name`.
- Not tracked: role switch, Reset, `?type=` links, the pager's page changes, the owned / general
  toggle going back to All.

## Page 9: Challenges (`/streaks/...`, five challenges) [DONE]

The picker hubs (`/streaks`, `/streaks/[role]`) are NOT tracked: they sit behind the login
and there is nothing on them but the cards (the path is already a page view). Everything is
measured on the boards. Gauntlet, Chaos, History, Page Streak and ID, Please share one set of
events; the rules live in `components/streaks/challengeTracking.ts` and each run hook maps its
run to a `RunProgress` with the mappers in `challengeRunProgress.ts` (tested in
`analyticsChallengeRunProgress.test.ts`) and calls the reporters from `useGauntletRun`, `useChaosRun`,
`useHistoryRun`, `usePageStreakRun` and `useIdPleaseRun`. Tests: `__tests__/unit/analytics/analyticsChallenges.test.ts`.

Every challenge event carries `challenge` (`gauntlet`, `chaos`, `history`, `page_streak`,
`id_please`), `role` (`survivor`, `killer`; ID, Please's combined lane is `mixed`) and `variant`
(game mode or difficulty; Page Streak: the killer).

| Event | Props | When |
|-------|-------|------|
| `challenge_start` | `attempt`, `roster` (when the challenge has one) | the first match of an attempt |
| `challenge_win` | `streak` (with this win) | every won match; with `challenge_loss` it gives the win rate |
| `challenge_checkpoint` | `streak` | a win banks a new checkpoint (not the winning match of a completion) |
| `challenge_complete` | `attempts` | the run is completed (ID, Please: the badge is earned) |
| `challenge_loss` | `streak` | a lost match ended the attempt |
| `challenge_abandon` | `streak` | a confirmed reset of an attempt that had a match in it |
| `challenge_abandon_all` | `challenge` (`page_streak`), `in_progress`, `completed` | Page Streak roster page: the confirmed "abandon all killers"; counts the runs it gave up, nothing to give up is not reported |
| `challenge_tokens` | `earned` | Gauntlet Lemon (`lemon_killer`): tokens a win really added to the balance; sum it for every token collected |
| `challenge_boost` | `boost`: `reroll` / `pick` / `slot` / `shield`, `price` | Gauntlet Lemon: a boost bought with tokens |
| `challenge_mode_change` | `challenge`, `role`, `from`, `to` | the player picked another mode or difficulty on the board |
| `challenge_ui` | `challenge`, `action`: `rules`, `stats`, `past_wins`, `animations_on`, `animations_off`, `abandon_open`, `abandon_cancel` | the buttons every challenge shares (`StandardHeaderActions`, `AbandonConfirmModal`) |

Decisions and gotchas:

- Runs are created by the server as soon as the page is opened (`get_or_create_run`), so "run
  exists" says nothing. A start is the first match of an attempt (the app's own `attempt_matches`).
  Every lost match begins the next attempt, also when it falls back to a checkpoint, so count the
  players that began a challenge with `attempt = 1`.
- A first match that is lost both starts and ends its attempt, so the start is read from the run
  BEFORE the match, not from the change.
- `attempt` is the run's failed attempts plus one (the backend's `attempts_taken`). Finishing a
  run resets `attempts` to 0, so `challenge_complete.attempts` also comes from before the match.
- A Gauntlet shield cancels a loss without touching the run: the attempt number does not move,
  so it is not a `challenge_loss`.
- `streak` is the win streak; History counts killers beaten (checkpoints only in Medium, counted
  in killers like the progress bar), Page Streak counts pages cleared (no checkpoints).
- ID, Please never ends: after the badge the run goes on, so a reset after it is still an abandon.
  Its 409 answers (`stale_match`) return a run without taking the result in; only a changed
  `total_wins + total_losses` is reported.
- Gauntlet answers with `run` (the next match already prepared) and `previous_run` (the match just
  played); the second is the "after" state.
- Page Streak: `variant` is the killer's canonical key (the page derives the localized name from it), so
  every event above is already per killer. Most completed killers = `challenge_complete` by `variant`, most
  played = `challenge_start` by `variant`. The roster page (`PageStreakBoard`) has no other events.
- Gauntlet Lemon tokens: the database keeps only the current balance (`tokens`) and the last roll, no history
  of tokens earned or boosts bought, so these two events are the only record. `earned` is the balance after
  the win minus the balance before, so a roll cut short by the cap of 20 counts only what fitted and a win on
  a full balance sends nothing. Tokens thrown away when an attempt falls back to zero are not subtracted.
  The shield is a boost only when it was charged, i.e. it saved the attempt (the same rule that keeps a shielded
  loss out of `challenge_loss`); at a checkpoint it is free and not counted. Popularity = counts of
  `challenge_boost` by `boost`, tokens spent = sum of `price`.
- Wins are counted (`challenge_win`); losses only when they ended the attempt, so a Gauntlet shield
  loss is in neither and the Umami win rate is slightly optimistic there. The backend keeps every
  match exactly, so which killer or perk was played is read from the database, not from events.
- Removed the "Start a new run" button of the victory card (Gauntlet, Chaos, History; Page Streak
  and ID, Please never had it): it was a bug. Resetting stays in the header. Its `startNewRun`
  dictionary key went with it.

## Page 10: Settings (`/settings`) [DONE]

One event for the six switches of the page (`SettingsClient.tsx`):

| Event | Props | When |
|-------|-------|------|
| `setting_change` | `setting`: `campfire`, `gifs`, `nsfw`, `sounds`, `music`, `animations`; `value`: `on`, `off`, `eco` (campfire only) | the visitor changes a setting |

Notes:

- Only changes are seen, not the state: someone who never touches a switch keeps the default
  (`defaultPreferences`: animations and music follow reduced motion, NSFW is off, the rest on).
- The same preferences are changed elsewhere and reported there: the animations switch in the
  challenge header is `challenge_ui` (`animations_on` / `animations_off`), the Smash or Pass choice is
  `smash_effects_choice`. Those are not `setting_change`.
- A click on the campfire mode that is already selected is not reported.

## Page 11: Tier lists (`/tier-lists`, `/tier-lists/[slug]`, `/tier-lists/custom/[id]`, `/tier-lists/new`) [DONE]

Branch `feature/umami-tier-lists-tracking`. Helpers and tests: `components/tier-lists/tierListTracking.ts`,
`__tests__/unit/analytics/analyticsTierLists.test.ts`.

Which official list is opened needs no event: `/tier-lists/<slug>` is already a page view. The two
ranking events carry `list` (the slug of an official list, or `custom` for one the visitor made, never a
title) and `kind`.

| Event | Props | Where |
|-------|-------|-------|
| `tier_list_rank` | `list`, `kind` | `TierListEditor` `handleBoardChange`: the first move on a list in a visit |
| `tier_list_complete` | `list`, `kind`, `items` | the move that takes the last item out of the unranked pool; once per list per visit |
| `tier_list_reset` | `list`, `kind` | confirmed reset in `TierListEditor`, when the save worked |
| `tier_list_import` | `into`: `hub` / `official` / `custom`, `via`: `link` / `manual` | `TierListHub.handleImport` (a `#import=` share link is `via=link`) and the import in `TierListEditor`; only imports that were saved |
| `tier_list_export` | `method`: `link` / `json_copy` / `file` | `TierListExportModal`, through the shared `ExportModal` `onExport` (same as Smash) |
| `tier_list_report_open` | none | `CustomTierListView`, the report button |
| `tier_list_create` | `items`, `own_items`, `tiers`, `ladder`, `cover_image`, `nsfw` | `TierListCreator.submit`, only the branch that saves a NEW list in this browser |
| `tier_list_preview` | none | the creator's Preview button |

Notes:

- `tier_list_complete` fires only for a move that finishes the list. A list opened already fully
  ranked (an official one with the LemonDBD default ranking) sends nothing, and a move on it is only
  a `tier_list_rank`. Both events are remembered per list for the visit, so undo and redo does not count twice.
- `tier_list_rank` is "started ranking", not every drag, so the count does not depend on how many items a list has.
  An official list that starts from the default ranking also counts on its first move.
- `own_items` are the items added by link or upload. Catalog picks keep a `survivor:7` style id and made up ids
  never contain a colon, so the two are told apart by that. Answers "how often do people add their own characters".
- `ladder` is the preset (`classic`, `short`, `numbers`, `feelings`) or `custom` once the tiers were edited by hand.
- `cover_image` is true only for a background image that passed the image check.
- Not tracked: edits of an existing list, deleting a list, the admin's publish, update and delete of official
  lists, card clicks, scale and names toggles, item preview, single moves, clearing a row, the NSFW reveal.
- No free text is sent, so the privacy policy needs no change.

## Out of scope (user visible pages only)

welcome (almost empty), admin, minigames, achievements.
Home is skipped for now (may still be redesigned).

## Pages still to go through

rules.
(Rules is mostly covered by `contact_click`; check what else it has.)
