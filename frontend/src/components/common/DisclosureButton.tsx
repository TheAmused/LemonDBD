// frontend/src/components/common/DisclosureButton.tsx
// The button that opens and closes a folded block when the block has no bordered header of its own
// (a group of match logs, a preview row, a drawer under a section title). The chevron turns with the
// state. Bordered sections use AccordionSection instead; the folding itself is always <Collapsible>.
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface DisclosureButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'aria-expanded'> {
  open: boolean;
  /** Which side the chevron sits on. */
  chevron?: 'start' | 'end';
}

export function DisclosureButton({ open, chevron = 'end', className, children, ...rest }: DisclosureButtonProps) {
  const icon = (
    <ChevronDown
      aria-hidden="true"
      className={cn('h-4 w-4 shrink-0 text-text-muted transition-transform duration-300 group-hover:text-text-primary motion-reduce:transition-none', open && 'rotate-180')}
    />
  );
  return (
    <button
      type="button"
      aria-expanded={open}
      className={cn(
        'group flex items-center gap-2 rounded-control text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red',
        className
      )}
      {...rest}
    >
      {chevron === 'start' && icon}
      {children}
      {chevron === 'end' && icon}
    </button>
  );
}
