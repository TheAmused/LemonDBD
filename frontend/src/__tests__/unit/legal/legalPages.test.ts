// frontend/src/__tests__/unit/legal/legalPages.test.ts
//
// The Terms of Service and the Rules as data: one registry, five locales, the same shape everywhere.
// Rendered behaviour (page, dialog, about-page links, the sign-up gate) is in legalRendering.test.tsx
// and auth/registrationConsent.test.tsx; the single-renderer rule is guards/legalDocs.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { en, es, pl, de, ja } from '../../../locales';
import { LEGAL_DOCS, legalSectionTone, type LegalDocId, type LegalDocText } from '@/components/legal/legalDocs';

const locales = { en, es, pl, de, ja } as const;
const docIds = Object.keys(LEGAL_DOCS) as LegalDocId[];
const docOf = (dict: (typeof locales)[keyof typeof locales], id: LegalDocId) => dict[id] as unknown as LegalDocText;
const allText = (doc: LegalDocText) => [
  doc.tagline, doc.tldrNotice, ...doc.summary,
  ...Object.values(doc.sections).flatMap((s) => [s.tldr, ...s.paragraphs, ...s.items, ...(s.closing ?? [])]),
];
const countOf = (text: string, needle: string) => text.split(needle).length - 1;

test('legal documents: the registry lists exactly the sections that exist, with text, in every locale', () => {
  assert.deepEqual(docIds.sort(), ['rules', 'terms']);
  for (const id of docIds) {
    const order = LEGAL_DOCS[id].order;
    assert.ok(order.length >= 8, `${id}: the registry lists its sections`);
    for (const [loc, dict] of Object.entries(locales)) {
      const doc = docOf(dict, id);
      assert.deepEqual(Object.keys(doc.sections).sort(), [...order].sort(), `${loc}.${id}: sections match the registry`);
      for (const section of order) {
        const s = doc.sections[section];
        assert.ok(s.heading.length > 0, `${loc}.${id}.${section}.heading`);
        assert.ok(s.tldr.length > 0, `${loc}.${id}.${section}.tldr`);
        assert.ok(s.paragraphs.length > 0, `${loc}.${id}.${section}.paragraphs`);
        assert.ok(Array.isArray(s.items), `${loc}.${id}.${section}.items`);
      }
    }
  }
});

test('legal documents: the TL;DR notice says the summaries are not binding, in every locale', () => {
  for (const id of docIds) {
    for (const [loc, dict] of Object.entries(locales)) assert.ok(docOf(dict, id).tldrNotice.length > 40, `${loc}.${id}.tldrNotice`);
  }
  assert.match(en.rules.tldrNotice, /not binding/i);
  assert.match(en.terms.tldrNotice, /only the full text below them is legally binding/i);
});

test('legal documents: every locale has the same list sizes as English', () => {
  for (const id of docIds) {
    const base = docOf(en, id);
    for (const [loc, dict] of Object.entries(locales)) {
      const doc = docOf(dict, id);
      assert.equal(doc.summary.length, base.summary.length, `${loc}.${id}.summary`);
      for (const section of LEGAL_DOCS[id].order) {
        assert.equal(doc.sections[section].items.length, base.sections[section].items.length, `${loc}.${id}.${section}.items`);
        assert.equal(doc.sections[section].paragraphs.length, base.sections[section].paragraphs.length, `${loc}.${id}.${section}.paragraphs`);
        assert.equal((doc.sections[section].closing ?? []).length, (base.sections[section].closing ?? []).length, `${loc}.${id}.${section}.closing`);
      }
    }
  }
  for (const [loc, dict] of Object.entries(locales)) {
    assert.equal(dict.rules.hookStages.stages.length, en.rules.hookStages.stages.length, `${loc}.rules.hookStages`);
  }
});

