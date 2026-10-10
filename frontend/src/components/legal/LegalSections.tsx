'use client';
// frontend/src/components/legal/LegalSections.tsx
//
// THE renderer of the Terms of Service and the Rules. The pages and the preview dialogs of the
// registration form render this component, so wording, order and numbering live in one place per
// document: `dict.<doc>` plus the entry in LEGAL_DOCS. Only the frame differs: `page` draws
// collapsible cards (side by side in pairs, one colour per row), `modal` draws a compact list.
// The only decoration is the "Rule N" / "Section N" eyebrow and the card colour: no icons.
import React from 'react';
import { BLOCK_TONES, BlockCard, BlockCardPair, BlockTitle, type BlockCardProps } from '@/components/common/BlockCard';
import { ContactLinks } from '@/components/common/ContactLinks';
import { RichText } from '@/components/common/RichText';
import { LEGAL_DOCS, fillLegalPaths, legalDocText, legalSectionTone, type LegalDocId, type LegalDocText } from '@/components/legal/legalDocs';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { usePrivacyInfo } from '@/hooks/usePrivacyInfo';
import { cn } from '@/utils/cn';
import { formatMessage } from '@/utils/i18nFormat';
import { fillPrivacyPlaceholders } from '@/utils/privacyPlaceholders';

/** The three hook stages of the Rules' enforcement block, mildest first. */
const STAGE_STYLES: readonly { box: string; bar: string }[] = [
  { box: 'border-accent-amber/40 bg-accent-amber/10', bar: 'bg-accent-amber' },
  { box: 'border-accent-orange/40 bg-accent-orange/10', bar: 'bg-accent-orange' },
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

/** The plain line stating that titles, TL;DRs and the summary are not binding. Shown above the text on the page and in the dialog. */
export function LegalNotice({ text, className }: { text: string; className?: string }) {
  return <p className={cn('type-body text-center text-text-muted', className)}>{text}</p>;
}

interface LegalSectionsProps {
  doc: LegalDocId;
  /** `page`: collapsible cards. `modal`: compact list for the registration dialog. */
  variant: 'page' | 'modal';
}

export function LegalSections({ doc, variant }: LegalSectionsProps) {
  const dict = useDictionary();
  const locale = useLocale();
  const text: LegalDocText = legalDocText(dict, doc);
  const spec = LEGAL_DOCS[doc];
  // The contact address comes from the backend (admin-editable), like on the Privacy Policy page.
  const info = usePrivacyInfo();
  const fill = (value: string) => fillLegalPaths(fillPrivacyPlaceholders(value, info, locale), locale);

  const summaryItem: BlockCardProps = {
    id: 'summary',
    storageKey: `lemondbd_drawer_${doc}_open_summary`,
    title: text.summaryHeading,
    tone: 'amber',
    centered: true,
    children: (
      <ul className={cn('flex list-disc flex-col gap-1.5 pl-5 text-text-muted', BLOCK_TONES.amber.marker)}>
        {text.summary.map((line) => (
          <li key={line}>
            <RichText text={line} />
          </li>
        ))}
      </ul>
    ),
  };

  const sectionItems: BlockCardProps[] = spec.order.map((id, index) => {
    const section = text.sections[id];
    const tone = legalSectionTone(index);
    const t = BLOCK_TONES[tone];
    return {
      id,
      storageKey: `lemondbd_drawer_${doc}_open_${id}`,
      title: section.heading,
      eyebrow: formatMessage(text.numberLabel, { n: index + 1 }, locale),
      tone,
      centered: true,
      children: (
        <>
          <p className={cn('rounded-2xl border border-dashed px-3.5 py-2.5 text-center italic text-text-secondary', t.bubble)}>
            <span className={cn('mr-2 not-italic type-label-2xs', t.text)}>{text.tldrLabel}</span>
            <RichText text={fill(section.tldr)} />
          </p>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className={PARAGRAPH}>
              <RichText text={fill(paragraph)} />
            </p>
          ))}
          {id === spec.stagesSection && text.hookStages ? <HookStages heading={text.hookStages.heading} stages={text.hookStages.stages} /> : null}
          {section.items.length > 0 ? (
            <ul className={cn('flex list-disc flex-col gap-1.5 pl-5 text-text-muted', t.marker)}>
              {section.items.map((item) => (
                <li key={item}>
                  <RichText text={fill(item)} />
                </li>
              ))}
            </ul>
          ) : null}
          {id === spec.contactSection ? <ContactLinks email={info?.contactEmail} className="justify-center" /> : null}
        </>
      ),
    };
  });

  if (variant === 'modal') {
    return (
      <>
        {[summaryItem, ...sectionItems].map((item) => (
          <section key={item.id} className="flex flex-col gap-2 border-t border-border-color pt-4 type-body-lg first:border-t-0 first:pt-0">
            <BlockTitle title={item.title} eyebrow={item.eyebrow} tone={item.tone} as="h3" centered />
            {item.children}
          </section>
        ))}
      </>
    );
  }

  // Page: the summary spans the grid, the rest sit two per row (one card alone if the count is odd).
  const rows: BlockCardProps[][] = [];
  for (let i = 0; i < sectionItems.length; i += 2) rows.push(sectionItems.slice(i, i + 2));

  return (
    <>
      <BlockCard {...summaryItem} className="xl:col-span-2" />
      {rows.map(([a, b]) => (b ? <BlockCardPair key={a.id} a={a} b={b} from="xl" /> : <BlockCard key={a.id} {...a} />))}
    </>
  );
}
