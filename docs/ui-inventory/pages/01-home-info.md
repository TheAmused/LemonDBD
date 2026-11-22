# UI Inventory — Home, Onboarding, Info & Legal, System & Auth Routes

> Scope: `/` (home), `/welcome`, `/about`, `/rules`, `/privacy-policy`, `/terms-of-service`, `/maintenance`, `/blocked`, `/forbidden`, `/reset-password`.
> Paths are relative to `frontend/src`. Default English strings from `locales/en/*` are quoted alongside their translation keys where applicable.

---

## Shared Root & AppShell Frame (`app/[locale]/layout.tsx`)

All routes under `app/[locale]/*` mount inside the root locale layout (`app/[locale]/layout.tsx`). Whether the `Sidebar` and `<main>` wrapper render depends on `ROUTE_SHELLS` in `components/layout/shellRoutes.ts` (or a runtime `useShellOverride` call):
- **Routes with AppShell (`Sidebar` + `<main>`)**: `/`, `/about`, `/rules`, `/privacy-policy`, `/terms-of-service`, `/blocked`, `/forbidden` (plus uncaught error boundary `app/[locale]/error.tsx` and 404 `app/[locale]/not-found.tsx`).
- **Shell-less routes (`shell: false` — no `Sidebar`, full-bleed children)**: `/welcome`, `/maintenance`, `/reset-password`.

### Shared Layout Elements (present on all routes via `app/[locale]/layout.tsx`)
- **Background canvas** (`components/layout/AppBackground.tsx`, `components/common/CampfireParticles.tsx`):
  - Fixed `-z-10` layer rendering `CampfireParticles` when preference `backgroundAnimation` is `'on'` (default) or `'eco'`; empty `div` when `'off'`.
- **Site Notice Banner** (`components/layout/SiteBannerGate.tsx` -> `components/layout/SiteBanner.tsx`):
  - Rendered at top of viewport when `siteConfig.banner.active` is true and within schedule (`isBannerVisible`).
  - Level variants (`BannerLevel`):
    - `info`: `Info` icon (Lucide), neutral border, `role="status"`.
    - `warning`: `TriangleAlert` icon (Lucide), amber border/icon, `role="status"`.
    - `critical`: `OctagonAlert` icon (Lucide), red border/icon, `role="alert"` (cannot be dismissed).
  - Banner text (`bannerTextFor(banner, locale)`).
  - Dismiss icon button (`X` icon, `aria-label="Dismiss notice"` / `app.siteBannerDismiss`, shown only for `info` and `warning` levels; persists fingerprint in `localStorage['lemondbd_site_banner_dismissed']`).
- **Global Tooltip Bubble** (`components/common/Tooltip.tsx` — `TooltipProvider`):
  - Portal-mounted `TooltipBubble` (`role="tooltip"`) triggered on hover/keyboard-focus of any element with `data-tooltip` (`tip()`). Variants: `default`, `item`, `action`, `status`, `error`.
- **Global Form Validation Bubble** (`components/common/FormValidation.tsx` — `FormValidationProvider`):
  - Intercepts native `invalid` events on `input` / `select` / `textarea` and renders a `TooltipBubble` (`variant="error"`, `placement="bottom"`) with `CircleAlert` icon + localized message (`validation.*`: `"Fill out this field."`, `"Tick this box to continue."`, `"Choose an option."`, `"Enter a valid email address."`, `"Enter a valid web address (https://…)."`, `"Use at least {min} characters."`, `"Use at most {max} characters."`, `"Enter {min} or more."`, `"Enter {max} or less."`, `"Enter a valid number."`, `"Enter a valid value."`, `"Match the requested format."`, `"This value is not valid."`) plus `sr-only` `role="alert"`.
- **Content Revocation Toast / Banner** (`components/common/ContentRevocationSync.tsx` -> `components/common/ContentRemovedNotice.tsx`):
  - Fixed bottom-center toast (`output`, `aria-live="polite"`) shown when locally saved tier lists, rosters, or minigames are purged due to moderator ban (`content-revoked` window event):
    - `ShieldAlert` icon (amber).
    - Title: `"Saved content removed"` (`moderation.contentRemoved.title`).
    - Body: `"An item you saved on this device was / # items you saved on this device were removed because moderators blocked it/them for breaking the rules."` (`moderation.contentRemoved.body`).
    - Dismiss button (`X` icon, `aria-label="Dismiss"` / `moderation.contentRemoved.dismiss`).
- **Maintenance Poller** (`components/layout/MaintenanceWatcher.tsx` -> `components/layout/MaintenancePoller.tsx`):
  - Headless 60s interval + tab-visibility poller (`GET /api/v1/maintenance-status`); redirects non-admin visitors to `/${locale}/maintenance` if maintenance mode activates (skipped on `/maintenance` and `/admin/*`).
- **Sidebar & Mobile Header** (`components/Sidebar.tsx`, rendered on routes where `shell !== false`):
  - **Desktop `<aside>`** (`aria-label="Main Navigation"` / `sidebar.navAria`, collapsible via `useSidebarState` & `localStorage['lemon_dbd_sidebar_collapsed']`):
    - **Brand Home Link** (`href="/${locale}"`, `aria-label="LemonDBD Home"` / `sidebar.homeAria`): `IconTile` with `LemonIcon` + `"LemonDBD"` (`app.title`).
    - **What's New Launcher** (`components/changelog/WhatsNewLauncher.tsx`): `Megaphone` icon button (`aria-label="What's New?"`, tooltip `"What's New?"` / `changelog.triggerTitle`) with conditional `UnreadDot` badge.
    - **Primary Navigation (`<nav>`)**:
      - `SidebarNavLink`: `"Challenges"` (`sidebar.challenges`, `TargetIcon`, `href="/${locale}/streaks"`).
      - `SidebarNavLink`: `"Map Callouts"` (`sidebar.mapCallouts`, `MapIcon`, `href="/${locale}/maps"`).
      - `SidebarNavLink`: `"Perk Randomizer"` (`filters.generatorTab`, `DiceIcon`, `href="/${locale}/randomizer"`).
      - `SidebarNavGroup` (`id="database"`, `"Database"` / `sidebar.groupDatabase`, `Library` icon, `ChevronDown` disclosure, persisted in `localStorage['lemon_dbd_nav_group_database']`):
        - `SidebarNavLink`: `"Perks"` (`filters.perks`, `PerkHexIcon`, `href="/${locale}/perks"`).
        - `SidebarNavLink`: `"Characters"` (`sidebar.characters`, `MaskIcon`, `href="/${locale}/characters"`).
      - `SidebarNavGroup` (`id="extras"`, `"Community & Games"` / `sidebar.groupExtras`, `GridIcon`, `ChevronDown` disclosure, persisted in `localStorage['lemon_dbd_nav_group_extras']`):
        - `SidebarNavLink`: `"Tier Lists"` (`sidebar.tierLists`, `LayoutList` icon, `href="/${locale}/tier-lists"`).
        - `SidebarNavLink`: `"Smash or Pass"` (`sidebar.smashOrPass`, `HeartIcon`, `href="/${locale}/smash-or-pass"`).
        - `SidebarNavLink`: `"Minigames"` (`sidebar.minigames`, `Gamepad2` icon, `href="/${locale}/minigames"`).
      - `SidebarNavLink`: `"Trophies"` (`sidebar.trophies`, `TrophyIcon`, `href="/${locale}/achievements"`).
      - `SidebarNavLink`: `"Settings"` (`sidebar.settings`, `Settings` icon, `href="/${locale}/settings"`).
      - `SidebarNavLink`: `"About us"` (`sidebar.about`, `Info` icon, `href="/${locale}/about"`).
      - **Admin-gated `SidebarNavGroup`** (`isAdmin === true`, `id="admin"`, `"Administration"` / `sidebar.groupAdmin`, `CrownIcon`):
        - `SidebarNavLink`: `"Admin Control Center"` (`sidebar.adminControlCenter`, `Settings` icon, `href="/${locale}/admin"`). (Note: any nav item whose path is marked admin-only in `adminOnlyPageFromPathname` is hidden for non-admins.)
    - **User Section** (`components/sidebar/SidebarUserSection.tsx`):
      - `SidebarNavLink` (dialog button): `"Bard Insults"` (`sidebar.insultsButton`, `Pencil` icon, opens `BardInsultsModal`).
      - **Guest state (`!isAuthenticated || !user`)**: `"Sign In"` button (`sidebar.signIn`, `LogIn` icon, opens `AuthModal` in `'login'` mode).
      - **Signed-in state (`isAuthenticated && user`)**:
        - Profile card (`Surface`): link to `/${locale}/user` with `UserAvatar` (custom image or fallback `LemonIcon`), username, role `Badge` (`"Administrator"` / `user.roleAdmin` in red tone if `user.role === 'admin'`, else `"User"` / `sidebar.roleUser` in neutral tone).
        - `"Sign Out"` icon button (`LogOut` icon, `aria-label="Sign Out"`, tooltip `"Sign Out"` / `sidebar.signOut`).
        - **Unverified email state** (`mustConfirmEmail(user, verificationRequired)`): `"Email not verified. Verify now"` link button (`sidebar.emailNotVerified`, opens `AuthModal` in email verification mode).
    - **Bottom Controls** (`components/sidebar/SidebarBottomControls.tsx`):
      - **Language Picker**: trigger button (`FlagIcon` + uppercase locale code `EN` / `PL` / `ES` / `DE` / `JA`, `aria-label="Switch Language"` / `sidebar.switchLanguage`, `aria-expanded`); popover `Surface` menu listing 5 `Link` items (`English`, `Polski`, `Español`, `Deutsch`, `日本語` with `FlagIcon`).
      - **Theme Picker**: trigger button (current theme icon + `FitText` label/short label, `aria-label="Change Theme"` / `sidebar.toggleTheme`, `aria-expanded`); popover `Surface` menu with 4 `MenuItem` options:
        - `"Light mode"` / short `"Light"` (`sidebar.themeLight` / `themeLightShort`, `Sun` icon).
        - `"Light mode (Lemon)"` / short `"Lemon"` (`sidebar.themeLightLemon` / `themeLightLemonShort`, `Citrus` icon).
        - `"Dark mode"` / short `"Dark"` (`sidebar.themeDark` / `themeDarkShort`, `Moon` icon).
        - `"System theme"` / short `"System"` (`sidebar.themeSystem` / `themeSystemShort`, `Laptop` icon).
      - **Report Bug Button**: `"Report Bug"` (`sidebar.reportBug`, `FogReportIcon`, opens `BugReportModal`).
      - **Buy Coffee Button**: `"Buy Coffee"` (`sidebar.buyCoffee`, `CampfireMugIcon`, opens `BuyCoffeeModal`).
      - **Legal Footer `<nav>`** (`aria-label="About us"`): `"Privacy"` link (`sidebar.privacyPolicy`, `href="/${locale}/privacy-policy"`), `·` separator, `"Terms"` link (`sidebar.termsOfService`, `href="/${locale}/terms-of-service"`).
    - **Collapse Toggle Tab** (`data-testid="sidebar-toggle-button"`): desktop edge `TileButton` (`aria-label="Toggle Navigation Sidebar"` / `sidebar.toggleSidebar`, `ChevronRight` when collapsed, `ChevronLeft` when expanded).
  - **Mobile `<header>`** (`lg:hidden`):
    - Brand Home `Link` (`LemonIcon` + `"LemonDBD"`).
    - `WhatsNewLauncher` (`Megaphone` icon button + `UnreadDot`).
    - Mobile Drawer Toggle `Button` (`Menu` icon, `data-testid="mobile-drawer-toggle"`, `aria-label="Open Navigation Drawer"` / `sidebar.openDrawer`).

