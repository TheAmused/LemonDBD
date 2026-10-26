// frontend/src/__tests__/unit/settings/settingsForm.test.ts
//
// The Settings tab's rules: what counts as a change, which changes lower a protection, the quick checks
// before a save and the local-time <-> UTC conversion of the banner's end time. The last block ties the
// tab to the backend's setting list, so a new setting cannot ship without its labels.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  SETTING_GROUP_ORDER,
  draftOf,
  draftProblem,
  isDraftDirty,
  isRiskyDraft,
  isoToLocalInput,
  localInputToIso,
  payloadValue,
  unitOf,
} from '@/components/admin/settingsForm';
import en from '@/locales/en/adminSettings';
import de from '@/locales/de/adminSettings';
import es from '@/locales/es/adminSettings';
import ja from '@/locales/ja/adminSettings';
import pl from '@/locales/pl/adminSettings';
import type { AdminSiteSetting } from '@/types/admin';

const row = (overrides: Partial<AdminSiteSetting>): AdminSiteSetting => ({
  key: 'x',
  kind: 'int',
  group: 'limits',
  value: 10,
  default: 10,
  overridden: false,
  min: 3,
  max: 120,
  max_length: 150,
  choices: [],
  allow_empty: false,
  risky_when: null,
  ...overrides,
});

describe('drafts', () => {
  it('start from the value, and never from a secret', () => {
    assert.equal(draftOf(row({ value: 10 })), '10');
    assert.equal(draftOf(row({ kind: 'bool', value: false })), 'false');
    assert.equal(draftOf(row({ kind: 'text', value: '' })), '');
    assert.equal(draftOf(row({ kind: 'secret', value: null })), '');
  });

  it('count as changed when they differ from the saved value; a secret when anything is typed', () => {
    assert.equal(isDraftDirty(row({ value: 10 }), ' 10 '), false);
    assert.equal(isDraftDirty(row({ value: 10 }), '11'), true);
    assert.equal(isDraftDirty(row({ kind: 'secret', value: null }), ''), false);
    assert.equal(isDraftDirty(row({ kind: 'secret', value: null }), '   '), false);
    assert.equal(isDraftDirty(row({ kind: 'secret', value: null }), 'https://discord.com/api/webhooks/1/x'), true);
  });

  it('send booleans as booleans and everything else trimmed', () => {
    assert.equal(payloadValue(row({ kind: 'bool', value: true }), 'false'), false);
    assert.equal(payloadValue(row({ kind: 'text', value: '' }), '  hi '), 'hi');
  });
});

describe('protection-lowering switches', () => {
  const verification = row({ key: 'email_verification_required', kind: 'bool', value: true, risky_when: false });

  it('are risky only when switched into the unsafe position', () => {
    assert.equal(isRiskyDraft(verification, 'false'), true);
    assert.equal(isRiskyDraft(verification, 'true'), false);
  });

  it('are not risky when the saved value already is the unsafe one', () => {
    assert.equal(isRiskyDraft({ ...verification, value: false }, 'false'), false);
  });

  it('are never flagged for an ordinary switch', () => {
    assert.equal(isRiskyDraft(row({ kind: 'bool', value: true, risky_when: null }), 'false'), false);
  });
});

describe('quick checks before saving', () => {
  it('numbers must be whole and inside the bounds', () => {
    const limit = row({ min: 3, max: 120 });
    assert.equal(draftProblem(limit, '10'), null);
    assert.equal(draftProblem(limit, '2'), 'range');
    assert.equal(draftProblem(limit, '121'), 'range');
    assert.equal(draftProblem(limit, '1.5'), 'number');
    assert.equal(draftProblem(limit, ''), 'number');
  });

  it('links must be https, and may be empty only when the setting allows it', () => {
    const link = row({ kind: 'url', allow_empty: true, max_length: 300 });
    assert.equal(draftProblem(link, ''), null);
    assert.equal(draftProblem(link, 'https://ko-fi.com/lemondbd'), null);
    assert.equal(draftProblem(link, 'http://ko-fi.com/lemondbd'), 'link');
    assert.equal(draftProblem(link, 'ko-fi.com'), 'link');
    assert.equal(draftProblem({ ...link, allow_empty: false, kind: 'url' }, ''), 'link');
  });

  it('a secret may be left empty (unchanged) but not half-typed', () => {
    const secret = row({ kind: 'secret', max_length: 200 });
    assert.equal(draftProblem(secret, ''), null);
    assert.equal(draftProblem(secret, 'https://discord.com/api/webhooks/1/abc'), null);
    assert.equal(draftProblem(secret, 'not a link'), 'link');
  });

  it('text respects its length', () => {
    const text = row({ kind: 'text', max_length: 5, allow_empty: true });
    assert.equal(draftProblem(text, 'abcde'), null);
    assert.equal(draftProblem(text, 'abcdef'), 'length');
    assert.equal(draftProblem({ ...text, allow_empty: false }, ''), 'length');
  });
});

