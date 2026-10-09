'use client';
// frontend/src/components/smash-or-pass/hub/HowToPlayModal.tsx
import { Gamepad2 } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Surface } from '@/components/common/Surface';
import { useDictionary } from '@/context/DictionaryContext';
import { TactileKeycaps } from './lazyParts';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPass: () => void;
  onSmash: () => void;
  onStats: () => void;
  onReset: () => void;
}

/** The controls explanation, with the keyboard keycaps working as real buttons. */
export function HowToPlayModal({ isOpen, onClose, onPass, onSmash, onStats, onReset }: HowToPlayModalProps) {
  const dict = useDictionary();
  const text = dict.smashOrPass.howToPlayModal;

  const rows: { icon: string; title: string; desc: string }[] = [
    { icon: text.swipeIcon, title: text.swipeTitle, desc: text.swipeDesc },
    { icon: text.iconsIcon, title: text.iconsTitle, desc: text.iconsDesc },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="lg"
      icon={<Gamepad2 className="h-5 w-5" aria-hidden="true" />}
      title={text.title}
      closeButtonAriaLabel={dict.modal.close}
      bodyClassName="p-5 sm:p-6"
    >
      <div className="space-y-3.5 text-xs text-text-secondary">
        {rows.map((row) => (
          <Surface key={row.title} tone="elevated" radius="2xl" padding="sm" className="flex items-start gap-3">
            <span className="text-xl shrink-0">{row.icon}</span>
            <div>
              <span className="type-strong text-accent-red block">{row.title}</span>
              <p className="text-text-muted leading-relaxed pt-0.5">{row.desc}</p>
            </div>
          </Surface>
        ))}

        <Surface tone="elevated" radius="2xl" padding="sm" className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xl shrink-0">{text.keycapsIcon}</span>
            <span className="type-strong text-accent-red block">{text.keycapsTitle}</span>
          </div>
          <TactileKeycaps onPass={onPass} onSmash={onSmash} onStats={onStats} onReset={onReset} className="my-1" />
        </Surface>

        <Surface tone="elevated" radius="2xl" padding="sm" className="flex items-start gap-3">
          <span className="text-xl shrink-0">{text.atmosphereIcon}</span>
          <div>
            <span className="type-strong text-accent-red block">{text.atmosphereTitle}</span>
            <p className="text-text-muted leading-relaxed pt-0.5">{text.atmosphereDesc}</p>
          </div>
        </Surface>
      </div>
    </Modal>
  );
}
