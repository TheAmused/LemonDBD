# Global Shell & Error Boundaries Inventory

## /[locale] (Global Layout Shell)

### Page & files
- **Layout entry**: `app/[locale]/layout.tsx`
- **Providers & global runtime hosts**:
  - `components/UmamiScript.tsx` (analytics script loader)
  - `components/ThemeProvider.tsx` (`next-themes` wrapper: `light`, `dark`, `light-lemon`, `system`)
  - `context/AuthContext.tsx` (`AuthProvider`)
  - `context/PreferencesContext.tsx` (`PreferencesProvider`)
  - `context/SiteConfigContext.tsx` (`SiteConfigProvider`)
  - `context/LocaleDictionaryProvider.tsx` + `context/DictionaryContext.tsx`
  - `components/common/ImagePreloadProvider.tsx`
  - `components/common/Tooltip.tsx` (`TooltipProvider`, `Tooltip`, `TooltipBubble`, `tip`)
  - `components/common/FormValidation.tsx` (`FormValidationProvider`)
  - `components/common/ContentRevocationSync.tsx` + `components/common/ContentRemovedNotice.tsx`
  - `components/layout/MaintenanceWatcher.tsx` + `components/layout/MaintenancePoller.tsx`
  - `components/moderation/WarningModal.tsx` + `components/moderation/WarningDialog.tsx` + `components/moderation/moderationLabels.ts`
- **Shell & background chrome**:
  - `components/layout/AppBackground.tsx` + `components/layout/backgroundEffects.ts` + `components/common/CampfireParticles.tsx`
  - `components/layout/SiteBannerGate.tsx` + `components/layout/SiteBanner.tsx`
  - `components/layout/AppShell.tsx` + `components/layout/shellRoutes.ts`
- **Sidebar & navigation**:
  - `components/Sidebar.tsx`
  - `components/sidebar/navGroupBoot.ts`
  - `components/sidebar/SidebarNavLink.tsx`
  - `components/sidebar/SidebarNavGroup.tsx`
  - `components/sidebar/SidebarUserSection.tsx`
  - `components/sidebar/SidebarBottomControls.tsx`
  - `components/sidebar/FlagIcon.tsx`
  - `components/LemonIcon.tsx`
  - `components/UserAvatar.tsx`
- **Changelog ("What's New?")**:
  - `components/changelog/WhatsNewLauncher.tsx`
  - `components/changelog/ChangelogPostItem.tsx`
  - `components/changelog/ChangelogEditorModal.tsx`
  - `components/changelog/useChangelogFeed.ts`
  - `components/changelog/changelogReadState.ts`
  - `components/changelog/changelogText.ts`
  - `components/changelog/changelogTheme.ts`
  - `components/common/RichTextEditor.tsx`
- **Authentication & common modals**:
  - `components/AuthModal.tsx`
  - `components/auth/AuthModalParts.tsx`
  - `components/auth/CodeInput.tsx`
  - `components/auth/GoogleSignInButton.tsx`
  - `components/auth/TwoFactorChallengeForm.tsx`
  - `components/EmailVerificationForm.tsx`
  - `components/moderation/AccountBlockedNotice.tsx`
  - `components/legal/LegalDocModal.tsx` + `components/legal/LegalSections.tsx` + `components/legal/legalDocs.ts`
  - `components/common/AltchaWidget.tsx`
  - `components/sidebar/BugReportModal.tsx` + `components/sidebar/BugReportScreenshots.tsx`
  - `components/sidebar/BuyCoffeeModal.tsx` + `components/sidebar/RewardedAdSection.tsx` + `components/sidebar/SupportTile.tsx`
  - `components/sidebar/BardInsultsModal.tsx`
  - `components/common/PreferencesPromptModal.tsx` + `components/common/AtmospherePreferencesList.tsx`
  - `components/common/Modal.tsx` + `components/common/ConfirmModal.tsx`

### Layout elements
- **Document Head (`app/[locale]/layout.tsx`)**:
  - Blocking `<script>` (`SIDEBAR_INIT_SCRIPT` + `NAV_GROUP_BOOT_SCRIPT`): restores `data-sidebar="collapsed"` from `localStorage['lemon_dbd_sidebar_collapsed']` and injects `<style id="lemon-nav-group-boot">` for `lemon-sidebar-group-*` before first paint.
  - JSON-LD `application/ld+json` (`siteJsonLd`).
  - Google AdSense `<script>` (`pagead2.googlesyndication.com`).
  - `<UmamiScript />`: fetches `/api/umami-config` and injects `<Script src="{url}/script.js" data-website-id={websiteId} />`.
- **Ambient Background (`components/layout/AppBackground.tsx`, `components/common/CampfireParticles.tsx`)**:
  - Fixed `-z-10` wrapper (`aria-hidden="true"`).
  - `<canvas>` rendering rising theme-aware particle embers (`CampfireParticles`), controlled by user preference `backgroundAnimation` (`'on'` = 60fps/28–64 particles, `'eco'` = 30fps/14–28 particles, `'off'` = unmounted).
- **Site Notice Banner (`components/layout/SiteBannerGate.tsx`, `components/layout/SiteBanner.tsx`)**:
  - Shown at top of viewport when `SiteConfig.banner.active` is true and within schedule (`isBannerVisible`).
  - Container (`role="status"` for `info`/`warning`, `role="alert"` for `critical`).
  - Level icon: `Info` (`info`), `TriangleAlert` (`warning`, amber), `OctagonAlert` (`critical`, red).
  - Notice text `<p>`: localized admin message (`bannerTextFor(banner, locale)`).
  - Dismiss button (`X` icon, `aria-label="Dismiss notice"` / `app.siteBannerDismiss`): rendered only for `info` and `warning` levels (persisted in `localStorage['lemondbd_site_banner_dismissed']`); omitted on `critical` notices.
