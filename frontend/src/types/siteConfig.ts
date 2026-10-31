// frontend/src/types/siteConfig.ts
//
// What GET /api/v1/site-config returns: the few admin settings every visitor's browser needs (a notice
// banner, outbound links, feature switches, a few limits). Nothing private is ever in it.
import type { Locale } from '@/i18n/config';

export type BannerLevel = 'info' | 'warning' | 'critical';

export interface SiteBannerConfig {
  active: boolean;
  level: BannerLevel;
  /** ISO time the banner ends, or null when it stays until an admin switches it off. */
  until: string | null;
  /** English plus any translations the admin wrote; use `bannerTextFor`. */
  text: Partial<Record<Locale, string>>;
}

export interface SiteConfig {
  /** False until the first answer arrives (or when it never does): links are unknown, not "off". */
  loaded: boolean;
  banner: SiteBannerConfig;
  links: {
    discordInvite: string | null;
    donationBmc: string | null;
    donationKofi: string | null;
    donationMessage: string | null;
  };
  features: {
    registrationOpen: boolean;
    emailVerificationRequired: boolean;
    googleSignIn: boolean;
    contentReportsOpen: boolean;
    /** Whether signed-out visitors may send bug reports. */
    guestBugReports: boolean;
    scoreboardOcr: boolean;
    /** Whether a bug report must carry at least one screenshot. */
    bugReportRequireImage: boolean;
  };
  limits: {
    resendCooldownSeconds: number;
    passwordMinLength: number;
    scoreboardUploadMaxBytes: number;
    /** How many screenshots a bug report may carry, and the largest one (admin settings). */
    bugReportMaxImages: number;
    bugReportImageMaxBytes: number;
  };
}
