// frontend/src/__tests__/unit/app/siteConfig.test.ts
//
// The public configuration the browser reads from GET /api/v1/site-config: parsed defensively, so a
// missing or odd field never breaks a page, and a link or notice is only trusted in its safe form.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SITE_CONFIG, bannerTextFor, isBannerVisible, parseSiteConfig } from '@/services/siteConfig';

const FULL = {
  banner: { active: true, level: 'warning', until: null, text: { en: 'Maintenance tonight', pl: 'Prace serwisowe' } },
  links: {
    discord_invite: 'https://discord.gg/abc',
    donation_bmc: 'javascript:alert(1)',
    donation_kofi: 'https://ko-fi.com/x',
    donation_message: '  Thanks!  ',
  },
  features: { registration_open: false, email_verification_required: true, google_sign_in: true, content_reports_open: false, scoreboard_ocr: true },
  limits: { resend_cooldown_seconds: 120, password_min_length: 10, scoreboard_upload_max_bytes: 2097152, bug_report_max_images: 4, bug_report_image_max_bytes: 1048576 },
};

describe('parseSiteConfig', () => {
  it('reads a complete answer', () => {
    const config = parseSiteConfig(FULL);
    assert.equal(config.loaded, true);
    assert.deepEqual(config.banner, { active: true, level: 'warning', until: null, text: { en: 'Maintenance tonight', pl: 'Prace serwisowe' } });
    assert.equal(config.links.discordInvite, 'https://discord.gg/abc');
    assert.equal(config.links.donationBmc, null);
    assert.equal(config.links.donationMessage, 'Thanks!');
    assert.equal(config.features.registrationOpen, false);
    assert.equal(config.features.contentReportsOpen, false);
    assert.equal(config.features.guestBugReports, true); // missing from the answer: the default
    assert.equal(parseSiteConfig({ features: { guest_bug_reports: false } }).features.guestBugReports, false);
    assert.deepEqual(config.limits, { resendCooldownSeconds: 120, passwordMinLength: 10, scoreboardUploadMaxBytes: 2097152, bugReportMaxImages: 4, bugReportImageMaxBytes: 1048576 });
  });

  it('only trusts https links', () => {
    const config = parseSiteConfig(FULL);
    assert.equal(config.links.donationBmc, null);
    assert.equal(parseSiteConfig({ links: { discord_invite: 'http://discord.gg/abc' } }).links.discordInvite, null);
  });

  it('falls back to the defaults for anything unexpected', () => {
    for (const body of [null, undefined, 'x', 42, [], {}]) {
      const config = parseSiteConfig(body);
      assert.equal(config.banner.active, false);
      assert.deepEqual(config.limits, DEFAULT_SITE_CONFIG.limits);
      assert.equal(config.features.registrationOpen, true);
    }
    const odd = parseSiteConfig({ features: { registration_open: 'no' }, limits: { resend_cooldown_seconds: -5, password_min_length: 2 } });
    assert.equal(odd.features.registrationOpen, true);
    assert.equal(odd.limits.resendCooldownSeconds, DEFAULT_SITE_CONFIG.limits.resendCooldownSeconds);
    assert.equal(odd.limits.passwordMinLength, DEFAULT_SITE_CONFIG.limits.passwordMinLength);
  });

  it('never shows a banner without English text, and ignores unknown languages', () => {
    assert.equal(parseSiteConfig({ banner: { active: true, level: 'info', text: { pl: 'tylko po polsku' } } }).banner.active, false);
    const config = parseSiteConfig({ banner: { active: true, level: 'info', text: { en: 'Hello', xx: 'nope' } } });
    assert.deepEqual(config.banner.text, { en: 'Hello' });
  });

  it('keeps an unknown level at info', () => {
    assert.equal(parseSiteConfig({ banner: { active: true, level: 'purple', text: { en: 'Hello' } } }).banner.level, 'info');
  });

  it('carries no banner text while the banner is off', () => {
    const config = parseSiteConfig({ banner: { active: false, level: 'info', text: { en: 'Draft' } } });
    assert.deepEqual(config.banner, { active: false, level: 'info', until: null, text: {} });
  });

  it('starts not loaded, so a missing link means "unknown" rather than "removed"', () => {
    assert.equal(DEFAULT_SITE_CONFIG.loaded, false);
    assert.equal(DEFAULT_SITE_CONFIG.links.discordInvite, null);
  });
});

describe('banner text and expiry', () => {
  const banner = parseSiteConfig(FULL).banner;

  it('prefers the visitor’s language, then English', () => {
    assert.equal(bannerTextFor(banner, 'pl'), 'Prace serwisowe');
    assert.equal(bannerTextFor(banner, 'ja'), 'Maintenance tonight');
    assert.equal(bannerTextFor(parseSiteConfig({}).banner, 'en'), '');
  });

  it('hides a banner whose end time has passed, even from an older cached answer', () => {
    const until = '2026-12-24T18:00:00Z';
    const timed = { ...banner, until };
    assert.equal(isBannerVisible(timed, Date.parse('2026-12-24T17:59:59Z')), true);
    assert.equal(isBannerVisible(timed, Date.parse('2026-12-24T18:00:00Z')), false);
    assert.equal(isBannerVisible(banner, Date.parse('2030-01-01T00:00:00Z')), true);
    assert.equal(isBannerVisible({ ...banner, active: false }), false);
  });
});