- **Desktop Sidebar (`components/Sidebar.tsx`, `<aside className="lemon-shell-aside hidden lg:flex ...">`, `aria-label="Main Navigation"` / `sidebar.navAria`)**:
  - **Brand header**:
    - Home link (`href="/[locale]"`, `aria-label="LemonDBD Home"` / `sidebar.homeAria`): red `IconTile` with `LemonIcon` + brand text `"LemonDBD"` (`app.title`).
    - Desktop "What's New?" trigger (`WhatsNewLauncher`, `hidden lg:block`): icon button with `Megaphone` icon, tooltip `"What's New?"` (`changelog.triggerTitle`), and animated red `UnreadDot` when `hasUnread` is true.
  - **Collapse toggle handle**:
    - Floating right-edge `TileButton` (`data-testid="sidebar-toggle-button"`, `aria-label="Toggle Navigation Sidebar"` / `sidebar.toggleSidebar`, `aria-expanded={!isCollapsed}`): `ChevronRight` (when collapsed) / `ChevronLeft` (when expanded).
  - **Primary navigation (`<nav aria-label="Main Navigation">`)**:
    - `SidebarNavLink` (`id="streaks"`, `href="/[locale]/streaks"`, `prefetch={false}`): `TargetIcon` + `"Challenges"` (`sidebar.challenges`).
    - `SidebarNavLink` (`id="maps"`, `href="/[locale]/maps"`): `MapIcon` + `"Map Callouts"` (`sidebar.mapCallouts`).
    - `SidebarNavLink` (`id="generator"`, `href="/[locale]/randomizer"`): `DiceIcon` + `"Perk Randomizer"` (`filters.generatorTab`).
    - `SidebarNavGroup` (`id="database"`, `DisclosureButton` with `Library` icon + `"Database"` / `sidebar.groupDatabase` + rotating `ChevronDown`):
      - `SidebarNavLink` (`id="perks"`, `href="/[locale]/perks"`): `PerkHexIcon` + `"Perks"` (`filters.perks`).
      - `SidebarNavLink` (`id="characters"`, `href="/[locale]/characters"`): `MaskIcon` + `"Characters"` (`sidebar.characters`).
    - `SidebarNavGroup` (`id="extras"`, `DisclosureButton` with `GridIcon` + `"Community & Games"` / `sidebar.groupExtras` + rotating `ChevronDown`):
      - `SidebarNavLink` (`id="tier-lists"`, `href="/[locale]/tier-lists"`): `LayoutList` icon + `"Tier Lists"` (`sidebar.tierLists`).
      - `SidebarNavLink` (`id="smash-or-pass"`, `href="/[locale]/smash-or-pass"`): `HeartIcon` + `"Smash or Pass"` (`sidebar.smashOrPass`).
      - `SidebarNavLink` (`id="minigames"`, `href="/[locale]/minigames"`): `Gamepad2` icon + `"Minigames"` (`sidebar.minigames`).
    - `SidebarNavLink` (`id="trophies"`, `href="/[locale]/achievements"`): `TrophyIcon` + `"Trophies"` (`sidebar.trophies`).
    - `SidebarNavLink` (`id="settings"`, `href="/[locale]/settings"`): `Settings` icon + `"Settings"` (`sidebar.settings`).
    - `SidebarNavLink` (`id="about"`, `href="/[locale]/about"`): `Info` icon + `"About us"` (`sidebar.about`).
    - **Admin-only group** (rendered only when `isAdmin` is true):
      - `SidebarNavGroup` (`id="admin"`, `CrownIcon` + `"Administration"` / `sidebar.groupAdmin`):
        - `SidebarNavLink` (`id="admin-panel"`, `href="/[locale]/admin"`): `Settings` icon + `"Admin Control Center"` (`sidebar.adminControlCenter`).
  - **User & Fun section (`components/sidebar/SidebarUserSection.tsx`)**:
    - Bard Insults trigger (`SidebarNavLink`, `id="bard-insults"`, `hasPopup="dialog"`): `Pencil` icon + `"Bard Insults"` (`sidebar.insultsButton`).
    - **Signed-out state**:
      - `"Sign In"` button (`sidebar.signIn`, `LogIn` icon, `variant="soft"`): opens `AuthModal` in `'login'` mode.
    - **Signed-in state**:
      - Elevated `Surface` card containing:
        - Profile link (`href="/[locale]/user"`): `UserAvatar` (custom uploaded image or fallback `LemonIcon`) + `user.username` + role `Badge` (`"Administrator"` / `user.roleAdmin` in red for admins, `"User"` / `sidebar.roleUser` in neutral for regular users).
        - Sign Out icon button (`LogOut` icon, `aria-label="Sign Out"` / `sidebar.signOut`, tooltip `"Sign Out"`).
        - Unverified email prompt (shown when `mustConfirmEmail(user, verificationRequired)` is true): link button `"Email not verified. Verify now"` (`sidebar.emailNotVerified`), opens `AuthModal` with `verifyEmailFor={user.email}`.
  - **Bottom Controls (`components/sidebar/SidebarBottomControls.tsx`)**:
    - **Language Switcher**:
      - Trigger button (`aria-label="Switch Language"` / `sidebar.switchLanguage`, `aria-expanded`): `FlagIcon` (SVG flag for `en`/`pl`/`es`/`de`/`ja`) + uppercase locale code (`EN`, `PL`, `ES`, `DE`, `JA`).
      - Dropdown menu (`Surface`, opens upward): 5 locale links (`redirectedPathName(code)` preserving path and query string):
        - `en`: GB `FlagIcon` + `"English"`
        - `pl`: PL `FlagIcon` + `"Polski"`
        - `es`: ES `FlagIcon` + `"Español"`
        - `de`: DE `FlagIcon` + `"Deutsch"`
        - `ja`: JP `FlagIcon` + `"日本語"`
    - **Theme Switcher**:
      - Trigger button (`aria-label="Change Theme"` / `sidebar.toggleTheme`, `aria-expanded`): current theme icon + `FitText` label (full label or short fallback).
      - Dropdown menu (`Surface`, opens upward): 4 `MenuItem` options:
        - `light`: `Sun` icon + `"Light mode"` (`sidebar.themeLight`, short `"Light"` / `sidebar.themeLightShort`)
        - `light-lemon`: `Citrus` icon + `"Light mode (Lemon)"` (`sidebar.themeLightLemon`, short `"Lemon"` / `sidebar.themeLightLemonShort`)
        - `dark`: `Moon` icon + `"Dark mode"` (`sidebar.themeDark`, short `"Dark"` / `sidebar.themeDarkShort`)
        - `system`: `Laptop` icon + `"System theme"` (`sidebar.themeSystem`, short `"System"` / `sidebar.themeSystemShort`)
    - **Support & Feedback row**:
      - `"Report Bug"` button (`sidebar.reportBug`, `FogReportIcon` in red): opens `BugReportModal`.
      - `"Buy Coffee"` button (`sidebar.buyCoffee`, `CampfireMugIcon` in amber): opens `BuyCoffeeModal`.
    - **Legal footer nav (`aria-label="About us"`)**:
      - Link to `/[locale]/privacy-policy`: `"Privacy"` (`sidebar.privacyPolicy`).
      - Middle dot separator `"·"`.
      - Link to `/[locale]/terms-of-service`: `"Terms"` (`sidebar.termsOfService`).
