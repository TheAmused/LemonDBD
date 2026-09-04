// frontend/src/__tests__/unit/userShowcase.test.ts
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  DEFAULT_SHOWCASE_STATE,
  PLAYER_TITLES,
  GRADE_EMBLEMS,
  type UserShowcaseState,
  type MainLoadout,
} from '@/types/userShowcase';
import {
  useUserShowcase,
  getShowcaseStorageKey,
  loadStoredShowcase,
  saveStoredShowcase,
  mergeShowcaseState,
} from '@/hooks/useUserShowcase';
import {
  mapBackendToShowcaseState,
  mapShowcaseStateToBackend,
} from '@/services/userShowcaseApi';

// In-memory mock storage for localStorage
class MockLocalStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

describe('User Showcase: Constants & Default State', () => {
  it('DEFAULT_SHOWCASE_STATE defines valid default values', () => {
    assert.equal(DEFAULT_SHOWCASE_STATE.playerTitle, 'The Fogwalker');
    assert.equal(DEFAULT_SHOWCASE_STATE.devotionLevel, 14);
    assert.equal(DEFAULT_SHOWCASE_STATE.gradeRank, 'Iridescent I');

    assert.equal(DEFAULT_SHOWCASE_STATE.survivorMain.characterName, 'Feng Min');
    assert.equal(DEFAULT_SHOWCASE_STATE.survivorMain.prestige, 9);
    assert.deepEqual(DEFAULT_SHOWCASE_STATE.survivorMain.perkIds, [null, null, null, null]);

    assert.equal(DEFAULT_SHOWCASE_STATE.killerMain.characterName, 'The Blight');
    assert.equal(DEFAULT_SHOWCASE_STATE.killerMain.prestige, 7);
    assert.deepEqual(DEFAULT_SHOWCASE_STATE.killerMain.perkIds, [null, null, null, null]);
  });

  it('PLAYER_TITLES contains the expected 10 showcase titles', () => {
    assert.equal(PLAYER_TITLES.length, 10);
    assert.ok(PLAYER_TITLES.includes('The Fogwalker'));
    assert.ok(PLAYER_TITLES.includes('Apex Predator'));
    assert.ok(PLAYER_TITLES.includes('Hex Cleanser'));
    assert.ok(PLAYER_TITLES.includes('Basement Architect'));
    assert.ok(PLAYER_TITLES.includes('Trial Champion'));
    assert.ok(PLAYER_TITLES.includes('Devoted Survivor'));
    assert.ok(PLAYER_TITLES.includes('Entity Whisperer'));
    assert.ok(PLAYER_TITLES.includes('Loop God'));
    assert.ok(PLAYER_TITLES.includes('The Merciless'));
    assert.ok(PLAYER_TITLES.includes('Campfire Veteran'));
  });

  it('GRADE_EMBLEMS contains standard DBD emblems from Iridescent I to Ash I', () => {
    assert.equal(GRADE_EMBLEMS.length, 6);
    assert.deepEqual(GRADE_EMBLEMS, [
      'Iridescent I',
      'Iridescent II',
      'Gold I',
      'Silver I',
      'Bronze I',
      'Ash I',
    ]);
  });
});

