'use client';
// frontend/src/components/admin/AdminToolParts.tsx
//
// The two building blocks of the Tools tab: a card (a fold-away drawer whose open state is remembered)
// and a row inside it (what it is on the left, its state or button on the right).
import React from 'react';
import { AccordionSection } from '@/components/common/AccordionSection';
import { adminToolDrawerKey } from '@/components/admin/adminStorage';
import { usePersistentDrawer } from '@/hooks/usePersistentDrawer';
import { cn } from '@/utils/cn';

/** One drawer; its rows are separated by rules. Open or closed is remembered per card. */
export function ToolCard({
  id,
  title,
  subtitle,
  children,
  action,
  className,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const [open, toggle] = usePersistentDrawer(adminToolDrawerKey(id), true);
  return (
    <AccordionSection
      as="section"
      title={title}
      open={open}
      onToggle={toggle}
      headerAction={action}
      className={cn('h-full', className)}
      bodyClassName="p-0"
    >
      {subtitle && <p className="border-b border-border-color p-4 text-center type-body text-text-muted sm:px-5">{subtitle}</p>}
      <ul className="divide-y divide-border-subtle">{children}</ul>
    </AccordionSection>
  );
}

/** A row: what it is on the left, its state or its button on the right. */
export function ToolRow({ title, description, meta, children }: { title: React.ReactNode; description?: string; meta?: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <p className="type-strong text-text-primary">{title}</p>
        {description && <p className="type-caption text-text-muted">{description}</p>}
        {meta && <p className="mt-0.5 type-micro text-text-secondary">{meta}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </li>
  );
}

/** A row that holds a form (fields stacked above their buttons) instead of a label and one control. */
export function ToolFormRow({ children }: { children: React.ReactNode }) {
  return <li className="space-y-3 px-4 py-3 sm:px-5">{children}</li>;
}
