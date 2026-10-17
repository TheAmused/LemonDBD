// frontend/src/components/common/WrapRow.tsx
// A row of buttons or badges that wraps, centred on a phone and left-aligned from `sm`.
import React from 'react';
import { cn } from '@/utils/cn';

export function WrapRow({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('flex flex-wrap items-center justify-center gap-2.5 sm:justify-start', className)}>{children}</div>;
}