### Shared Modals & Drawers (mounted in Root Layout / Sidebar)
- **Mobile Navigation Drawer** (`components/Sidebar.tsx` via `components/common/Modal.tsx`, `variant="drawer-left"`, `size="xs"`):
  - Trigger: Mobile header `Menu` button (`data-testid="mobile-drawer-toggle"`).
  - Contents: Close `Button` (`X` icon, `data-testid="mobile-drawer-close"`, `aria-label="Close Navigation Drawer"` / `sidebar.closeDrawer`) + full `renderSidebarContent()`.
- **Moderator Warning Modal** (`components/moderation/WarningModal.tsx` -> `components/moderation/WarningDialog.tsx`, `variant="dialog"`, `size="md"`, `layer="top"`, non-dismissible via backdrop/Escape, `closeButton="none"`):
  - Trigger: Automatically opens on any route when signed-in user has unacknowledged warnings (`auth.warnings.length > 0`).
  - Elements:
    - Title: `"You have received a warning"` (`moderation.warning.title`).
    - Callout box: `TriangleAlert` icon + `"A moderator reviewed your activity on LemonDBD. Your account still works as before, but repeated breaches of the rules can lead to a suspension or a ban."` (`moderation.warning.intro`).
    - Definition list (`<dl>`): `"Reason"` (`moderation.warning.reasonLabel` + localized reason from `moderation.reasons.*`), `"Rule"` (`moderation.warning.ruleLabel` + `"Section {number}: {name}"`), `"What happened"` (`moderation.warning.factsLabel` + moderator facts text).
    - Metadata row: expiration text `"This warning expires on {date}."` (`moderation.warning.expires`), multi-warning counter `"Warning {current} of {total}"` (`moderation.warning.counter` when `warnings.length > 1`), `"Read the rules"` link (`moderation.warning.rulesLink`, `href="/${locale}/rules"`, also acknowledges warning).
    - Footer action: `"I understand"` primary button (`moderation.warning.acknowledge`, calls `acknowledgeWarning(warning.id)`).
- **What's New (Changelog) Modal & Sub-Modals** (`components/changelog/WhatsNewLauncher.tsx`, `components/changelog/ChangelogPostItem.tsx`, `components/changelog/ChangelogEditorModal.tsx`, `components/common/RichTextEditor.tsx`):
  - Trigger: `Megaphone` button in Sidebar / Mobile Header.
  - Main Modal (`variant="dialog"`, `size="2xl"`, `fullscreenOnMobile`, title `"What's New"` / `changelog.modalTitle`, close `X` button):
    - **Admin-only header button**: `Plus` icon button (`aria-label="New entry"`, tooltip `"New entry"` / `changelog.newEntry`, opens `ChangelogEditorModal`).
    - **Error state**: Dismissible `Alert` (`CircleAlert` icon + error message + `X` dismiss button).
    - **Loading state**: Centered `Spinner` (`size="md"`).
    - **Empty state**: `EmptyState` (`variant="inline"`, `Megaphone` icon, `"Nothing new yet. Check back after the next Trial."` / `changelog.emptyState`).
    - **Post list (`ChangelogPostItem` rows)**:
      - **Admin-only drag handle**: `GripVertical` icon button (`aria-label="Drag to reorder"`, tooltip `"Drag to reorder"` / `changelog.dragToReorder`).
      - `DisclosureButton` header (`ChevronDown` icon):
        - **Admin-only status badge**: `"Published"` (green) or `"Draft"` (amber) (`changelog.publishedLabel` / `changelog.draftBadge`).
        - Post date, conditional `"Edited"` label (`changelog.edited`).
        - **Admin-only Discord badge**: `DiscordIcon` + `"On Discord"` (`changelog.discordSent`).
        - Heading `h3` (post title) + conditional `"New"` badge (`changelog.newBadge`, redSolid) when unread.
        - Collapsed 2-line plain-text preview (`line-clamp-2`).
      - **Admin-only row action buttons**:
        - `"Announce on Discord"` (`DiscordIcon`, shown when published and not yet announced).
        - `"Update on Discord"` (`RefreshCw` icon, shown when edited after Discord sync).
        - `"Edit"` (`Pencil` icon, opens `ChangelogEditorModal`).
        - `"Delete"` (`Trash2` icon, opens delete `ConfirmModal`).
      - Collapsible body: `<RichText block />` rendering post HTML.
    - **Pagination**: `"Load more"` button (`changelog.loadMore`, with `loadingMore` spinner state) when `hasMore` is true.
  - **Admin Sub-Modal — `ChangelogEditorModal`** (`variant="dialog"`, `size="2xl"`, `layer="top"`, title `"New Changelog Entry"` / `"Edit Changelog Entry"`):
    - `"Title"` required `Input` (`changelog.titleLabel`).
    - Quick section pill buttons (`"Add section"` / `changelog.addSection` label + `Plus` icon buttons for `"New"`, `"QoL"`, `"Balance"`, `"Bug-fix"`, `"Known issues"`, `"Announcement"`).
    - `"Content"` required `RichTextEditor` (`changelog.bodyLabel`): toolbar with `Bold`, `Italic`, `Underline`, `AlignLeft`, `AlignCenter`, `AlignRight`, `AlignJustify`, `Heading3`, `List` (bullet), `ListOrdered` (numbered), `Link2` (opens URL `Popover` with `Input` placeholder `"Link URL (https://...)"` + `"Add link"` button), `Palette` (opens text color `Popover` with 6 `ColorSwatch` buttons: Bone, Blood, Amber, Hex, Hope, Fog), `Highlighter` (opens highlight `Popover` with `"No highlight"` `×` button + 5 `ColorSwatch` buttons), and `contentEditable` textbox.
    - Error `Alert` when save fails.
    - Footer: `Switch` toggle (`aria-label="Published"`) + `"Published"` / `"Draft"` label, `"Save"` primary button (`changelog.save`).
  - **Admin Sub-Modals — Confirmations & Notices**:
    - Announce/Update Discord `ConfirmModal` (`"Announce on Discord?"` / `"Update the Discord message?"`, confirm `"Send"` / `"Update"`).
    - Unpublish Draft `ConfirmModal` (`"Save as draft?"`, `"Readers will no longer see this entry and its Discord message will be deleted."`, confirm `"Save"`).
    - Delete Entry `ConfirmModal` (`"Delete this entry?"`, `"This changelog post will be permanently removed."`, confirm `"Delete"`).
    - Discord Sent `Modal` (`size="sm"`, `SuccessState` with `CheckCircle2` + `"Sent to Discord"` / `"Discord message updated"`).
