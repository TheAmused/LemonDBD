// frontend/src/components/legal/legalDocs.ts
//
// The registry of the "document" legal pages built on <LegalSections>: the Terms of Service and
// the Rules. Adding a section = add its text to every locale and its id to the document's `order`;
// adding a document = one more entry here plus its locale file. Nothing else knows the sections.
import type { BlockTone } from '@/components/common/BlockCard';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/locales/types';
import { formatMessage } from '@/utils/i18nFormat';

export type LegalDocId = 'terms' | 'rules';

export interface LegalSectionText {
  heading: string;
  tldr: string;
  paragraphs: readonly string[];
  items: readonly string[];
}

/** What every legal document in the dictionary looks like. */
export interface LegalDocText {
  pageTitle: string;
  heading: string;
  tagline: string;
  backToAbout: string;
  lastUpdatedLabel: string;
  lastUpdated: string;
  translationNotice: string;
  /** "Rule {n}" / "Section {n}" */
  numberLabel: string;
  tldrLabel: string;
  /** States that the headings and TL;DR lines are not legally binding. */
  tldrNotice: string;
  summaryHeading: string;
  summary: readonly string[];
  sections: Readonly<Record<string, LegalSectionText>>;
  hookStages?: { heading: string; stages: readonly { title: string; text: string }[] };
}

interface LegalDocSpec {
  /** URL segment under /[locale]/. */
  path: string;
  /** Render order of the sections. */
  order: readonly string[];
  /** The section that ends with the contact buttons. */
  contactSection: string;
  /** The section that shows the hook stages, if the dictionary has them. */
  stagesSection?: string;
}

const TERMS_ORDER = ['about', 'accounts', 'service', 'content', 'conduct', 'ip', 'termination', 'liability', 'changes', 'law'] as const satisfies readonly (keyof Dictionary['terms']['sections'])[];
const RULES_ORDER = ['scope', 'respect', 'fairPlay', 'yourContent', 'smashOrPass', 'serverCare', 'reporting', 'enforcement'] as const satisfies readonly (keyof Dictionary['rules']['sections'])[];

export const LEGAL_DOCS: Readonly<Record<LegalDocId, LegalDocSpec>> = {
  terms: { path: 'terms-of-service', order: TERMS_ORDER, contactSection: 'law' },
  rules: { path: 'rules', order: RULES_ORDER, contactSection: 'reporting', stagesSection: 'enforcement' },
};

export function legalDocText(dict: Dictionary, doc: LegalDocId): LegalDocText {
  return dict[doc];
}

/** Colour of the n-th section (0-based): sections sit two per row, and a row is one colour, red then amber. */
export function legalSectionTone(index: number): BlockTone {
  return Math.floor(index / 2) % 2 === 0 ? 'red' : 'amber';
}

/** The `{termsPath}`, `{rulesPath}` and `{privacyPath}` placeholders of the legal texts. */
export function fillLegalPaths(text: string, locale: Locale): string {
  return formatMessage(
    text,
    {
      termsPath: `/${locale}/${LEGAL_DOCS.terms.path}`,
      rulesPath: `/${locale}/${LEGAL_DOCS.rules.path}`,
      privacyPath: `/${locale}/privacy-policy`,
    },
    locale
  );
}