- **Mobile Top Header (`components/Sidebar.tsx`, `<header className="... lg:hidden">`)**:
  - Brand link (`href="/[locale]"`, `aria-label="LemonDBD Home"`): `LemonIcon` badge + `"LemonDBD"` (`app.title`).
  - Mobile `WhatsNewLauncher` button (`Megaphone` icon + `UnreadDot`).
  - Mobile drawer open button (`data-testid="mobile-drawer-toggle"`, `aria-label="Open Navigation Drawer"` / `sidebar.openDrawer`, `Menu` icon).
- **Global Tooltip & Form Validation Overlays**:
  - `TooltipProvider` (`components/common/Tooltip.tsx`): renders portal `<TooltipBubble role="tooltip">` with title, optional description, and directional arrow for any hovered/keyboard-focused element with `data-tooltip` (`variants`: `default`, `item`, `action`, `status`, `error`).
  - `FormValidationProvider` (`components/common/FormValidation.tsx`): intercepts native HTML5 `invalid` events on `<input>`, `<select>`, and `<textarea>` controls and renders `<TooltipBubble variant="error">` with `CircleAlert` icon + localized validation message (`locales/en/validation.ts`: `"Fill out this field."`, `"Tick this box to continue."`, `"Choose an option."`, `"Enter a valid email address."`, `"Enter a valid web address (https://…)."`, `"Use at least {min} characters."`, `"Use at most {max} characters."`, `"Enter {min} or more."`, `"Enter {max} or less."`, `"Enter a valid number."`, `"Enter a valid value."`, `"Match the requested format."`, `"This value is not valid."`) + screen-reader `<span role="alert">`.
- **Content Removed Toast / Banner (`components/common/ContentRevocationSync.tsx`, `components/common/ContentRemovedNotice.tsx`)**:
  - Floating bottom-center `Surface` (`as="output"`, `aria-live="polite"`) shown when background revocation sync deletes locally saved items banned by moderators:
    - `ShieldAlert` icon (amber).
    - Title: `"Saved content removed"` (`moderation.contentRemoved.title`).
    - Body: `"{count, plural, one {An item you saved on this device was} other {# items you saved on this device were}} removed because moderators blocked {count, plural, one {it} other {them}} for breaking the rules."` (`moderation.contentRemoved.body`).
    - Dismiss button (`X` icon, `aria-label="Dismiss"` / `moderation.contentRemoved.dismiss`).
- **Cookie / Consent Banner Note**:
  - **No cookie consent banner exists** in the app by design (documented in `locales/en/privacy.ts` under `sections.storage`: only a strictly necessary HttpOnly session cookie on sign-in and local storage preferences are used; analytics is cookie-free self-hosted Umami).
  - Instead, legal consent is collected via `LegalConsentField` inside `AuthModal` during registration, and sensory/NSFW preferences are prompted via `PreferencesPromptModal` (`components/common/PreferencesPromptModal.tsx`) when entering applicable features.

### Modes / states
- **AppShell Route Layout Modes (`components/layout/AppShell.tsx`, `components/layout/shellRoutes.ts`)**:
  - **Standard shell (`spec` object)**: renders `<Sidebar />` + `<main>` with route-specific padding (`tight`, `comfortable`, `spacious`, `flush`, or `customPadding`) and `dbd-fog-overlay` (omitted on `/streaks`).
  - **Shellless mode (`shell: false`)**: omits `<Sidebar />` and `<main>` wrapper so the page owns the full viewport; active on `/[locale]/maintenance`, `/[locale]/reset-password`, and `/[locale]/welcome` (or when overridden via `useShellOverride(false)`).
  - **Error shell override (`ERROR_SHELL`)**: centered viewport shell (`mainId="main-error-content"`) applied via `useShellOverride(ERROR_SHELL)` on `/blocked`, `/forbidden`, `not-found.tsx`, and `error.tsx`.
- **Sidebar States**:
  - **Desktop expanded vs. collapsed**: toggled via `useSidebarState` (`localStorage['lemon_dbd_sidebar_collapsed']` and `<html data-sidebar="collapsed">`).
  - **Nav group open vs. folded**: persisted per group in `localStorage['lemon-sidebar-group-<id>']`; automatically unfolds when navigating into a child route.
  - **Admin-only nav filtering**: hides routes listed in `utils/adminOnlyPages.ts` and hides the `"Administration"` nav group unless `isAdmin` is true.
  - **Language switching in-flight guard**: disables language switcher button (`opacity-60 pointer-events-none`) while a locale navigation is resolving.
- **Maintenance Poller (`components/layout/MaintenancePoller.tsx`)**:
  - Headless background poller (runs every 60s and on tab `visibilitychange` on non-`/maintenance`, non-`/admin` routes); redirects open tabs to `/[locale]/maintenance` if `fetchMaintenanceStatus` reports `blocked: true`.

### Modals & drawers (file)
- **Mobile Navigation Drawer (`components/Sidebar.tsx`)**:
  - **Trigger**: Mobile header hamburger button (`data-testid="mobile-drawer-toggle"`).
  - **Variant**: `Modal` (`variant="drawer-left"`, `size="xs"`, `containerClassName="lg:hidden"`).
  - **Elements**: Floating close button (`X` icon, `data-testid="mobile-drawer-close"`, `aria-label="Close Navigation Drawer"` / `sidebar.closeDrawer`) + full sidebar content (`renderSidebarContent()`).