- **Authentication Modal (`components/AuthModal.tsx`, `components/auth/AuthModalParts.tsx`) & Legal Preview Modal (`components/legal/LegalDocModal.tsx`)**:
  - Trigger: Sidebar `"Sign In"` button, Sidebar `"Email not verified. Verify now"` button, or `/welcome` guest state `"Sign In"` button.
  - Modal frame (`variant="dialog"`, `size="md"`, close `X` button `aria-label="Close"` / `modal.close`).
  - **Modes / Views**:
    1. **Security Check Loading (`showSecurityCheck`)**: `Spinner` (`tone="accent"`) + `"Running security check"` (`user.authSecurityCheck`) while ALTCHA PoW challenge solves.
    2. **Sign In mode (`mode === 'login'`, title `"Sign In"` / `user.authSignInTitle`)**:
       - Error `Alert` banner (`CircleAlert` + message) when error occurs.
       - `"Login or Email"` required text `Input` (`user.loginOrEmailLabel`).
       - `"Password"` required password `Input` (`user.passwordLabel`).
       - `"Forgot password?"` link button (`user.forgotPasswordLink`, hidden when `adminOnly`; switches to `'forgot'` mode).
       - `AltchaWidget` (`components/common/AltchaWidget.tsx`: hidden honeypot input + status/error output with `ShieldCheck` / `ShieldAlert` + `"Retry"` button).
       - Submit `Button`: `LogIn` icon + `"Sign In"` (`user.signIn`).
       - **Google Sign-In section** (when `googleClientId` is configured and not `adminOnly`): `"or"` divider (`user.googleOrDivider`) + `GoogleSignInButton` (`GoogleLogo` SVG + `"Continue with Google"` / `user.googleContinue` + GIS iframe overlay).
       - **Dev-only Demo Accounts** (`useDemoAccounts`, when `FLASK_ENV=development`): `"Quick Demo Accounts"` (`user.quickDemoAccounts`), `"Admin (lemon)"` button (`ShieldAlert` icon, `user.adminDemo`), `"User (user)"` button (`user.userDemo`).
       - Mode switch link button: `"Don't have an account? Register"` (`user.dontHaveAccount` + `user.register`, switches to `'register'`).
    3. **Register mode (`mode === 'register'`, title `"Create Account"` / `user.authRegisterTitle`)**:
       - `"Login"` required text `Input` (`user.loginLabel`).
       - `"Username"` required text `Input` (`user.usernameLabel`, `minLength={3}`, `maxLength={50}`).
       - `"Email Address"` required email `Input` (`user.emailLabel`).
       - `"Password"` required password `Input` (`user.passwordLabel`, `minLength={limits.passwordMinLength}`).
       - `LegalConsentField`: `Checkbox` with label `"I have read and accept the Terms of Service and the Rules, and I have read the Privacy Policy"` (`user.acceptLegalLabel`).
         - `"Terms of Service"` `InlineLink` (`user.acceptTermsLink`) -> opens `LegalDocModal` (`doc="terms"`).
         - `"Rules"` `InlineLink` (`user.acceptRulesLink`) -> opens `LegalDocModal` (`doc="rules"`).
         - `"Privacy Policy"` `InlineLink` (`user.acceptPrivacyLink`) -> opens `/${locale}/privacy-policy` in a new tab.
         - Validation error text (`#accept-legal-error`, `role="alert"`): `"Please accept the Terms of Service and the Rules to create an account."` (`user.legalNotAccepted`).
       - `AltchaWidget`.
       - **Registration closed notice** (when `!features.registrationOpen`): `"New accounts are paused at the moment. Please try again later."` (`user.registrationClosedNotice`, disables submit).
       - Submit `Button`: `UserPlus` icon + `"Create Account"` (`user.createAccount`).
       - `GoogleSignInSection` + `DemoAccountButtons` + Mode switch link (`"Already have an account? Sign In"` / `user.alreadyHaveAccount` + `user.signIn`).
    4. **Forgot Password mode (`mode === 'forgot'`, title `"Reset Password"` / `user.resetPassword`)**:
       - Subtitle: `"We will send a reset link to your email."` (`user.authResetSubtitle`).
       - `"Email Address"` required email `Input` (`user.emailLabel`).
       - `AltchaWidget`.
       - Submit `Button`: `Mail` icon + `"Send Reset Link"` (`user.sendResetLink`).
       - Mode switch link: `"Back to Sign In"` (`user.backToSignIn`).
    5. **Forgot Sent Notice (`notice.type === 'forgot-sent'`, title `"Reset Password"`)**:
       - Amber callout (`MailWarning` icon + `"If that email is registered, a password reset link is on its way."` / `user.forgotSentNotice` + `"Close"` button `modal.close`).
    6. **Email Verification Notice (`notice.type === 'verify-reminder' | 'register-success'`, title `"Verify Email"` / `user.authVerifyEmailTitle`, rendered by `components/EmailVerificationForm.tsx`)**:
       - Subtitle: `"Enter the code we sent to {email}."` (`user.authVerifySubtitle`).
       - Error text (`role="alert"`): e.g. `"Invalid verification code."` (`user.invalidVerificationCode`) or `"Failed to resend code."` (`user.failedToResendCode`).
       - `CodeInput` (`components/auth/CodeInput.tsx`): 6 numeric single-digit inputs (`aria-label="Digit {n} of verification code"` / `user.digitAriaLabel`).
       - Submit `Button`: `"Verify"` / `"Verifying..."` (`user.verifyEmailAction` / `user.verifying`).
       - Resend `Button`: `"Resend code"` or cooldown `"Resend code in {seconds}s"` (`user.resendCode` / `user.resendCodeIn`).
    7. **Two-Factor Challenge Notice (`notice.type === 'two-factor'`, title `"Two-step verification"` / `twoFactor.challengeTitle`, rendered by `components/auth/TwoFactorChallengeForm.tsx`)**:
       - **Authenticator App sub-mode (`!useRecovery`)**:
         - Subtitle: `"Enter the 6-digit code from your authenticator app."` (`twoFactor.challengeSubtitle`).
         - `CodeInput` (6 digits).
         - Toggle button: `"Use a recovery code instead"` (`twoFactor.useRecoveryCode`).
       - **Recovery Code sub-mode (`useRecovery`)**:
         - Subtitle: `"Enter one of your recovery codes. Each one works only once."` (`twoFactor.challengeRecoverySubtitle`).
         - Text `Input` (`aria-label="Recovery code"`, placeholder `"XXXXX-XXXXX"` / `twoFactor.recoveryCodePlaceholder`).
         - Toggle button: `"Use the authenticator app instead"` (`twoFactor.useAppCode`).
       - Error text (`role="alert"`, `twoFactor.errInvalidCode` / `errLocked` / `errChallengeExpired` / `errGeneric`).
       - Submit `Button`: `"Verify"` (`twoFactor.challengeSubmit`).
       - Back button: `"Back to sign in"` (`twoFactor.backToSignIn`).
    8. **Account Blocked Notice (`notice.type === 'blocked'`, title `"This account is banned"` / `"This account is suspended"`, rendered by `components/moderation/AccountBlockedNotice.tsx`)**:
       - Red alert card with `Ban` (if banned) or `Clock` (if suspended) icon + body text (`"A moderator permanently banned this account, so it can no longer sign in."` / `"A moderator suspended this account until {date}. You can sign in again after that."` — `moderation.blocked.bannedBody` / `suspendedBody`).
       - `"Reason: {reason}"` (`moderation.blocked.reasonLabel`).
       - Appeal text (`moderation.blocked.appealWithContact` / `appealNoContact`).
       - `"Close"` primary button (`moderation.blocked.close`).
  - **Nested Sub-Modal — `LegalDocModal`** (`components/legal/LegalDocModal.tsx`, `variant="dialog"`, `size="3xl"`, `layer="top"`):
    - Trigger: Clicking `"Terms of Service"` or `"Rules"` inline link in `LegalConsentField`.
    - Elements: Header with document title (`"Terms of Service"` or `"Rules"`) and close `X` button; non-binding `LegalNotice` lines (`tldrNotice`, `translationNotice`); `<LegalSections variant="modal" />` rendering all sections inline with `h3` `BlockTitle` headings (no collapsible accordions).
- **Bug Report Modal** (`components/sidebar/BugReportModal.tsx`, `components/sidebar/BugReportScreenshots.tsx`, `variant="sheet"`, `size="xl"` or `"sm"` on success):
  - Trigger: Sidebar `"Report Bug"` button.
  - **Modes / States**:
    - **Guests Closed state** (`!isAuthenticated && !features.guestBugReports`): `Alert` with `"Bug reports from signed-out visitors are paused at the moment. Please sign in to send one."` (`sidebar.bugGuestsClosed`), no submit footer.
    - **Form state**:
      - Title: `"Report a bug"` (`sidebar.bugReportModalTitle`), close `X` button (`sidebar.bugCloseButton`).
      - Error `Alert` when validation/submission fails.
      - **Reporter Identity**:
        - **Signed-in variant**: `Surface` card with `LemonIcon`, `"Logged in as {username}"` (`sidebar.bugLoggedInAs`), user email, green `"Verified"` `Badge` (`UserCheck` icon + `sidebar.verified`).
        - **Guest variant**: Required `FormField` `"Email (for resolution updates)"` (`sidebar.bugGuestEmailLabel`, `Mail` icon) with email `Input` (placeholder `"you@example.com"` / `sidebar.bugGuestEmailPlaceholder`).
      - **Issue Title**: Required `FormField` `"Issue Title"` (`sidebar.bugTitleLabel`) with text `Input` (placeholder `"Short summary"` / `sidebar.bugTitlePlaceholder`).
      - **Detailed Description**: Required `FormField` `"Detailed Description"` (`sidebar.bugDescriptionLabel`) with `Textarea` (rows=5, placeholder `"What happened?"` / `sidebar.bugDescriptionPlaceholder`) + inset guide card (`"A good report includes:"` / `sidebar.bugGuideTitle` with numbered list: `"What happened: Describe the problem in a sentence or two."`, `"Steps to reproduce: What you clicked or typed, step by step."`, `"Expected result: What you thought should happen instead."`, `"Screenshot: A picture of the problem, if you can. It speeds up the fix."`).
      - **Screenshots Uploader (`BugReportScreenshots`)**:
        - Header: `ImageIcon` + `"Screenshots"` (`sidebar.bugScreenshotsLabel`, red `*` if `features.bugReportRequireImage`) + counter `{images.length}/{maxImages}`.
        - Attached thumbnail grid (`<ul>` of 80×80 `Img` tiles with hover `TrashIcon` remove button `aria-label="Remove screenshot {n}"`).
        - Drag-and-drop dashed `Button` (hidden when full): `UploadIcon` + `"Drag screenshots here or click to browse"` (or `"Drop to attach"` while dragging, `sidebar.bugDropImages` / `bugDropRelease`) + `"Max {count} images, {mb} MB each"` (`sidebar.bugImageLimits`) + hidden `<input type="file" accept="image/*" multiple />`.
        - Validation `Alert` (`"Only image files can be attached."`, `"Each screenshot must be {mb} MB or smaller."`, `"You can attach up to {count} screenshots."`).
      - `AltchaWidget` (active for guests).
      - Footer Submit `Button`: `"Submit"` / `"Submitting..."` (`sidebar.bugSubmitButton` / `bugSubmitting`).
    - **Success state (`isSuccess`)**: `SuccessState` (`CheckCircle2` icon + `"Report sent"` / `sidebar.bugSuccessMessage` + `"Thank you for helping improve LemonDBD."` / `sidebar.bugSuccessThanks`) + floating close `X` button.
- **Buy Coffee / Support Modal** (`components/sidebar/BuyCoffeeModal.tsx`, `components/sidebar/SupportTile.tsx`, `components/sidebar/RewardedAdSection.tsx`, `variant="dialog"`, `size="lg"` or `"sm"` when thanked):
  - Trigger: Sidebar `"Buy Coffee"` button.
  - **Modes / States**:
    - **Default Support view**:
      - Title: `"Support LemonDBD"` (`sidebar.coffeeTitle`), close `X` button (`sidebar.coffeeClose`).
      - Intro text: admin-configured `links.donationMessage[locale]` or fallback `"Fuel the Entity with caffeine to keep LemonDBD database servers and tired Meghead programmers running 24/7!"` (`sidebar.coffeeDonationMessage`).
      - **Empty state** (when neither BMC nor Ko-fi URL is configured): `"Support links are not available right now."` (`sidebar.coffeeNoLinks`).
      - **Support gateway tiles (`SupportTile`)**:
        - `"Buy Me a Coffee"` (when `links.donationBmc` set): `BuyMeACoffeeIcon`, tagline `"Quick 1-click coffee & support"` (`sidebar.coffeeBuyMeCoffeeTagline`), `"Visit"` chip + `ExternalLink` icon (`sidebar.coffeeVisit`).
        - `"Ko-fi"` (when `links.donationKofi` set): `KofiIcon`, tagline `"0% fee donations & one-time tips"` (`sidebar.coffeeKofiTagline`), `"Visit"` chip + `ExternalLink` icon (`sidebar.coffeeVisit`).
      - **Rewarded Ad tile (`RewardedAdSection`)** (shown only when a rewarded ad provider is wired and `ready` is true):
        - `SupportTile` (amber tone): `ClapperboardIcon`, `"Watch a short ad"` (`sidebar.coffeeAdTitle`), `"Free support, just let the ad play to the end"` (`sidebar.coffeeAdTagline`), `"Watch"` chip + `ChevronIcon` (`sidebar.coffeeAdWatch`).
    - **Ad Thank-You state (`thanked === true`)**:
      - Floating close `X` button + `SuccessState` (`HeartIcon` in red + `"Thank you!"` / `sidebar.coffeeAdThanksTitle` + `"Your support keeps LemonDBD running."` / `sidebar.coffeeAdThanksMessage` + `"You are the best!"` / `sidebar.coffeeAdThanksNote`).
