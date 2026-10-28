// frontend/src/__tests__/unit/tarotCards.test.ts
//
// Every Tarot card a perk can be dealt as needs its art (back and face) on disk and a
// name in every language. A missing file only shows up in the app as a silent
// fallback to the plain card, so it is checked here.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import de from '@/locales/de';
import en from '@/locales/en';
import es from '@/locales/es';
import ja from '@/locales/ja';
import pl from '@/locales/pl';
import type { RoleCategory } from '@/types/perks';
import { PERK_TYPES } from '@/utils/perkTypes';
import { DEFAULT_TYPE_NAMES, tarotCard, tarotImageUrl } from '@/components/generator/lib/tarotCards';

const PUBLIC_DIR = path.resolve(__dirname, '../../../public');
const ROLES: readonly RoleCategory[] = ['Survivor', 'Killer'];
const LOCALES = { de, en, es, ja, pl };

describe('tarot cards', () => {
  it('has a back and a face image on disk for every type on both sides', () => {
    const missing: string[] = [];
    for (const type of PERK_TYPES) {
      for (const role of ROLES) {
        for (const side of ['back', 'face'] as const) {
          const url = tarotImageUrl(tarotCard(type, role).slug, side);
          if (!fs.existsSync(path.join(PUBLIC_DIR, url))) missing.push(`${type}/${role}/${side}: ${url}`);
        }
      }
    }
    assert.deepEqual(missing, []);
  });

  it('deals the Killer side of healing and the two sides of totems as their own cards', () => {
    assert.deepEqual(tarotCard('healing', 'Survivor'), { name: 'healing', slug: 'caregiver' });
    assert.deepEqual(tarotCard('healing', 'Killer'), { name: 'tormentor', slug: 'tormentor' });
    assert.deepEqual(tarotCard('totem', 'Survivor'), { name: 'totem', slug: 'totems-survivor' });
    assert.deepEqual(tarotCard('totem', 'Killer'), { name: 'totem', slug: 'totems-killer' });
  });

  it('names every card in every language, matching the English defaults', () => {
    const expected = Object.keys(DEFAULT_TYPE_NAMES).sort();
    for (const [locale, dict] of Object.entries(LOCALES)) {
      assert.deepEqual(Object.keys(dict.generator.tarotCardNames).sort(), expected, `[${locale}] tarotCardNames keys`);
    }
    assert.deepEqual(en.generator.tarotCardNames, DEFAULT_TYPE_NAMES);
  });

  it('uses no art file that no card refers to', () => {
    const used = new Set<string>();
    for (const type of PERK_TYPES) for (const role of ROLES) used.add(`the-${tarotCard(type, role).slug}.webp`);
    const onDisk = fs.readdirSync(path.join(PUBLIC_DIR, 'images/tarot')).filter((f) => f.endsWith('.webp'));
    assert.deepEqual(onDisk.filter((f) => !used.has(f)).sort(), []);
  });
});