- **What's New / Changelog Modal (`components/changelog/WhatsNewLauncher.tsx`, `components/changelog/ChangelogPostItem.tsx`)**:
  - **Trigger**: `Megaphone` icon button in desktop sidebar header or mobile top header.
  - **Variant**: `Modal` (`variant="dialog"`, `size="2xl"`, `fullscreenOnMobile`, title `"What's New"` / `changelog.modalTitle`).
  - **Header controls**:
    - Close button (`X`).
    - Admin-only `"New entry"` icon button (`Plus` icon, tooltip `"New entry"` / `changelog.newEntry`, opens `ChangelogEditorModal`).
  - **States & body elements**:
    - Action error `Alert` (dismissible, shown when a delete or Discord sync fails: `"The Discord message could not be sent."`, `"No Discord channel is set up for announcements."`, `"The Discord message was deleted. You can announce this entry again."`, `"Saved, but the Discord message could not be updated..."`, `"Saved as a draft, but the Discord message could not be deleted..."`).
    - Loading state: centered `Spinner`.
    - Empty state (`EmptyState`, `variant="inline"`): `Megaphone` icon + `"Nothing new yet. Check back after the next Trial."` (`changelog.emptyState`).
    - Feed list (`ChangelogPostItem` rows):
      - Admin-only drag handle button (`GripVertical` icon, tooltip `"Drag to reorder"` / `changelog.dragToReorder`).
      - `DisclosureButton` header:
        - Admin-only status `Badge`: `"Published"` (`changelog.publishedLabel`, green) or `"Draft"` (`changelog.draftBadge`, amber).
        - Formatted date + optional `"Edited"` label (`changelog.edited`).
        - Admin-only Discord status `Badge` (when `discord_announced_at` is set): `DiscordIcon` + `"On Discord"` (`changelog.discordSent`).
        - Post title (`<h3>`) + unread `Badge` (`"New"` / `changelog.newBadge`, redSolid).
        - Collapsed 2-line plain-text preview (`<p>`).
      - Admin-only row action icon buttons:
        - `"Announce on Discord"` (`DiscordIcon`, shown when published and not yet announced).
        - `"Update on Discord"` (`RefreshCw` icon, shown when published and edited since last Discord sync).
        - `"Edit"` (`Pencil` icon, opens `ChangelogEditorModal` with post).
        - `"Delete"` (`Trash2` icon, opens delete `ConfirmModal`).
      - Collapsible body (`Collapsible`): rendered HTML (`RichText`).
    - Pagination footer (when `hasMore` is true): `"Load more"` button (`changelog.loadMore`).
- **Changelog Editor Modal — Admin Only (`components/changelog/ChangelogEditorModal.tsx`, `components/common/RichTextEditor.tsx`)**:
  - **Trigger**: `"New entry"` (`Plus`) or `"Edit"` (`Pencil`) button inside `WhatsNewLauncher`.
  - **Variant**: `Modal` (`variant="dialog"`, `size="2xl"`, `layer="top"`, title `"New Changelog Entry"` / `changelog.newTitle` or `"Edit Changelog Entry"` / `changelog.editTitle`).
  - **Elements**:
    - `"Title"` required `Input` (`changelog.titleLabel`).
    - Quick section pill row (`"Add section"` / `changelog.addSection`): 6 pill buttons with `Plus` icon that append an `<h3>` + bullet list into the editor: `"New"`, `"QoL"`, `"Balance"`, `"Bug-fix"`, `"Known issues"`, `"Announcement"` (`changelog.sections.*`).
    - `"Content"` required `RichTextEditor` (`changelog.bodyLabel`):
      - Formatting toolbar buttons with tooltips (`changelog.editor.*`): `"Bold"` (`Bold`), `"Italic"` (`Italic`), `"Underline"` (`Underline`), `"Align left"` (`AlignLeft`), `"Align center"` (`AlignCenter`), `"Align right"` (`AlignRight`), `"Justify"` (`AlignJustify`), `"Heading"` (`Heading3`), `"Bullet list"` (`List`), `"Numbered list"` (`ListOrdered`).
      - `"Link"` (`Link2`) toolbar button + `Popover`: URL `Input` (`placeholder="Link URL (https://...)"` / `changelog.editor.linkPrompt`) + `"Add link"` button (`changelog.editor.linkApply`).
      - `"Text color"` (`Palette`) toolbar button + `Popover`: 6 `ColorSwatch` buttons (`Bone`, `Blood`, `Amber`, `Hex`, `Hope`, `Fog`).
      - `"Highlight"` (`Highlighter`) toolbar button + `Popover`: `"No highlight"` clear button (`×`) + 5 `ColorSwatch` buttons (`Blood`, `Amber`, `Hex`, `Hope`, `Fog`).
      - `contentEditable` rich text area (`role="textbox"`).
    - Error `Alert` (when save fails).
    - Footer: `Switch` toggle (`"Published"` / `changelog.publishedLabel` vs. `"Draft"` / `changelog.draftBadge`) + `"Save"` button (`changelog.save`).
- **Changelog Confirmation & Notice Modals — Admin Only (`components/changelog/WhatsNewLauncher.tsx`, `components/common/ConfirmModal.tsx`)**:
  - **Announce / Update on Discord `ConfirmModal`**: triggered by row Discord buttons; title `"Announce on Discord?"` (`changelog.discordConfirmTitle`) or `"Update the Discord message?"` (`changelog.discordUpdateConfirmTitle`), message + post title, confirm button `"Send"` (`changelog.discordConfirmSend`) or `"Update"` (`changelog.discordUpdateConfirmSend`).
  - **Unpublish / Save as Draft `ConfirmModal`**: triggered when saving a published post that has a Discord message as a draft; title `"Save as draft?"` (`changelog.draftConfirmTitle`), message `"Readers will no longer see this entry and its Discord message will be deleted."` (`changelog.draftConfirmMessage`), confirm button `"Save"` (`changelog.save`).
  - **Delete Entry `ConfirmModal`**: triggered by row `"Delete"` button; title `"Delete this entry?"` (`changelog.deleteConfirmTitle`), message `"This changelog post will be permanently removed."` (`changelog.deleteConfirmMessage`), confirm button `"Delete"` (`changelog.delete`).
  - **Discord Success `Modal`**: `size="sm"`, `layer="top"`, floating close button, `SuccessState` showing `"Sent to Discord"` (`changelog.discordSuccess`) or `"Discord message updated"` (`changelog.discordUpdated`) + post title.