- **Bard Insults Modal** (`components/sidebar/BardInsultsModal.tsx`, `variant="dialog"`, `size="lg"`):
  - Trigger: Sidebar `"Bard Insults"` button.
  - Elements:
    - Title: `"Be Shakespeare in the Fog"` (`sidebar.insultsTitle`), close `X` button (`sidebar.insultsClose`).
    - Intro paragraph: `"Lost for words after a lost trial? Swap the usual chat insults for something with a little more class."` (`sidebar.insultsIntro`).
    - Hint text: `"Click an insult to copy it, then paste it into the post-game chat."` (`sidebar.insultsCopyHint`).
    - Side `SegmentedControl` (`ariaLabel="Choose a side"` / `sidebar.insultsSideAria`):
      - `"Survivor"` (`sidebar.insultsSideSurvivor`, green thumb).
      - `"Killer"` (`sidebar.insultsSideKiller`, red thumb).
    - `Table` (`density="sm"`):
      - Columns (`Th`): `"You type"` (`sidebar.insultsColumnPlain`) | `"The Bard says"` (`sidebar.insultsColumnBard`).
      - Rows (`TableRow`): 9 shared rows (`sidebar.insultsRowsShared`: `"GG"`, `"EZ"`, `"You suck"`, `"Rage quit"`, `"AFK"`, `"Lagging"`, `"I'm carrying"`, `"One shot"`, `"He's cheating"`) + 6 role-specific rows:
        - Survivor (`sidebar.insultsRowsSurvivor`): `"Tunneling"`, `"Camping"`, `"Baby killer"`, `"Slugging"`, `"Gens are done"`, `"Noob killer"`.
        - Killer (`sidebar.insultsRowsKiller`): `"T-bagging"`, `"Hiding in a locker"`, `"Pallet looping"`, `"Flashlight clicking"`, `"Sweaty"`, `"Gen rushing"`.
      - Each right-hand cell is a copy `button` showing the Shakespearean translation + temporary green `Check` icon for 1.5s after copying + `sr-only` live region `"Copied to clipboard"` (`sidebar.insultsCopied`).

---

## `/` (Home)

### Page & files
- Route file: `app/[locale]/page.tsx`
- Page component: `components/landing/HomePage.tsx` (`HomePage`, `LandingContent`, `LandingFallback`)
- Supporting components: `components/LemonIcon.tsx`, `components/common/DbdSpinner.tsx`, `components/common/ImagePreloadProvider.tsx`
- Locale files: `locales/en/landing.ts`, `locales/en/app.ts`
- Shell: `CENTERED_PAGE` in `components/layout/shellRoutes.ts` (renders with `Sidebar` + centered `<main>`)

### Layout elements
- **Main Container** (`LandingContent`): centered flex column (`max-w-xl`).
- **Heading (`<h1>`)**: `"Welcome to LemonDBD"` (`landing.welcomeTitle`, rendered when non-empty).
- **Hero Emblem Card**: elevated rounded card (`h-36 w-36 sm:h-44 sm:w-44`, red border tint, hover scale/rotate transition) containing animated pulsing `LemonIcon` (`dbd-lemon-glow`).
- **Subtitle (`<p>`)**: `"Your Dead by Daylight hub: challenges, map callouts, randomizers, minigames and much more."` (`landing.welcomeSubtitle`, rendered when non-empty).
- **Background Image Prefetch**: `useEffect` prefetches `/logo.webp` and `/icon.png` via `useImagePrefetch()`.

### Modes / states
- **Default state**: Renders `LandingContent` inside `AppShell` (with `Sidebar`).
- **Suspense / Loading state (`LandingFallback`)**:
  - Renders `DbdSpinner` (`components/common/DbdSpinner.tsx`, `layout="inline"`, `size="responsive"`, `accent="blood"`, `needleSpeed={1.3}`):
    - Animated skill-check SVG ring with rotating needle, great-zone arc, center `LemonIcon` emblem, and label `"Loading..."` (`app.loading`, plus `sr-only` text).

### Modals & drawers (file)
- None specific to `/` (uses shared `Sidebar` / `RootLayout` modals: `Mobile Navigation Drawer`, `WhatsNewLauncher`, `AuthModal`, `BugReportModal`, `BuyCoffeeModal`, `BardInsultsModal`, `WarningDialog`).

---

## `/welcome`

### Page & files
- Route file: `app/[locale]/welcome/page.tsx` (noindex metadata)
- Client wrapper: `components/onboarding/WelcomeClient.tsx`
- Wizard container & parts:
  - `components/onboarding/CharacterOnboardingWizard.tsx`
  - `components/onboarding/CharacterOnboardingWizardParts.tsx`
  - `components/onboarding/wizard/OnboardingAuthRequired.tsx`
  - `components/onboarding/wizard/OnboardingIntroView.tsx`
  - `components/onboarding/wizard/OnboardingLanguageView.tsx`
  - `components/onboarding/wizard/OnboardingLegend.tsx`
  - `components/onboarding/wizard/ChapterToolbar.tsx`
  - `components/onboarding/wizard/ChapterCard.tsx`
  - `components/onboarding/wizard/ChapterCharacterPanel.tsx`
  - `components/onboarding/wizard/useOnboardingRoster.ts`
  - `components/onboarding/wizard/useOnboardingLanguage.ts`
  - `components/onboarding/wizard/useOnboardingCompletion.ts`
  - `components/onboarding/wizard/useChapterExpansion.ts`
- Shared character/modal components:
  - `components/characters/CharacterOwnershipOverlay.tsx` (`OwnershipClipOverlay`)
  - `components/characters/PerksTogglePopup.tsx`
  - `components/common/StickyActionBar.tsx` (`StickyActionBar`, `ActionBarButton`)
  - `components/layout/CenteredScreen.tsx`
  - `components/common/Spinner.tsx`
- Locale files: `locales/en/onboarding.ts`, `locales/en/user.ts`, `locales/en/filters.ts`, `locales/en/modal.ts`, `locales/en/characterDetail.ts`
- Shell: `shell: false` in `components/layout/shellRoutes.ts` (full-screen wizard, no `Sidebar`)

### Layout elements
- **Step 1 — Intro View (`OnboardingIntroView.tsx`, wrapped in `CenteredScreen`)**:
  - Heading (`<h1>`): `"Welcome to LemonDBD"` (`onboarding.introTitle`).
  - Body (`<p>`): `"To tailor the site to your progress in the game, please mark which chapters, characters, and perks you already own."` (`onboarding.introBody`).
  - Primary `Button`: `"Get Started"` (`onboarding.introContinueButton`, advances wizard view to `'language'`).
- **Step 2 — Language Selection View (`OnboardingLanguageView.tsx`, wrapped in `CenteredScreen`)**:
  - Heading (`<h1>`): `"Choose your language"` (`onboarding.languageStepTitle`).
  - Body (`<p>`): `"Pick the language you want to use across the site. You can change this again later."` (`onboarding.languageStepBody`).
  - Language `ToggleChip` list (5 options from `LANGUAGES` in `SidebarBottomControls.tsx`, each with `FlagIcon` + language label, `aria-pressed`):
    - `en`: `"English"`
    - `pl`: `"Polski"`
    - `es`: `"Español"`
    - `de`: `"Deutsch"`
    - `ja`: `"日本語"`
    - Selecting a different language immediately navigates to `/${language}/welcome` while keeping step `'language'` in `localStorage`.
  - Primary `Button`: `"Continue"` (`onboarding.languageContinueButton`) or `"Saving..."` (`onboarding.savingLabel` when `savingLanguage` is true; persists preferred language on user profile and advances view to `'roster'`).
