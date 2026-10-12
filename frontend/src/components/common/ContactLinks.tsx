'use client';
// frontend/src/components/common/ContactLinks.tsx
//
// How to reach the team: the contact email (when the backend has one, click to copy) and the Discord invite.
// Shared by the About us "Contact us" card and the Rules "See something? Say something" card.
import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Mail } from 'lucide-react';
import { DiscordIcon } from '@/components/icons/DiscordIcon';
import { ActionPill, LinkPill } from '@/components/common/LinkPill';
import { useDictionary } from '@/context/DictionaryContext';
import { copyTextWithFallback } from '@/utils/clipboard';
import { cn } from '@/utils/cn';

const DISCORD_INVITE_URL = 'https://discord.gg/Veygfp6XfT';
const COPIED_MS = 2000;

/** The e-mail address as a capsule: one click copies it to the clipboard. */
function EmailPill({ email }: { email: string }) {
  const dict = useDictionary();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    if (!(await copyTextWithFallback(email))) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

  return (
    <>
      <ActionPill
        onClick={copy}
        aria-label={`${dict.about.contact.copyEmailLabel}: ${email}`}
        icon={<Mail className="h-4 w-4 text-accent-red" />}
        trailing={copied ? <Check className="h-3.5 w-3.5 text-accent-green" /> : <Copy className="h-3.5 w-3.5" />}
      >
        {copied ? dict.about.contact.emailCopied : email}
      </ActionPill>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? dict.about.contact.emailCopied : ''}
      </span>
    </>
  );
}

/** `className` sets the row's alignment (default: start). */
export function ContactLinks({ email, className }: { email?: string | null; className?: string }) {
  const dict = useDictionary();

  return (
    <div className={cn('flex flex-wrap items-center gap-3 pt-1', className ?? 'justify-start')}>
      {email ? <EmailPill email={email} /> : null}
      <LinkPill href={DISCORD_INVITE_URL} icon={<DiscordIcon className="h-4 w-4 text-brand-discord" />}>
        {dict.about.contact.discordLabel}
      </LinkPill>
    </div>
  );
}
