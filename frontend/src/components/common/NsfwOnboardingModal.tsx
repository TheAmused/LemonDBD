'use client';
// frontend/src/components/common/NsfwOnboardingModal.tsx

import React from 'react';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Switch } from '@/components/common/Switch';
import { useDictionary } from '@/context/DictionaryContext';
import { useGlobalNsfwPreference, markNsfwOnboardingComplete } from '@/utils/nsfwAck';

interface NsfwOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NsfwOnboardingModal({ isOpen, onClose }: NsfwOnboardingModalProps) {
  const dict = useDictionary();
  const text = dict.smashOrPass.effectsPrefs;
  const nsfwDict = dict.tierLists.nsfw;
  const [nsfw, setNsfw] = useGlobalNsfwPreference();

  const handleContinue = () => {
    markNsfwOnboardingComplete();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleContinue}
      variant="dialog"
      size="md"
      layer="top"
      title={text.title}
      closeButton="none"
      closeOnEscape
      closeOnBackdropClick
      swipeToClose
      testId="nsfw-onboarding-modal"
      footerClassName="justify-center"
      footer={
        <Button
          variant="primary"
          size="md"
          data-autofocus
          onClick={handleContinue}
          className="w-full sm:w-auto sm:min-w-40"
        >
          {text.continue}
        </Button>
      }
    >
      <div className="flex flex-col px-5 py-5 sm:px-8 sm:py-6">
        <div role="note" className="text-center">
          <p className="type-label-sm text-accent-amber">{nsfwDict.title}</p>
          <p className="mt-2 type-body-fluid text-text-secondary">{nsfwDict.description}</p>
        </div>
        <div className="mt-5 divide-y divide-border-color/60 border-y border-border-color/60">
          <div className="flex items-center justify-between gap-4 py-4 sm:gap-6">
            <div className="min-w-0 text-left">
              <p className="type-card-title text-text-primary">{text.nsfw ?? nsfwDict.label}</p>
              <p className="mt-0.5 type-body-fluid text-text-muted">{text.nsfwDesc ?? nsfwDict.hint}</p>
            </div>
            <Switch checked={nsfw} onChange={setNsfw} ariaLabel={text.nsfw ?? nsfwDict.label} />
          </div>
        </div>
        <p className="mt-4 text-center type-body-fluid text-text-muted">{text.saved}</p>
      </div>
    </Modal>
  );
}
