'use client';
// frontend/src/components/layout/SiteBanner.tsx
//
// The notice an admin writes in Settings > Notices ("maintenance tonight"). Plain text only, in the
// visitor's language when the admin translated it, else English. Info and warning notices can be
// dismissed (remembered for that exact text, so a changed notice shows again); a critical one stays.
import React, { useEffect, useState } from 'react';
import { Info, OctagonAlert, TriangleAlert, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useDictionary, useLocale } from '@/context/DictionaryContext';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { usePersistentString } from '@/hooks/usePersistentString';
import { bannerTextFor, isBannerVisible } from '@/services/siteConfig';
import type { BannerLevel } from '@/types/siteConfig';
import { cn } from '@/utils/cn';

const BANNER_DISMISSED_STORAGE_KEY = 'lemondbd_site_banner_dismissed';
const CLOCK_MS = 60_000;

const LEVELS: Record<BannerLevel, { Icon: typeof Info; box: string; icon: string }> = {
  info: { Icon: Info, box: 'border-accent-blue/40', icon: 'text-accent-blue' },
  warning: { Icon: TriangleAlert, box: 'border-accent-amber/50', icon: 'text-accent-amber' },
  critical: { Icon: OctagonAlert, box: 'border-accent-red/50', icon: 'text-accent-red' },
};

/** What "dismissed" is remembered against: the notice's level and wording. */
const bannerFingerprint = (level: BannerLevel, text: string) => `${level}:${text}`;

/** The notice itself, without any state: shared by the live banner and the admin's preview. */
export function SiteBannerView({
  level,
  text,
  onDismiss,
  dismissLabel,
  className,
}: {
  level: BannerLevel;
  text: string;
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
}) {
  const { Icon, box, icon } = LEVELS[level];
  return (
    <div
      role={level === 'critical' ? 'alert' : 'status'}
      className={cn('relative z-10 flex items-start gap-3 border-b bg-bg-surface px-4 py-2.5 sm:items-center sm:px-6', box, className)}
    >
      <Icon className={cn('mt-0.5 icon-md shrink-0 sm:mt-0', icon)} aria-hidden="true" />
      <p className="min-w-0 flex-1 type-body text-text-primary">{text}</p>
      {onDismiss && (
        <Button variant="ghost" size="sm" icon onClick={onDismiss} aria-label={dismissLabel}>
          <X aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

export function SiteBanner() {
  const { banner } = useSiteConfig();
  const locale = useLocale();
  const t = useDictionary().app;
  const [dismissed, setDismissed] = usePersistentString<string>(BANNER_DISMISSED_STORAGE_KEY, '');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_MS);
    return () => clearInterval(timer);
  }, []);

  if (!isBannerVisible(banner, now)) return null;
  const text = bannerTextFor(banner, locale);
  const fingerprint = bannerFingerprint(banner.level, text);
  const canDismiss = banner.level !== 'critical';
  if (canDismiss && dismissed === fingerprint) return null;

  return (
    <SiteBannerView
      level={banner.level}
      text={text}
      onDismiss={canDismiss ? () => setDismissed(fingerprint) : undefined}
      dismissLabel={t.siteBannerDismiss}
    />
  );
}
