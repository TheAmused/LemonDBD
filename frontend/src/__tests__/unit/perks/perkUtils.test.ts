// frontend/src/__tests__/unit/perks/perkUtils.test.ts
// frontend/src/utils/__tests__/perkUtils.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  sanitizePath,
  sanitizeCharacterNameForAvatar,
  getPerkIconUrl,
  getCharacterAvatarUrl,
  formatPerkSlug,
  normalizeSearchText,
} from '@/utils/perkUtils';
import { staticUrl, sanitizeName, avatarUrlForCharacter, perkIconUrl } from '@/utils/staticUrl';

test('perkUtils: sanitizePath strips leading slash and static/ prefix', () => {
  assert.strictEqual(sanitizePath('/static/avatars/survivors/dwight.png'), 'avatars/survivors/dwight.png');
  assert.strictEqual(sanitizePath('static/icons/perk.png'), 'icons/perk.png');
  assert.strictEqual(sanitizePath('/icons/perk.png'), 'icons/perk.png');
  assert.strictEqual(sanitizePath('icons/perk.png'), 'icons/perk.png');
});

test('perkUtils: sanitizeCharacterNameForAvatar handles symbols, spaces, and punctuation', () => {
  assert.strictEqual(sanitizeCharacterNameForAvatar('Dwight Fairfield'), 'dwight_fairfield');
  assert.strictEqual(sanitizeCharacterNameForAvatar('The Shape (Michael Myers)'), 'the_shape_(michael_myers)');
  assert.strictEqual(sanitizeCharacterNameForAvatar("The Cenobite / Pinhead"), 'the_cenobite_pinhead');
  assert.strictEqual(sanitizeCharacterNameForAvatar('  Feng Min  '), 'feng_min');
  assert.strictEqual(sanitizeCharacterNameForAvatar('A---B___C'), 'a_b_c');
});

test('perkUtils: formatPerkSlug converts perk name to valid slug', () => {
  assert.strictEqual(formatPerkSlug("A Nurse's Calling"), "a_nurse's_calling");
  assert.strictEqual(formatPerkSlug('Dead Hard'), 'dead_hard');
  assert.strictEqual(formatPerkSlug('Hex: Ruin'), 'hex:_ruin');
});

test('perkUtils: getPerkIconUrl resolves local and remote URLs', () => {
  const base = 'https://api.lemondbd.com';
  assert.strictEqual(
    getPerkIconUrl({ icon_local_path: 'icons/sprint_burst.png', icon_url: 'https://wiki.dbd/icon.png' }, base),
    'https://api.lemondbd.com/static/icons/sprint_burst.png'
  );
  assert.strictEqual(
    getPerkIconUrl({ icon_local_path: '', icon_url: 'https://wiki.dbd/icon.png' }, base),
    'https://wiki.dbd/icon.png'
  );
  assert.strictEqual(getPerkIconUrl(null, base), null);
});

test('perkUtils: getCharacterAvatarUrl handles general and specific character avatars', () => {
  const base = 'https://api.lemondbd.com';
  // General perk returns null for character avatar
  assert.strictEqual(
    getCharacterAvatarUrl(
      { character: 'General', category: 'Survivor', character_avatar_path: undefined, is_generic_counterpart: false },
      'Survivor',
      base
    ),
    null
  );
  assert.strictEqual(
    getCharacterAvatarUrl(
      { character: 'Sprint Burst', category: 'Survivor', character_avatar_path: undefined, is_generic_counterpart: true },
      'Survivor',
      base
    ),
    null
  );

  // Survivor avatar fallback
  assert.strictEqual(
    getCharacterAvatarUrl({ character: 'Meg Thomas', category: 'Survivor', character_avatar_path: undefined, is_generic_counterpart: false }, 'Survivor', base),
    'https://api.lemondbd.com/static/avatars/survivors/meg_thomas.webp'
  );

  // Killer avatar fallback
  assert.strictEqual(
    getCharacterAvatarUrl({ character: 'The Trapper', category: 'Killer', character_avatar_path: undefined, is_generic_counterpart: false }, 'Killer', base),
    'https://api.lemondbd.com/static/avatars/killers/the_trapper.webp'
  );
});

test('staticUrl utilities: staticUrl, sanitizeName, avatarUrlForCharacter, perkIconUrl', () => {
  assert.strictEqual(staticUrl(null), undefined);
  assert.strictEqual(staticUrl('https://example.com/image.png'), 'https://example.com/image.png');
  assert.ok(staticUrl('icons/perk.png')?.endsWith('/static/icons/perk.png'));

  assert.strictEqual(sanitizeName('The Ghost Face'), 'the_ghost_face');
  assert.ok(avatarUrlForCharacter('The Nurse', 'killers')?.includes('/static/avatars/killers/the_nurse.webp'));
  assert.ok(avatarUrlForCharacter('Dwight Fairfield', 'survivors')?.includes('/static/avatars/survivors/dwight_fairfield.webp'));

  assert.strictEqual(perkIconUrl({ icon_local_path: null, icon_url: 'https://cdn.dbd/icon.png' }), 'https://cdn.dbd/icon.png');
});

test('perkUtils: getCharacterAvatarUrl resolves character aliases for Leon, Bill, Aestri, Tapp', () => {
  const base = 'https://api.lemondbd.com';
  
  // Leon S. Kennedy -> leon_scott_kennedy.webp
  assert.strictEqual(
    getCharacterAvatarUrl({ character: 'Leon S. Kennedy', category: 'Survivor' }, 'Survivor', base),
    'https://api.lemondbd.com/static/avatars/survivors/leon_scott_kennedy.webp'
  );
  
  // William "Bill" Overbeck -> bill_overbeck.webp
  assert.strictEqual(
    getCharacterAvatarUrl({ character: 'William "Bill" Overbeck', category: 'Survivor' }, 'Survivor', base),
    'https://api.lemondbd.com/static/avatars/survivors/bill_overbeck.webp'
  );

  // Aestri Yazar -> the_troupe.webp
  assert.strictEqual(
    getCharacterAvatarUrl({ character: 'Aestri Yazar', category: 'Survivor' }, 'Survivor', base),
    'https://api.lemondbd.com/static/avatars/survivors/the_troupe.webp'
  );

  // Detective Tapp -> david_tapp.webp
  assert.strictEqual(
    getCharacterAvatarUrl({ character: 'Detective Tapp', category: 'Survivor' }, 'Survivor', base),
    'https://api.lemondbd.com/static/avatars/survivors/david_tapp.webp'
  );

  // Ashley J. Williams -> ash_williams.webp
  assert.strictEqual(
    getCharacterAvatarUrl({ character: 'Ashley J. Williams', category: 'Survivor' }, 'Survivor', base),
    'https://api.lemondbd.com/static/avatars/survivors/ash_williams.webp'
  );
});

test('perkUtils: normalizeSearchText folds letters NFD keeps whole (ł, ø, ß)', () => {
  assert.strictEqual(normalizeSearchText('Wieśniak'), 'wiesniak');
  assert.strictEqual(normalizeSearchText('Przełom'), 'przelom');
  assert.strictEqual(normalizeSearchText('Bjørn'), 'bjorn');
});

test('perkUtils: normalizeSearchText strips accents and converts to lowercase', () => {
  assert.strictEqual(normalizeSearchText('Élodie Rakoto'), 'elodie rakoto');
  assert.strictEqual(normalizeSearchText('  Pośpiech  '), 'pospiech');
  assert.strictEqual(normalizeSearchText('DEAD HARD'), 'dead hard');
});
