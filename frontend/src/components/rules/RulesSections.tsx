'use client';
// frontend/src/components/rules/RulesSections.tsx
//
// THE renderer of the rules text. The /rules page and the rules modal (opened from the
// registration form) both render this component, so the wording, order and numbering live in
// exactly one place: `dict.rules` plus the RULE_BLOCKS table below. Only the frame differs:
// `page` draws collapsible cards (side by side in pairs), `modal` draws a compact list. The only
// decoration is the "Rule N" eyebrow and the card colour: no icons.
import React from 'react';
import { BLOCK_TONES, BlockCard, BlockCardPair, BlockTitle, type BlockCardProps, type BlockTone } from '@/components/common/BlockCard';
import { ContactLinks } from '@/components/common/ContactLinks';
import { RichText } from '@/components/common/RichText';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { usePrivacyInfo } from '@/hooks/usePrivacyInfo';
import type { Dictionary } from '@/locales/types';
import { cn } from '@/utils/cn';
import { formatMessage } from '@/utils/i18nFormat';
import { fillPrivacyPlaceholders } from '@/utils/privacyPlaceholders';

type RuleSectionId = keyof Dictionary['rules']['sections'];

interface RuleBlock {
  id: 'summary' | RuleSectionId;
  tone: BlockTone;
}

/**
 * Render order and colour of every block. The summary comes first and is not numbered. On the
 * page the rest sit two per row, and both cards of a row share one colour: the rows alternate
 * red, golden, red, golden, red.
 */
const RULE_BLOCKS: readonly RuleBlock[] = [
  { id: 'summary', tone: 'amber' },
  { id: 'joining', tone: 'red' },
  { id: 'respect', tone: 'red' },
  { id: 'fairPlay', tone: 'amber' },
  { id: 'yourContent', tone: 'amber' },
  { id: 'smashOrPass', tone: 'red' },
  { id: 'serverCare', tone: 'red' },
  { id: 'unofficial', tone: 'amber' },
  { id: 'reporting', tone: 'amber' },
  { id: 'enforcement', tone: 'red' },
  { id: 'fineprint', tone: 'red' },
];

/** The three hook stages of the enforcement block, mildest first. */
const STAGE_STYLES: readonly { box: string; bar: string }[] = [
  { box: 'border-accent-amber/40 bg-accent-amber/10', bar: 'bg-accent-amber' },
  { box: 'border-accent-amber/40 bg-accent-amber/10', bar: 'bg-accent-amber' },
  { box: 'border-accent-red/40 bg-accent-red/10', bar: 'bg-accent-red' },
];

const PARAGRAPH = 'text-text-muted text-justify [text-justify:inter-word] hyphens-auto';

function HookStages({ heading, stages }: { heading: string; stages: readonly { title: string; text: string }[] }) {
  return (
    <div className="flex flex-col gap-2 py-1">
      <p className="type-label-xs text-center text-text-muted">{heading}</p>
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {stages.map((stage, i) => {
          const style = STAGE_STYLES[Math.min(i, STAGE_STYLES.length - 1)];
          return (
            <li key={stage.title} className={cn('flex flex-col gap-1.5 rounded-2xl border p-3 text-center', style.box)}>
              <span className="flex gap-1" aria-hidden="true">
                {STAGE_STYLES.map((_, bar) => (
                  <span key={bar} className={cn('h-1.5 flex-1 rounded-full', bar <= i ? style.bar : 'bg-border-color')} />
                ))}
              </span>
              <span className="type-strong text-text-primary">{stage.title}</span>
              <span className="type-body text-text-muted">{stage.text}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

interface RulesSectionsProps {
  /** `page`: collapsible cards for /rules. `modal`: compact list for the registration dialog. */
  variant: 'page' | 'modal';
}

export function RulesSections({ variant }: RulesSectionsProps) {
  const dict = useDictionary();
  const locale = useLocale();
  const rules = dict.rules;
  // The contact address comes from the backend (admin-editable), like on the Privacy Policy page.
  const info = usePrivacyInfo();
  const fill = (text: string) => fillPrivacyPlaceholders(text, info, locale);

  const renderBody = (block: RuleBlock) => {
    const tone = BLOCK_TONES[block.tone];

    if (block.id === 'summary') {
      return (
        <ul className={cn('flex list-disc flex-col gap-1.5 pl-5 text-text-muted', tone.marker)}>
          {rules.summary.map((line) => (
            <li key={line}>
              <RichText text={line} />
            </li>
          ))}
        </ul>
      );
    }

    const section = rules.sections[block.id];
    return (
      <>
        <p className={cn('rounded-2xl border border-dashed px-3.5 py-2.5 text-center italic text-text-secondary', tone.bubble)}>
          <span className={cn('mr-2 not-italic type-label-2xs', tone.text)}>{rules.tldrLabel}</span>
          <RichText text={section.tldr} />
        </p>
        {section.paragraphs.map((text) => (
          <p key={text} className={PARAGRAPH}>
            <RichText text={fill(text)} />
          </p>
        ))}
        {block.id === 'enforcement' ? <HookStages heading={rules.hookStages.heading} stages={rules.hookStages.stages} /> : null}
        {section.items.length > 0 ? (
          <ul className={cn('flex list-disc flex-col gap-1.5 pl-5 text-text-muted', tone.marker)}>
            {section.items.map((text) => (
              <li key={text}>
                <RichText text={fill(text)} />
              </li>
            ))}
          </ul>
        ) : null}
        {block.id === 'reporting' ? <ContactLinks email={info?.contactEmail} className="justify-center" /> : null}
      </>
    );
  };

  // The summary sits at index 0, so the position in the table is the rule number.
  const items: BlockCardProps[] = RULE_BLOCKS.map((block, index) => ({
    id: block.id,
    storageKey: `lemondbd_drawer_rules_open_${block.id}`,
    title: block.id === 'summary' ? rules.summaryHeading : rules.sections[block.id].heading,
    eyebrow: block.id === 'summary' ? undefined : formatMessage(rules.ruleLabel, { n: index }, locale),
    tone: block.tone,
    centered: true,
    children: renderBody(block),
  }));

  if (variant === 'modal') {
    return (
      <>
        {items.map((item) => (
          <section key={item.id} className="flex flex-col gap-2 border-t border-border-color pt-4 type-body-lg first:border-t-0 first:pt-0">
            <BlockTitle title={item.title} eyebrow={item.eyebrow} tone={item.tone} as="h3" centered />
            {item.children}
          </section>
        ))}
      </>
    );
  }

  // Page: the summary spans the grid, the rest sit two per row (one card alone if the count is odd).
  const [summary, ...rest] = items;
  const rows: BlockCardProps[][] = [];
  for (let i = 0; i < rest.length; i += 2) rows.push(rest.slice(i, i + 2));

  return (
    <>
      <BlockCard {...summary} className="xl:col-span-2" />
      {rows.map(([a, b]) => (b ? <BlockCardPair key={a.id} a={a} b={b} from="xl" /> : <BlockCard key={a.id} {...a} />))}
    </>
  );
}
