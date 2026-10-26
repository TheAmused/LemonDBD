// frontend/src/__tests__/unit/admin/scraperTargets.test.ts
//
// The database tools' target list: what export, import and purge offer. The ids themselves are
// checked against the backend's registry by backend/tests (test_admin_backup_targets), so this file
// covers the frontend side: every target is labelled, grouped once, and purge pulls in what it must.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { en, pl, de, es, ja } from '@/locales';
import {
  ALL_TARGETS,
  PURGEABLE_TARGET_IDS,
  PURGE_REQUIRES,
  TARGET_GROUPS_CONFIG,
  TARGET_KEY_MAP,
  withPurgeDependencies,
} from '@/components/scraper-config/scraperTargets';

describe('database tool targets', () => {
  it('ids are unique', () => {
    const ids = ALL_TARGETS.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('every target has a translated label and description in every locale', () => {
    for (const [name, dict] of Object.entries({ en, pl, de, es, ja })) {
      const admin = dict.admin as unknown as Record<string, string>;
      for (const target of ALL_TARGETS) {
        const key = TARGET_KEY_MAP[target.id];
        assert.ok(key, `${target.id} has no TARGET_KEY_MAP entry`);
        assert.ok(admin[`target${key}Label`], `${name}: target${key}Label`);
        assert.ok(admin[`target${key}Desc`], `${name}: target${key}Desc`);
      }
    }
  });

  it('every target sits in exactly one of the four groups, and every group has targets', () => {
    const groups = TARGET_GROUPS_CONFIG.map((g) => g.key);
    for (const target of ALL_TARGETS) assert.ok(groups.includes(target.category), `${target.id}: ${target.category}`);
    for (const group of groups) assert.ok(ALL_TARGETS.some((t) => t.category === group), `${group} is empty`);
  });

  it('accounts, the audit log and the ban-evasion list can never be purged', () => {
    for (const id of ['users', 'admin_audit_logs', 'banned_email_hashes']) assert.ok(!PURGEABLE_TARGET_IDS.includes(id), id);
  });

  it('a purge selection always includes the tables that point at what was chosen, in list order', () => {
    assert.deepEqual(withPurgeDependencies(['chapters']), ['survivors', 'killers', 'chapters'].sort((a, b) => PURGEABLE_TARGET_IDS.indexOf(a) - PURGEABLE_TARGET_IDS.indexOf(b)));
    assert.ok(withPurgeDependencies(['item_categories']).includes('item_addons'));
    for (const [parent, children] of Object.entries(PURGE_REQUIRES)) {
      for (const child of children) assert.ok(withPurgeDependencies([parent]).includes(child), `${parent} -> ${child}`);
    }
  });
});