describe('User Showcase: Storage Keys & Serialization', () => {
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    (globalThis as any).localStorage = mockStorage;
  });

  it('generates storage key scoped by user ID or defaults to guest', () => {
    assert.equal(getShowcaseStorageKey(null), 'lemondbd_showcase_guest');
    assert.equal(getShowcaseStorageKey(undefined), 'lemondbd_showcase_guest');
    assert.equal(getShowcaseStorageKey(42), 'lemondbd_showcase_42');
    assert.equal(getShowcaseStorageKey('user-uuid-123'), 'lemondbd_showcase_user-uuid-123');
  });

  it('loadStoredShowcase returns deep copy of DEFAULT_SHOWCASE_STATE when storage is empty', () => {
    const loaded = loadStoredShowcase('user_empty');
    assert.deepEqual(loaded, DEFAULT_SHOWCASE_STATE);
    loaded.survivorMain.characterName = 'Meg Thomas';
    assert.equal(DEFAULT_SHOWCASE_STATE.survivorMain.characterName, 'Feng Min');
  });

  it('loadStoredShowcase returns fallback when JSON in storage is corrupted', () => {
    mockStorage.setItem('lemondbd_showcase_corrupted', '{"not valid json:');
    const loaded = loadStoredShowcase('corrupted');
    assert.deepEqual(loaded, DEFAULT_SHOWCASE_STATE);
  });

  it('mergeShowcaseState merges partial saved data gracefully with defaults', () => {
    const partial = {
      playerTitle: 'Apex Predator',
      survivorMain: {
        characterName: 'Claudette Morel',
        prestige: 50,
        perkIds: [101, 102],
      },
    };
    const merged = mergeShowcaseState(partial);
    assert.equal(merged.playerTitle, 'Apex Predator');
    assert.equal(merged.devotionLevel, 14);
    assert.equal(merged.gradeRank, 'Iridescent I');
    assert.equal(merged.survivorMain.characterName, 'Claudette Morel');
    assert.equal(merged.survivorMain.prestige, 50);
    assert.deepEqual(merged.survivorMain.perkIds, [101, 102, null, null]);
    assert.equal(merged.killerMain.characterName, 'The Blight');
  });

  it('clamps devotion level (1-99) and prestige levels (1-100)', () => {
    const outOfBounds = {
      devotionLevel: 150,
      survivorMain: { characterName: 'Ace', prestige: 999, perkIds: [] },
      killerMain: { characterName: 'Trapper', prestige: -5, perkIds: [] },
    };
    const merged = mergeShowcaseState(outOfBounds);
    assert.equal(merged.devotionLevel, 99);
    assert.equal(merged.survivorMain.prestige, 100);
    assert.equal(merged.killerMain.prestige, 1);
  });

  it('saveStoredShowcase and loadStoredShowcase roundtrip correctly', () => {
    const customState: UserShowcaseState = {
      playerTitle: 'Hex Cleanser',
      devotionLevel: 25,
      gradeRank: 'Gold I',
      survivorMain: {
        characterName: 'Mikaela Reid',
        prestige: 45,
        perkIds: [5, 12, 44, null],
      },
      killerMain: {
        characterName: 'The Nurse',
        prestige: 80,
        perkIds: [1, 2, 3, 4],
      },
    };

    saveStoredShowcase('user_42', customState);
    const loaded = loadStoredShowcase('user_42');
    assert.deepEqual(loaded, customState);
  });
});

describe('User Showcase: Hook & State Actions', () => {
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    (globalThis as any).localStorage = mockStorage;
  });

  it('hook exposes initial showcase state and all updater actions', () => {
    let capturedHook!: ReturnType<typeof useUserShowcase>;

    function TestComponent() {
      capturedHook = useUserShowcase('hook_test_user');
      return React.createElement('div', null, capturedHook.showcase.playerTitle);
    }

    renderToStaticMarkup(React.createElement(TestComponent));

    assert.ok(capturedHook);
    assert.deepEqual(capturedHook.showcase, DEFAULT_SHOWCASE_STATE);
    assert.equal(typeof capturedHook.setPlayerTitle, 'function');
    assert.equal(typeof capturedHook.setDevotionLevel, 'function');
    assert.equal(typeof capturedHook.setGradeRank, 'function');
    assert.equal(typeof capturedHook.setSurvivorCharacter, 'function');
    assert.equal(typeof capturedHook.setSurvivorPrestige, 'function');
    assert.equal(typeof capturedHook.setSurvivorPerk, 'function');
    assert.equal(typeof capturedHook.setKillerCharacter, 'function');
    assert.equal(typeof capturedHook.setKillerPrestige, 'function');
    assert.equal(typeof capturedHook.setKillerPerk, 'function');
    assert.equal(typeof capturedHook.resetShowcase, 'function');
  });

  it('hook loads pre-existing showcase data from localStorage on mount', () => {
    const existing: UserShowcaseState = {
      playerTitle: 'Loop God',
      devotionLevel: 42,
      gradeRank: 'Iridescent II',
      survivorMain: {
        characterName: 'Dwight Fairfield',
        prestige: 100,
        perkIds: [10, 20, 30, 40],
      },
      killerMain: {
        characterName: 'The Spirit',
        prestige: 66,
        perkIds: [50, 60, 70, 80],
      },
    };

    mockStorage.setItem('lemondbd_showcase_existing_user', JSON.stringify(existing));

    let capturedHook!: ReturnType<typeof useUserShowcase>;
    function TestComponent() {
      capturedHook = useUserShowcase('existing_user');
      return React.createElement('div', null, capturedHook.showcase.playerTitle);
    }

    renderToStaticMarkup(React.createElement(TestComponent));

    assert.deepEqual(capturedHook.showcase, existing);
    assert.equal(capturedHook.state.playerTitle, 'Loop God');
  });

  it('action updaters mutate state and sync to localStorage', () => {
    let capturedHook!: ReturnType<typeof useUserShowcase>;

    function TestComponent() {
      capturedHook = useUserShowcase('updater_test_user');
      return React.createElement('div', null, capturedHook.showcase.playerTitle);
    }

    renderToStaticMarkup(React.createElement(TestComponent));

    // Test title update
    capturedHook.setPlayerTitle('Entity Whisperer');
    let stored = JSON.parse(mockStorage.getItem('lemondbd_showcase_updater_test_user')!);
    assert.equal(stored.playerTitle, 'Entity Whisperer');

    // Test devotion update
    capturedHook.setDevotionLevel(77);
    stored = JSON.parse(mockStorage.getItem('lemondbd_showcase_updater_test_user')!);
    assert.equal(stored.devotionLevel, 77);

    // Test grade rank update
    capturedHook.setGradeRank('Silver I');
    stored = JSON.parse(mockStorage.getItem('lemondbd_showcase_updater_test_user')!);
    assert.equal(stored.gradeRank, 'Silver I');

    // Test survivor character & prestige
    capturedHook.setSurvivorCharacter('Meg Thomas');
    capturedHook.setSurvivorPrestige(88);
    stored = JSON.parse(mockStorage.getItem('lemondbd_showcase_updater_test_user')!);
    assert.equal(stored.survivorMain.characterName, 'Meg Thomas');
    assert.equal(stored.survivorMain.prestige, 88);

    // Test survivor perks (slots 0..3)
    capturedHook.setSurvivorPerk(0, 101);
    capturedHook.setSurvivorPerk(1, 102);
    capturedHook.setSurvivorPerk(2, 103);
    capturedHook.setSurvivorPerk(3, 104);
    stored = JSON.parse(mockStorage.getItem('lemondbd_showcase_updater_test_user')!);
    assert.deepEqual(stored.survivorMain.perkIds, [101, 102, 103, 104]);

    // Test killer character & prestige
    capturedHook.setKillerCharacter('The Huntress');
    capturedHook.setKillerPrestige(99);
    stored = JSON.parse(mockStorage.getItem('lemondbd_showcase_updater_test_user')!);
    assert.equal(stored.killerMain.characterName, 'The Huntress');
    assert.equal(stored.killerMain.prestige, 99);

    // Test killer perks (slots 0..3)
    capturedHook.setKillerPerk(1, 202);
    stored = JSON.parse(mockStorage.getItem('lemondbd_showcase_updater_test_user')!);
    assert.equal(stored.killerMain.perkIds[1], 202);

    // Test resetShowcase restores default
    capturedHook.resetShowcase();
    stored = JSON.parse(mockStorage.getItem('lemondbd_showcase_updater_test_user')!);
    assert.deepEqual(stored, DEFAULT_SHOWCASE_STATE);
  });
});

