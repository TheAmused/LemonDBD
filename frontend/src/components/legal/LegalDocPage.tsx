'use client';
// frontend/src/components/legal/LegalDocPage.tsx
//
// A whole document page (Terms of Service, Rules): header, intro and the section cards. The route
// files are one line each: <LegalDocPage doc="terms" />.
import React from 'react';
import { LegalPageLayout } from '@/components/legal/LegalPage';
import { LegalNotice, LegalSections } from '@/components/legal/LegalSections';
import { legalDocText, type LegalDocId } from '@/components/legal/legalDocs';
import { useDictionary, useLocale } from '@/context/DictionaryContext';

export function LegalDocPage({ doc }: { doc: LegalDocId }) {
  const dict = useDictionary();
  const locale = useLocale();
  const text = legalDocText(dict, doc);

  return (
    <LegalPageLayout
      locale={locale}
      heading={text.heading}
      backLabel={text.backToAbout}
      lastUpdated={`${text.lastUpdatedLabel}: ${text.lastUpdated}`}
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
        <p className="type-body-fluid text-text-secondary">{text.tagline}</p>
        <div className="flex flex-col gap-1.5">
          <LegalNotice text={text.tldrNotice} />
          <p className="type-body text-text-muted">{text.translationNotice}</p>
        </div>
      </div>

      {/* Cards in the same row share one height; a collapsed card keeps its own. */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
        <LegalSections doc={doc} variant="page" />
      </div>
    </LegalPageLayout>
  );
}
