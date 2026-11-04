'use client';
// frontend/src/components/smash-or-pass/hub/HowToPlayModal.tsx
import { ZoomIn } from 'lucide-react';
import { HeartIcon, PassIcon, CardFlipIcon } from '@/components/icons/DbdIcons';
import { Modal } from '@/components/common/Modal';
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

/** One flat section: a title and what it names, with no box around it. */
function Section({ title, className = '', children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`space-y-3 ${className}`}>
      <h3 className="type-strong text-text-primary">{title}</h3>
      {children}
    </section>
  );
}

/** The swipe, shown rather than described: a card sways between Pass and Smash, lighting the side it leans to. */
function SwipeDemo({ passLabel, smashLabel }: { passLabel: string; smashLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-2 overflow-hidden py-1">
      <span className="htp-light-pass flex w-16 shrink-0 flex-col items-center gap-1.5 text-text-secondary">
        <PassIcon className="icon-xl" aria-hidden="true" />
        <span className="type-caption">{passLabel}</span>
      </span>
      <span className="htp-card flex h-24 w-16 shrink-0 items-end justify-center rounded-card border border-accent-red/60 bg-bg-secondary pb-2 shadow-lg" aria-hidden="true">
        <span className="h-1 w-8 rounded-full bg-border-color" />
      </span>
      <span className="htp-light-smash flex w-16 shrink-0 flex-col items-center gap-1.5 text-accent-red">
        <HeartIcon className="icon-xl" aria-hidden="true" />
        <span className="type-caption">{smashLabel}</span>
      </span>
    </div>
  );
}

/** One of the two buttons on every card: its icon, named. */
function CardAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-3 text-text-secondary">
      {icon}
      <span className="type-caption">{label}</span>
    </li>
  );
}

/**
 * How the game is played. It adapts to the screen: the swipe demo and the card icons sit side by side
 * once there is room, and the keyboard shortcuts are left out where there is no keyboard (touch screens).
 */
export function HowToPlayModal({ isOpen, onClose, onPass, onSmash, onStats, onReset }: HowToPlayModalProps) {
  const dict = useDictionary();
  const text = dict.smashOrPass.howToPlayModal;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      size="lg"
      title={text.title}
      closeButtonAriaLabel={dict.modal.close}
      bodyClassName="p-4 sm:p-6"
    >
      <div className="grid gap-6 sm:grid-cols-2 sm:gap-x-8">
        <Section title={text.swipeTitle}>
          <SwipeDemo passLabel={text.passBadge} smashLabel={text.smashBadge} />
        </Section>

        <Section title={text.iconsTitle}>
          <ul className="space-y-3 sm:pt-1">
            <CardAction icon={<CardFlipIcon className="icon-xl text-accent-red" aria-hidden="true" />} label={text.flipCardBadge} />
            <CardAction icon={<ZoomIn className="icon-xl text-accent-amber" aria-hidden="true" />} label={text.zoomArtBadge} />
          </ul>
        </Section>

        <Section title={text.keycapsTitle} className="border-t border-border-color pt-5 sm:col-span-2 pointer-coarse:hidden">
          <TactileKeycaps onPass={onPass} onSmash={onSmash} onStats={onStats} onReset={onReset} />
        </Section>
      </div>
    </Modal>
  );
}