describe('banner end time', () => {
  it('survives the trip to the date field and back (the server stores UTC)', () => {
    const iso = '2026-12-24T18:30:00Z';
    assert.equal(localInputToIso(isoToLocalInput(iso)), iso);
  });

  it('empty and invalid values become empty', () => {
    assert.equal(isoToLocalInput(''), '');
    assert.equal(isoToLocalInput('soon'), '');
    assert.equal(localInputToIso(''), '');
    assert.equal(localInputToIso('soon'), '');
  });
});

describe('units', () => {
  it('come from the key’s last word', () => {
    assert.equal(unitOf('session_hours'), 'hours');
    assert.equal(unitOf('two_factor_lockout_minutes'), 'minutes');
    assert.equal(unitOf('resend_cooldown_seconds'), 'seconds');
    assert.equal(unitOf('scoreboard_upload_max_mb'), 'mb');
    assert.equal(unitOf('rate_auth_per_minute'), 'perMinute');
    assert.equal(unitOf('password_min_length'), null);
  });
});

// The backend's list of settings is the source of truth; every one needs a label and a description in all
// languages, and a place in the tab. Skipped when the backend folder is not next to the front end.
const SPEC_FILE = path.resolve(__dirname, '../../../../../backend/app/utils/site_settings_spec.py');
const spec = fs.existsSync(SPEC_FILE) ? fs.readFileSync(SPEC_FILE, 'utf8') : null;

function backendSettings(source: string): { key: string; group: string }[] {
  const found: { key: string; group: string }[] = [];
  for (const m of source.matchAll(/SettingSpec\(\s*"(\w+)",\s*"\w+",\s*"(\w+)"/g)) found.push({ key: m[1], group: m[2] });
  for (const m of source.matchAll(/_int_spec\(\s*"(\w+)",\s*"(\w+)"/g)) found.push({ key: m[1], group: m[2] });
  const locales = /BANNER_LOCALES = \(([^)]*)\)/.exec(source)?.[1].match(/"(\w+)"/g)?.map((s) => s.replace(/"/g, '')) ?? [];
  const generated = /SettingSpec\(f"(\w+)_\{code\}",\s*"\w+",\s*"(\w+)"/.exec(source);
  if (generated) for (const code of locales) found.push({ key: `${generated[1]}_${code}`, group: generated[2] });
  return found;
}

describe('the tab covers every backend setting', { skip: spec === null ? 'backend not present' : false }, () => {
  const settings = backendSettings(spec ?? '');
  const dictionaries = { en, pl, de, es, ja } as const;

  it('finds the settings', () => {
    assert.ok(settings.length > 40, `parsed only ${settings.length} settings`);
    assert.ok(settings.some((s) => s.key === 'site_banner_text_ja'));
    assert.ok(settings.some((s) => s.key === 'rate_auth_per_minute'));
  });

  for (const [locale, dict] of Object.entries(dictionaries)) {
    it(`${locale}: every setting and group has its label and description`, () => {
      const admin = dict as Record<string, string | undefined>;
      const missing: string[] = [];
      for (const { key, group } of settings) {
        for (const name of [`config_${key}`, `config_${key}_desc`, `configGroup_${group}`, `configGroupDesc_${group}`]) {
          if (!admin[name]) missing.push(name);
        }
      }
      assert.deepEqual([...new Set(missing)], []);
    });
  }

  it('every group the backend uses has a place in the tab', () => {
    const unplaced = [...new Set(settings.map((s) => s.group))].filter((g) => !(SETTING_GROUP_ORDER as readonly string[]).includes(g));
    assert.deepEqual(unplaced, []);
  });

  it('every language has exactly the same keys and placeholders', () => {
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join(',');
    const reference = en as Record<string, string>;
    for (const [locale, dict] of Object.entries(dictionaries)) {
      const own = dict as Record<string, string>;
      assert.deepEqual(Object.keys(own).sort(), Object.keys(reference).sort(), `${locale}: keys differ from en`);
      for (const key of Object.keys(reference)) {
        assert.equal(placeholders(own[key]), placeholders(reference[key]), `${locale}.${key}: placeholders differ`);
      }
    }
  });

  it('choice labels exist for every banner level', () => {
    for (const dict of Object.values(dictionaries)) {
      const admin = dict as Record<string, string | undefined>;
      for (const level of ['info', 'warning', 'critical']) assert.ok(admin[`configChoice_${level}`], level);
    }
  });
});
