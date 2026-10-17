// frontend/src/components/common/Badge.tsx
// The one small label chip ("Event", "NOTICE", "Coming Soon"). A badge is a
// flat tinted label -- never put a Badge inside another bordered pill.
import React from 'react';
import { cn } from '@/utils/cn';
import { FitText } from '@/components/common/FitText';

export type BadgeTone = 'neutral' | 'red' | 'redSolid' | 'amber' | 'green' | 'blue' | 'purple' | 'overlay' | 'onAccent';
export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-bg-elevated/70 text-text-secondary border-transparent',
  red: 'bg-accent-red/10 text-accent-red border-accent-red/30',
  /** A loud "New" marker: full red fill, white text. */
  redSolid: 'bg-accent-red text-text-inverted border-transparent',
  amber: 'bg-accent-amber/10 text-accent-amber border-accent-amber/30',
  green: 'bg-accent-green/10 text-accent-green border-accent-green/30',
  blue: 'bg-accent-blue/10 text-accent-blue border-accent-blue/30',
  purple: 'bg-accent-purple/10 text-accent-purple border-accent-purple/30',
  /** A frosted label laid over an image or a card banner. */
  overlay: 'bg-bg-surface/85 text-text-secondary border-border-color/60 shadow-xs backdrop-blur-md',
  /** A count inside a coloured button: takes the button's text colour. */
  onAccent: 'bg-text-inverted/20 text-inherit border-transparent',
};

// Tones that read as a flat chip instead of a pill.
const CHIP_TONES: readonly BadgeTone[] = ['neutral', 'overlay'];

const BADGE_SIZES: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-micro',
  sm: 'px-2 py-0.5 text-tiny',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-6 py-3 text-2xl',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: BadgeSize;
  /** Uppercase mono label (default) or plain text. */
  plain?: boolean;
  /** Pill (default) or squarer. Neutral and overlay badges are always the flat, squarer kind: they are never clickable. */
  square?: boolean;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  tone = 'neutral',
  size = 'sm',
  plain = false,
  square = false,
  icon,
  className,
  children,
  ...rest
}) => (
  <span
    className={cn(
      'inline-flex max-w-full shrink-0 items-center gap-1 border font-black tracking-wider whitespace-nowrap',
      !plain && ' uppercase',
      square || CHIP_TONES.includes(tone) ? 'rounded-chip' : 'rounded-full',
      BADGE_TONES[tone],
      BADGE_SIZES[size],
      className
    )}
    {...rest}
  >
    {icon}
    {typeof children === 'string' || typeof children === 'number' ? (
      <FitText minScale={0.7} maxLines={2}>{children}</FitText>
    ) : (
      children
    )}
  </span>
);
