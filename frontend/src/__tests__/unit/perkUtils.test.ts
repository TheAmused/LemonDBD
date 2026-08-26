// frontend/src/utils/__tests__/perkUtils.test.ts
import test from 'node:test';
import assert from 'node:assert';
import {
  sanitizePath,
  sanitizeCharacterNameForAvatar,
  getPerkIconUrl,
  getCharacterAvatarUrl,
  formatPerkSlug,
  getBackendBaseUrl,
} from '@/utils/perkUtils';
import { staticUrl, sanitizeName, avatarUrlForCharacter, perkIconUrl } from '@/utils/staticUrl';
import {
  DBD_KEYWORDS,
  createDbdTokenRegex,
  createPerkTokenRegex,
  renderFormattedDbdText,
} from '@/utils/textFormatter';

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
    'https://api.lemondbd.com/static/avatars/survivors/meg_thomas.png'
  );

  // Killer avatar fallback
  assert.strictEqual(
    getCharacterAvatarUrl({ character: 'The Trapper', category: 'Killer', character_avatar_path: undefined, is_generic_counterpart: false }, 'Killer', base),
    'https://api.lemondbd.com/static/avatars/killers/the_trapper.png'
  );
});

test('staticUrl utilities: staticUrl, sanitizeName, avatarUrlForCharacter, perkIconUrl', () => {
  assert.strictEqual(staticUrl(null), undefined);
  assert.strictEqual(staticUrl('https://example.com/image.png'), 'https://example.com/image.png');
  assert.ok(staticUrl('icons/perk.png')?.endsWith('/static/icons/perk.png'));

  assert.strictEqual(sanitizeName('The Ghost Face'), 'the_ghost_face');
  assert.ok(avatarUrlForCharacter('The Nurse', 'killers')?.includes('/static/avatars/killers/the_nurse.png'));
  assert.ok(avatarUrlForCharacter('Dwight Fairfield', 'survivors')?.includes('/static/avatars/survivors/dwight_fairfield.png'));

  assert.strictEqual(perkIconUrl({ icon_local_path: null, icon_url: 'https://cdn.dbd/icon.png' }), 'https://cdn.dbd/icon.png');
});

test('textFormatter: token regex matches multilingual DBD keywords', () => {
  assert.ok(DBD_KEYWORDS.length > 50, 'Keywords list must be comprehensive');
  assert.ok(DBD_KEYWORDS.includes('Exhausted'));
  assert.ok(DBD_KEYWORDS.includes('Exposed'));
  assert.ok(DBD_KEYWORDS.includes('Hex:'));
  assert.ok(DBD_KEYWORDS.includes('Boon:'));
  assert.ok(DBD_KEYWORDS.includes('Terror Radius'));

  const regex = createDbdTokenRegex();
  assert.ok(regex instanceof RegExp);
  assert.ok(regex.test('Causes the Exhausted Status Effect for 40 seconds.'));
  assert.ok(regex.test('Increases movement speed by 150%.'));

  const perkRegex = createPerkTokenRegex('Sprint Burst');
  assert.ok(perkRegex.test('When using Sprint Burst, break into a sprint.'));
});

test('textFormatter: renderFormattedDbdText handles plain text, quotes, and bullet items', () => {
  const plain = renderFormattedDbdText('Simple perk effect text.');
  assert.ok(plain);

  const withQuote = renderFormattedDbdText('Standard text.\n\n"Quotes from survivors give lore context." - Meg Thomas');
  assert.ok(withQuote);

  const withBullets = renderFormattedDbdText('Perk effects:\n• Effect 1 increases speed\n• Effect 2 reveals aura');
  assert.ok(withBullets);

  const eventNotice = renderFormattedDbdText('THIS ITEM IS NO LONGER AVAILABLE IN THE BLOODWEB');
  assert.ok(eventNotice);

  const htmlList = renderFormattedDbdText(
    'Effects:<ul><li>Zyskujesz <b>10/12.5/15%</b> efektu <b>Pośpiech</b> przez 3 s.</li><li>Paleta jest zablokowana przez 60 s.</li></ul><br><br>Czas odnawiania: 60 s.'
  );
  assert.ok(htmlList);

  const inputToken = renderFormattedDbdText(
    'Użyj {Input.ActivatableButton2}, aby aktywować moc.'
  );
  assert.ok(inputToken);

  const naturalButtons = renderFormattedDbdText(
    'While next to a Dropped Pallet, use Active Ability Button 1 for 5/4/3s to reset it.\n\n“I’ll hit you with everything I’ve got. Then I’ll do it again.” -Yui Kimura'
  );
  assert.ok(naturalButtons);

  const polishButtons = renderFormattedDbdText(
    'Będąc obok przewróconej palety, użyj przycisk zdolności aktywnej 1 przez 5/4/3 s aby ją zresetować.\n\n„Zaatakuję cię wszystkim, co mam. Później zrobię to jeszcze raz”. – Yui Kimura'
  );
  assert.ok(polishButtons);
});