- **Authentication Modal (`components/AuthModal.tsx`, `components/auth/*`, `components/EmailVerificationForm.tsx`, `components/moderation/AccountBlockedNotice.tsx`)**:
  - **Trigger**: Sidebar `"Sign In"` button, Sidebar `"Email not verified. Verify now"` button, or page-level auth gates (`useSignInThen`, `AuthRequiredState`, `/admin-entry`).
  - **Variant**: `Modal` (`variant="dialog"`, `size="md"`).
  - **Modes / Views**:
    - **Security Check view (`showSecurityCheck`)**: shown while ALTCHA PoW challenge is verifying; `Spinner` + `"Running security check"` (`user.authSecurityCheck`).
    - **Login mode (`mode === 'login'`, title `"Sign In"` / `user.authSignInTitle`)**:
      - Error alert banner (`CircleAlert` + error message, e.g. `"Invalid credentials"` / `user.invalidCredentials`).
      - `"Login or Email"` required text `Input` (`user.loginOrEmailLabel`).
      - `"Password"` required password `Input` (`user.passwordLabel`).
      - `"Forgot password?"` link button (`user.forgotPasswordLink`, hidden when `adminOnly` is true) -> switches to `'forgot'` mode.
      - `AltchaWidget` (honeypot input + PoW status/error retry button `"Retry"` / `modal.retry`).
      - Submit button (`LogIn` icon + `"Sign In"` / `user.signIn`).
      - `GoogleSignInSection` (when `googleClientId` is configured and not `adminOnly`): `"or"` divider (`user.googleOrDivider`) + `GoogleSignInButton` (`GoogleLogo` + `"Continue with Google"` / `user.googleContinue` + GIS iframe overlay).
      - `DemoAccountButtons` (development environment only, when `useDemoAccounts` returns accounts): `"Quick Demo Accounts"` heading (`user.quickDemoAccounts`), `"Admin (lemon)"` button (`user.adminDemo`, `ShieldAlert` icon), and `"User (user)"` button (`user.userDemo`, hidden when `adminOnly`).
      - `ModeSwitchLink` (hidden when `adminOnly`): `"Don't have an account? Register"` (`user.dontHaveAccount` + `user.register`) -> switches to `'register'` mode.
    - **Register mode (`mode === 'register'`, title `"Create Account"` / `user.authRegisterTitle`)**:
      - `"Login"` required text `Input` (`user.loginLabel`).
      - `"Username"` required text `Input` (`user.usernameLabel`, `minLength={3}`, `maxLength={50}`).
      - `"Email Address"` required email `Input` (`user.emailLabel`).
      - `"Password"` required password `Input` (`user.passwordLabel`, `minLength={limits.passwordMinLength}`).
      - `LegalConsentField`: `Checkbox` with `"I have read and accept the {terms} and the {rules}, and I have read the {privacy}"` (`user.acceptLegalLabel`), where `"Terms of Service"` (`user.acceptTermsLink`) and `"Rules"` (`user.acceptRulesLink`) open `LegalDocModal`, and `"Privacy Policy"` (`user.acceptPrivacyLink`) opens `/[locale]/privacy-policy` in a new tab; inline validation error `"Please accept the Terms of Service and the Rules to create an account."` (`user.legalNotAccepted`).
      - `AltchaWidget`.
      - Registration closed notice (when `!features.registrationOpen`): `"New accounts are paused at the moment. Please try again later."` (`user.registrationClosedNotice`).
      - Submit button (`UserPlus` icon + `"Create Account"` / `user.createAccount`, disabled if registration is closed).
      - `GoogleSignInSection` + `DemoAccountButtons` + `ModeSwitchLink` (`"Already have an account? Sign In"` / `user.alreadyHaveAccount` + `user.signIn`).
    - **Forgot Password mode (`mode === 'forgot'`, title `"Reset Password"` / `user.resetPassword`)**:
      - Subtitle: `"We will send a reset link to your email."` (`user.authResetSubtitle`).
      - `"Email Address"` required email `Input` (`user.emailLabel`).
      - `AltchaWidget`.
      - Submit button (`Mail` icon + `"Send Reset Link"` / `user.sendResetLink`).
      - `ModeSwitchLink`: `"Back to Sign In"` (`user.backToSignIn`).
    - **Forgot Sent Notice view (`notice.type === 'forgot-sent'`, title `"Reset Password"`)**:
      - Amber `output` card with `MailWarning` icon + `"If that email is registered, a password reset link is on its way."` (`user.forgotSentNotice`) + `"Close"` button (`modal.close`).
    - **Email Verification view (`notice.type === 'verify-reminder' | 'register-success'`, title `"Verify Email"` / `user.authVerifyEmailTitle`, rendered by `components/EmailVerificationForm.tsx`)**:
      - Subtitle: `"Enter the code we sent to {email}."` (`user.authVerifySubtitle`).
      - Error alert text (e.g. `"Invalid verification code."` / `user.invalidVerificationCode`).
      - `CodeInput` (`components/auth/CodeInput.tsx`): 6 single-digit numeric `<input>` boxes (`aria-label="Digit {n} of verification code"` / `user.digitAriaLabel`).
      - Submit button: `"Verify"` (`user.verifyEmailAction`) / `"Verifying..."` (`user.verifying`).
      - Resend button: `"Resend code"` (`user.resendCode`) or cooldown `"Resend code in {seconds}s"` (`user.resendCodeIn`).
    - **Two-Factor Challenge view (`notice.type === 'two-factor'`, title `"Two-step verification"` / `twoFactor.challengeTitle`, rendered by `components/auth/TwoFactorChallengeForm.tsx`)**:
      - **App Code sub-mode (default)**:
        - Subtitle: `"Enter the 6-digit code from your authenticator app."` (`twoFactor.challengeSubtitle`).
        - `CodeInput` (6-digit numeric inputs).
        - Submit button: `"Verify"` (`twoFactor.challengeSubmit`).
        - Switch method button: `"Use a recovery code instead"` (`twoFactor.useRecoveryCode`).
        - `"Back to sign in"` button (`twoFactor.backToSignIn`).
      - **Recovery Code sub-mode (`useRecovery === true`)**:
        - Subtitle: `"Enter one of your recovery codes. Each one works only once."` (`twoFactor.challengeRecoverySubtitle`).
        - Recovery code text `Input` (`aria-label="Recovery code"` / `twoFactor.recoveryCodeLabel`, `placeholder="XXXXX-XXXXX"` / `twoFactor.recoveryCodePlaceholder`).
        - Submit button: `"Verify"` (`twoFactor.challengeSubmit`).
        - Switch method button: `"Use the authenticator app instead"` (`twoFactor.useAppCode`).
        - `"Back to sign in"` button (`twoFactor.backToSignIn`).
      - Error messages (`twoFactor.errInvalidCode`, `twoFactor.errLocked`, `twoFactor.errChallengeExpired`, `twoFactor.errGeneric`).
    - **Account Blocked view (`notice.type === 'blocked'`, rendered by `components/moderation/AccountBlockedNotice.tsx`)**:
      - Title: `"This account is banned"` (`moderation.blocked.bannedTitle`) or `"This account is suspended"` (`moderation.blocked.suspendedTitle`).
      - Red callout card with `Ban` or `Clock` icon + `"A moderator permanently banned this account, so it can no longer sign in."` (`moderation.blocked.bannedBody`) or `"A moderator suspended this account until {date}. You can sign in again after that."` (`moderation.blocked.suspendedBody`).
      - `"Reason: {reason}"` (`moderation.blocked.reasonLabel` + localized reason from `moderation.reasons.*`).
      - Appeal instructions (`moderation.blocked.appealWithContact` or `moderation.blocked.appealNoContact`).
      - `"Close"` button (`moderation.blocked.close`).
