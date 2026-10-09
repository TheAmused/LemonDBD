// frontend/src/__tests__/unit/rulesPage.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { en, es, pl, de, ja } from '../../locales';

const locales = { en, es, pl, de, ja } as const;
const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');

const sectionsSrc = read('components/rules/RulesSections.tsx');
const blockIds = [...sectionsSrc.matchAll(/\{ id: '(\w+)', tone:/g)].map((m) => m[1]).filter((id) => id !== 'summary');

test('rules: every block the renderer lists exists, with text, in all locales', () => {
  assert.ok(blockIds.length >= 8, 'the renderer lists its blocks');
  for (const [loc, dict] of Object.entries(locales)) {
    const sections = dict.rules.sections as Record<string, { heading: string; tldr: string; paragraphs: string[]; items: string[] }>;
    assert.deepEqual(Object.keys(sections).sort(), [...blockIds].sort(), `${loc}: sections match the renderer`);
    for (const id of blockIds) {
      assert.ok(sections[id].heading.length > 0, `${loc}.${id}.heading`);
      assert.ok(sections[id].tldr.length > 0, `${loc}.${id}.tldr`);
      assert.ok(sections[id].paragraphs.length > 0, `${loc}.${id}.paragraphs`);
      assert.ok(Array.isArray(sections[id].items), `${loc}.${id}.items is an array`);
    }
  }
});

test('rules: locales share the same list sizes as English', () => {
  for (const [loc, dict] of Object.entries(locales)) {
    assert.equal(dict.rules.summary.length, en.rules.summary.length, `${loc}.summary`);
    assert.equal(dict.rules.hookStages.stages.length, en.rules.hookStages.stages.length, `${loc}.hookStages.stages`);
    for (const key of Object.keys(en.rules.sections) as (keyof typeof en.rules.sections)[]) {
      assert.equal(dict.rules.sections[key].items.length, en.rules.sections[key].items.length, `${loc}.${key}.items`);
      assert.equal(dict.rules.sections[key].paragraphs.length, en.rules.sections[key].paragraphs.length, `${loc}.${key}.paragraphs`);
    }
  }
});

test('rules: the contact email placeholder is kept in every locale, and the rule number placeholder too', () => {
  for (const [loc, dict] of Object.entries(locales)) {
    assert.ok(dict.rules.sections.reporting.paragraphs.join(' ').includes('{contactEmail}'), `${loc}: reporting quotes {contactEmail}`);
    assert.ok(dict.rules.ruleLabel.includes('{n}'), `${loc}: ruleLabel has {n}`);
  }
});

test('rules: the page and the registration modal render the same <RulesSections>, and hold no rule text of their own', () => {
  const page = read('app/[locale]/rules/page.tsx');
  const modal = read('components/rules/RulesModal.tsx');
  assert.ok(page.includes('<RulesSections variant="page" />'));
  assert.ok(modal.includes('<RulesSections variant="modal" />'));
  for (const file of [page, modal]) assert.ok(!/rules\.sections\b/.test(file), 'section text is only read by RulesSections');
});

test('privacy policy and rules share one page frame', () => {
  for (const rel of ['app/[locale]/privacy-policy/page.tsx', 'app/[locale]/rules/page.tsx']) {
    assert.ok(read(rel).includes('<LegalPageLayout'), `${rel} uses LegalPageLayout`);
  }
});

test('about page: the Rules pill sits right after the Privacy Policy pill, in one wrapping row', () => {
  const about = read('app/[locale]/about/page.tsx');
  assert.match(about, /privacy-policy`[\s\S]{0,300}\/rules`/, 'both pills are adjacent');
  assert.ok(about.includes('dict.rules.heading'), 'pill label comes from the dictionary');
  assert.match(about, /flex flex-wrap items-center justify-center gap-3[\s\S]{0,200}LegalLinkPill/, 'pills share a wrapping flex row');
});

test('registration: the required rules checkbox gates sign-up and its link opens the rules modal', () => {
  const auth = read('components/AuthModal.tsx');
  assert.match(auth, /<Checkbox[\s\S]*?invalid=\{showRulesError\}/, 'an unticked box is flagged with the site error style');
  assert.ok(!/<Checkbox[^>]*\brequired\b/.test(auth), 'no native validation bubble');
  assert.ok(auth.includes('<RulesModal'), 'rules modal is mounted');
  assert.match(auth, /if \(!acceptedRules\)\s*\{\s*setRulesAttempted\(true\);\s*return;/, 'submit is blocked');
  assert.match(auth, /role="alert"[^>]*>\s*\{dict\.user\.rulesNotAccepted\}/, 'with an inline message under the checkbox');
  assert.ok(auth.indexOf('!acceptedRules') < auth.indexOf('await register('), 'the check runs before the request');
  assert.ok(auth.includes("mode === 'register'") && auth.includes('setRulesOpen(true)'), 'only the register form links to the rules');
});

test('registration label: every locale places the rules link with a single {rules} placeholder', () => {
  for (const [loc, dict] of Object.entries(locales)) {
    assert.equal(dict.user.acceptRulesLabel.split('{rules}').length, 2, `${loc}.acceptRulesLabel`);
    assert.ok(dict.user.acceptRulesLink.length > 0, `${loc}.acceptRulesLink`);
    assert.ok(dict.user.rulesNotAccepted.length > 0, `${loc}.rulesNotAccepted`);
  }
});

test('Checkbox: `invalid` gives the box the site error ring and aria-invalid', () => {
  const checkbox = read('components/common/Checkbox.tsx');
  assert.match(checkbox, /invalid\?: boolean/);
  assert.match(checkbox, /aria-invalid=\{invalid \|\| undefined\}/);
  assert.match(checkbox, /invalid && 'ring-2 ring-accent-red'/);
});

test('rules: cards carry no icons (only the "Rule N" eyebrow), titles are centred, no hero icon or privacy pill', () => {
  const sections = read('components/rules/RulesSections.tsx');
  const page = read('app/[locale]/rules/page.tsx');
  assert.ok(!sections.includes('lucide-react'), 'RulesSections draws no icons');
  assert.ok(!page.includes('lucide-react'), 'the page draws no icons');
  assert.ok(!page.includes('LegalLinkPill'), 'no privacy pill at the foot of the page');
  assert.match(sections, /centered: true/, 'page cards centre their titles');
  assert.match(sections, /<BlockTitle[^>]*\bcentered\b/, 'modal titles are centred too');
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
});

test('rules: they also cover the Discord server, in every locale', () => {
  for (const [loc, dict] of Object.entries(locales)) {
    assert.ok(dict.rules.sections.joining.paragraphs.join(' ').includes('Discord'), `${loc}: joining names the Discord server`);
    assert.ok(dict.rules.summary.some((line) => line.includes('Discord')), `${loc}: the summary says it applies on Discord`);
  }
});

test('rules: cards use only the site accents (red and amber)', () => {
  const sections = read('components/rules/RulesSections.tsx');
  const cards = read('components/common/BlockCard.tsx');
  const banned = /accent-(cyan|rose|green|purple|indigo|orange|blue|pink)/;
  assert.ok(!banned.test(sections), 'RulesSections uses no other accent');
  assert.ok(!banned.test(cards), 'BlockCard offers no other accent');
  assert.match(cards, /BlockTone = 'red' \| 'amber'/);
  for (const [, tone] of sections.matchAll(/\{ id: '\w+', tone: '(\w+)' \}/g)) assert.ok(tone === 'red' || tone === 'amber', tone);
});

test('rules: both cards of a row share one colour, and the rows alternate red / golden', () => {
  const sections = read('components/rules/RulesSections.tsx');
  const tones = [...sections.matchAll(/\{ id: '\w+', tone: '(\w+)' \}/g)].map((m) => m[1]);
  const rows = tones.slice(1); // the summary spans the whole width
  assert.equal(rows.length % 2, 0, 'cards pair up');
  for (let i = 0; i < rows.length; i += 2) {
    assert.equal(rows[i], rows[i + 1], `row ${i / 2 + 1}: both cards share a colour`);
    if (i > 0) assert.notEqual(rows[i], rows[i - 2], `row ${i / 2 + 1} differs from the row above`);
  }
  assert.notEqual(tones[0], rows[0], 'the first row differs from the summary above it');
});
