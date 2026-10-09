// frontend/src/__tests__/unit/formValidation.test.ts
//
// The browser's native "Please fill out this field." bubble must never reach the
// user: FormValidationProvider swallows it and shows our own, localized message.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { en, es, pl, de, ja } from '../../locales';
import { placeholderNames } from '@/utils/i18nFormat';
import { getValidationMessage, type ValidatableControl } from '@/utils/formValidation';

const locales = { en, es, pl, de, ja } as const;
const SRC = path.resolve(__dirname, '../..');
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

test('the root layout mounts the validation provider (otherwise native bubbles come back)', () => {
  const layout = fs.readFileSync(path.join(SRC, 'app/[locale]/layout.tsx'), 'utf-8');
  assert.match(layout, /<FormValidationProvider\s*\/>/);
});

test('the provider cancels the native bubble (preventDefault on `invalid`, captured on the document)', () => {
  const src = fs.readFileSync(path.join(SRC, 'components/common/FormValidation.tsx'), 'utf-8');
  assert.match(src, /addEventListener\('invalid',\s*onInvalid,\s*true\)/);
  assert.match(src, /e\.preventDefault\(\)/);
});

test('no native browser dialogs (alert / confirm / prompt) anywhere in the app', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== '__tests__' && e.name !== 'node_modules') walk(full);
      } else if (/\.(ts|tsx)$/.test(e.name)) files.push(full);
    }
  };
  walk(SRC);
  const NATIVE = /(?<![\w.$])(?:window\.)?(?:alert|confirm|prompt)\s*\(/;
  const bad: string[] = [];
  for (const f of files) {
    fs.readFileSync(f, 'utf-8').split(/\r?\n/).forEach((line, i) => {
      const code = line.replace(/\/\/.*$/, '');
      // `confirm()` as a local function (DeleteAccountSection) is fine: only the window.* forms and bare alert/prompt are native.
      if (/window\.(alert|confirm|prompt)\s*\(/.test(code) || /(?<![\w.$])(alert|prompt)\s*\(/.test(code)) {
        if (NATIVE.test(code)) bad.push(`${path.relative(SRC, f)}:${i + 1}  ${line.trim().slice(0, 90)}`);
      }
    });
  }
  assert.deepEqual(bad, [], `native browser dialogs found:\n${bad.join('\n')}`);
});