- **Legal Document Preview Modal (`components/legal/LegalDocModal.tsx`, `components/legal/LegalSections.tsx`)**:
  - **Trigger**: Clicking `"Terms of Service"` or `"Rules"` inline links inside `AuthModal`'s registration form (`LegalConsentField`).
  - **Variant**: `Modal` (`variant="dialog"`, `size="3xl"`, `layer="top"`, title `"Terms of Service"` / `terms.heading` or `"Rules"` / `rules.heading`).
  - **Elements**:
    - Non-binding notices (`LegalNotice`): `tldrNotice` and `translationNotice`.
    - Compact modal list of all sections (`LegalSections variant="modal"`):
      - Summary section (`"Summary"` / `"Rules in a nutshell"`) + bullet list.
      - Numbered/ordered sections (`terms`: 10 sections; `rules`: 8 sections), each with `BlockTitle`, dashed `TL;DR` callout bubble, paragraphs, bullet items, `HookStages` 3-stage visual bar on Rules' enforcement section (`"Stage 1: warning"`, `"Stage 2: suspension"`, `"Stage 3: ban"`), and `ContactLinks` (copyable email pill + `"Join our Discord"` pill) on the contact section.
- **Moderation Warning Modal (`components/moderation/WarningModal.tsx`, `components/moderation/WarningDialog.tsx`)**:
  - **Trigger**: Automatically opens on any page when `useAuth().warnings` is non-empty for the signed-in user.
  - **Variant**: Non-dismissible `Modal` (`variant="dialog"`, `size="md"`, `layer="top"`, `closeButton="none"`, `closeOnBackdropClick={false}`, `closeOnEscape={false}`, title `"You have received a warning"` / `moderation.warning.title`).
  - **Elements**:
    - Amber callout box with `TriangleAlert` icon + `"A moderator reviewed your activity on LemonDBD. Your account still works as before, but repeated breaches of the rules can lead to a suspension or a ban."` (`moderation.warning.intro`).
    - Definition list (`<dl>`):
      - `"Reason"` (`moderation.warning.reasonLabel`) -> localized reason (`moderation.reasons.*`).
      - `"Rule"` (`moderation.warning.ruleLabel`) -> `"Section {number}: {name}"` (`moderation.ruleSection`).
      - `"What happened"` (`moderation.warning.factsLabel`) -> moderator's factual note.
    - Metadata row: expiry date `"This warning expires on {date}."` (`moderation.warning.expires`), multi-warning counter `"Warning {current} of {total}"` (`moderation.warning.counter`), and link `"Read the rules"` (`moderation.warning.rulesLink` -> `/[locale]/rules`).
    - Footer action button: `"I understand"` (`moderation.warning.acknowledge`, calls `acknowledgeWarning(warning.id)`).
- **Bug Report Modal (`components/sidebar/BugReportModal.tsx`, `components/sidebar/BugReportScreenshots.tsx`)**:
  - **Trigger**: Sidebar `"Report Bug"` button (or User Profile `"Report New Bug"` button).
  - **Variant**: `Modal` (`variant="sheet"`, `size="xl"` for form / `size="sm"` for success, title `"Report a bug"` / `sidebar.bugReportModalTitle`).
  - **Modes / States**:
    - **Guests closed state (`!isAuthenticated && !features.guestBugReports`)**: `Alert` showing `"Bug reports from signed-out visitors are paused at the moment. Please sign in to send one."` (`sidebar.bugGuestsClosed`), no form or submit button.
    - **Active Form state**:
      - Error `Alert` (validation or submission error).
      - **Reporter identity**:
        - Signed-in user: elevated `Surface` card with `LemonIcon`, `"Logged in as {username}"` (`sidebar.bugLoggedInAs`), `user.email`, and green `"Verified"` `Badge` (`UserCheck` icon + `sidebar.verified`).
        - Guest user: required `"Email (for resolution updates)"` email `Input` (`sidebar.bugGuestEmailLabel`, `placeholder="you@example.com"` / `sidebar.bugGuestEmailPlaceholder`, `Mail` icon).
      - `"Issue Title"` required text `Input` (`sidebar.bugTitleLabel`, `placeholder="Short summary"` / `sidebar.bugTitlePlaceholder`).
      - `"Detailed Description"` required `Textarea` (`sidebar.bugDescriptionLabel`, `rows={5}`, `placeholder="What happened?"` / `sidebar.bugDescriptionPlaceholder`).
      - Inset guide box (`"A good report includes:"` / `sidebar.bugGuideTitle`): ordered list of 4 items (`"What happened"`, `"Steps to reproduce"`, `"Expected result"`, `"Screenshot"`).
      - `BugReportScreenshots` section:
        - Header: `ImageIcon` + `"Screenshots"` (`sidebar.bugScreenshotsLabel`, with red `*` if `features.bugReportRequireImage` is true) + counter `"{images.length}/{maxImages}"`.
        - Attached image thumbnail grid (`80x80` `Surface` tiles with `Img` + hover/focus delete button with `TrashIcon`, `aria-label="Remove screenshot {n}"`).
        - Dashed dropzone `Button` (hidden when `images.length >= maxImages`): `UploadIcon` + `"Drag screenshots here or click to browse"` (`sidebar.bugDropImages`, or `"Drop to attach"` / `sidebar.bugDropRelease` while dragging) + `"Max {count} images, {mb} MB each"` (`sidebar.bugImageLimits`) + hidden `<input type="file" accept="image/*" multiple />`.
        - File validation `Alert` (`"Only image files can be attached."`, `"Each screenshot must be {mb} MB or smaller."`, `"You can attach up to {count} screenshots."`).
      - `AltchaWidget` (active for guests).
      - Footer submit button: `"Submit"` (`sidebar.bugSubmitButton`) / `"Submitting..."` (`sidebar.bugSubmitting`).
    - **Success state (`isSuccess === true`)**:
      - `SuccessState`: green `CheckCircle2` icon + `"Report sent"` (`sidebar.bugSuccessMessage`) + `"Thank you for helping improve LemonDBD."` (`sidebar.bugSuccessThanks`) + floating close button.
