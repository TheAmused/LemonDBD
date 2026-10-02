// frontend/src/components/common/Badge.tsx
// The one small label chip ("Event", "NOTICE", "Coming Soon"). A badge is a
// flat tinted label -- never put a Badge inside another bordered pill.
import React from 'react';
import { cn } from '@/utils/cn';
import { FitText } from '@/components/common/FitText';

export type BadgeTone = 'neutral' | 'red' | 'amber' | 'green' | 'blue' | 'purple';
export type BadgeSize = 'xs' | 'sm' | 'md';

export const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-bg-elevated text-text-secondary border-border-color',
  red: 'bg-accent-red/10 text-accent-red border-accent-red/30',
  amber: 'bg-accent-amber/10 text-accent-amber border-accent-amber/30',
  green: 'bg-accent-green/10 text-accent-green border-accent-green/30',
  blue: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
  purple: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
};

export const BADGE_SIZES: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-[9px]',
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: BadgeSize;
  /** Uppercase mono label (default) or plain text. */
  plain?: boolean;
  /** Fully rounded (default) or squarer. */
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
      square ? 'rounded-md' : 'rounded-full',
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

export default Badge;
