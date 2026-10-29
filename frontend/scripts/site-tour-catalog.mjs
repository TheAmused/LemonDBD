// frontend/scripts/site-tour-catalog.mjs
// Declarative catalog of viewports, application routes, interactive modal targets,
// and categories used by the Playwright automated site tour suite.

/**
 * 4 target responsive device viewports covering FHD desktop down to mobile smartphones.
 */
export const VIEWPORTS = [
  { id: 'desktop', name: 'PC Desktop FHD', width: 1920, height: 1080, touch: false, hasTouch: false, isMobile: false },
  { id: 'laptop', name: 'Laptop', width: 1280, height: 800, touch: false, hasTouch: false, isMobile: false },
  { id: 'tablet', name: 'Tablet', width: 768, height: 1024, touch: true, hasTouch: true, isMobile: true },
  {
    id: 'mobile',
    name: 'Mobile',
    width: 390,
    height: 844,
    touch: true,
    hasTouch: true,
    isMobile: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
];

/**
 * Functional category groupings for navigation, filtering, and reporting.
 */
export const CATEGORIES = [
  { id: 'landing', title: 'Landing & Overview', icon: 'home', order: 1 },
  { id: 'perks', title: 'Perk Catalogue & Vault', icon: 'zap', order: 2 },
  { id: 'randomizer', title: 'Loadout Randomizer', icon: 'shuffle', order: 3 },
  { id: 'streaks', title: 'Streak Challenges', icon: 'flame', order: 4 },
  { id: 'minigames', title: 'Minigames & Idle', icon: 'gamepad-2', order: 5 },
  { id: 'maps', title: 'Maps & Voice Search', icon: 'map', order: 6 },
  { id: 'characters', title: 'Characters & Lore', icon: 'users', order: 7 },
  { id: 'tier-lists', title: 'Tier Lists & Creator', icon: 'bar-chart', order: 8 },
  { id: 'smash-or-pass', title: 'Smash or Pass', icon: 'heart', order: 9 },
  { id: 'achievements', title: 'Achievements & Trophies', icon: 'trophy', order: 10 },
  { id: 'about-legal', title: 'About & Policies', icon: 'shield', order: 11 },
  { id: 'settings', title: 'Settings & Appearance', icon: 'settings', order: 12 },
  { id: 'account', title: 'User & Administration', icon: 'user', order: 13 },
  { id: 'modals', title: 'Interactive Modals & Drawers', icon: 'layers', order: 14 },
];

export const CATEGORY_METADATA = CATEGORIES;

/**
 * Complete list of full-page routes to capture across all viewports.
 */
export const PAGE_ROUTES = [
  // Landing
  { id: 'landing', title: 'Landing Page', route: '/en', category: 'landing', subcategory: 'overview', folder: '01-landing', waitForSelector: 'main' },

  // Perks
  { id: 'perks', title: 'Perk Catalogue Vault', route: '/en/perks', category: 'perks', subcategory: 'catalogue', folder: '02-perks', waitForSelector: 'main, [role="main"], section[aria-label]' },

  // Randomizer - 5 interactive modes
  { id: 'randomizer-instant', title: 'Loadout Randomizer - Instant Roll', route: '/en/randomizer', category: 'randomizer', subcategory: 'instant', folder: '03-randomizer-instant', waitForSelector: 'main, canvas, [data-testid="generator-stage"]' },
  { id: 'randomizer-wheel-stage', title: 'Loadout Randomizer - Chaos Wheel', route: '/en/randomizer', category: 'randomizer', subcategory: 'wheel', folder: '03-randomizer-wheel', setup: 'setRandomizerModeWheel', waitForSelector: 'main, canvas, [data-testid="generator-stage"]' },
  { id: 'randomizer-slot', title: 'Loadout Randomizer - Slot Machine', route: '/en/randomizer', category: 'randomizer', subcategory: 'slot', folder: '03-randomizer-slot', setup: 'setRandomizerModeSlot', waitForSelector: 'main, canvas, [data-testid="generator-stage"]' },
  { id: 'randomizer-tarot', title: 'Loadout Randomizer - Tarot Cards', route: '/en/randomizer', category: 'randomizer', subcategory: 'tarot', folder: '03-randomizer-tarot', setup: 'setRandomizerModeTarot', waitForSelector: 'main, canvas, [data-testid="generator-stage"]' },
  { id: 'randomizer-crate', title: 'Loadout Randomizer - Mystery Crate', route: '/en/randomizer', category: 'randomizer', subcategory: 'crate', folder: '03-randomizer-crate', setup: 'setRandomizerModeCrate', waitForSelector: 'main, canvas, [data-testid="generator-stage"]' },

  // Streaks - Signed In
  { id: 'streaks-hub', title: 'Killer Challenges Hub (Signed In)', route: '/en/streaks/killer', category: 'streaks', subcategory: 'hub', folder: '04-streaks-hub', auth: 'user', requiresAuth: 'user', waitForSelector: 'main' },
  { id: 'streaks-survivor', title: 'Survivor Challenges Hub (Signed In)', route: '/en/streaks/survivor', category: 'streaks', subcategory: 'hub', folder: '04-streaks-survivor', auth: 'user', requiresAuth: 'user', waitForSelector: 'main' },
  { id: 'streaks-chaos', title: 'Chaos Streak Active Board (Signed In)', route: '/en/streaks/killer/chaos-streak', category: 'streaks', subcategory: 'chaos', folder: '04-streaks-chaos', auth: 'user', requiresAuth: 'user', waitForSelector: 'main' },
  { id: 'streaks-gauntlet', title: 'Win Streak & Gauntlet (Signed In)', route: '/en/streaks/killer/gauntlet-streak', category: 'streaks', subcategory: 'gauntlet', folder: '04-streaks-gauntlet', auth: 'user', requiresAuth: 'user', waitForSelector: 'main' },
  { id: 'streaks-history-streak', title: 'Streak Match History (Signed In)', route: '/en/streaks/killer/history-streak', category: 'streaks', subcategory: 'history', folder: '04-streaks-history-streak', auth: 'user', requiresAuth: 'user', waitForSelector: 'main' },
  { id: 'streaks-id-please', title: 'ID, Please Board (Signed In)', route: '/en/streaks/killer/id-please', category: 'streaks', subcategory: 'id-please', folder: '04-streaks-id-please', auth: 'user', requiresAuth: 'user', waitForSelector: 'main' },
  { id: 'streaks-page', title: 'Page Streak Board (Signed In)', route: '/en/streaks/killer/page-streak', category: 'streaks', subcategory: 'page-streak', folder: '04-streaks-page', auth: 'user', requiresAuth: 'user', waitForSelector: 'main' },

  // Streaks - Guest
  { id: 'streaks-hub-guest', title: 'Streak Challenges Hub - Sign-In Required (Guest)', route: '/en/streaks', category: 'streaks', subcategory: 'hub', folder: '04-streaks-hub-guest', auth: 'guest', waitForSelector: 'main, h1, [role="main"]' },
  { id: 'streaks-chaos-guest', title: 'Chaos Streak - Sign-In Required (Guest)', route: '/en/streaks/killer/chaos-streak', category: 'streaks', subcategory: 'chaos', folder: '04-streaks-chaos-guest', auth: 'guest', waitForSelector: 'main, h1, [role="main"]' },

  // Minigames
  { id: 'minigames-hub', title: 'Minigames Hub', route: '/en/minigames', category: 'minigames', subcategory: 'hub', folder: '05-minigames-hub', waitForSelector: 'main' },
  { id: 'minigames-idle', title: 'DBD Idle Clicker', route: '/en/minigames/idle', category: 'minigames', subcategory: 'idle', folder: '05-minigames-idle', waitForSelector: 'main' },
  { id: 'minigames-creator', title: 'Challenge Creator', route: '/en/minigames/creator', category: 'minigames', subcategory: 'creator', folder: '05-minigames-creator', waitForSelector: 'main' },
  { id: 'minigames-play', title: 'Challenge Player', route: '/en/minigames/play', category: 'minigames', subcategory: 'player', folder: '05-minigames-play', waitForSelector: 'main' },

  // Maps
  { id: 'maps', title: 'Map Explorer & Realm Radar', route: '/en/maps', category: 'maps', subcategory: 'explorer', folder: '06-maps', waitForSelector: 'main' },

  // Characters
  { id: 'characters-roster', title: 'Character Roster (Survivors & Killers)', route: '/en/characters', category: 'characters', subcategory: 'roster', folder: '07-characters-roster', waitForSelector: 'main' },
  { id: 'characters-detail', title: 'Character Detail - The Trapper', route: '/en/characters/the-trapper', category: 'characters', subcategory: 'detail', folder: '07-characters-detail', waitForSelector: 'main' },

  // Tier Lists
  { id: 'tier-lists-hub', title: 'Tier Lists Community Hub', route: '/en/tier-lists', category: 'tier-lists', subcategory: 'hub', folder: '08-tier-lists-hub', waitForSelector: 'main' },
  { id: 'tier-lists-creator', title: 'Tier List Creator (Signed In)', route: '/en/tier-lists/new', category: 'tier-lists', subcategory: 'creator', folder: '08-tier-lists-creator', auth: 'user', requiresAuth: 'user', waitForSelector: 'main' },
  { id: 'tier-lists-creator-guest', title: 'Tier List Creator (Guest)', route: '/en/tier-lists/new', category: 'tier-lists', subcategory: 'creator', folder: '08-tier-lists-creator-guest', auth: 'guest', waitForSelector: 'main' },
  { id: 'tier-lists-survivors', title: 'Survivor Tier List', route: '/en/tier-lists/survivors', category: 'tier-lists', subcategory: 'presets', folder: '08-tier-lists-survivors', waitForSelector: 'main' },

  // Smash or Pass
  { id: 'smash-hub', title: 'Smash or Pass Hub', route: '/en/smash-or-pass', category: 'smash-or-pass', subcategory: 'arena', folder: '09-smash-hub', waitForSelector: 'main' },
  { id: 'smash-create', title: 'Smash or Pass Roster Creator', route: '/en/smash-or-pass/create', category: 'smash-or-pass', subcategory: 'creator', folder: '09-smash-create', auth: 'user', requiresAuth: 'user', waitForSelector: 'main' },

  // Achievements
  { id: 'achievements', title: 'Achievements & Trophies', route: '/en/achievements', category: 'achievements', subcategory: 'overview', folder: '10-achievements', waitForSelector: 'main' },

  // About & Legal
  { id: 'about', title: 'About LemonDBD', route: '/en/about', category: 'about-legal', subcategory: 'about', folder: '11-about', waitForSelector: 'main' },
  { id: 'rules', title: 'Community Rules', route: '/en/rules', category: 'about-legal', subcategory: 'rules', folder: '11-rules', waitForSelector: 'main' },
  { id: 'privacy-policy', title: 'Privacy Policy', route: '/en/privacy-policy', category: 'about-legal', subcategory: 'legal', folder: '11-privacy', waitForSelector: 'main' },
  { id: 'terms-of-service', title: 'Terms of Service', route: '/en/terms-of-service', category: 'about-legal', subcategory: 'legal', folder: '11-terms', waitForSelector: 'main' },

  // Settings
  { id: 'settings', title: 'Settings & Appearance', route: '/en/settings', category: 'settings', subcategory: 'appearance', folder: '12-settings', waitForSelector: 'main' },

  // Account
  { id: 'user-profile', title: 'User Profile & Sanctum (Signed In)', route: '/en/user', category: 'account', subcategory: 'profile', folder: '14-user-profile', auth: 'user', requiresAuth: 'user', waitForSelector: 'main' },
  { id: 'user-profile-guest', title: 'User Profile - Sign-in Required (Guest)', route: '/en/user', category: 'account', subcategory: 'profile', folder: '14-user-profile-guest', auth: 'guest', waitForSelector: 'main, h1, [role="main"]' },
  { id: 'admin', title: 'Admin Control Panel (Admin)', route: '/en/admin', category: 'account', subcategory: 'admin-portal', folder: '14-admin', auth: 'admin', requiresAuth: 'admin', waitForSelector: 'main' },
  { id: 'admin-guest', title: 'Admin Control Panel - Forbidden (Guest)', route: '/en/admin', category: 'account', subcategory: 'admin-portal', folder: '14-admin-guest', auth: 'guest', waitForSelector: 'main, h1, [role="main"]' },
];

/**
 * Interactive popup modals, drawers, and overlay targets.
 */
export const MODAL_TARGETS = [
  // Account Modals
  {
    id: 'auth-login', title: 'Sign In Dialog', category: 'account', subcategory: 'auth', auth: 'guest', route: '/en', folder: 'sidebar-auth-login',
    triggerSelector: 'button:has-text("Sign In"), button:has-text("Zaloguj"), [data-testid="sidebar-login-button"], button[aria-label*="Sign in" i]',
    modalSelector: 'dialog[open], [role="dialog"], [data-testid="auth-modal"]',
  },
  {
    id: 'auth-register', title: 'Sign Up / Register Dialog', category: 'account', subcategory: 'auth', auth: 'guest', route: '/en', folder: 'sidebar-auth-register',
    triggerSelector: 'button:has-text("Sign Up"), button:has-text("Rejestracja"), [data-testid="auth-register-tab"]',
    modalSelector: 'dialog[open], [role="dialog"], [data-testid="auth-modal"]',
  },
  {
    id: 'user-2fa-setup', title: 'Two-Factor Authentication Setup Modal', category: 'account', subcategory: 'security', auth: 'user', route: '/en/user', folder: 'user-2fa-setup', requiresAuth: 'user',
    triggerSelector: 'button[role="switch"], [aria-label*="two-factor" i], [aria-label*="uwierzytelnianie" i]',
    modalSelector: 'dialog[open], [role="dialog"]',
  },
  {
    id: 'admin-user-edit', title: 'Admin User Edit Modal', category: 'account', subcategory: 'admin-tools', auth: 'admin', route: '/en/admin?tab=users', folder: 'admin-user-edit', requiresAuth: 'admin',
    triggerSelector: 'button:has-text("Create User"), button:has-text("Utwórz użytkownika"), button[aria-label*="Actions" i], button[aria-label*="Akcje" i]',
    modalSelector: 'dialog[open], [role="dialog"]',
  },
  {
    id: 'streaks-scoreboard', title: 'Scoreboard OCR Scan Modal', category: 'account', subcategory: 'admin-tools', auth: 'admin', route: '/en/admin?tab=tools', folder: 'streaks-scoreboard', requiresAuth: 'admin',
    triggerSelector: 'li:has-text("OCR") button, li:has-text("Scoreboard") button, button:has-text("OCR")',
    modalSelector: 'dialog[open], [role="dialog"]',
  },

  // About & Legal Modals / Drawers
  {
    id: 'bug-report', title: 'Report Bug Dialog', category: 'about-legal', subcategory: 'modals', auth: 'guest', route: '/en', folder: 'sidebar-bug-report',
    triggerSelector: 'button[aria-label*="report" i], button:has-text("Report Bug"), button:has-text("Zgłoś błąd")',
    modalSelector: 'dialog[open], [role="dialog"]',
  },
  {
    id: 'buy-coffee', title: 'Buy Me a Coffee Dialog', category: 'about-legal', subcategory: 'modals', auth: 'guest', route: '/en', folder: 'sidebar-buy-coffee',
    triggerSelector: 'button[aria-label*="coffee" i], button:has-text("Buy Coffee"), button:has-text("Postaw kawę")',
    modalSelector: 'dialog[open], [role="dialog"]',
  },
  {
    id: 'whats-new', title: "What's New Drawer & Changelog", category: 'about-legal', subcategory: 'drawers', auth: 'guest', route: '/en', folder: 'sidebar-changelog',
    triggerSelector: 'button[aria-label*="What\'s new" i], button[aria-label*="Co nowego" i]',
    modalSelector: 'dialog[open], [role="dialog"]',
  },

  // Perks Modals
  {
    id: 'perk-detail', title: 'Perk Detail Modal', category: 'perks', subcategory: 'modals', auth: 'guest', route: '/en/perks', folder: 'perks-perk-detail',
    triggerSelector: 'section[aria-label] .grid button, .grid button:has(img), [data-testid="perk-card"]',
    modalSelector: 'dialog[open], [role="dialog"]',
  },
  {
    id: 'perks-mobile-filters', title: 'Perks Mobile Filter Drawer', category: 'perks', subcategory: 'modals', auth: 'guest', route: '/en/perks', folder: 'perks-mobile-filters',
    triggerSelector: 'button[aria-label*="filter" i], button:has-text("Filters")',
    modalSelector: 'dialog[open], [role="dialog"], [data-popover-side], [role="group"]',
    viewports: ['mobile'],
  },

  // Randomizer Modals
  {
    id: 'randomizer-wheel', title: 'Chaos Wheel Modal', category: 'randomizer', subcategory: 'modals', auth: 'guest', route: '/en/randomizer', folder: 'randomizer-wheel',
    triggerSelector: 'button[aria-label*="mutator" i], button[aria-label*="chaos" i], button:has-text("🔮"), button[aria-label*="wheel" i]',
    modalSelector: 'dialog[open], [role="dialog"]',
  },

  // Streaks Modals & Drawers
  {
    id: 'streaks-rules', title: 'Streak Rules & Guidance Modal', category: 'streaks', subcategory: 'modals', auth: 'user', route: '/en/streaks/killer/chaos-streak', folder: 'streaks-rules', requiresAuth: 'user',
    triggerSelector: 'button[aria-label*="rules" i], button:has-text("Rules"), button:has-text("Zasady"), button[aria-label*="zasady" i]',
    modalSelector: 'dialog[open], [role="dialog"]',
  },
  {
    id: 'streaks-abandon', title: 'Streak Abandon Confirmation Dialog', category: 'streaks', subcategory: 'modals', auth: 'user', route: '/en/streaks/killer/chaos-streak', folder: 'streaks-abandon', requiresAuth: 'user',
    triggerSelector: 'button[aria-label*="abandon" i], button:has-text("Abandon"), button:has-text("Poddaj"), button[aria-label*="poddaj" i]',
    modalSelector: 'dialog[open], [role="dialog"]',
  },
  {
    id: 'streaks-stats-drawer', title: 'Streak Stats & Match History Drawer', category: 'streaks', subcategory: 'drawers', auth: 'user', requiresAuth: 'user', route: '/en/streaks/killer/chaos-streak', folder: 'streaks-stats-drawer',
    triggerSelector: 'button:has-text("History"), button:has-text("Historia"), button[aria-label*="history" i], button[aria-label*="historia" i]',
    modalSelector: '[data-variant="drawer-right"], dialog[open], [role="dialog"]',
  },

  // Smash or Pass Modals
  {
    id: 'smash-how-to-play', title: 'Smash or Pass How to Play Modal', category: 'smash-or-pass', subcategory: 'modals', auth: 'guest', route: '/en/smash-or-pass', folder: 'smash-how-to-play',
    triggerSelector: 'button[aria-label*="how to play" i], button[aria-label*="jak grać" i], button:has-text("How to Play"), button:has-text("Jak grać"), [role="menuitem"]:has-text("How to Play"), [role="menuitem"]:has-text("Jak grać")',
    modalSelector: 'dialog[open], [role="dialog"]',
  },
  {
    id: 'smash-preferences-prompt', title: 'Smash or Pass Preferences Prompt', category: 'smash-or-pass', subcategory: 'modals', auth: 'guest', route: '/en/smash-or-pass', folder: 'smash-preferences-prompt',
    setup: 'clearPreferencesDismissed',
    modalSelector: 'dialog[open], [role="dialog"]',
  },
  {
    id: 'smash-roster-select', title: 'Smash or Pass Roster Select Modal', category: 'smash-or-pass', subcategory: 'modals', auth: 'guest', route: '/en/smash-or-pass', folder: 'smash-roster-select',
    triggerSelector: 'header[data-hub-header] button:has(svg.lucide-chevron-down), [data-hub-header] button:has(img)',
    modalSelector: 'dialog[open], [role="dialog"]',
  },
  {
    id: 'smash-leaderboard', title: 'Smash or Pass Leaderboard Modal', category: 'smash-or-pass', subcategory: 'modals', auth: 'guest', route: '/en/smash-or-pass', folder: 'smash-leaderboard',
    triggerSelector: 'button:has-text("Leaderboard"), button:has-text("Ranking"), button[aria-label*="leaderboard" i]',
    modalSelector: 'dialog[open], [role="dialog"]',
  },

  // Maps Modals
  {
    id: 'maps-voice-info', title: 'Voice Engine Info Modal', category: 'maps', subcategory: 'modals', auth: 'guest', route: '/en/maps', folder: 'maps-voice-info', setup: 'enableMapsVoiceMode',
    triggerSelector: 'button[aria-label*="voice" i], button[aria-label*="info" i]',
    modalSelector: 'dialog[open], [role="dialog"]',
  },

  // Characters Modals
  {
    id: 'characters-killer-power', title: 'Killer Power Detail Modal', category: 'characters', subcategory: 'modals', auth: 'guest', route: '/en/characters/the-trapper', folder: 'characters-killer-power',
    triggerSelector: 'article header button:has(img), button[aria-label*="Trap" i], button[aria-label*="Pułapka" i]',
    modalSelector: 'dialog[open], [role="dialog"]',
  },
  {
    id: 'characters-lore', title: 'Character Lore & Bio Modal', category: 'characters', subcategory: 'modals', auth: 'guest', route: '/en/characters/the-trapper', folder: 'characters-lore',
    triggerSelector: 'button:has-text("Lore"), button:has-text("Biography"), button:has-text("Historia")',
    modalSelector: 'dialog[open], [role="dialog"]',
  },

  // Tier Lists Modals
  {
    id: 'tier-lists-edit-item', title: 'Tier Item Edit Modal', category: 'tier-lists', subcategory: 'modals', auth: 'guest', route: '/en/tier-lists/survivors', folder: 'tier-lists-edit-item', action: 'dblclick',
    triggerSelector: 'div[aria-label].cursor-grab, [data-item-key], .cursor-grab',
    modalSelector: 'dialog[open], [role="dialog"]',
  },
  {
    id: 'tier-lists-export', title: 'Tier List Export Modal', category: 'tier-lists', subcategory: 'modals', auth: 'guest', route: '/en/tier-lists/survivors', folder: 'tier-lists-export',
    triggerSelector: 'button[aria-label*="export" i], [role="menuitem"]:has-text("Export"), [role="menuitem"]:has-text("Eksport"), button:has-text("Export")',
    modalSelector: 'dialog[open], [role="dialog"]',
  },
];

/**
 * Utility helper functions.
 */
export function getViewport(id) {
  return VIEWPORTS.find((v) => v.id === id);
}

export function getPageRoute(id) {
  return PAGE_ROUTES.find((r) => r.id === id);
}

export function getModalTarget(id) {
  if (id === 'minigames-rules') {
    return MODAL_TARGETS.find((m) => m.id === 'smash-how-to-play');
  }
  return MODAL_TARGETS.find((m) => m.id === id);
}
