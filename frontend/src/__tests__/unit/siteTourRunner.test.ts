// frontend/src/__tests__/unit/siteTourRunner.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import {
  parseArgs,
  formatFileSize,
  solveAltchaChallenge,
  matchesFilter,
  getScreenshotFileName,
} from '../../../scripts/site-tour.mjs';

interface CliOptions {
  update: boolean;
  page: string | null;
  category: string | null;
  auth: string | null;
  modalsOnly: boolean;
  pagesOnly: boolean;
  viewports: string[] | null;
  baseUrl: string;
  headless: boolean;
  help: boolean;
}

interface AltchaSolution {
  number: number;
  challenge: string;
  salt: string;
}

const parse = (argv: string[] = []): CliOptions => parseArgs(argv) as unknown as CliOptions;
const solve = (req: unknown, url: string): Promise<AltchaSolution | null> =>
  solveAltchaChallenge(req as Parameters<typeof solveAltchaChallenge>[0], url) as Promise<AltchaSolution | null>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, '../../..');

describe('Site Tour Runner - CLI Argument Parser', () => {
  it('parses default CLI options with no arguments provided', () => {
    const opts = parse([]);
    assert.strictEqual(opts.update, false);
    assert.strictEqual(opts.page, null);
    assert.strictEqual(opts.category, null);
    assert.strictEqual(opts.modalsOnly, false);
    assert.strictEqual(opts.pagesOnly, false);
    assert.strictEqual(opts.viewports, null);
    assert.strictEqual(opts.headless, true);
    assert.strictEqual(opts.help, false);
    assert.ok(opts.baseUrl.startsWith('http'));
  });

  it('parses --update flag correctly', () => {
    const opts = parse(['--update']);
    assert.strictEqual(opts.update, true);
  });

  it('parses --quick flag and populates desktop and mobile viewports', () => {
    const opts = parse(['--quick']);
    assert.deepStrictEqual(opts.viewports, ['desktop', 'mobile']);
  });

  it('parses --viewports comma-separated list', () => {
    const opts = parse(['--viewports=desktop,tablet,mobile']);
    assert.deepStrictEqual(opts.viewports, ['desktop', 'tablet', 'mobile']);

    const spaceOpts = parse(['--viewports', 'laptop,mobile']);
    assert.deepStrictEqual(spaceOpts.viewports, ['laptop', 'mobile']);
  });

  it('parses --page and --category flags', () => {
    const opts = parse(['--page=landing', '--category=perks']);
    assert.strictEqual(opts.page, 'landing');
    assert.strictEqual(opts.category, 'perks');

    const spaceOpts = parse(['--page', 'randomizer', '--category', 'modals']);
    assert.strictEqual(spaceOpts.page, 'randomizer');
    assert.strictEqual(spaceOpts.category, 'modals');
  });

  it('parses --auth flag correctly', () => {
    const opts = parse(['--auth=guest']);
    assert.strictEqual(opts.auth, 'guest');

    const userOpts = parse(['--auth', 'user']);
    assert.strictEqual(userOpts.auth, 'user');
  });

  it('parses --pages-only and --modals-only flags', () => {
    const pagesOpts = parse(['--pages-only']);
    assert.strictEqual(pagesOpts.pagesOnly, true);
    assert.strictEqual(pagesOpts.modalsOnly, false);

    const modalsOpts = parse(['--modals-only']);
    assert.strictEqual(modalsOpts.modalsOnly, true);
    assert.strictEqual(modalsOpts.pagesOnly, false);
  });

  it('parses --base-url and strips trailing slashes', () => {
    const opts = parse(['--base-url=https://127.0.0.1:3005///']);
    assert.strictEqual(opts.baseUrl, 'https://127.0.0.1:3005');

    const spaceOpts = parse(['--base-url', 'http://localhost:3000/']);
    assert.strictEqual(spaceOpts.baseUrl, 'http://localhost:3000');
  });

  it('parses --headless and --no-headless toggles', () => {
    assert.strictEqual(parse(['--no-headless']).headless, false);
    assert.strictEqual(parse(['--headless=false']).headless, false);
    assert.strictEqual(parse(['--headless=true']).headless, true);
  });

  it('parses --help and -h flags', () => {
    assert.strictEqual(parse(['--help']).help, true);
    assert.strictEqual(parse(['-h']).help, true);
  });
});

