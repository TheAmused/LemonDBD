'use client';
// frontend/src/components/common/LinkPill.tsx
//
// The one CLICKABLE capsule (Discord, e-mail copy, "go to this page" links).
// Rule for the whole site: anything clickable has a border, a surface fill, a trailing icon
// (arrow / external-link / copy) and lifts on hover -- so it never relies on colour alone.
// Anything NOT clickable is a flat InfoChip (no border, never fully round).
import React from 'react';
import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { cn } from '@/utils/cn';

const PILL_CLASS =
  'inline-flex max-w-full items-center gap-2 rounded-full border-2 border-border-color bg-bg-surface px-4 py-2 type-card-title text-text-primary shadow-sm transition-all cursor-pointer select-none hover:-translate-y-0.5 hover:border-accent-red/60 hover:bg-bg-elevated hover:shadow-md active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-red';

interface PillBase {
  /** Leading icon (the brand / topic mark). */
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** A capsule that navigates. Internal hrefs use next/link, absolute ones open in a new tab. */
export function LinkPill({ href, icon, children, className }: PillBase & { href: string }) {
  const external = /^https?:\/\//i.test(href);
  const content = (
    <>
      <span aria-hidden="true" className="shrink-0">{icon}</span>
      <span className="min-w-0">{children}</span>
      {external ? (
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
      ) : (
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
      )}
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cn(PILL_CLASS, className)}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={cn(PILL_CLASS, className)}>
      {content}
    </Link>
  );
}

/** A capsule that runs an action; `trailing` is its non-colour "I am clickable" mark. */
export function ActionPill({
  icon,
  trailing,
  children,
  className,
  ...rest
}: PillBase & { trailing: React.ReactNode } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  return (
    <button type="button" className={cn(PILL_CLASS, className)} {...rest}>
      <span aria-hidden="true" className="shrink-0">{icon}</span>
      <span className="min-w-0">{children}</span>
      <span aria-hidden="true" className="shrink-0 text-text-muted">{trailing}</span>
    </button>
  );
}
