// frontend/src/__tests__/unit/shared/formValidation.test.ts
//
// The browser's native "Please fill out this field." bubble must never reach the
// user: FormValidationProvider swallows it and shows our own, localized message.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { en, es, pl, de, ja } from '../../../locales';
import { placeholderNames } from '@/utils/i18nFormat';
import { getValidationMessage, type ValidatableControl } from '@/utils/formValidation';

const locales = { en, es, pl, de, ja } as const;
const t = en.validation;

const NONE = {
  customError: false,
  valueMissing: false,
  typeMismatch: false,
  tooShort: false,
  tooLong: false,
  rangeUnderflow: false,
  rangeOverflow: false,
  stepMismatch: false,
  badInput: false,
  patternMismatch: false,
};
const control = (over: Partial<ValidatableControl> & { fails?: Partial<typeof NONE> }): ValidatableControl => {
  const { fails, ...rest } = over;
  return { tagName: 'INPUT', type: 'text', validity: { ...NONE, ...fails }, ...rest };
};

test('getValidationMessage: empty required fields, by control kind', () => {
  assert.equal(getValidationMessage(control({ fails: { valueMissing: true } }), t), t.valueMissing);
  assert.equal(getValidationMessage(control({ type: 'checkbox', fails: { valueMissing: true } }), t), t.valueMissingCheckbox);
  assert.equal(getValidationMessage(control({ tagName: 'SELECT', type: 'select-one', fails: { valueMissing: true } }), t), t.valueMissingSelect);
});

test('getValidationMessage: type mismatches', () => {
  assert.equal(getValidationMessage(control({ type: 'email', fails: { typeMismatch: true } }), t), t.typeMismatchEmail);
  assert.equal(getValidationMessage(control({ type: 'url', fails: { typeMismatch: true } }), t), t.typeMismatchUrl);
  assert.equal(getValidationMessage(control({ type: 'tel', fails: { typeMismatch: true } }), t), t.invalidValue);
});

test('getValidationMessage: length and range limits carry their number', () => {
  assert.equal(getValidationMessage(control({ minLength: 8, fails: { tooShort: true } }), t), 'Use at least 8 characters.');
  assert.equal(getValidationMessage(control({ maxLength: 64, fails: { tooLong: true } }), t), 'Use at most 64 characters.');
  assert.equal(getValidationMessage(control({ type: 'number', min: '1', fails: { rangeUnderflow: true } }), t), 'Enter 1 or more.');
  assert.equal(getValidationMessage(control({ type: 'number', max: '4', fails: { rangeOverflow: true } }), t), 'Enter 4 or less.');
});

test('getValidationMessage: pattern uses the author title when there is one; custom messages pass through', () => {
  assert.equal(getValidationMessage(control({ title: 'Letters only', fails: { patternMismatch: true } }), t), 'Letters only');
  assert.equal(getValidationMessage(control({ fails: { patternMismatch: true } }), t), t.patternMismatch);
  assert.equal(getValidationMessage(control({ validationMessage: 'Taken already', fails: { customError: true } }), t), 'Taken already');
  assert.equal(getValidationMessage(control({}), t), t.invalidValue);
});

test('validation messages: every locale has the same keys and the same {placeholders}', () => {
  const keys = Object.keys(en.validation).sort();
  for (const [loc, dict] of Object.entries(locales)) {
    const v = dict.validation as Record<string, string>;
    assert.deepEqual(Object.keys(v).sort(), keys, `${loc}: same message keys as English`);
    for (const key of keys) {
      assert.ok(v[key].trim().length > 0, `${loc}.${key} is not empty`);
      assert.deepEqual(
        placeholderNames(v[key]).sort(),
        placeholderNames((en.validation as Record<string, string>)[key]).sort(),
        `${loc}.${key} keeps the same placeholders`
      );
    }
  }
});