describe('Site Tour Runner - formatFileSize Helper', () => {
  it('formats invalid or zero inputs gracefully', () => {
    assert.strictEqual(formatFileSize(0), '0 KB');
    assert.strictEqual(formatFileSize(-100), '0 KB');
    assert.strictEqual(formatFileSize(Number.NaN), '0 KB');
  });

  it('formats small files in bytes', () => {
    assert.strictEqual(formatFileSize(512), '512 B');
    assert.strictEqual(formatFileSize(1023), '1023 B');
  });

  it('formats kilobyte ranges accurately', () => {
    assert.strictEqual(formatFileSize(1024), '1.0 KB');
    assert.strictEqual(formatFileSize(1536), '1.5 KB');
    assert.strictEqual(formatFileSize(1024 * 50), '50.0 KB');
  });

  it('formats megabyte ranges accurately', () => {
    assert.strictEqual(formatFileSize(1024 * 1024), '1.0 MB');
    assert.strictEqual(formatFileSize(1024 * 1024 * 3.5), '3.5 MB');
  });
});

describe('Site Tour Runner - ALTCHA Challenge Solver', () => {
  it('solves a cryptographic SHA-256 challenge correctly', async () => {
    const salt = 'site_tour_salt_987';
    const secretNum = 77;
    const challengeHash = crypto.createHash('sha256').update(`${salt}${secretNum}`).digest('hex');

    const mockRequest = {
      get: async () => ({
        ok: () => true,
        json: async () => ({
          algorithm: 'SHA-256',
          challenge: challengeHash,
          salt: salt,
          signature: 'hmac_signature_mock',
          expires: Date.now() + 60000,
          maxnumber: 500,
        }),
      }),
    };

    const solution = await solve(mockRequest, 'https://localhost');
    assert.ok(solution !== null);
    assert.strictEqual(solution.number, 77);
    assert.strictEqual(solution.challenge, challengeHash);
    assert.strictEqual(solution.salt, salt);
  });

  it('returns null if challenge request fails', async () => {
    const failingRequest = {
      get: async () => ({
        ok: () => false,
      }),
    };

    const solution = await solve(failingRequest, 'https://localhost');
    assert.strictEqual(solution, null);
  });
});