describe('User Showcase: Database Serialization & Deserialization', () => {
  it('mapShowcaseStateToBackend converts frontend state to database schema format', () => {
    const frontendState: UserShowcaseState = {
      playerTitle: 'Apex Predator',
      devotionLevel: 25,
      gradeRank: 'Gold I',
      survivorMain: {
        characterName: 'Meg Thomas',
        prestige: 50,
        perkIds: [1, 2, 3, 4],
      },
      killerMain: {
        characterName: 'The Trapper',
        prestige: 100,
        perkIds: [5, 6, 7, 8],
      },
    };

    const backendPayload = mapShowcaseStateToBackend(frontendState);
    assert.deepEqual(backendPayload, {
      player_title: 'Apex Predator',
      devotion_level: 25,
      grade_rank: 'Gold I',
      survivor_main: {
        character_name: 'Meg Thomas',
        prestige: 50,
        perk_ids: [1, 2, 3, 4],
      },
      killer_main: {
        character_name: 'The Trapper',
        prestige: 100,
        perk_ids: [5, 6, 7, 8],
      },
    });
  });

  it('mapBackendToShowcaseState converts database record to frontend UserShowcaseState', () => {
    const rawBackendData = {
      player_title: 'Trial Champion',
      devotion_level: 40,
      grade_rank: 'Silver I',
      survivor_main: {
        character_name: 'David King',
        prestige: 60,
        perk_ids: [10, 20, 30, 40],
      },
      killer_main: {
        character_name: 'The Oni',
        prestige: 85,
        perk_ids: [50, 60, 70, 80],
      },
      updated_at: '2026-09-04T12:00:00Z',
    };

    const parsed = mapBackendToShowcaseState(rawBackendData);
    assert.equal(parsed.playerTitle, 'Trial Champion');
    assert.equal(parsed.devotionLevel, 40);
    assert.equal(parsed.gradeRank, 'Silver I');
    assert.equal(parsed.survivorMain.characterName, 'David King');
    assert.equal(parsed.survivorMain.prestige, 60);
    assert.deepEqual(parsed.survivorMain.perkIds, [10, 20, 30, 40]);
    assert.equal(parsed.killerMain.characterName, 'The Oni');
    assert.equal(parsed.killerMain.prestige, 85);
    assert.deepEqual(parsed.killerMain.perkIds, [50, 60, 70, 80]);
  });
});
