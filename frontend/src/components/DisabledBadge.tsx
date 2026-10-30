'use client';
// frontend/src/components/DisabledBadge.tsx

import React from 'react';
import { Button } from '@/components/common/Button';
import { TriangleAlert } from 'lucide-react';

interface DisabledBadgeProps {
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  position?: string;
  className?: string;
  ariaLabel?: string;
}

export const DisabledBadge: React.FC<DisabledBadgeProps> = ({
  label,
  onClick,
  position = 'top-1 right-1',
  className,
  ariaLabel,
}) => (
  <Button variant="amberSoft" size="xs" icon pill
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick(e);
    }}
    aria-label={ariaLabel || label}
    className={className || `absolute ${position} z-10 bg-bg-surface/90`}
  >
    <TriangleAlert />
  </Button>
);