- **Buy Coffee / Support Modal (`components/sidebar/BuyCoffeeModal.tsx`, `components/sidebar/RewardedAdSection.tsx`, `components/sidebar/SupportTile.tsx`)**:
  - **Trigger**: Sidebar `"Buy Coffee"` button.
  - **Variant**: `Modal` (`variant="dialog"`, `size="lg"` for links / `size="sm"` for thank-you state, title `"Support LemonDBD"` / `sidebar.coffeeTitle`).
  - **Modes / States**:
    - **Default Support options view**:
      - Donation message `<p>`: admin-configured localized message or default `"Fuel the Entity with caffeine to keep LemonDBD database servers and tired Meghead programmers running 24/7!"` (`sidebar.coffeeDonationMessage`).
      - Empty state text (if both support URLs are cleared in admin settings): `"Support links are not available right now."` (`sidebar.coffeeNoLinks`).
      - `"Buy Me a Coffee"` `SupportTile` (when `links.donationBmc` is set): `BuyMeACoffeeIcon`, tagline `"Quick 1-click coffee & support"` (`sidebar.coffeeBuyMeCoffeeTagline`), `"Visit"` chip + `ExternalLink` icon.
      - `"Ko-fi"` `SupportTile` (when `links.donationKofi` is set): `KofiIcon`, tagline `"0% fee donations & one-time tips"` (`sidebar.coffeeKofiTagline`), `"Visit"` chip + `ExternalLink` icon.
      - `RewardedAdSection` (rendered only when a rewarded ad provider is wired and `ready` is true): amber `SupportTile` with `ClapperboardIcon`, `"Watch a short ad"` (`sidebar.coffeeAdTitle`), `"Free support, just let the ad play to the end"` (`sidebar.coffeeAdTagline`), `"Watch"` chip + `ChevronIcon`.
    - **Ad Rewarded Thank-You state (`thanked === true`)**:
      - `SuccessState` with red `HeartIcon`, title `"Thank you!"` (`sidebar.coffeeAdThanksTitle`), description `"Your support keeps LemonDBD running."` (`sidebar.coffeeAdThanksMessage`) + `"You are the best!"` (`sidebar.coffeeAdThanksNote`).
- **Bard Insults Modal (`components/sidebar/BardInsultsModal.tsx`)**:
  - **Trigger**: Sidebar `"Bard Insults"` button (`id="bard-insults"`).
  - **Variant**: `Modal` (`variant="dialog"`, `size="lg"`, title `"Be Shakespeare in the Fog"` / `sidebar.insultsTitle`).
  - **Elements**:
    - Intro text: `"Lost for words after a lost trial? Swap the usual chat insults for something with a little more class."` (`sidebar.insultsIntro`).
    - Hint caption: `"Click an insult to copy it, then paste it into the post-game chat."` (`sidebar.insultsCopyHint`).
    - Side `SegmentedControl` (`ariaLabel="Choose a side"` / `sidebar.insultsSideAria`): `"Survivor"` (`sidebar.insultsSideSurvivor`, green active highlight) vs. `"Killer"` (`sidebar.insultsSideKiller`).
    - 2-column `Table` (`"You type"` / `sidebar.insultsColumnPlain` vs. `"The Bard says"` / `sidebar.insultsColumnBard`):
      - 9 shared rows (`"GG"`, `"EZ"`, `"You suck"`, `"Rage quit"`, `"AFK"`, `"Lagging"`, `"I'm carrying"`, `"One shot"`, `"He's cheating"`) + 6 role-specific rows (Survivor: `"Tunneling"`, `"Camping"`, `"Baby killer"`, `"Slugging"`, `"Gens are done"`, `"Noob killer"`; Killer: `"T-bagging"`, `"Hiding in a locker"`, `"Pallet looping"`, `"Flashlight clicking"`, `"Sweaty"`, `"Gen rushing"`).
      - Clicking any Bard cell copies the Shakespearean phrase to clipboard and displays a green `Check` icon for 1.5s + screen-reader `<output>` `"Copied to clipboard"` (`sidebar.insultsCopied`).
- **Experience & Atmosphere Preferences Prompt Modal (`components/common/PreferencesPromptModal.tsx`, `components/common/AtmospherePreferencesList.tsx`)**:
  - **Trigger**: Opened on first visit to sensory/atmosphere-heavy features (e.g. Smash or Pass when `lemondbd_smash_entry_acknowledged_v1` is not set).
  - **Variant**: `Modal` (`variant="dialog"`, `size="md"`, `closeButton="none"`, `testId="preferences-prompt-modal"`, title `"Trial Safety & Atmosphere"` / `smashOrPass.effectsPrefs.smashPromptTitle` in `'smash'` mode or `"Experience & Atmosphere"` / `smashOrPass.effectsPrefs.promptTitle` in `'general'` mode).
  - **Elements**:
    - Photosensitivity warning banner (in `'smash'` mode): amber card with `WarningIcon`, `"Photosensitivity Warning"` (`smashOrPass.effectsPrefs.epilepsyWarningTitle`), and `"Features rapid animations, flashes, and sudden sounds that may trigger seizures or discomfort. You can disable effects in Settings."` (`smashOrPass.effectsPrefs.epilepsyWarningBody`).
    - `AtmospherePreferencesList` (5 preference rows):
      1. `VolumeIcon` + `"Sound Effects"` (`settings.soundEffects`) + `Switch`.
      2. `MusicIcon` + `"Music"` (`settings.music`) + `Switch`.
      3. `ClapperboardIcon` + `"Interactive Animations"` (`settings.animations`) + `Switch`.
      4. `MatureIcon` + `"NSFW / 18+ Content"` (`settings.nsfw`) + `"18+"` amber pill + `Switch`.
      5. `CampfireIcon` + `"Campfire Particles"` (`settings.campfire`) + 3-button fieldset: `"Full"` (`settings.campfireOn`), `"Eco"` (`settings.campfireEco`), `"Off"` (`settings.campfireOff`).
    - Action buttons: `"Settings"` (`smashOrPass.effectsPrefs.goToSettings` -> navigates to `/[locale]/settings`) and `"Enter Trial"` (`smashOrPass.effectsPrefs.enterTrial`) / `"Defaults"` (`smashOrPass.effectsPrefs.continueDefaults`).