test('legal documents: placeholders are the known ones and are kept in every locale', () => {
  const known = new Set(['contactEmail', 'termsPath', 'rulesPath', 'privacyPath']);
  for (const id of docIds) {
    const base = allText(docOf(en, id)).join('\n');
    for (const [loc, dict] of Object.entries(locales)) {
      const doc = docOf(dict, id);
      const text = allText(doc).join('\n');
      for (const [, name] of text.matchAll(/\{(\w+)\}/g)) assert.ok(known.has(name), `${loc}.${id}: unknown placeholder {${name}}`);
      for (const name of known) assert.equal(countOf(text, `{${name}}`), countOf(base, `{${name}}`), `${loc}.${id}: {${name}} count`);
      const contact = doc.sections[LEGAL_DOCS[id].contactSection].paragraphs.join(' ');
      assert.ok(contact.includes('{contactEmail}'), `${loc}.${id}: the contact section quotes {contactEmail}`);
    }
  }
});

test('registration label: every locale places a terms link and a rules link, once each', () => {
  for (const [loc, dict] of Object.entries(locales)) {
    assert.equal(countOf(dict.user.acceptLegalLabel, '{terms}'), 1, `${loc}: {terms}`);
    assert.equal(countOf(dict.user.acceptLegalLabel, '{rules}'), 1, `${loc}: {rules}`);
    for (const key of ['acceptTermsLink', 'acceptRulesLink', 'legalNotAccepted'] as const) assert.ok(dict.user[key].length > 0, `${loc}.${key}`);
    assert.ok(!('acceptRulesLabel' in (dict.user as Record<string, unknown>)), `${loc}: the old single-document label is gone`);
  }
});

test('rules: what the server stores (avatars, bug reports) is kept apart from what stays in the browser', () => {
  for (const [loc, dict] of Object.entries(locales)) {
    assert.equal(dict.rules.sections.yourContent.paragraphs.length, 2, `${loc}: one paragraph stored, one not stored`);
  }
  const [stored, notStored] = en.rules.sections.yourContent.paragraphs;
  assert.match(stored, /avatar/i);
  assert.match(stored, /bug report/i);
  assert.ok(!/tier list|roster|minigame/i.test(stored), 'the stored paragraph does not claim shared lists');
  assert.match(notStored, /tier lists/i);
  assert.match(notStored, /browser/i);
  const termsContent = en.terms.sections.content.paragraphs.join(' ');
  assert.match(termsContent, /your own browser/i, 'the Terms say the same');
});

test('legal documents: both cover the Discord server, in every locale', () => {
  for (const [loc, dict] of Object.entries(locales)) {
    assert.ok(dict.rules.sections.scope.paragraphs.join(' ').includes('Discord'), `${loc}: Rules scope names Discord`);
    assert.ok(dict.rules.summary.some((line) => line.includes('Discord')), `${loc}: the Rules summary says it applies on Discord`);
    assert.ok(dict.terms.sections.about.paragraphs.join(' ').includes('Discord'), `${loc}: Terms about names Discord`);
  }
});

test('legal documents: both cards of a row share one colour, and the rows alternate red / golden', () => {
  for (const id of docIds) {
    const n = LEGAL_DOCS[id].order.length;
    assert.equal(n % 2, 0, `${id}: cards pair up`);
    const tones = Array.from({ length: n }, (_, i) => legalSectionTone(i));
    for (let i = 0; i < n; i += 2) {
      assert.equal(tones[i], tones[i + 1], `${id} row ${i / 2 + 1}: both cards share a colour`);
      if (i > 0) assert.notEqual(tones[i], tones[i - 2], `${id} row ${i / 2 + 1} differs from the row above`);
    }
    assert.equal(tones[0], 'red', `${id}: the first row is red, below the golden summary`);
  }
});

test('Terms: the claims they make about the site are backed by the code', () => {
  // Self-service account deletion exists, as the Terms and the Privacy Policy say.
  assert.match(en.terms.sections.termination.paragraphs[0], /delete your account yourself/);
  assert.match(en.privacy.sections.rights.paragraphs.join(' '), /delete your account yourself/);
  // Registration enforces a minimum age of 18 in the documents, not in a field: the number must agree everywhere.
  assert.match(en.terms.sections.accounts.items[0], /18/);
  assert.match(en.privacy.sections.children.paragraphs.join(' '), /under 18/);
});
