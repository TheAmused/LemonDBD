# Design Specification: Playwright Comprehensive Site Tour Screenshots & Interactive Visual Catalog

**Date:** 2026-10-25  
**Status:** Approved  
**Author:** Antigravity Pair Programming  

---

## 1. Overview & Objectives

LemonDBD is a Dead by Daylight companion application featuring rich interactivity across multiple game utilities: perk catalogue, loadout randomizer, streak challenges, minigames & DBD Idle, map explorer, character catalogue, tier lists, Smash or Pass, achievements, user settings, user profile, and admin management.

This project delivers an automated, high-fidelity Playwright screenshot automation suite that:
1. Systematically navigates every page and sub-route across the application.
2. Identifies and opens every interactive popup modal, drawer, and dialog that presents itself on each page.
3. Captures pixel-perfect screenshots across an **Expanded Responsive Matrix** covering PC Desktop, Laptop, Tablet, and Mobile devices.
4. Organizes all assets cleanly into a single self-contained directory: `additions/screenshots/`.
5. Generates a structured `manifest.json` catalog and an interactive, zero-dependency visual gallery explorer (`index.html`) supporting device filters, category views, instant search, and side-by-side device comparisons.
6. Remains permanently in the codebase (`frontend/scripts/site-tour.mjs`) with seamless one-command update mechanics (`npm run screenshots:update` or `npm run screenshots`) and selective update flags.

---

## 2. Target Device Matrix

The suite captures full-screen page states and modal dialogs across 4 distinct viewports:

| Device Profile | Screen Resolution | Touch Enabled | Mobile UA | Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Desktop FHD** | 1920 × 1080 | No | No | High-res desktop monitors, wide tables & grids |
| **Laptop** | 1280 × 800 | No | No | Standard laptop screens, responsive layout checks |
| **Tablet** | 768 × 1024 | Yes | Yes | Medium screen portrait, collapsible sidebar / drawer |
| **Mobile** | 390 × 844 | Yes | Yes (iPhone) | Standard modern smartphone, mobile navigation & overlays |

---

## 3. Coverage Catalog: Pages & Modals

### 3.1 Route Catalog

All routes are tested under the default locale (`/en`).

| Category | Route | Description | Modals / Dialogs Captured |
| :--- | :--- | :--- | :--- |
| **01-landing** | `/en` | Homepage & feature hub | — |
| **02-perks** | `/en/perks` | Searchable perk catalogue | • Perk Detail Modal (`PerkModal`)<br>• Mobile Filters Sheet / Drawer |
| **03-randomizer** | `/en/randomizer` | Loadout randomizer & slot machine | • Chaos Wheel / Reroll Modal |
| **04-streaks** | `/en/streaks`<br>`/en/streaks/killer/chaos-streak`<br>`/en/streaks/killer/history-streak`<br>`/en/streaks/killer/gauntlet-streak` | Streak Challenge Hub & game modes | • Streak Rules Modal (`RulesModalShell`)<br>• Abandon Confirmation Modal<br>• Scoreboard OCR Modal (`ScoreboardCheckModal`) |
| **05-minigames** | `/en/minigames`<br>`/en/minigames/idle`<br>`/en/minigames/creator`<br>`/en/minigames/play` | Minigames Hub, DBD Idle, Challenge Creator & Player | • Minigames How to Play / Rules Modal<br>• Victory / Finish Modal<br>• Challenge Share / Export Modal |
| **06-maps** | `/en/maps` | Map & Realm Explorer with voice search | • Voice Engine Info Modal (`VoiceEngineInfoModal`) |
| **07-characters** | `/en/characters`<br>`/en/characters/the-trapper` | Survivor & Killer rosters + Character Detail view | • Killer Power Modal<br>• Lore / Biography Modal<br>• Equipment Detail Modal |
| **08-tier-lists** | `/en/tier-lists`<br>`/en/tier-lists/survivors`<br>`/en/tier-lists/new` | Tier Lists Hub, Pre-made board & Creator workspace | • Tier Item Edit Modal (`TierItemEditModal`)<br>• Tier Item Preview Modal<br>• Tier List Export Modal<br>• Tier List Import Modal |
| **09-smash-or-pass** | `/en/smash-or-pass`<br>`/en/smash-or-pass/create` | Smash or Pass card voting & Custom Roster creator | • Preferences Prompt Modal (`PreferencesPromptModal`)<br>• How to Play Modal<br>• Roster Select Modal<br>• Leaderboard Modal |
| **10-achievements** | `/en/achievements` | Account achievements & trophies | — |
| **11-about-legal** | `/en/about`<br>`/en/rules`<br>`/en/privacy-policy`<br>`/en/terms-of-service` | About page, community rules, privacy policy & terms | — |
| **12-settings** | `/en/settings` | Appearance, audio, audio speed, theme settings | — |
| **13-universal-modals** | Sidebar / Shell controls | Persistent shell controls | • Auth Modal (Sign In tab)<br>• Auth Modal (Sign Up tab)<br>• Buy Coffee Modal (`BuyCoffeeModal`)<br>• Bug Report Modal (`BugReportModal`)<br>• What's New Drawer (`WhatsNewLauncher`) |
| **14-authenticated** | `/en/user`<br>`/en/admin` | User Profile & Admin Control Panel | • 2FA Setup Modal (`TwoFactorSetupModal`)<br>• Admin User Form Modal (`AdminUserFormModal`) |

---

## 4. Directory & Asset Structure

All assets reside in `additions/screenshots/`:

```text
additions/screenshots/
├── index.html                      # Interactive visual explorer dashboard
├── manifest.json                   # Structured JSON metadata catalog
├── pages/                          # Full-page screenshots by feature category
│   ├── 01-landing/
│   │   ├── desktop-1920x1080.png
│   │   ├── laptop-1280x800.png
│   │   ├── tablet-768x1024.png
│   │   └── mobile-390x844.png
│   ├── 02-perks/
│   ├── 03-randomizer/
│   ├── 04-streaks-hub/
│   ├── 04-streaks-chaos/
│   ├── 04-streaks-gauntlet/
│   ├── 05-minigames-hub/
│   ├── 05-minigames-idle/
│   ├── 05-minigames-creator/
│   ├── 06-maps/
│   ├── 07-characters-roster/
│   ├── 07-characters-detail/
│   ├── 08-tier-lists-hub/
│   ├── 08-tier-lists-creator/
│   ├── 09-smash-hub/
│   ├── 09-smash-create/
│   ├── 10-achievements/
│   ├── 11-about/
│   ├── 11-rules/
│   ├── 11-privacy/
│   ├── 12-settings/
│   ├── 14-user-profile/
│   └── 14-admin/
└── modals/                         # Popup modal screenshots across viewports
    ├── sidebar-auth-login/
    ├── sidebar-auth-register/
    ├── sidebar-buy-coffee/
    ├── sidebar-bug-report/
    ├── sidebar-changelog/
    ├── perks-perk-detail/
    ├── perks-mobile-filters/
    ├── randomizer-wheel/
    ├── streaks-rules/
    ├── streaks-abandon/
    ├── streaks-scoreboard/
    ├── minigames-rules/
    ├── maps-voice-info/
    ├── characters-killer-power/
    ├── characters-lore/
    ├── tier-lists-edit-item/
    ├── tier-lists-export/
    ├── smash-preferences-prompt/
    ├── smash-roster-select/
    ├── smash-leaderboard/
    ├── user-2fa-setup/
    └── admin-user-edit/
```

---

## 5. Technical Implementation Details

### 5.1 Playwright Automation Engine (`frontend/scripts/site-tour.mjs`)

* **Execution Runtime**: Node.js ES Module utilizing the existing project devDependency `playwright`.
* **Deterministic Visual Stability**:
  * Emulates `prefers-reduced-motion: reduce` to eliminate transition blur.
  * Disables cursor blinking where inputs are active.
  * Waits for DOM readiness and critical selectors before snapshot capture (`await page.waitForLoadState('networkidle')` with fallback to `domcontentloaded` + selector wait).
  * Injects CSS to hide dynamic timestamps or volatile counters where appropriate.
* **Authentication Handling**:
  * Leverages local development endpoint `/api/v1/auth/demo-accounts`.
  * Logs in via UI or auth session storage using demo admin `lemon:lemon` to access protected pages (`/en/user`, `/en/admin`).
* **Modal Triggering Strategy**:
  * Each modal entry in the catalog specifies:
    * `route`: Starting page URL.
    * `setup`: Optional setup logic (e.g. clearing `localStorage['smash-preferences-prompt-dismissed']` to trigger Smash prompt, or clicking a perk tile to trigger `PerkModal`).
    * `modalSelector`: Locator for the open modal dialog (`[role="dialog"]`, `.lemon-modal`, or `data-testid`).
    * `fullPage`: Whether to capture full page viewport with darkened backdrop or modal bounding box.

### 5.2 Update & Maintenance Workflow

The script provides CLI flags for continuous use:
* `npm --prefix frontend run screenshots`: Full capture pass.
* `npm --prefix frontend run screenshots:update`: Overwrites all screenshots and refreshes manifest.
* `--page=<name>`: Restrict capture to a specific page or route (e.g. `--page=perks`).
* `--category=<category>`: Restrict capture to a specific category (e.g. `--category=minigames`).
* `--modals-only`: Re-captures only modals.
* `--pages-only`: Re-captures only base pages.
* `--viewports=desktop,mobile`: Run on a subset of screen sizes for rapid feedback.

### 5.3 Interactive Visual Explorer (`index.html`)

* **Architecture**: Standalone HTML5 document with embedded CSS and vanilla JavaScript.
* **Features**:
  * Live filter by Device (PC Desktop 1920, Laptop 1280, Tablet 768, Mobile 390).
  * Category navigation tabs (All, Perks, Streaks, Minigames, Maps, Characters, Tier Lists, Smash, Account, Modals).
  * View Modes:
    * **Grid View**: Card grid displaying thumbnails with title, category, viewport pill, and dimensions.
    * **Comparison View**: Side-by-side comparison of PC Desktop vs Mobile or Base Page vs Modal.
  * **Instant Search**: Filters items instantly by title or route.
  * **High-Res Lightbox**: Full-resolution image viewer with zoom and keyboard navigation (Left/Right/Esc).

---

## 6. Verification Plan

1. **Compilation & Syntax**: Script passes `oxlint` and node module syntax evaluation.
2. **Execution Test**: Execute `node scripts/site-tour.mjs` against `https://localhost`.
3. **Asset Verification**:
   * Confirm all directories in `additions/screenshots/pages` and `additions/screenshots/modals` are populated.
   * Verify all PNG files have non-zero file sizes and correct dimensions.
   * Verify `manifest.json` is valid JSON and all file paths match on disk.
   * Open `additions/screenshots/index.html` in browser and verify rendering, filtering, and image loads.
4. **Update Verification**: Run `node scripts/site-tour.mjs --page=perks` to confirm selective update operates without corrupting the broader manifest.
