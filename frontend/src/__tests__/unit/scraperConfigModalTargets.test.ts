// frontend/src/__tests__/unit/scraperConfigModalTargets.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('ScraperConfigModal export/import targets', () => {
  const modalPath = path.resolve(__dirname, '../../components/ScraperConfigModal.tsx');
  const modalContent = fs.readFileSync(modalPath, 'utf-8');

  const expectedNewTargets = [
    'offerings',
    'chapters',
    'perk_rules',
    'user_showcases',
    'changelog_posts',
    'generator_drawn_perks',
    'draft_sessions',
    'scraper_settings',
    'challenge_mode_settings',
    'admin_audit_logs',
    'gauntlet_runs',
    'chaos_runs',
    'history_runs',
    'page_streak_runs',
    'rosters',
    'smash_translations',
  ];

  for (const target of expectedNewTargets) {
    it(`ALL_TARGETS includes the '${target}' full-database export target`, () => {
      assert.ok(
        modalContent.includes(`id: '${target}'`),
        `ALL_TARGETS must include an entry with id: '${target}'`
      );
    });
  }

  it('TARGET_KEY_MAP has a matching Pascal-case entry for every new target', () => {
    for (const target of expectedNewTargets) {
      assert.ok(
        new RegExp(`${target}:\\s*'[A-Za-z]+'`).test(modalContent),
        `TARGET_KEY_MAP must map '${target}' to a Pascal-case locale key suffix`
      );
    }
  });

  it('ALL_TARGETS has grown to cover every full-database export target (29 total)', () => {
    const idMatches = modalContent.match(/id:\s*'[a-z_]+'/g) || [];
    assert.equal(idMatches.length, 29, 'ALL_TARGETS should contain 29 target entries after this task');
  });
});