---

## app/global-error.tsx (Root Layout Crash Boundary)

### Page & files
- **Error boundary entry**: `app/global-error.tsx`
- **Component**: `components/layout/GlobalErrorDocument.tsx`
- **Styles & helpers**: `components/layout/errorPageClasses.ts`, `i18n/errorPageCopy.ts`, `locales/en/errorPages.ts`

### Layout elements
- Standalone `<html>` + `<body className="bg-bg-primary text-text-primary">` + centered `<main>` (no providers, no sidebar).
- Error code badge (`ERROR_CODE_BADGE`): `"Error"` (`errorPages.error.code`).
- Heading (`<h1>`): `"Something went wrong"` (`errorPages.error.title`).
- Description (`<p>`): `"This page hit an unexpected error. Try again; if it keeps happening, go back to the home page."` (`errorPages.error.text`).
- Action buttons:
  - `"Try again"` button (`errorPages.error.retry`, calls Next's `reset()`).
  - `"Back to home"` full-reload anchor (`<a href="/{locale}">`, `errorPages.backHome`).
- Error digest line (rendered only when `error.digest` is present): `"Reference: <code>{error.digest}</code>"` (`errorPages.error.reference`).

### Modes / states
- **Locale resolution**: initializes in English (`DEFAULT_ERROR_PAGE_COPY`), detects the locale prefix from `window.location.pathname` (`localeOfPath`), and asynchronously loads localized strings (`loadErrorPageCopy`).
- **With vs. without `error.digest`**: conditionally shows the `"Reference"` code line.

### Modals & drawers (file)
- None (renders outside all layout providers).

---

## /[locale]/error.tsx (Segment Error Boundary)

### Page & files
- **Error boundary entry**: `app/[locale]/error.tsx`
- **Component**: `components/layout/ErrorPage.tsx` (`variant="error"`)
- **Styles & helpers**: `components/layout/errorPageClasses.ts`, `locales/en/errorPages.ts`

### Layout elements
- Renders inside the normal `AppShell` (with `Sidebar` and `useShellOverride(ERROR_SHELL)`).
- Elevated rounded card with glowing `LemonIcon` (`dbd-lemon-glow`).
- Error code badge: `"Error"` (`errorPages.error.code`).
- Heading (`<h1>`): `"Something went wrong"` (`errorPages.error.title`).
- Description (`<p>`): `"This page hit an unexpected error. Try again; if it keeps happening, go back to the home page."` (`errorPages.error.text`).
- Action buttons:
  - `"Try again"` button (`Button variant="secondary"`, `RotateCcw` icon + `errorPages.error.retry`, calls `reset()`).
  - `"Back to home"` link (`Link` to `/${locale}`, `Home` icon + `errorPages.backHome`).
- Reference line (when `error.digest` is present): `"Reference: <code>{reference}</code>"` (`errorPages.error.reference`).

### Modes / states
- **`ErrorPage` shared variants (`components/layout/ErrorPage.tsx`)**:
  - `variant="error"`: used by `app/[locale]/error.tsx` (includes `"Try again"` button and optional `reference` digest).
  - `variant="not-found"`: used by `app/[locale]/not-found.tsx` (code `"404"`, title `"Page not found"`, text `"This page doesn't exist, was moved, or the address has a typo."`).
  - `variant="forbidden"`: used by `app/[locale]/forbidden/page.tsx` (code `"403"`, title `"Forbidden"`, guest text `"You need to sign in with an administrator account to open this page."` vs. signed-in text `"Your account doesn't have permission to open this page."`).
  - `variant="blocked"`: used by `app/[locale]/blocked/page.tsx` (code `"Blocked"`, title `"Page blocked"`, text `"This page isn't open to visitors right now."`).

### Modals & drawers (file)
- Inherits all global shell modals (`Sidebar` mobile drawer, `WhatsNewLauncher`, `AuthModal`, `BugReportModal`, `BuyCoffeeModal`, `BardInsultsModal`, `WarningModal`).

---

## /[locale]/not-found.tsx & /[locale]/[...rest] (404 Not Found & Catch-All)

### Page & files
- **Catch-all route**: `app/[locale]/[...rest]/page.tsx` (calls `notFound()` from `next/navigation` so unknown URLs under `/[locale]/*` render `app/[locale]/not-found.tsx` inside the locale layout shell).
- **Not-found boundary**: `app/[locale]/not-found.tsx`
- **Component**: `components/layout/ErrorPage.tsx` (`variant="not-found"`)
- **Styles & helpers**: `components/layout/errorPageClasses.ts`, `locales/en/errorPages.ts`

### Layout elements
- Renders inside `AppShell` (`useShellOverride(ERROR_SHELL)` keeps `Sidebar` interactive).
- Elevated rounded card (`h-36 w-36 sm:h-44 sm:w-44`) with glowing `LemonIcon`.
- Badge (`ERROR_CODE_BADGE`): `"404"` (`errorPages.notFound.code`).
- Heading (`<h1>`): `"Page not found"` (`errorPages.notFound.title`).
- Description (`<p>`): `"This page doesn't exist, was moved, or the address has a typo."` (`errorPages.notFound.text`).
- Action link (`Link` to `/${locale}`, primary button style): `Home` icon + `"Back to home"` (`errorPages.backHome`).

### Modes / states
- Static 404 presentation inside `ERROR_SHELL`; document title set to `"LemonDBD - Page not found"`.

### Modals & drawers (file)
- Inherits all global shell modals (`Sidebar` mobile drawer, `WhatsNewLauncher`, `AuthModal`, `BugReportModal`, `BuyCoffeeModal`, `BardInsultsModal`, `WarningModal`).
