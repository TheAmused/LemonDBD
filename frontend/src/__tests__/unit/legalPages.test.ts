// frontend/src/__tests__/unit/legalPages.test.ts
//
// The Terms of Service and the Rules: one renderer, one registry, five locales, one registration gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { en, es, pl, de, ja } from '../../locales';
import { LEGAL_DOCS, legalSectionTone, type LegalDocId, type LegalDocText } from '@/components/legal/legalDocs';

const locales = { en, es, pl, de, ja } as const;
const docIds = Object.keys(LEGAL_DOCS) as LegalDocId[];
const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
/** Source without comment lines, so a comment cannot trip a pattern check. */
const code = (rel: string) => read(rel).split('\n').filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line)).join('\n');
const docOf = (dict: (typeof locales)[keyof typeof locales], id: LegalDocId) => dict[id] as unknown as LegalDocText;
const allText = (doc: LegalDocText) => [
  doc.tagline, doc.tldrNotice, ...doc.summary,
  ...Object.values(doc.sections).flatMap((s) => [s.tldr, ...s.paragraphs, ...s.items]),
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

test('legal documents: every locale has the same list sizes as English', () => {
  for (const id of docIds) {
    const base = docOf(en, id);
    for (const [loc, dict] of Object.entries(locales)) {
      const doc = docOf(dict, id);
      assert.equal(doc.summary.length, base.summary.length, `${loc}.${id}.summary`);
      for (const section of LEGAL_DOCS[id].order) {
        assert.equal(doc.sections[section].items.length, base.sections[section].items.length, `${loc}.${id}.${section}.items`);
        assert.equal(doc.sections[section].paragraphs.length, base.sections[section].paragraphs.length, `${loc}.${id}.${section}.paragraphs`);
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
      assert.ok(doc.numberLabel.includes('{n}'), `${loc}.${id}.numberLabel has {n}`);
      const contact = doc.sections[LEGAL_DOCS[id].contactSection].paragraphs.join(' ');
      assert.ok(contact.includes('{contactEmail}'), `${loc}.${id}: the contact section quotes {contactEmail}`);
    }
  }
});

test('legal documents: the headings and TL;DR lines are declared non-binding, in every locale and on the page and the dialog', () => {
  for (const id of docIds) {
    for (const [loc, dict] of Object.entries(locales)) assert.ok(docOf(dict, id).tldrNotice.length > 40, `${loc}.${id}.tldrNotice`);
  }
  assert.match(en.rules.tldrNotice, /not binding/i);
  assert.match(en.terms.tldrNotice, /no legal effect/i);
  assert.ok(read('components/legal/LegalDocPage.tsx').includes('<LegalNotice'), 'the page shows the notice');
  assert.ok(read('components/legal/LegalDocModal.tsx').includes('<LegalNotice'), 'the dialog shows the notice');
  assert.ok(read('components/legal/LegalDocPage.tsx').includes('text.translationNotice'), 'the page says which language version prevails');
  assert.ok(read('components/legal/LegalDocModal.tsx').includes('text.translationNotice'), 'the dialog says it too');
});

test('legal documents: the pages and the dialog render the same <LegalSections> and hold no document text of their own', () => {
  assert.ok(read('components/legal/LegalDocPage.tsx').includes('<LegalSections doc={doc} variant="page" />'));
  assert.ok(read('components/legal/LegalDocModal.tsx').includes('<LegalSections doc={shown} variant="modal" />'));
  assert.match(read('app/[locale]/rules/page.tsx'), /<LegalDocPage doc="rules" \/>/);
  assert.match(read('app/[locale]/terms-of-service/page.tsx'), /<LegalDocPage doc="terms" \/>/);
  for (const rel of ['app/[locale]/rules/page.tsx', 'app/[locale]/terms-of-service/page.tsx', 'components/legal/LegalDocPage.tsx', 'components/legal/LegalDocModal.tsx']) {
    assert.ok(!/\.sections\b/.test(code(rel)), `${rel}: section text is only read by LegalSections`);
  }
  assert.ok(!fs.existsSync(path.resolve(__dirname, '../../components/rules')), 'the old rules-only components are gone');
});

test('legal dialog: a read-only preview, with the X as its only way out and no subtitle, accept button or link out', () => {
  const modal = code('components/legal/LegalDocModal.tsx');
  assert.ok(!/subtitle=/.test(modal), 'no subtitle');
  assert.ok(!/footer=/.test(modal), 'no footer');
  assert.ok(!/<Button\b|buttonClassName|<Link\b|onAccept/.test(modal), 'no Close / Accept button and no link to the full page');
  assert.ok(modal.includes('closeButtonAriaLabel'), 'the header X is labelled');
  for (const [loc, dict] of Object.entries(locales)) {
    const rules = dict.rules as Record<string, unknown>;
    assert.ok(!('openFullPage' in rules) && !('acceptButton' in rules), `${loc}: the dialog strings are gone`);
  }
});

test('Terms, Privacy Policy and Rules share one page frame and one card', () => {
  assert.ok(read('app/[locale]/privacy-policy/page.tsx').includes('<LegalPageLayout'));
  assert.ok(read('components/legal/LegalDocPage.tsx').includes('<LegalPageLayout'));
  assert.ok(read('components/legal/LegalSections.tsx').includes('BlockCardPair'));
  assert.match(read('app/[locale]/terms-of-service/layout.tsx'), /pageMetadata\('\/terms-of-service'/);
  assert.match(read('app/[locale]/rules/layout.tsx'), /pageMetadata\('\/rules'/);
});

test('about page: Terms, Privacy Policy and Rules pills sit in one wrapping row, Rules right after Privacy', () => {
  const about = read('app/[locale]/about/page.tsx');
  assert.match(about, /terms-of-service`[\s\S]{0,300}privacy-policy`[\s\S]{0,300}\/rules`/, 'the three pills are adjacent, in that order');
  for (const key of ['dict.terms.heading', 'dict.privacy.heading', 'dict.rules.heading']) assert.ok(about.includes(key), `${key} labels a pill`);
  assert.match(about, /flex flex-wrap items-center justify-center gap-3[\s\S]{0,200}LegalLinkPill/, 'pills share a wrapping flex row');
});

test('registration: the required checkbox covers both documents and gates sign-up', () => {
  const auth = code('components/AuthModal.tsx');
  assert.match(auth, /<Checkbox[\s\S]*?invalid=\{showLegalError\}/, 'an unticked box is flagged with the site error style');
  assert.ok(!/<Checkbox[^>]*\brequired\b/.test(auth), 'no native validation bubble');
  assert.ok(auth.includes('<LegalDocModal'), 'the preview dialog is mounted');
  assert.match(auth, /if \(!acceptedLegal\)\s*\{\s*setLegalAttempted\(true\);\s*return;/, 'submit is blocked');
  assert.match(auth, /role="alert"[^>]*>\s*\{dict\.user\.legalNotAccepted\}/, 'with an inline message under the checkbox');
  assert.ok(auth.indexOf('!acceptedLegal') < auth.indexOf('await register('), 'the check runs before the request');
  assert.ok(auth.includes("setLegalDoc(part === '{terms}' ? 'terms' : 'rules')"), 'each link previews its own document');
  assert.ok(auth.includes("mode === 'register'"), 'only the register form shows it');
});

test('registration label: every locale places a terms link and a rules link, once each', () => {
  for (const [loc, dict] of Object.entries(locales)) {
    assert.equal(countOf(dict.user.acceptLegalLabel, '{terms}'), 1, `${loc}: {terms}`);
    assert.equal(countOf(dict.user.acceptLegalLabel, '{rules}'), 1, `${loc}: {rules}`);
    for (const key of ['acceptTermsLink', 'acceptRulesLink', 'legalNotAccepted'] as const) assert.ok(dict.user[key].length > 0, `${loc}.${key}`);
    assert.ok(!('acceptRulesLabel' in (dict.user as Record<string, unknown>)), `${loc}: the old single-document label is gone`);
  }
});

test('Checkbox: `invalid` gives the box the site error ring and aria-invalid', () => {
  const checkbox = read('components/common/Checkbox.tsx');
  assert.match(checkbox, /invalid\?: boolean/);
  assert.match(checkbox, /aria-invalid=\{invalid \|\| undefined\}/);
  assert.match(checkbox, /invalid && 'ring-2 ring-accent-red'/);
});

test('legal documents: cards carry no icons (only the "Rule N" / "Section N" eyebrow) and titles are centred', () => {
  const sections = read('components/legal/LegalSections.tsx');
  const page = read('components/legal/LegalDocPage.tsx');
  assert.ok(!sections.includes('lucide-react'), 'LegalSections draws no icons');
  assert.ok(!page.includes('lucide-react'), 'the page draws no icons');
  assert.ok(!page.includes('LegalLinkPill'), 'no pill at the foot of the page');
  assert.match(sections, /centered: true/, 'page cards centre their titles');
  assert.match(sections, /<BlockTitle[^>]*\bcentered\b/, 'dialog titles are centred too');
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

test('legal documents: cards use only the site accents (red and amber)', () => {
  const sections = read('components/legal/LegalSections.tsx');
  const cards = read('components/common/BlockCard.tsx');
  const banned = /accent-(cyan|rose|green|purple|indigo|blue|pink)/;
  assert.ok(!banned.test(sections), 'LegalSections uses no other accent');
  assert.ok(!banned.test(cards), 'BlockCard offers no other accent');
  assert.match(cards, /BlockTone = 'red' \| 'amber'/);
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
  assert.match(read('components/legal/LegalSections.tsx'), /id: 'summary'[\s\S]{0,200}tone: 'amber'/, 'the summary is golden');
});

test('Terms: the claims they make about the site are backed by the code', () => {
  // Self-service account deletion exists, as the Terms and the Privacy Policy say.
  assert.match(en.terms.sections.termination.paragraphs[0], /delete your account yourself/);
  assert.match(en.privacy.sections.rights.paragraphs.join(' '), /delete your account yourself/);
  // Registration enforces a minimum age of 13 in the documents, not in a field: the number must agree everywhere.
  assert.match(en.terms.sections.accounts.items[0], /13/);
  assert.match(en.privacy.sections.children.paragraphs.join(' '), /under 13/);
});
