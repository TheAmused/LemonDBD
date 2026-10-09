'use client';
// frontend/src/components/common/ContactLinks.tsx
//
// How to reach the team: the contact email (when the backend has one) and the Discord invite.
// Shared by the About us "Contact us" card and the Rules "See something? Say something" card.
import React from 'react';
import { Mail } from 'lucide-react';
import { DiscordIcon } from '@/components/icons/DiscordIcon';
import { useDictionary } from '@/context/DictionaryContext';
import { cn } from '@/utils/cn';

const DISCORD_INVITE_URL = 'https://discord.gg/Veygfp6XfT';

/** `className` sets the row's alignment (default: start). */
export function ContactLinks({ email, className }: { email?: string | null; className?: string }) {
  const dict = useDictionary();

  return (
    <div className={cn('flex flex-wrap items-center gap-3 pt-1', className ?? 'justify-start')}>
      {email ? (
        <span className="inline-flex items-center gap-2 px-1 py-2 type-card-title text-text-primary">
          <Mail className="h-4 w-4 shrink-0 text-accent-red" aria-hidden="true" />
          {email}
        </span>
      ) : null}
      <a
        href={DISCORD_INVITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-border-color bg-bg-elevated px-4 py-2 type-card-title text-brand-discord transition-colors hover:border-brand-discord hover:bg-brand-discord/10"
      >
        <DiscordIcon className="h-4 w-4" />
        {dict.about.contact.discordLabel}
      </a>
    </div>
  );
}