describe('Site Tour Runner - Package.json NPM Scripts', () => {
  it('has all three required screenshot commands configured', () => {
    const pkgPath = path.join(FRONTEND_DIR, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    assert.ok(pkg.scripts, 'package.json must contain scripts section');
    assert.strictEqual(pkg.scripts.screenshots, 'node scripts/site-tour.mjs');
    assert.strictEqual(pkg.scripts['screenshots:update'], 'node scripts/site-tour.mjs --update');
    assert.strictEqual(pkg.scripts['screenshots:quick'], 'node scripts/site-tour.mjs --viewports=desktop,mobile');
  });
});

describe('Site Tour Runner - matchesFilter', () => {
  it('matches all items when no filter is provided', () => {
    const page = { id: 'perks', category: 'perks', route: '/en/perks', folder: '01-perks' };
    assert.strictEqual(matchesFilter(page, {}, false), true);
  });

  it('matches pages by category strictly', () => {
    const perksPage = { id: 'perks', category: 'perks', route: '/en/perks', folder: '01-perks' };
    const buildsPage = { id: 'builds', category: 'builds', route: '/en/builds', folder: '02-builds' };

    assert.strictEqual(matchesFilter(perksPage, { category: 'perks' }, false), true);
    assert.strictEqual(matchesFilter(buildsPage, { category: 'perks' }, false), false);
  });

  it('matches modals when category is "modals" or matches folder or route', () => {
    const perkModal = { id: 'perk-detail', category: 'modals', route: '/en/perks', folder: 'perk-detail' };
    const authModal = { id: 'auth-login', category: 'modals', route: '/en', folder: 'auth-login' };

    assert.strictEqual(matchesFilter(perkModal, { category: 'modals' }, true), true);
    assert.strictEqual(matchesFilter(authModal, { category: 'modals' }, true), true);
    assert.strictEqual(matchesFilter(perkModal, { category: 'perks' }, true), true);
    assert.strictEqual(matchesFilter(authModal, { category: 'perks' }, true), false);
  });

  it('filters by page id or route, handling normalized /en prefix', () => {
    const landingPage = { id: 'landing', category: 'general', route: '/en', folder: '01-landing' };
    const perksPage = { id: 'perks', category: 'perks', route: '/en/perks', folder: '01-perks' };
    const perkModal = { id: 'perk-detail', category: 'modals', route: '/en/perks', folder: 'perk-detail' };

    assert.strictEqual(matchesFilter(landingPage, { page: 'landing' }, false), true);
    assert.strictEqual(matchesFilter(landingPage, { page: '/en' }, false), true);
    assert.strictEqual(matchesFilter(perksPage, { page: 'perks' }, false), true);
    assert.strictEqual(matchesFilter(perksPage, { page: '/en/perks' }, false), true);
    assert.strictEqual(matchesFilter(perkModal, { page: 'perks' }, true), true);
    assert.strictEqual(matchesFilter(landingPage, { page: 'perks' }, false), false);
  });

  it('filters by auth status (guest, user, admin)', () => {
    const guestPage = { id: 'user-profile-guest', category: 'account', auth: 'guest', route: '/en/user' };
    const userPage = { id: 'user-profile', category: 'account', auth: 'user', requiresAuth: 'user', route: '/en/user' };
    const adminPage = { id: 'admin', category: 'account', auth: 'admin', requiresAuth: 'admin', route: '/en/admin' };

    assert.strictEqual(matchesFilter(guestPage, { auth: 'guest' }, false), true);
    assert.strictEqual(matchesFilter(userPage, { auth: 'guest' }, false), false);
    assert.strictEqual(matchesFilter(userPage, { auth: 'user' }, false), true);
    assert.strictEqual(matchesFilter(adminPage, { auth: 'admin' }, false), true);
    assert.strictEqual(matchesFilter(adminPage, { auth: 'all' }, false), true);
  });

  it('matches modals by their accurate functional category', () => {
    const streakRulesModal = { id: 'streaks-rules', category: 'streaks', auth: 'user', route: '/en/streaks/killer/chaos-streak' };
    assert.strictEqual(matchesFilter(streakRulesModal, { category: 'streaks' }, true), true);
    assert.strictEqual(matchesFilter(streakRulesModal, { category: 'perks' }, true), false);
    assert.strictEqual(matchesFilter(streakRulesModal, { category: 'modals' }, true), true);
  });
});

describe('Site Tour Runner - getScreenshotFileName', () => {
  it('formats filenames with viewport id and dimensions per spec Section 4', () => {
    assert.strictEqual(
      getScreenshotFileName({ id: 'desktop', width: 1920, height: 1080 }),
      'desktop-1920x1080.png'
    );
    assert.strictEqual(
      getScreenshotFileName({ id: 'laptop', width: 1366, height: 768 }),
      'laptop-1366x768.png'
    );
    assert.strictEqual(
      getScreenshotFileName({ id: 'tablet', width: 768, height: 1024 }),
      'tablet-768x1024.png'
    );
    assert.strictEqual(
      getScreenshotFileName({ id: 'mobile', width: 390, height: 844 }),
      'mobile-390x844.png'
    );
  });
});

