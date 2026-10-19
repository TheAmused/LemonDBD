// frontend/src/__tests__/unit/characterCardLink.test.ts
// A character tile is a real link (keyboard, middle-click, crawlers), or a real toggle button in ownership mode.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const card = readFileSync(path.join(__dirname, '../../components/characters/hub/CharacterCard.tsx'), 'utf8');

test('the tile navigates through a <Link href>, not router.push on a div', () => {
  assert.match(card, /<Link\s+href=\{detailHref\}/);
  assert.doesNotMatch(card, /router\.push/);
  assert.doesNotMatch(card, /<Surface[^>]*onClick=/);
});

test('ownership mode toggles through a button that reports its state', () => {
  assert.match(card, /<button\s+type="button"\s+aria-pressed=\{isOwned\}/);
});