- **Step 3 — Roster & Chapter Ownership View (`CharacterOnboardingWizard.tsx`)**:
  - **Main Card (`Surface`)**:
    - **Header**:
      - Heading (`<h1>`): `"Which characters do you already own?"` (`onboarding.heading`).
      - Subheading (`<p>`): `"Pick the chapters you own so the perk randomizer and streaks only offer you perks you can actually use. You can always change this later from your Characters page."` (`onboarding.subheading`).
    - **Legend Section (`OnboardingLegend.tsx`)**:
      - Heading (`<h2>`): `"How this works"` (`onboarding.legendTitle`).
      - 3-column example portrait grid (renders Survivor #7 Ace Visconti's portrait via `Img` + `OwnershipClipOverlay`, no badges):
        1. Locked swatch (`isOwned={false}`, `isPartial={false}`): desaturated/dimmed portrait, label `"Character locked"` (`onboarding.legendLocked`).
        2. Partial swatch (`isOwned={false}`, `isPartial={true}`): half-desaturated left / full-color right split portrait, label `"Character partially unlocked (only perks unlocked)"` (`onboarding.legendPartial`).
        3. Owned swatch (`isOwned={true}`): full-color portrait, label `"Character unlocked"` (`onboarding.legendOwned`).
    - **Chapters Toolbar (`ChapterToolbar.tsx`)**:
      - Section label: `"Chapters"` (`onboarding.chaptersTitle`).
      - Search input box: `Search` icon + text `Input` (placeholder `"Search"` / `onboarding.searchPlaceholder`) + conditional clear `Button` (`X` icon, `aria-label="Clear search"` / `filters.clearSearch` when `searchQuery` is non-empty).
      - Bulk selection buttons:
        - `"I own everything"` `ToggleChip` (`onboarding.selectAllButton`, `pressed={isAllOwned}`, shows `Check` icon when active; toggles all chapters owned/unowned).
        - `"Clear all"` `Button` (`onboarding.deselectAllButton`, `variant="secondary"`, disabled when `!hasAnySelection`; resets all non-free chapters/perks).
    - **Customize Hint (`<p>`)**:
      - `Info` icon (Lucide) + `"Tip: tap the picture to mark the whole chapter as owned. Tap the name under it to expand its characters and pick them one by one or unlock just their perks."` (`onboarding.legendCustomizeHint`).
    - **Chapters Grid (`ChapterCard.tsx`, `CHAPTER_GRID_CLASS`, 2 to 7 columns responsive)**:
      - Each `ChapterCard` represents a non-free DLC chapter sorted by release date:
        - **Top Banner Ownership Button** (`role="switch"`, `aria-checked={chapterOwned}`, `aria-label="I own this chapter: {chapterDisplayName}"` / `onboarding.ownChapterButton`):
          - Chapter capsule image (`Img`) or fallback chapter display name text.
          - `OwnershipClipOverlay` (no badge): full color when all characters in chapter are owned; split left-grayscale / right-color when partially owned (some characters or perks unlocked); full grayscale + dark scrim when locked.
        - **Bottom Expand Row (`TileButton`, `aria-expanded={isExpanded}`, `aria-controls="chapter-panel-{slug}"`)**:
          - Chapter title (`<h3>`: localized chapter name or canonical name).
          - `ChevronDown` icon (rotates 180° when expanded).
    - **Expanded Chapter Character Panel (`ChapterCharacterPanel.tsx`)**:
      - Animated full-row panel (`framer-motion` `AnimatePresence`, placed after the last card of the expanded chapter's grid row) containing a character grid one column denser than the chapters grid at every width (`CHARACTER_GRID_CLASS`, 3 to 8 columns), so a portrait is never bigger than a chapter card:
      - Each character is the Characters page's `CharacterCard` in `ownershipMode` (toggles character ownership + cascades to their teachable perks):
        - Portrait with `OwnershipClipOverlay` (grey/dim when locked, colour when owned, no badge) and a name bar underneath.
        - When `!isOwned`: overlay pill `Button` `"Perks ({unlocked}/{total})"` (`filters.perks`) at the bottom of the portrait; opens `PerksTogglePopup` for that character.
  - **Bottom Sticky Action Bar (`StickyActionBar` with `sidebarAware={false}`)**:
    - `ActionBarButton` (`variant="red"`, `wide`, uppercase): `"Continue"` (`onboarding.continueButton`) or `"Saving..."` (`onboarding.savingLabel` while `saving` is true; saves bulk character & perk ownership, marks onboarding complete, clears draft, and redirects to `/${locale}`).

### Modes / states
- **Suspense fallback (`app/[locale]/welcome/page.tsx`)**: `null`.
- **Already Completed Redirect state (`WelcomeClient.tsx` — `onboardingDone === true`)**:
  - When `!isLoading && isAuthenticated && user?.onboarding_completed_at`, triggers `router.replace('/${locale}')` and renders a full-screen centered `Spinner` (`size="lg"`, `tone="accent"`).
- **Auth Loading / Roster Loading state (`loading || authLoading`)**:
  - Full-screen centered `Spinner` (`size="lg"`, `tone="accent"`).
- **Unauthenticated / Guest Gate (`!authLoading && !isAuthenticated` — `OnboardingAuthRequired.tsx`)**:
  - Full-screen centered card (`Surface`, `max-w-md`):
    - Red `IconTile` with `LemonIcon`.
    - Heading (`<h1>`): `"Authentication Required"` (`user.authRequiredTitle`).
    - Description (`<p>`): `"Please sign in or create an account to view your LemonDBD profile, manage your teachables, and track game challenges."` (`user.authRequiredDesc`).
    - Primary `Button`: `User` icon + `"Sign In"` (`user.signIn`, opens `AuthModal`).
    - `Link`: `"Return to Home"` (`user.returnToHome`, `href="/${locale}"`).
- **Wizard Step Modes** (persisted per user in `localStorage` via `onboardingStorage.ts`):
  1. `'intro'` (`OnboardingIntroView`)
  2. `'language'` (`OnboardingLanguageView`)
  3. `'roster'` (`CharacterOnboardingWizard` main view, with draft ownership persisted in `localStorage`)

### Modals & drawers (file)
- **Perks Toggle Popup** (`components/characters/PerksTogglePopup.tsx`, `Modal` with `variant="sheet"`, `size="lg"`, `layer="top"`):
  - Trigger: Clicking `"Perks ({unlocked}/{total})"` on any unowned character card inside an expanded `ChapterCharacterPanel`.
  - Elements:
    - Header title: `"{character.name} Perks"` (`filters.perks`), close `X` button (`aria-label="Close"` / `modal.close`).
    - Help caption: `"Click a perk to toggle whether you own it."` (`characterDetail.togglePerkOwnershipHelp`).
    - 3-column perk grid (`TileButton` items):
      - Perk icon `Img` (full color when unlocked, grayscale + 50% opacity when locked).
      - Corner status badge: green `Check` icon when unlocked, neutral `LockIcon` when locked.
      - Perk name (`<span>`).
      - Permanently unlocked perks (free character perks, general perks, generic counterparts via `isDefaultUnlockedPerk`) are `disabled` (`cursor-default`).
    - Empty state text (if character has 0 perks): `"No teachable perks for this character."` (`characterDetail.noTeachablePerksForCharacter`).
- **Auth Modal** (`components/AuthModal.tsx`, dynamically imported in `CharacterOnboardingWizardParts.tsx`):
  - Trigger: Clicking `"Sign In"` in `OnboardingAuthRequired` (when visiting `/welcome` signed out).

---

## `/about`

### Page & files
- Route file: `app/[locale]/about/page.tsx`
- Page component: `components/about/AboutClient.tsx` (`AboutClient`, `LegalLinks`, `SyncedAboutPair`)
- Supporting components:
  - `components/common/BlockCard.tsx` (`BlockCardPair`, `BlockTitle`)
  - `components/legal/LegalPage.tsx` (`LastUpdatedStamp`, `LegalLinkPill`)
  - `components/common/ContactLinks.tsx` (`ContactLinks`, `EmailPill`)
  - `components/common/LinkPill.tsx` (`LinkPill`, `ActionPill`)
  - `components/common/RichText.tsx`
- Locale files: `locales/en/about.ts`, `locales/en/sidebar.ts`, `locales/en/terms.ts`, `locales/en/privacy.ts`, `locales/en/rules.ts`
- Shell: `{ padding: 'spacious', mainClassName: 'flex flex-col items-center justify-center min-h-screen-nav lg:min-h-screen overflow-y-auto relative' }` in `components/layout/shellRoutes.ts` (renders with `Sidebar`).

### Layout elements
- **Last Updated Stamp (`LastUpdatedStamp`)**: `"Last updated: October 31, 2026"` (`about.lastUpdatedLabel` + `about.lastUpdated`, top-right aligned on `sm+`).
- **Screen-Reader Heading (`<h1 className="sr-only">`)**: `"About us"` (derived from `about.pageTitle` `"LemonDBD - About us"`).
- **2-Column Collapsible Card Grid (`3 × SyncedAboutPair` / `BlockCardPair`, `tone="red"`, `centered={true}`)**:
  - Every card is a `<section id={id}>` with a header `<button>` (`aria-expanded`, centered `<h2>` title + rotating `ChevronDown` icon) and a `<Collapsible>` body (`open` by default, persisted in `localStorage['lemondbd_drawer_about_<id>']`). Paired cards on the same row synchronize height when both are open:
  1. **Card `id="who"` — `"Who we are"` (`about.who.heading`)**:
     - 3 paragraphs (`about.who.paragraphs` via `RichText`):
       - `"LemonDBD is created by 2 developers, TheAmused and PabloPicasso, also known as LemonTeam."`
       - `"We joined Dead by Daylight in 2021, when the Portrait of a Murder chapter came out (The Artist and Jonah Vasquez), and we have been big fans ever since."`
       - `"TheAmused is a Meghead, while PabloPicasso prefers to play killer."`
  2. **Card `id="why"` — `"Why did we build this?"` (`about.why.heading`)**:
     - 2 paragraphs (`about.why.paragraphs` via `RichText`):
       - `"We started out wanting a simple site for map callouts and challenges, just for ourselves. Then we decided it was worth expanding and sharing with everyone who might want to use it too."`
       - `"Many of these things already exist somewhere on the internet: map callouts, challenge pages, character info. We wanted to have all of it in one convenient place."`
  3. **Card `id="community"` — `"For streamers and players"` (`about.community.heading`)**:
     - 2 paragraphs (`about.community.paragraphs` via `RichText`):
       - `"We noticed that many streamers create their own challenges that live only in an Excel sheet. Others ask someone to build a small app for a single challenge, mostly just for themselves."`
       - `"We want to build a place where streamers and regular players can reach all of this easily. We also make our own challenges, in different versions: harder ones for people looking for a real challenge and easier ones for more casual players."`
  4. **Card `id="features"` — `"What will you find here?"` (`about.features.heading`)**:
     - 2 paragraphs (`about.features.paragraphs` via `RichText`):
       - `"Challenges, handy tools and game data for Dead by Daylight players, all in one place."`
       - `"We have plans to keep developing the site, so more and more things will show up over time."`
  5. **Card `id="credits"` — `"Project help"` (`about.credits.heading`)**:
     - Paragraph: `"Thank you to everyone who helped us build this project."` (`about.credits.text`).
     - Contributor list (`<ul>` of `CREDITS`): `bromu`, `lift`, `aquamarine`, `packleader`.
  6. **Card `id="contact"` — `"Contact us"` (`about.contact.heading`)**:
     - Paragraph: `"Questions, feedback or ideas? Reach us by email or on our Discord server."` (`about.contact.text`).
     - **`ContactLinks` (`components/common/ContactLinks.tsx`)**:
       - **Email Copy Capsule (`EmailPill` / `ActionPill`)** (rendered when `usePrivacyInfo()?.contactEmail` is present):
         - Leading `Mail` icon (red), email address text, trailing `Copy` icon (switches to green `Check` icon for 2000ms after click), `aria-label="Copy email address: {email}"` (`about.contact.copyEmailLabel`).
         - Shows `TooltipBubble` (`variant="action"`, title `"Copied!"` / `about.contact.emailCopied`) + `sr-only` live `<output>` for 2000ms after copying.
       - **Discord Invite Capsule (`LinkPill`)** (rendered when `siteConfig.links.discordInvite` is non-empty):
         - Leading `DiscordIcon`, label `"Join our Discord"` (`about.contact.discordLabel`), trailing `ExternalLink` icon, opens invite URL in new tab.
- **Bottom Cross-Page Navigation (`LegalLinks` with `exclude="about"`)**:
  - Centered `<nav>` with 3 `LegalLinkPill` (`LinkPill`) capsules (each with leading icon, uppercase label, and trailing `ArrowRight` icon):
    - `"Terms of Service"` (`terms.heading`, `FileText` icon, `href="/${locale}/terms-of-service"`).
    - `"Privacy Policy"` (`privacy.heading`, `ShieldCheck` icon, `href="/${locale}/privacy-policy"`).
    - `"Rules"` (`rules.heading`, `ScrollText` icon, `href="/${locale}/rules"`).

### Modes / states
- **Collapsible Card States**: Each of the 6 `BlockCard` sections independently toggles open/closed (`expanded` persisted in `localStorage['lemondbd_drawer_about_<id>']`, default `true`).
- **Dynamic Backend Config States**:
  - `EmailPill` is shown only once `GET /api/v1/privacy-info` returns a non-empty `contactEmail`.
  - Discord `LinkPill` is shown only when `siteConfig.links.discordInvite` is configured.
  - Email copied feedback state (`copiedAnchor` active for 2s after click, showing `Check` icon + `"Copied!"` `TooltipBubble`).

### Modals & drawers (file)
- None specific to `/about` (collapsible cards use `BlockCardPair` in `components/common/BlockCard.tsx`; global modals via `Sidebar` / `RootLayout`).

---

## `/rules`

### Page & files
- Route file: `app/[locale]/rules/page.tsx`
- Page component: `components/legal/LegalDocPage.tsx` (`<LegalDocPage doc="rules" />`)
- Supporting components:
  - `components/legal/LegalPage.tsx` (`LegalPageLayout`, `LastUpdatedStamp`, `LegalIntro`, `LegalLinkPill`)
  - `components/legal/LegalSections.tsx` (`LegalSections`, `HookStages`)
  - `components/legal/legalDocs.ts` (`LEGAL_DOCS.rules`, `RULES_ORDER`)
  - `components/about/AboutClient.tsx` (`LegalLinks`)
  - `components/common/BlockCard.tsx` (`BlockCard`, `BlockCardPair`)
  - `components/common/ContactLinks.tsx`
  - `components/common/RichText.tsx`
- Locale file: `locales/en/rules.ts`
- Shell: `LEGAL` (`padding: 'spacious'`, `Sidebar` + `<main>`) in `components/layout/shellRoutes.ts`

### Layout elements
- **Screen-Reader Heading (`<h1 className="sr-only">`)**: `"Rules"` (`rules.heading`).
- **Last Updated Stamp (`LastUpdatedStamp`)**: `"Last updated: October 15, 2026"` (`rules.lastUpdatedLabel` + `rules.lastUpdated`).
- **Intro Notice Strip (`LegalIntro`, `<aside>` 2-column `Surface`)**:
  - Column 1: `InfoIcon` (amber) + `"The titles, the TL;DR lines and the summary are friendly shortcuts. For legal reasons they are not binding and do not replace the text below them. If they differ from it, the full text applies."` (`rules.tldrNotice`).
  - Column 2: `GlobeIcon` (amber) + `"If the translated versions of this page differ from the English one, the English version prevails."` (`rules.translationNotice`).
- **Collapsible Section Cards (`LegalSections` with `doc="rules"`, `variant="page"`)**:
  - Each card renders a header `<button>` (`<h2>` `BlockTitle` + `ChevronDown` icon) and `<Collapsible>` body persisted in `localStorage['lemondbd_drawer_rules_open_<id>']` (open by default):
  1. **Full-width Summary Card (`id="summary"`, `tone="amber"`, spans 2 columns on `xl`)**:
     - Title (`<h2>`): `"Rules in a nutshell"` (`rules.summaryHeading`).
     - Body: 6-item bullet list (`rules.summary` via `RichText`).
  2. **Row 1 Pair (`tone="red"`, `BlockCardPair`)**:
     - **Card `id="scope"` — `"The trial grounds"` (`rules.sections.scope`)**:
       - Dashed TL;DR callout bubble: `"TL;DR"` label (`rules.tldrLabel`) + `"Website and Discord: same rules in both places."`
       - 2 paragraphs (with inline link `[Terms of Service](/${locale}/terms-of-service)`).
     - **Card `id="respect"` — `"Don't be the Entity"` (`rules.sections.respect`)**:
       - Dashed TL;DR callout: `"TL;DR"` + `"Everyone here came to be hunted by a game, not by you."`
       - Lead paragraph + 5 bullet items + closing paragraph (`"Dark humour about fictional characters is acceptable. It must not be aimed at real people."`).
  3. **Row 2 Pair (`tone="amber"`, `BlockCardPair`)**:
     - **Card `id="fairPlay"` — `"Fair play"` (`rules.sections.fairPlay`)**:
       - Dashed TL;DR callout: `"TL;DR"` + `"Earn your trophies. Don't forge them."`
       - Lead paragraph + 4 bullet items.
     - **Card `id="yourContent"` — `"Your stuff, your responsibility"` (`rules.sections.yourContent`)**:
       - Dashed TL;DR callout: `"TL;DR"` + `"You own it. You are also the one answering for it."`
       - 2 paragraphs (with `[Terms of Service](/${locale}/terms-of-service)` link) + 4 bullet items.
  4. **Row 3 Pair (`tone="red"`, `BlockCardPair`)**:
     - **Card `id="smashOrPass"` — `"Smash or Pass etiquette"` (`rules.sections.smashOrPass`)**:
       - Dashed TL;DR callout: `"TL;DR"` + `"It is a joke about fictional people. Keep it a joke."`
       - Lead paragraph + 4 bullet items.
     - **Card `id="serverCare"` — `"Be gentle with the generators"` (`rules.sections.serverCare`)**:
       - Dashed TL;DR callout: `"TL;DR"` + `"Use the site like a person, not like a botnet."`
       - Lead paragraph + 4 bullet items.
  5. **Row 4 Pair (`tone="amber"`, `BlockCardPair`)**:
     - **Card `id="reporting"` — `"See something? Say something"` (`rules.sections.reporting`)**:
       - Dashed TL;DR callout: `"TL;DR"` + `"Found a bug or a rule-breaker? Tell us."`
       - 3 paragraphs (with `mailto:{contactEmail}` link).
       - **`ContactLinks` footer** (centered): `EmailPill` copy button (with `Mail` + `Copy`/`Check` icons and `"Copied!"` tooltip) + Discord invite `LinkPill` (`"Join our Discord"`).
     - **Card `id="enforcement"` — `"What happens if you break them"` (`rules.sections.enforcement`)**:
       - Dashed TL;DR callout: `"TL;DR"` + `"Three steps: a warning, a temporary suspension, and a permanent ban."`
       - Lead paragraph.
       - **`HookStages` widget (`rules.hookStages`)**:
         - Label: `"The hook stages"` (`rules.hookStages.heading`).
         - 3-column ordered list (`<ol>`) with 3-segment progress bars:
           1. Amber box (1/3 bar lit): `"Stage 1: warning"` — `"A formal notice on your account. It does not restrict you."`
           2. Orange box (2/3 bars lit): `"Stage 2: suspension"` — `"You are signed out and cannot sign in for a set number of days."`
           3. Red box (3/3 bars lit): `"Stage 3: ban"` — `"Your account is banned for good, and accounts made to get around it can be banned too."`
       - 7 bullet items (with `[Terms of Service](/${locale}/terms-of-service)` link).
- **Bottom Cross-Page Navigation (`LegalLinks` with `exclude="rules"`)**:
  - 3 `LegalLinkPill` capsules: `"About us"` (`InfoIcon`, `href="/${locale}/about"`), `"Terms of Service"` (`FileText` icon, `href="/${locale}/terms-of-service"`), `"Privacy Policy"` (`ShieldCheck` icon, `href="/${locale}/privacy-policy"`).

### Modes / states
- **Collapsible Card States**: 9 collapsible `BlockCard` sections (`summary` + 8 sections in `RULES_ORDER`), each persisted in `localStorage['lemondbd_drawer_rules_open_<id>']` (default `true`).
- **Placeholder Resolution State**: `{contactEmail}` in `reporting` section resolves from `usePrivacyInfo()` (shows `"…"` while loading); `{termsPath}` resolves to `/${locale}/terms-of-service`.
- **Contact Links State**: `EmailPill` (click-to-copy with 2s `"Copied!"` tooltip) and Discord `LinkPill` render based on backend config.

### Modals & drawers (file)
- None specific to `/rules` (collapsible cards use `BlockCard` / `BlockCardPair` in `components/common/BlockCard.tsx`; global modals via `Sidebar` / `RootLayout`).

---

## `/privacy-policy`

### Page & files
- Route file: `app/[locale]/privacy-policy/page.tsx`
- Page component: `components/legal/PrivacyPolicyClient.tsx` (`PrivacyPolicyClient`, `PRIVACY_SECTION_ORDER`)
- Supporting components:
  - `components/legal/LegalPage.tsx` (`LegalPageLayout`, `LastUpdatedStamp`, `LegalIntro`, `LegalLinkPill`)
  - `components/about/AboutClient.tsx` (`LegalLinks`)
  - `components/common/BlockCard.tsx` (`BlockCard`)
  - `components/common/RichText.tsx`
  - `hooks/usePrivacyInfo.ts`, `utils/privacyPlaceholders.ts`
- Locale file: `locales/en/privacy.ts`
- Shell: `LEGAL` (`padding: 'spacious'`, `Sidebar` + `<main>`) in `components/layout/shellRoutes.ts`

### Layout elements
- **Screen-Reader Heading (`<h1 className="sr-only">`)**: `"Privacy Policy"` (`privacy.heading`).
- **Last Updated Stamp (`LastUpdatedStamp`)**: `"Last updated: November 9, 2026"` (`privacy.lastUpdatedLabel` + `privacy.lastUpdated`).
- **Intro Notice Strip (`LegalIntro`, `<aside>` single-column `Surface`)**:
  - `GlobeIcon` (amber) + `"If the translated versions of this page differ from the English one, the English version prevails."` (`privacy.translationNotice`).
- **Single-Column Stack of 16 Collapsible `BlockCard` Sections (`tone="red"`, left-aligned titles)**:
  - Each card has a header `<button>` (`<h2>` `BlockTitle` + `ChevronDown` icon) and `<Collapsible>` body persisted in `localStorage['lemondbd_drawer_privacy_open_<id>']` (open by default):
  1. **`id="summary"` — `"The short version"` (`privacy.summaryHeading`)**: 4 bullet items (`privacy.summary`).
  2. **`id="whoWeAre"` — `"Who we are"` (`privacy.sections.whoWeAre.heading`)**: 2 paragraphs.
  3. **`id="aiContent"` — `"AI-generated content"` (`privacy.sections.aiContent.heading`)**: 3 paragraphs.
  4. **`id="dataWeCollect"` — `"What we collect"` (`privacy.sections.dataWeCollect.heading`)**: 1 lead paragraph + 8 bullet items (Account data, Two-factor sign-in, What you save, Moderation records, Bug reports and messages, Technical data, Voice commands, Screenshot check).
  5. **`id="howWeUse"` — `"Why we use it"` (`privacy.sections.howWeUse.heading`)**: 1 lead paragraph + 7 bullet items.
  6. **`id="moderation"` — `"Reports, warnings and bans"` (`privacy.sections.moderation.heading`)**: 1 lead paragraph + 5 bullet items (with `{warningWindow}` and `{banListWindow}` dynamic values) + 1 closing paragraph.
  7. **`id="analytics"` — `"Analytics"` (`privacy.sections.analytics.heading`)**: 3 paragraphs (Umami analytics details).
  8. **`id="storage"` — `"Cookies, local storage and third parties"` (`privacy.sections.storage.heading`)**: 3 paragraphs (with `{sessionWindow}` dynamic value).
  9. **`id="sharing"` — `"Who sees your data"` (`privacy.sections.sharing.heading`)**: 1 lead paragraph + 4 bullet items (with `{mailProvider}` dynamic value).
  10. **`id="transfers"` — `"International transfers"` (`privacy.sections.transfers.heading`)**: 1 paragraph.
  11. **`id="retention"` — `"How long we keep it"` (`privacy.sections.retention.heading`)**: 2 paragraphs (with `{verificationWindow}`, `{resetWindow}`, `{sessionWindow}`, `{streakPrune}`, `{warningWindow}`, `{banListWindow}` dynamic values).
  12. **`id="security"` — `"Security"` (`privacy.sections.security.heading`)**: 1 paragraph.
  13. **`id="rights"` — `"Your rights"` (`privacy.sections.rights.heading`)**: 1 lead paragraph + 7 bullet items + 1 closing paragraph (with `[{contactEmail}](mailto:{contactEmail})` link).
  14. **`id="children"` — `"Children"` (`privacy.sections.children.heading`)**: 1 paragraph.
  15. **`id="changes"` — `"Changes to this policy"` (`privacy.sections.changes.heading`)**: 1 paragraph.
  16. **`id="contact"` — `"Contact us"` (`privacy.sections.contact.heading`)**: 1 paragraph (with `[{contactEmail}](mailto:{contactEmail})` link).
- **Bottom Cross-Page Navigation (`LegalLinks` with `exclude="privacy-policy"`)**:
  - 3 `LegalLinkPill` capsules: `"About us"` (`InfoIcon`, `href="/${locale}/about"`), `"Terms of Service"` (`FileText` icon, `href="/${locale}/terms-of-service"`), `"Rules"` (`ScrollText` icon, `href="/${locale}/rules"`).

### Modes / states
- **Collapsible Card States**: 16 independent `BlockCard` drawers persisted in `localStorage['lemondbd_drawer_privacy_open_<id>']` (default `true`).
- **Dynamic Privacy Placeholders State (`fillPrivacyPlaceholders` via `GET /api/v1/privacy-info`)**:
  - While loading (or if fetch fails), placeholders `{contactEmail}`, `{mailProvider}`, `{verificationWindow}`, `{resetWindow}`, `{sessionWindow}`, `{streakPrune}`, `{warningWindow}`, `{banListWindow}` display `"…"`; once loaded, they render localized `Intl.NumberFormat` durations (e.g. `"24 hours"`, `"3 days"`) and live contact/provider strings.

### Modals & drawers (file)
- None specific to `/privacy-policy` (collapsible cards use `BlockCard` in `components/common/BlockCard.tsx`; global modals via `Sidebar` / `RootLayout`).

---

## `/terms-of-service`

### Page & files
- Route file: `app/[locale]/terms-of-service/page.tsx`
- Page component: `components/legal/LegalDocPage.tsx` (`<LegalDocPage doc="terms" />`)
- Supporting components:
  - `components/legal/LegalPage.tsx` (`LegalPageLayout`, `LastUpdatedStamp`, `LegalIntro`, `LegalLinkPill`)
  - `components/legal/LegalSections.tsx` (`LegalSections`)
  - `components/legal/legalDocs.ts` (`LEGAL_DOCS.terms`, `TERMS_ORDER`)
  - `components/about/AboutClient.tsx` (`LegalLinks`)
  - `components/common/BlockCard.tsx` (`BlockCard`, `BlockCardPair`)
  - `components/common/ContactLinks.tsx`
  - `components/common/RichText.tsx`
- Locale file: `locales/en/terms.ts`
- Shell: `LEGAL` (`padding: 'spacious'`, `Sidebar` + `<main>`) in `components/layout/shellRoutes.ts`

### Layout elements
- **Screen-Reader Heading (`<h1 className="sr-only">`)**: `"Terms of Service"` (`terms.heading`).
- **Last Updated Stamp (`LastUpdatedStamp`)**: `"Last updated: October 15, 2026"` (`terms.lastUpdatedLabel` + `terms.lastUpdated`).
- **Intro Notice Strip (`LegalIntro`, `<aside>` 2-column `Surface`)**:
  - Column 1: `InfoIcon` (amber) + `"The TL;DR lines and the summary are only a reading aid. Only the full text below them is legally binding, and if they differ, the full text applies."` (`terms.tldrNotice`).
  - Column 2: `GlobeIcon` (amber) + `"If the translated versions of this page differ from the English one, the English version prevails."` (`terms.translationNotice`).
- **Collapsible Section Cards (`LegalSections` with `doc="terms"`, `variant="page"`)**:
  - Each card has a header `<button>` (`<h2>` `BlockTitle` + `ChevronDown` icon) and `<Collapsible>` body persisted in `localStorage['lemondbd_drawer_terms_open_<id>']` (open by default):
  1. **Full-width Summary Card (`id="summary"`, `tone="amber"`, spans 2 columns on `xl`)**:
     - Title (`<h2>`): `"Summary"` (`terms.summaryHeading`).
     - Body: 7-item bullet list (`terms.summary` via `RichText`).
  2. **Row 1 Pair (`tone="red"`, `BlockCardPair`)**:
     - **Card `id="about"` — `"Who we are and what these Terms cover"` (`terms.sections.about`)**:
       - Dashed TL;DR callout: `"TL;DR"` + `"LemonTeam runs LemonDBD. These Terms are the agreement between you and us."`
       - 3 paragraphs (with `[{contactEmail}](mailto:{contactEmail})`, `[Rules](/${locale}/rules)`, and `[Privacy Policy](/${locale}/privacy-policy)` links).
     - **Card `id="accounts"` — `"Accounts and eligibility"` (`terms.sections.accounts`)**:
       - Dashed TL;DR callout: `"TL;DR"` + `"18 or older, a real email, one account, and a password kept private."`
       - 1 lead paragraph + 5 bullet items.
  3. **Row 2 Pair (`tone="amber"`, `BlockCardPair`)**:
     - **Card `id="service"` — `"The Site"` (`terms.sections.service`)**:
       - Dashed TL;DR callout: `"TL;DR"` + `"Free, provided as it is, and subject to change."`
       - 3 paragraphs.
     - **Card `id="content"` — `"Your content and licence"` (`terms.sections.content`)**:
       - Dashed TL;DR callout: `"TL;DR"` + `"You keep ownership. We receive only the permission needed to run the Site."`
       - 5 paragraphs (with `[Privacy Policy](/${locale}/privacy-policy)` link).
  4. **Row 3 Pair (`tone="red"`, `BlockCardPair`)**:
     - **Card `id="conduct"` — `"Acceptable use"` (`terms.sections.conduct`)**:
       - Dashed TL;DR callout: `"TL;DR"` + `"Follow the Rules, and do not misuse or attack the Site."`
       - 1 lead paragraph (with `[Rules](/${locale}/rules)` link) + 5 bullet items.
     - **Card `id="ip"` — `"Fan project and intellectual property"` (`terms.sections.ip`)**:
       - Dashed TL;DR callout: `"TL;DR"` + `"Unofficial and unaffiliated. The game belongs to its owners."`
       - 3 paragraphs.
  5. **Row 4 Pair (`tone="amber"`, `BlockCardPair`)**:
     - **Card `id="termination"` — `"Suspension and termination"` (`terms.sections.termination`)**:
       - Dashed TL;DR callout: `"TL;DR"` + `"You can leave at any time. We may restrict or close accounts that break the rules."`
       - 6 paragraphs (with `[Privacy Policy](/${locale}/privacy-policy)` and `[{contactEmail}](mailto:{contactEmail})` links).
     - **Card `id="liability"` — `"Disclaimers and liability"` (`terms.sections.liability`)**:
       - Dashed TL;DR callout: `"TL;DR"` + `"Provided as it is. Our liability is limited as far as the law allows."`
       - 4 paragraphs.
  6. **Row 5 Pair (`tone="red"`, `BlockCardPair`)**:
     - **Card `id="changes"` — `"Changes to these Terms"` (`terms.sections.changes`)**:
       - Dashed TL;DR callout: `"TL;DR"` + `"We may update them. Significant changes are announced in advance."`
       - 2 paragraphs.
     - **Card `id="law"` — `"Governing law, disputes and contact"` (`terms.sections.law`)**:
       - Dashed TL;DR callout: `"TL;DR"` + `"Polish law applies, without removing the protection of your local consumer law. Contact us first."`
       - 3 paragraphs (with `[{contactEmail}](mailto:{contactEmail})` link).
       - **`ContactLinks` footer** (centered): `EmailPill` copy button (with `Mail` + `Copy`/`Check` icons and `"Copied!"` tooltip) + Discord invite `LinkPill` (`"Join our Discord"`).
- **Bottom Cross-Page Navigation (`LegalLinks` with `exclude="terms-of-service"`)**:
  - 3 `LegalLinkPill` capsules: `"About us"` (`InfoIcon`, `href="/${locale}/about"`), `"Privacy Policy"` (`ShieldCheck` icon, `href="/${locale}/privacy-policy"`), `"Rules"` (`ScrollText` icon, `href="/${locale}/rules"`).

### Modes / states
- **Collapsible Card States**: 11 collapsible `BlockCard` sections (`summary` + 10 sections in `TERMS_ORDER`), each persisted in `localStorage['lemondbd_drawer_terms_open_<id>']` (default `true`).
- **Placeholder Resolution State**: `{contactEmail}` resolves from `usePrivacyInfo()` (or `"…"` while loading); `{rulesPath}` and `{privacyPath}` resolve to `/${locale}/rules` and `/${locale}/privacy-policy`.
- **Contact Links State**: `EmailPill` (click-to-copy with 2s `"Copied!"` tooltip) and Discord `LinkPill` render based on backend config.

### Modals & drawers (file)
- None specific to `/terms-of-service` (collapsible cards use `BlockCard` / `BlockCardPair` in `components/common/BlockCard.tsx`; global modals via `Sidebar` / `RootLayout`).

---

## `/maintenance`

### Page & files
- Route file: `app/[locale]/maintenance/page.tsx` (noindex metadata)
- Page component: `components/layout/MaintenancePage.tsx`
- Supporting components: `components/layout/CenteredScreen.tsx`, `components/layout/errorPageClasses.ts`, `components/LemonIcon.tsx`, `services/maintenanceStatus.ts`
- Locale files: `locales/en/errorPages.ts`, `locales/en/app.ts`
- Shell: `shell: false` in `components/layout/shellRoutes.ts` AND `useShellOverride(false)` in `MaintenancePage.tsx` (ensures no `Sidebar` even when Next.js proxy rewrites an arbitrary route URL to `/maintenance` with HTTP 503).

### Layout elements
- **Centered Card (`CenteredScreen` -> `Surface`, `max-w-xl`, centered text)**:
  - **Emblem Tile**: `h-28 w-28` elevated rounded card (`border-accent-red/40`) containing glowing `LemonIcon` (`dbd-lemon-glow`).
  - **Heading (`<h1>`)**: `"Back soon"` (`errorPages.maintenance.title`).
  - **Description (`<p>`)**: `"The site is down for maintenance. Thanks for your patience."` (`errorPages.maintenance.text`).
  - **Document Title**: Dynamically set to `"LemonDBD - Back soon"` (`${dict.app.title} - ${copy.title}`).

### Modes / states
- **Static Maintenance Display + Auto-Recovery Polling**:
  - Polls `fetchMaintenanceStatus` (`GET /api/v1/maintenance-status`) on mount and every 30s (`POLL_MS = 30_000`).
  - When `status.blocked` becomes `false`: if current pathname ends with `/maintenance`, navigates to `/${locale}`; otherwise calls `window.location.reload()` to load the originally requested URL.

### Modals & drawers (file)
- None (`Sidebar` is suppressed; only global `WarningModal` / `SiteBannerGate` / `ContentRevocationSync` from `RootLayout` remain mounted).

---

## `/blocked`

### Page & files
- Route file: `app/[locale]/blocked/page.tsx` (noindex metadata; also served via proxy rewrite when a visitor requests a page an admin switched off)
- Page component: `components/layout/ErrorPage.tsx` (`<ErrorPage variant="blocked" />`)
- Supporting components: `components/layout/errorPageClasses.ts`, `components/LemonIcon.tsx`, `components/common/Button.tsx`
- Locale files: `locales/en/errorPages.ts`, `locales/en/app.ts`
- Shell: `ERROR_SHELL` (`mainId="main-error-content"`, centered `<main>` + `Sidebar`, enforced via `useShellOverride(ERROR_SHELL)` even on rewritten URLs)

### Layout elements
- **Centered Container** (`max-w-xl`, centered flex column):
  - **Hero Emblem Card**: `h-36 w-36 sm:h-44 sm:w-44` elevated rounded card (`border-accent-red/40`, hover scale/rotate transition) with glowing `LemonIcon` (`dbd-lemon-glow`).
  - **Status Code Badge (`ERROR_CODE_BADGE`)**: `"Blocked"` (`errorPages.blocked.code`, red pill badge).
  - **Heading (`<h1>`)**: `"Page blocked"` (`errorPages.blocked.title`).
  - **Description (`<p>`)**: `"This page isn't open to visitors right now."` (`errorPages.blocked.text`).
  - **Primary Action Link (`Link` styled with `buttonClassName('primary', 'lg')`)**:
    - `Home` icon (Lucide) + `"Back to home"` (`errorPages.backHome`, `href="/${locale}"`).
  - **Document Title**: `"LemonDBD - Page blocked"`.

### Modes / states
- Single static `"blocked"` variant of `ErrorPage` (note: `ErrorPage` also supports `'not-found'`, `'forbidden'`, and `'error'` variants across the app).

### Modals & drawers (file)
- None specific to `/blocked` (uses shared `Sidebar` / `RootLayout` modals).

---

## `/forbidden`

### Page & files
- Route file: `app/[locale]/forbidden/page.tsx` (noindex metadata)
- Page component: `components/layout/ErrorPage.tsx` (`<ErrorPage variant="forbidden" />`)
- Supporting components: `components/layout/errorPageClasses.ts`, `components/LemonIcon.tsx`, `components/common/Button.tsx`
- Locale files: `locales/en/errorPages.ts`, `locales/en/app.ts`
- Shell: `ERROR_SHELL` (`mainId="main-error-content"`, centered `<main>` + `Sidebar`, enforced via `useShellOverride(ERROR_SHELL)`)

### Layout elements
- **Centered Container** (`max-w-xl`, centered flex column):
  - **Hero Emblem Card**: `h-36 w-36 sm:h-44 sm:w-44` elevated rounded card (`border-accent-red/40`, hover scale/rotate transition) with glowing `LemonIcon` (`dbd-lemon-glow`).
  - **Status Code Badge (`ERROR_CODE_BADGE`)**: `"403"` (`errorPages.forbidden.code`, red pill badge).
  - **Heading (`<h1>`)**: `"Forbidden"` (`errorPages.forbidden.title`).
  - **Description (`<p>`)** (auth-dependent, see Modes / states below).
  - **Primary Action Link (`Link` styled with `buttonClassName('primary', 'lg')`)**:
    - `Home` icon (Lucide) + `"Back to home"` (`errorPages.backHome`, `href="/${locale}"`).
  - **Document Title**: `"LemonDBD - Forbidden"`.

### Modes / states
- **Guest variant (`!isAuthenticated`)**:
  - Description text: `"You need to sign in with an administrator account to open this page."` (`errorPages.forbidden.textGuest`).
- **Signed-in Non-Admin variant (`isAuthenticated`)**:
  - Description text: `"Your account doesn't have permission to open this page."` (`errorPages.forbidden.textSignedIn`).

### Modals & drawers (file)
- None specific to `/forbidden` (uses shared `Sidebar` / `RootLayout` modals).

---

## `/reset-password`

### Page & files
- Route file: `app/[locale]/reset-password/page.tsx` (noindex metadata)
- Page component: `components/auth/ResetPasswordClient.tsx` (`ResetPasswordClient`, `ResetPasswordContent`)
- Supporting components: `components/layout/CenteredScreen.tsx`, `components/common/Surface.tsx`, `components/common/Field.tsx` (`FieldLabel`, `IconInput`), `components/common/Button.tsx`, `components/LemonIcon.tsx`, `components/icons/DbdIcons.tsx` (`LockIcon`)
- Locale files: `locales/en/user.ts`, `locales/en/app.ts`
- Shell: `shell: false` in `components/layout/shellRoutes.ts` (bare centered screen, no `Sidebar`)

### Layout elements
- **Outer Card (`CenteredScreen` -> `Surface`, `max-w-md`)**:
- **Form Mode (`!done`)**:
  - **Header**:
    - Elevated `Surface` tile (`h-14 w-14`) with `LemonIcon`.
    - Heading (`<h1>`): `"Set New Password"` (`user.setNewPassword`).
  - **Error Alert Banner** (conditional on `error !== null`, `role="alert"`):
    - Red bordered box with `CircleAlert` icon + error message string.
  - **New Password Field**:
    - `FieldLabel`: `"New Password"` (`user.newPassword`).
    - `IconInput`: leading `LockIcon`, `type="password"`, `required`, bound to `password`.
  - **Confirm New Password Field**:
    - `FieldLabel`: `"Confirm New Password"` (`user.confirmPassword`).
    - `IconInput`: leading `LockIcon`, `type="password"`, `required`, bound to `confirmPassword`.
  - **Submit Button (`Button`, `type="submit"`, `variant="primary"`, `loading={loading}`)**:
    - Label: `"Confirm"` (`user.confirmNewPassword`, shows `Spinner` when `loading` is true).
- **Success Mode (`done === true`)**:
  - `CheckCircle2` icon (`h-10 w-10 text-accent-green`).
  - Confirmation text (`<p>`): `"Your password has been reset successfully!"` (`user.passwordResetSuccess`).
  - Action `Link` (styled as primary button): `"Go to Home"` (`user.goToHome`, `href="/${locale}"`).

### Modes / states
- **Suspense fallback**: `null` while `useSearchParams()` resolves `?token=...`.
- **Default Form state (`!done`)**: Renders password inputs and `"Confirm"` button.
- **Submitting / Loading state (`loading === true`)**: Disables submit button and renders inline `Spinner`.
- **Error states (`error !== null`)**:
  - Missing query token (`!token`): `"Missing reset token."` (`user.missingResetToken`).
  - Password shorter than `siteConfig.limits.passwordMinLength`: `"Password must be at least {min} characters long."` (`user.passwordTooShort`).
  - Mismatched passwords (`password !== confirmPassword`): `"Passwords do not match."` (`user.passwordsDoNotMatch`).
  - Backend error: `res.error` or fallback `"Failed to reset password."` (`user.failedToResetPassword`).
- **Completed / Success state (`done === true`)**: Replaces header and form with `CheckCircle2` icon, `"Your password has been reset successfully!"`, and `"Go to Home"` link.

### Modals & drawers (file)
- None (`shell: false`, no page-level modals).
