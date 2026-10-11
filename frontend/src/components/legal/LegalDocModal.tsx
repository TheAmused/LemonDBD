'use client';
// frontend/src/components/legal/LegalDocModal.tsx
//
// A read-only preview of a legal document (the registration form opens it so nobody has to
// leave the form). The same text as the page, drawn by the same <LegalSections>. It only shows:
// accepting happens at the checkbox, so there are no buttons besides the X in the header.
import React from 'react';
import { Modal } from '@/components/common/Modal';
import { LegalNotice, LegalSections } from '@/components/legal/LegalSections';
import { legalDocText, type LegalDocId } from '@/components/legal/legalDocs';
import { useDictionary } from '@/context/DictionaryContext';

interface LegalDocModalProps {
  /** Which document to show; null keeps the dialog closed. */
  doc: LegalDocId | null;
  onClose: () => void;
}

export function LegalDocModal({ doc, onClose }: LegalDocModalProps) {
  const dict = useDictionary();
  // Keep the last document while the closing animation plays.
  const [shown, setShown] = React.useState<LegalDocId>('terms');
  React.useEffect(() => {
    if (doc) setShown(doc);
  }, [doc]);
  const text = legalDocText(dict, shown);

  return (
    <Modal
      isOpen={doc !== null}
      onClose={onClose}
      variant="dialog"
      size="3xl"
      layer="top"
      title={text.heading}
      tone="danger"
      centerTitle
      closeButtonAriaLabel={dict.modal.close}
      padded
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <LegalNotice text={text.tldrNotice} />
          <LegalNotice text={text.translationNotice} />
        </div>
        <LegalSections doc={shown} variant="modal" />
      </div>
    </Modal>
  );
}
