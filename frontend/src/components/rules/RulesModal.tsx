'use client';
// frontend/src/components/rules/RulesModal.tsx
//
// The rules in a dialog, for places where leaving the page would lose work (the registration
// form). Same text as the /rules page: both render <RulesSections>.
import React from 'react';
import Link from 'next/link';
import { Modal } from '@/components/common/Modal';
import { Button, buttonClassName } from '@/components/common/Button';
import { RulesSections } from '@/components/rules/RulesSections';
import { useDictionary, useLocale } from '@/context/DictionaryContext';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Shows an "I accept" button that calls this and closes the dialog. */
  onAccept?: () => void;
}

export function RulesModal({ isOpen, onClose, onAccept }: RulesModalProps) {
  const dict = useDictionary();
  const locale = useLocale();
  const { rules } = dict;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="3xl"
      layer="top"
      title={rules.heading}
      subtitle={rules.tagline}
      tone="danger"
      closeButtonAriaLabel={dict.modal.close}
      padded
      footer={
        <>
          <Link
            href={`/${locale}/rules`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClassName('ghost', 'sm')}
          >
            {rules.openFullPage}
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              {dict.modal.close}
            </Button>
            {onAccept ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onAccept();
                  onClose();
                }}
              >
                {rules.acceptButton}
              </Button>
            ) : null}
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <RulesSections variant="modal" />
      </div>
    </Modal>
  );
}
