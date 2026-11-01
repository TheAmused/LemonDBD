'use client';
// frontend/src/components/legal/LegalDocPage.tsx
//
// A whole document page (Terms of Service, Rules): header, intro and the section cards. The route
// files are one line each: <LegalDocPage doc="terms" />.
import React from 'react';
import { GlobeIcon, InfoIcon } from '@/components/icons/DbdIcons';
import { LegalIntro, LegalPageLayout } from '@/components/legal/LegalPage';
import { LegalLinks } from '@/components/about/AboutClient';
import { LegalSections } from '@/components/legal/LegalSections';
import { LEGAL_DOCS, legalDocText, type LegalDocId } from '@/components/legal/legalDocs';
import { useDictionary } from '@/context/DictionaryContext';

export function LegalDocPage({ doc }: { doc: LegalDocId }) {
  const dict = useDictionary();
  const text = legalDocText(dict, doc);

  return (
    <LegalPageLayout
      heading={text.heading}
      lastUpdatedLabel={text.lastUpdatedLabel}
      lastUpdated={text.lastUpdated}
    >
      <LegalIntro notices={[{ icon: InfoIcon, text: text.tldrNotice }, { icon: GlobeIcon, text: text.translationNotice }]} />

      {/* Cards in the same row share one height; a collapsed card keeps its own. */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
        <LegalSections doc={doc} variant="page" />
      </div>

      <LegalLinks exclude={LEGAL_DOCS[doc].path} />
    </LegalPageLayout>
  );
}
