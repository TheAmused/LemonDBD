// frontend/src/components/common/ModalIconHeader.tsx
//
// The artwork header of a detail popup (perk, add-on, item, offering): an icon on the left, the centred
// title, and on the right a second picture that says what the thing belongs to (a perk's character, an
// add-on's killer or item type). Both sides share one size so the title stays centred even when the right
// side is empty. Passed to <Modal header>; see the allow-list in guards/uiGuards.
import React from 'react';

/** Left and right pictures share this size. */
const MODAL_ICON_SLOT = 'h-14 w-14 phone-lg:h-20 phone-lg:w-20 md:h-24 md:w-24';

interface ModalIconHeaderProps {
  /** The thing's own icon. */
  leading: React.ReactNode;
  title: React.ReactNode;
  titleId?: string;
  /** A line under the title (an alias). */
  subtitle?: React.ReactNode;
  /** What it belongs to. Leave out for an empty slot that still keeps the title centred. */
  trailing?: React.ReactNode;
}

export function ModalIconHeader({ leading, title, titleId, subtitle, trailing }: ModalIconHeaderProps) {
  return (
    <div className="grid shrink-0 grid-cols-[auto_1fr_auto] items-center gap-3 px-4 pb-0 pt-12 phone-lg:gap-4 phone-lg:px-6 md:gap-6 md:px-8">
      <div className={`flex ${MODAL_ICON_SLOT} shrink-0 items-center justify-center`}>{leading}</div>

      <div className="min-w-0 text-center">
        <h2
          id={titleId}
          className="text-xl phone-lg:text-2xl md:text-3xl font-black text-text-primary tracking-tight leading-tight text-balance [overflow-wrap:anywhere]"
        >
          {title}
        </h2>
        {subtitle && <p className="mt-1.5 type-strong text-accent-amber">{subtitle}</p>}
      </div>

      {trailing ? (
        <div className={`flex ${MODAL_ICON_SLOT} shrink-0 items-center justify-center`}>
          {trailing}
        </div>
      ) : (
        <div className={`${MODAL_ICON_SLOT} shrink-0`} aria-hidden="true" />
      )}
    </div>
  );
}
