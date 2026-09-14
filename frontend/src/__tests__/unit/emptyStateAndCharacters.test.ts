// frontend/src/__tests__/unit/emptyStateAndCharacters.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import enEmpty from '../../locales/en/empty';
import plEmpty from '../../locales/pl/empty';
import deEmpty from '../../locales/de/empty';
import esEmpty from '../../locales/es/empty';
import jaEmpty from '../../locales/ja/empty';
import enChar from '../../locales/en/characterDetail';
import plChar from '../../locales/pl/characterDetail';
import deChar from '../../locales/de/characterDetail';
import esChar from '../../locales/es/characterDetail';
import jaChar from '../../locales/ja/characterDetail';

describe('Empty State & Character Not Found Translations', () => {
  it('defines character-specific empty state keys across all 5 locales', () => {
    const emptyLocales = [enEmpty, plEmpty, deEmpty, esEmpty, jaEmpty];
    for (const loc of emptyLocales) {
      assert.ok('charactersTitle' in loc, 'charactersTitle must exist');
      assert.ok('charactersSubtitle' in loc, 'charactersSubtitle must exist');
      assert.notEqual(loc.charactersTitle, loc.title, 'charactersTitle must differ from perk title');
    }
  });

  it('provides correct Polish translation for missing characters and perks', () => {
    assert.equal(plEmpty.title, 'Nie znaleziono umiejętności');
    assert.equal(plEmpty.charactersTitle, 'Nie znaleziono postaci');
    assert.equal(plChar.noCharactersFound, 'Nie znaleziono postaci');
  });

  it('defines noCharactersFound across all characterDetail locale files', () => {
    assert.equal(enChar.noCharactersFound, 'No Characters Found');
    assert.equal(plChar.noCharactersFound, 'Nie znaleziono postaci');
    assert.equal(deChar.noCharactersFound, 'Keine Charaktere gefunden');
    assert.equal(esChar.noCharactersFound, 'No se encontraron personajes');
    assert.equal(jaChar.noCharactersFound, 'キャラクターが見つかりません');
  });
});
