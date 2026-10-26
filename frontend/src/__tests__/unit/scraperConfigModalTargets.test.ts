// frontend/src/__tests__/unit/scraperConfigModalTargets.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFeatureSource } from '../helpers/readFeatureSource';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('ScraperConfigModal export/import targets', () => {
  // The modal is a composition root; targets, hooks and tabs live in components/scraper-config/.
  const componentsDir = path.resolve(__dirname, '../../components');
  const featureDir = path.join(componentsDir, 'scraper-config');
  const modalContent = readFeatureSource(path.join(componentsDir, 'ScraperConfigModal.tsx'), featureDir);

  const expectedNewTargets = [
    'offerings',
    'chapters',
    'user_showcases',
    'changelog_posts',
    'challenge_mode_settings',
    'admin_audit_logs',
    'banned_email_hashes',
    'gauntlet_runs',
    'chaos_runs',
    'history_runs',
    'page_streak_runs',
    'rosters',
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

  it('ALL_TARGETS covers all 27 backend database targets (backend test_admin_backup_targets checks the names)', () => {
    const targetsContent = fs.readFileSync(path.join(featureDir, 'scraperTargets.ts'), 'utf-8');
    const idMatches = targetsContent.match(/id:\s*'[a-z_]+'/g) || [];
    assert.equal(idMatches.length, 27, 'ALL_TARGETS should contain exactly 27 target entries');
  });

  it('a purge selection always includes the tables that point at what was chosen', async () => {
    const { withPurgeDependencies, PURGEABLE_TARGET_IDS } = await import('../../components/scraper-config/scraperTargets');
    assert.deepEqual(withPurgeDependencies(['chapters']), ['survivors', 'killers', 'chapters'].filter((id) => PURGEABLE_TARGET_IDS.includes(id)).sort((a, b) => PURGEABLE_TARGET_IDS.indexOf(a) - PURGEABLE_TARGET_IDS.indexOf(b)));
    assert.ok(withPurgeDependencies(['item_categories']).includes('item_addons'));
    assert.ok(!PURGEABLE_TARGET_IDS.includes('users') && !PURGEABLE_TARGET_IDS.includes('admin_audit_logs'));
  });

  it('TARGET_GROUPS_CONFIG organizes targets into content, users, community, and settings', () => {
    assert.ok(modalContent.includes("key: 'content'"), 'Must include content group');
    assert.ok(modalContent.includes("key: 'users'"), 'Must include users group');
    assert.ok(modalContent.includes("key: 'community'"), 'Must include community group');
    assert.ok(modalContent.includes("key: 'settings'"), 'Must include settings group');
  });

  it('provides group-level toggle functions toggleGroupExport and toggleGroupPurge', () => {
    assert.ok(modalContent.includes('toggleGroupExport'), 'Must include toggleGroupExport');
    assert.ok(modalContent.includes('toggleGroupPurge'), 'Must include toggleGroupPurge');
  });
});
