// frontend/src/services/siteConfig.ts
import { i18n, type Locale } from '@/i18n/config';
import { MIN_PASSWORD_LENGTH } from '@/constants/validation';
import type { BannerLevel, SiteConfig } from '@/types/siteConfig';
import { apiUrl } from '@/utils/api';

const BANNER_LEVELS: readonly BannerLevel[] = ['info', 'warning', 'critical'];
const DEFAULT_RESEND_COOLDOWN_SECONDS = 60;
const DEFAULT_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
const DEFAULT_BUG_REPORT_MAX_IMAGES = 3;
const DEFAULT_BUG_REPORT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/** Used until the server answers, and when it cannot be reached: the same behaviour the site had before the setting existed. */
export const DEFAULT_SITE_CONFIG: SiteConfig = {
  loaded: false,
  banner: { active: false, level: 'info', until: null, text: {} },
  links: { discordInvite: null, donationBmc: null, donationKofi: null, donationMessage: null },
  features: { registrationOpen: true, emailVerificationRequired: true, googleSignIn: false, contentReportsOpen: true, scoreboardOcr: true, guestBugReports: true, bugReportRequireImage: false },
  limits: {
    resendCooldownSeconds: DEFAULT_RESEND_COOLDOWN_SECONDS,
    passwordMinLength: MIN_PASSWORD_LENGTH,
    scoreboardUploadMaxBytes: DEFAULT_UPLOAD_MAX_BYTES,
    bugReportMaxImages: DEFAULT_BUG_REPORT_MAX_IMAGES,
    bugReportImageMaxBytes: DEFAULT_BUG_REPORT_IMAGE_MAX_BYTES,
  },
};

type Raw = Record<string, unknown>;
const isRecord = (value: unknown): value is Raw => typeof value === 'object' && value !== null && !Array.isArray(value);
const asLink = (value: unknown): string | null => (typeof value === 'string' && /^https:\/\//i.test(value) ? value : null);
const asBool = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);
const asCount = (value: unknown, fallback: number, min: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min ? Math.floor(value) : fallback;

/** Reads the server's answer defensively: anything unexpected falls back to the default for that field. */
export function parseSiteConfig(body: unknown): SiteConfig {
  if (!isRecord(body)) return DEFAULT_SITE_CONFIG;
  const banner = isRecord(body.banner) ? body.banner : {};
  const links = isRecord(body.links) ? body.links : {};
  const features = isRecord(body.features) ? body.features : {};
  const limits = isRecord(body.limits) ? body.limits : {};
  const defaults = DEFAULT_SITE_CONFIG;

  const text: Partial<Record<Locale, string>> = {};
  if (isRecord(banner.text)) {
    for (const locale of i18n.locales) {
      const value = banner.text[locale];
      if (typeof value === 'string' && value.trim()) text[locale] = value.trim();
    }
  }
  const level = BANNER_LEVELS.find((candidate) => candidate === banner.level) ?? 'info';
  const active = banner.active === true && Boolean(text.en);

  return {
    loaded: true,
    banner: {
      active,
      level,
      until: active && typeof banner.until === 'string' ? banner.until : null,
      text: active ? text : {},
    },
    links: {
      discordInvite: asLink(links.discord_invite),
      donationBmc: asLink(links.donation_bmc),
      donationKofi: asLink(links.donation_kofi),
      donationMessage: typeof links.donation_message === 'string' && links.donation_message.trim() ? links.donation_message.trim() : null,
    },
    features: {
      registrationOpen: asBool(features.registration_open, defaults.features.registrationOpen),
      emailVerificationRequired: asBool(features.email_verification_required, defaults.features.emailVerificationRequired),
      googleSignIn: asBool(features.google_sign_in, defaults.features.googleSignIn),
      contentReportsOpen: asBool(features.content_reports_open, defaults.features.contentReportsOpen),
      guestBugReports: asBool(features.guest_bug_reports, defaults.features.guestBugReports),
      scoreboardOcr: asBool(features.scoreboard_ocr, defaults.features.scoreboardOcr),
      bugReportRequireImage: asBool(features.bug_report_require_image, defaults.features.bugReportRequireImage),
    },
    limits: {
      resendCooldownSeconds: asCount(limits.resend_cooldown_seconds, defaults.limits.resendCooldownSeconds, 1),
      passwordMinLength: asCount(limits.password_min_length, defaults.limits.passwordMinLength, MIN_PASSWORD_LENGTH),
      scoreboardUploadMaxBytes: asCount(limits.scoreboard_upload_max_bytes, defaults.limits.scoreboardUploadMaxBytes, 1),
      bugReportMaxImages: asCount(limits.bug_report_max_images, defaults.limits.bugReportMaxImages, 1),
      bugReportImageMaxBytes: asCount(limits.bug_report_image_max_bytes, defaults.limits.bugReportImageMaxBytes, 1),
    },
  };
}

/** The banner text in the visitor's language, else English. Empty when nothing is shown. */
export function bannerTextFor(banner: SiteConfig['banner'], locale: Locale): string {
  return banner.text[locale] ?? banner.text.en ?? '';
}

/** True while the banner should be on screen (an expired `until` hides it even if the cached answer is older). */
export function isBannerVisible(banner: SiteConfig['banner'], now: number = Date.now()): boolean {
  if (!banner.active || !banner.text.en) return false;
  if (!banner.until) return true;
  const end = Date.parse(banner.until);
  return Number.isNaN(end) || end > now;
}

/** Fetches the public configuration; null when the server cannot be reached (the caller keeps what it had). */
export async function fetchSiteConfig(signal?: AbortSignal): Promise<SiteConfig | null> {
  try {
    const res = await fetch(apiUrl('/api/v1/site-config'), { signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return parseSiteConfig(await res.json());
  } catch {
    return null;
  }
}
