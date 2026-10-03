// frontend/src/__tests__/unit/emptyStateAndCharacters.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import plEmpty from '../../locales/pl/empty';
import enChar from '../../locales/en/characterDetail';
import plChar from '../../locales/pl/characterDetail';
import deChar from '../../locales/de/characterDetail';
import esChar from '../../locales/es/characterDetail';
import jaChar from '../../locales/ja/characterDetail';

describe('Empty State & Character Not Found Translations', () => {
  it('provides correct Polish translation for missing characters and perks', () => {
    assert.equal(plEmpty.title, 'Nie znaleziono umiejętności');
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
