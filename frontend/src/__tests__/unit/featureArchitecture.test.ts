// frontend/src/__tests__/unit/featureArchitecture.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as auth from '@/features/auth';
import * as characters from '@/features/characters';
import * as perks from '@/features/perks';
import * as maps from '@/features/maps';
import * as smashOrPass from '@/features/smash-or-pass';
import * as streaks from '@/features/streaks';
import * as tierLists from '@/features/tier-lists';
import * as minigames from '@/features/minigames';
import * as admin from '@/features/admin';

import { cn } from '@/lib/cn';
import { downloadFile } from '@/lib/download';
import { copyToClipboard, copyTextWithFallback } from '@/lib/clipboard';
import { getLocalStorage, safeGetItem, safeSetItem, safeRemoveItem, createVersionedStore } from '@/lib/storage';
import { canonicalSlug, sanitizeAvatarName, getAvatarSubdir } from '@/lib/slug';
import { apiFetchJson, ApiError } from '@/lib/api-client';

describe('Feature Architecture: Public Barrels & Bounded Domains', () => {
  it('auth feature exports expected public API', () => {
    assert.equal(typeof auth.AuthModal, 'function');
    assert.equal(typeof auth.useAuth, 'function');
    assert.equal(typeof auth.AuthProvider, 'function');
    assert.equal(typeof auth.getAuthToken, 'function');
    assert.equal(typeof auth.authHeaders, 'function');
    assert.equal(typeof auth.authFetch, 'function');
    assert.equal(typeof auth.setSessionFlag, 'function');
  });

  it('characters feature exports expected public API', () => {
    assert.equal(typeof characters.CharactersHub, 'function');
    assert.equal(typeof characters.CharacterDetailClient, 'function');
  });

  it('perks feature exports expected public API', () => {
    assert.equal(typeof perks.PerkCard, 'function');
    assert.equal(typeof perks.PerkIcon, 'function');
    assert.equal(typeof perks.PerkFilters, 'function');
    assert.equal(typeof perks.PerkModal, 'function');
  });

  it('maps feature exports expected public API', () => {
    assert.equal(typeof maps.MapExplorer, 'function');
    assert.equal(typeof maps.MapsClient, 'function');
  });

  it('smash-or-pass feature exports expected public API', () => {
    assert.equal(typeof smashOrPass.CharacterCard, 'function');
    assert.equal(typeof smashOrPass.SmashOrPassClient, 'function');
    assert.equal(typeof smashOrPass.SmashOrPassHub, 'function');
  });

  it('streaks feature exports expected public API', () => {
    assert.equal(typeof streaks.StreakPanelGrid, 'function');
    assert.equal(typeof streaks.StreaksLayoutShell, 'function');
    assert.equal(typeof streaks.StreakPanel, 'function');
    assert.equal(typeof streaks.RoleTabs, 'function');
    assert.equal(typeof streaks.getSavedStreakRole, 'function');
    assert.equal(typeof streaks.saveStreakRole, 'function');
  });

  it('tier-lists feature exports expected public API', () => {
    assert.equal(typeof tierLists.TierListHub, 'function');
    assert.equal(typeof tierLists.OfficialTierListView, 'function');
    assert.equal(typeof tierLists.CustomTierListView, 'function');
    assert.equal(typeof tierLists.TierListCreator, 'function');
  });

  it('minigames feature exports expected public API', () => {
    assert.equal(typeof minigames.MinigamesHub, 'function');
    assert.equal(typeof minigames.MinigamesHubClient, 'function');
  });

  it('admin feature exports expected public API', () => {
    assert.equal(typeof admin.AdminPanelClient, 'function');
    assert.equal(typeof admin.AdminHeader, 'function');
    assert.equal(typeof admin.AdminUsersSection, 'function');
  });
});

describe('Core Infrastructure: src/lib/ modules', () => {
  it('cn merges classes correctly', () => {
    assert.equal(cn('px-2', 'px-4', 'text-red-500'), 'px-4 text-red-500');
  });

  it('downloadFile is a callable function', () => {
    assert.equal(typeof downloadFile, 'function');
  });

  it('clipboard exports copyToClipboard and copyTextWithFallback', () => {
    assert.equal(typeof copyToClipboard, 'function');
    assert.equal(typeof copyTextWithFallback, 'function');
  });

  it('storage exports safe storage and versioned store factories', () => {
    assert.equal(typeof getLocalStorage, 'function');
    assert.equal(typeof safeGetItem, 'function');
    assert.equal(typeof safeSetItem, 'function');
    assert.equal(typeof safeRemoveItem, 'function');
    assert.equal(typeof createVersionedStore, 'function');
  });

  it('slug exports canonical utilities', () => {
    assert.equal(canonicalSlug('Dead by Daylight!'), 'dead-by-daylight');
    assert.equal(sanitizeAvatarName('The Trapper'), 'the_trapper');
    assert.equal(getAvatarSubdir('Survivor'), 'survivors');
    assert.equal(getAvatarSubdir('Killer'), 'killers');
  });

  it('api-client exports apiFetchJson and ApiError', () => {
    assert.equal(typeof apiFetchJson, 'function');
    assert.equal(typeof ApiError, 'function');
  });
});

describe('Feature Architecture: Boundary Guardrails', () => {
  it('forbids deep imports matching @/features/*/*', () => {
    const deepImportPattern = /from\s+['"]@\/features\/[^'"]+\/[^'"]+['"]/;
    assert.ok(deepImportPattern.test("import { x } from '@/features/auth/internal'"));
    assert.ok(!deepImportPattern.test("import { x } from '@/features/auth'"));
  });
});
