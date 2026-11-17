# UI Inventory — User Account, Settings & Achievements (`/user`, `/settings`, `/achievements`)

---

## /user

### Page & files
- **Route page**: `app/[locale]/user/page.tsx` (`UserPage` — metadata title: `dict.app.userPageTitle` `"LemonDBD - User Profile"`, `noindex: true`)
- **Route loading state**: `app/[locale]/user/loading.tsx` (`UserPageLoading` -> `UserProfileSkeleton`)
- **Feature barrel**: `features/auth/index.ts` (re-exports `UserProfileClient`, `AuthModal`, `useAuth`, `AuthProvider`)
- **Main client shell**: `components/user/UserProfileClient.tsx`
- **Skeletons**:
  - `components/user/UserProfileSkeleton.tsx` (`UserProfileSkeleton` -> `DbdSpinner`)
  - `components/user/UserBugReportsSkeleton.tsx` (`UserBugReportsSkeleton` -> `DbdSpinner`)
- **Header & Vault Mastery**:
  - `components/user/CampfireHeader.tsx` (`CampfireHeader`)
  - `components/UserAvatar.tsx` (`UserAvatar`)
  - `components/user/VaultMasteryDials.tsx` (`VaultMasteryDials`, `RadialDial`)
- **Account Management section (`tabSanctum`)**:
  - `components/user/UserProfileForm.tsx` (`UserProfileForm`)
  - `components/user/DownloadDataSection.tsx` (`DownloadDataSection`)
  - `components/user/SignOutEverywhereSection.tsx` (`SignOutEverywhereSection`)
  - `components/user/DeleteAccountSection.tsx` (`DeleteAccountSection`)
  - `components/user/TwoFactorSection.tsx` (`TwoFactorSection`)
  - `components/user/TwoFactorSetupModal.tsx` (`TwoFactorSetupModal`)
  - `components/user/TwoFactorConfirmModal.tsx` (`TwoFactorConfirmModal`)
  - `components/user/RecoveryCodesPanel.tsx` (`RecoveryCodesPanel`)
  - `components/auth/CodeInput.tsx` (`CodeInput`)
  - `components/auth/QrCode.tsx` (`QrCode`)
  - `components/auth/GoogleSignInButton.tsx` (`GoogleSignInButton`)
- **Signature Loadouts section (`dualMainsTitle`)**:
  - `components/user/DualMainsShowcase.tsx` (`DualMainsShowcase`)
  - `components/user/MainCard.tsx` (`MainCard`)
  - `components/user/PerkDiamondSlot.tsx` (`PerkDiamondSlot`)
  - `components/streaks/page-streak/PerkTile.tsx` (`PerkTile`)
  - `components/ui/DiamondCluster.tsx` (`DiamondCluster`)
  - `components/ui/DiamondSlot.tsx` (`DiamondSlot`)
  - `components/user/ShowcaseCharacterModal.tsx` (`ShowcaseCharacterModal`, `CharacterGridItem`)
  - `components/user/ShowcasePerkModal.tsx` (`ShowcasePerkModal`, `PerkGridItem`)
  - `components/perks/PerkSearchBox.tsx` (`PerkSearchBox`)
  - `components/perks/roleOnlyMessage.ts` (`roleOnlyMessage`)
- **My Bug Reports section (`tabBugReports`)**:
  - `components/user/UserBugReportsDrawer.tsx` (`UserBugReportsDrawer`)
  - `components/user/UserBugReportsList.tsx` (`UserBugReportsList`, `PreviewCloseButton`)
  - `components/sidebar/BugReportModal.tsx` (`BugReportModal`)
  - `components/sidebar/BugReportScreenshots.tsx` (`BugReportScreenshots`)
- **Unauthenticated Auth Modal**:
  - `components/AuthModal.tsx` (`AuthModal`)
  - `components/auth/AuthModalParts.tsx` (`AuthField`, `ForgotSentNotice`, `SecurityCheck`, `LegalConsentField`, `SubmitLabel`, `GoogleSignInSection`, `DemoAccountButtons`, `ModeSwitchLink`)
  - `components/EmailVerificationForm.tsx` (`EmailVerificationForm`)
  - `components/auth/TwoFactorChallengeForm.tsx` (`TwoFactorChallengeForm`)
  - `components/moderation/AccountBlockedNotice.tsx` (`AccountBlockedNotice`)
  - `components/legal/LegalDocModal.tsx` (`LegalDocModal`)
  - `components/legal/LegalSections.tsx` (`LegalSections`, `LegalNotice`, `HookStages`)
  - `components/common/AltchaWidget.tsx` (`AltchaWidget`)
- **Shared primitives**: `components/common/AccordionSection.tsx`, `components/common/Modal.tsx`, `components/common/Surface.tsx`, `components/common/Button.tsx`, `components/common/Field.tsx`, `components/common/Switch.tsx`, `components/common/Checkbox.tsx`, `components/common/CustomDropdown.tsx`, `components/common/Popover.tsx`, `components/common/Pagination.tsx`, `components/common/Badge.tsx`, `components/common/EmptyState.tsx`, `components/common/SuccessState.tsx`, `components/common/Alert.tsx`, `components/common/UnreadDot.tsx`, `components/common/Tooltip.tsx`, `components/common/DbdSpinner.tsx`, `components/common/Spinner.tsx`, `components/common/Collapsible.tsx`, `components/common/IconTile.tsx`, `components/common/TileButton.tsx`, `components/common/SelectableCard.tsx`, `components/LemonIcon.tsx`, `components/icons/DbdIcons.tsx`

### Layout elements
- **Hidden Avatar File Input** (`UserProfileClient.tsx`):
  - `<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" />`
- **Campfire Header Card** (`CampfireHeader.tsx` — `Surface`):
  - **Avatar Button** (`aria-label`: `dict.user.changeAvatar` `"Change Avatar"`, triggers hidden file input):
    - `UserAvatar` (`size="3xl"`, `shape="rounded"`, `showAdminBadge={true}`):
      - Custom uploaded image (`Img`) OR fallback `LemonIcon` (`text-accent-amber`).
      - **Admin Badge** (rendered when `user.role === 'admin'`): red circular badge in top-right corner with `CrownIcon` (`DbdIcons`).
    - **Hover/Focus Overlay**: dark overlay with `Camera` icon (`lucide-react`) + uppercase label `dict.user.changeAvatar` `"Change Avatar"`.
    - **Uploading Overlay** (when `isUploadingAvatar` is true): translucent backdrop with `Spinner` (`size="lg"`, `tone="accent"`).
  - **Avatar Status Feedback** (when `avatarFeedback` is present):
    - Paragraph below avatar (`text-accent-green` on success, `text-accent-red` on error):
      - Success: `dict.user.avatarUpdateSuccess` `"Avatar updated successfully!"`
      - Error (size > 10MB): `dict.user.avatarSizeLimit` `"Avatar file size must be under 10MB."`
      - Error (API failure): `ApiError.message` or `dict.user.avatarUploadFailed` `"Failed to upload avatar."`
  - **Identity & Metadata Column**:
    - Heading `h1`: `{user.username}`
    - Metadata row (rendered if `user.created_at` exists): `Calendar` icon (`lucide-react`) + `dict.user.memberSince` `"Member since"` + formatted date (`formatDate(user.created_at)`).
  - **Vault Mastery Radial Dials** (`VaultMasteryDials.tsx`):
    - Section heading `h2`: `dict.user.vaultMastery` `"Vault Mastery"`
    - 3-column grid of square `RadialDial` cards (SVG circular gauge + center percentage `{percentage}%` + fraction `{count}/{total}` + bottom uppercase title):
      1. **Survivors Dial**: title `dict.stats.survivors` `"Survivors"`, stroke `stroke-accent-green`, default total `54`.
      2. **Killers Dial**: title `dict.stats.killers` `"Killers"`, stroke `stroke-accent-red`, default total `44`.
      3. **Perks Dial**: title `dict.sidebar.perks` `"Perks"`, stroke `stroke-accent-amber`, default total `321`.
- **Accordion 1: Account Management** (`UserProfileForm.tsx` -> `AccordionSection`):
  - **Header**:
    - Banner background: `/images/banners/banner_account.webp`
    - Heading `h2`: `dict.user.tabSanctum` `"Account Management"`
    - Expand/collapse toggle button + `ChevronDown` icon (`lucide-react`, rotates 180° when open). Persistent key: `lemondbd_drawer_account` (default closed: `false`).
  - **Status Feedback Banner** (conditional when `statusMessage` is set):
    - Green (`CheckCircle2` icon) or Red (`CircleAlert` icon) alert box with `statusMessage.text`:
      - Success (profile updated): `dict.user.profileUpdateSuccessMsg` `"Profile updated successfully!"`
      - Success (email changed & verification needed): `dict.user.emailChangedVerifyMsg` `"Email changed. We sent a verification code to the new address: enter it to verify the account again."`
      - Success (Google password link sent): `dict.user.setPasswordSent` `"A link to set your password is on its way to your email."`
      - Error (password too short): `dict.user.passwordTooShort` `"Password must be at least {min} characters long."`
      - Error (password mismatch): `dict.user.passwordsDoNotMatch` `"Passwords do not match."`
      - Error (missing current password): `dict.user.currentPasswordRequired` `"You must enter your current password to update your account details."`
      - Error (wrong current password, 403): `dict.user.currentPasswordIncorrect` `"Your current password is incorrect."`
      - Error (2FA code required): `dict.twoFactor.codeRequiredHint` `"Two-factor authentication is on. Enter a code from your app to continue."`
      - Error (2FA errors via `twoFactorErrorMessage`): `dict.twoFactor.errInvalidCode` / `errLocked` / `errChallengeExpired` / `errIncorrectPassword` / `errUnavailable` / `errGeneric`
      - Error (generic): `dict.user.profileUpdateFailedMsg` `"Failed to update profile."`
  - **Profile Update Form**:
    - **Login Field**: `<label htmlFor="profile-login">` `dict.user.loginLabel` `"Login"` + disabled text `Input` (`id="profile-login"`, `value={login}`).
    - **Username Field**: `<label htmlFor="profile-username">` `dict.user.usernameLabel` `"Username"` + text `Input` (`id="profile-username"`, `required`, `minLength={3}`, `maxLength={50}`, `readOnly={!hasPassword}`).
    - **Email Address Field**: `<label>` `dict.user.emailLabel` `"Email Address"` + `Mail` icon (`lucide-react`) + email `Input` (`required`, `readOnly={!hasPassword}`).
    - **Current Password Field** (rendered when `hasPassword === true`):
      - `<label htmlFor="profile-current-password">` `dict.user.currentPassword` `"Current Password"` + red asterisk `*` with tooltip `dict.user.currentPasswordHint` `"Required to update your account details"`.
      - Password/text `Input` (`id="profile-current-password"`, `aria-required="true"`).
      - Show/Hide toggle `Button` (`variant="ghost"`, `size="xs"`, `icon`, `aria-label`: `dict.user.showPassword` `"Show password"` / `dict.user.hidePassword` `"Hide password"`, icons `Eye` / `EyeOff`).
    - **2FA Code / Recovery Input** (rendered when `hasPassword && (twoFactorEnabled || needsTwoFactorCode)`):
      - `<label htmlFor="profile-two-factor-code">` `dict.twoFactor.codeOrRecoveryLabel` `"App code or recovery code"` + text `Input` (`id="profile-two-factor-code"`, `autoComplete="one-time-code"`).
    - **Password Management Block (when `hasPassword === true`)**:
      - Header row: `LockIcon` (`DbdIcons`, amber) + `dict.user.passwordLabel` `"Password"` | right caption: `dict.user.passwordPlaceholder` `"Leave blank to keep current"`.
      - **New Password Field**: `<label>` `dict.user.newPassword` `"New Password"` + password/text `Input` + `Eye`/`EyeOff` show/hide toggle `Button`.
      - **Confirm New Password Field**: `<label>` `dict.user.confirmPassword` `"Confirm New Password"` + password/text `Input` (shows green border when matching, `invalid` red border when mismatching) + `Eye`/`EyeOff` show/hide toggle `Button`.
    - **Set Password Block (when `hasPassword === false`, i.e., Google-only account)**:
      - Heading row: `LockIcon` (`DbdIcons`, amber) + `dict.user.setPasswordTitle` `"Password"`.
      - Description: `dict.user.setPasswordDesc` `"Because you signed in with Google, this account has no password yet. To set one, we will email you a link."`
      - Action button: `Button` (`variant="secondary"`, `size="sm"`, `leftIcon={<Mail />}`) `dict.user.setPasswordButton` `"Set a new password"`.
    - **Form Action Row**:
      - Left icon-button cluster:
        1. **Download My Data** (`DownloadDataSection.tsx` with `iconOnly`): `Button` (`variant="secondary"`, `size="sm"`, `icon`, `leftIcon={<Download />}`), `aria-label` & tooltip title: `dict.user.downloadDataTitle` `"Download my data"`, tooltip description: `dict.user.downloadDataDesc` `"Get a copy of everything we store about your account (profile, ownership, showcase, streaks, stats, votes, bug reports and moderation records) as a JSON file."`. Inline error alert on failure: `dict.user.downloadDataFailed` `"Could not prepare your data. Try again."`. (Note: non-`iconOnly` variant renders label `dict.user.downloadDataButton` `"Download my data"`).
        2. **Sign Out Everywhere** (`SignOutEverywhereSection.tsx`): `Button` (`variant="secondary"`, `size="sm"`, `icon`, `leftIcon={<LogOut />}`), `aria-label` & tooltip title: `dict.user.signOutEverywhereTitle` `"Sign out everywhere"`, tooltip description: `dict.user.signOutEverywhereDesc` `"End every session of this account on all devices, this one included. Use it after signing in on a shared computer or if you think someone else has access."`. Inline error alert on failure: `dict.user.signOutEverywhereFailed` `"Could not sign out everywhere. Try again."`.
        3. **Delete Account** (`DeleteAccountSection.tsx` with `iconOnly`): `Button` (`variant="danger"`, `size="sm"`, `icon`, `leftIcon={<Trash2 />}`), `aria-label` & tooltip title: `dict.user.deleteAccountTitle` `"Delete account"`, tooltip description: `dict.user.deleteAccountDesc` `"Permanently delete your account and everything saved on it: ownership, showcase, streaks and progress. This cannot be undone."`, opens Delete Account Confirm Modal. (Note: non-`iconOnly` variant renders label `dict.user.deleteAccountButton` `"Delete my account"`).
      - Right submit button: `Button` (`type="submit"`, `variant="primary"`, `size="sm"`, `loading={isUpdating}`) `dict.user.saveChanges` `"Save"`.
  - **Two-Factor Authentication Sub-section** (`TwoFactorSection.tsx`):
    - Header row: `ShieldCheck` icon (`lucide-react`, amber) + heading `h3` `dict.twoFactor.sectionTitle` `"Two-factor authentication"` + `Switch` (rendered when `status?.available` is true; `ariaLabel`: `dict.twoFactor.sectionTitle`; `checked={status.enabled || setupOpen}`; `disabled={needsPassword && !status.enabled}`; toggling on opens `TwoFactorSetupModal`, toggling off sets `action='disable'` on `TwoFactorConfirmModal`).
    - Description: `dict.twoFactor.description` `"Ask for a code from your authenticator app every time you sign in. Works with Google Authenticator, Microsoft Authenticator, Apple Passwords and other authenticator apps."`
    - Conditional states in `TwoFactorSection`:
      - Load error (`loadFailed`): alert paragraph `dict.twoFactor.loadFailed` `"Could not load your two-factor settings."`
      - Unavailable (`status && !status.available`): paragraph `dict.twoFactor.unavailable` `"Two-factor authentication is not available on this server right now."`
      - Needs password (`status?.available && !status.enabled && needsPassword`): hint `dict.twoFactor.needsPasswordHint` `"Set a password first (see above). Two-factor needs it to confirm that it is really you."`
      - Enabled (`status?.available && status.enabled`):
        - Bullet list (`<ul>`):
          - `dict.twoFactor.enabledSince` `"On since {date}"` (when `status.enabled_at` is present)
          - `dict.twoFactor.recoveryRemaining` `"{count, plural, one {# recovery code left} other {# recovery codes left}}"`
        - Action button: `Button` (`variant="secondary"`, `size="sm"`) `dict.twoFactor.regenerateButton` `"New recovery codes"` (sets `action='regenerate'` on `TwoFactorConfirmModal`).
- **Accordion 2: Signature Loadouts** (`DualMainsShowcase.tsx` -> `AccordionSection`):
  - **Header**:
    - Banner background: `/images/banners/banner_loadouts.webp`
    - Heading `h2`: `dict.user.dualMainsTitle` `"Signature Loadouts"`
    - Expand/collapse toggle button + `ChevronDown` icon. Persistent key: `lemondbd_drawer_loadouts` (default open: `true`).
  - **Body**: 2-column grid (`Survivor` on left, `Killer` on right) rendering two `MainCard` components (`MainCard.tsx`):
    - Container `aria-label`: `dict.user.survivorMain` `"Survivor Main"` (Survivor) / `dict.user.killerMain` `"Killer Main"` (Killer).
    - **Character Portrait Tile** (`TileButton`):
      - `aria-label` & tooltip: `dict.user.changeMain` `"Change Main"`
      - Character portrait `PerkIcon` (default Survivor: `"Feng Min"`, default Killer: `"The Blight"`; fallback initials + uppercase role `SURVIVOR` / `KILLER`).
      - Hover overlay text: `dict.user.changeMain` `"Change Main"`
      - Click opens `ShowcaseCharacterModal` for that role.
    - **Character Name Heading** `h3`: `{loadout.characterName}`
    - **4-Perk Signature Diamond Loadout** (`DiamondCluster` with `aria-label`: `dict.user.signatureLoadout` `"4-Perk Signature Loadout"`):
      - 4 `PerkDiamondSlot` items (`slotIndex` 0..3: top, right, bottom, left):
        - **Empty slot**: dashed `DiamondSlot` button with `Plus` icon (`lucide-react`), `ariaLabel` & tooltip: `dict.user.emptySlot` `"Empty Perk Slot"`. Click opens `ShowcasePerkModal`.
        - **Filled slot**: `PerkTile` (`PerkIcon` inside diamond clip, tooltip & `aria-label` with localized perk display name; click opens `ShowcasePerkModal`) + hover/focus Clear `Button` (`variant="primary"`, `size="xs"`, `icon`, `pill`, `X` icon, `aria-label` & tooltip: `dict.user.clearPerk` `"Clear Perk"`).
- **Accordion 3: My Bug Reports** (`UserBugReportsDrawer.tsx` -> `AccordionSection`):
  - **Header**:
    - Banner background: `/images/banners/banner_bugs.webp`
    - Heading `h2`: `dict.user.tabBugReports` `"My Bug Reports"`
    - **Unread Dot** (`titleAddon`, rendered when `unreadCount > 0`): pulsing red `UnreadDot` with `aria-label`: `dict.user.newFeedback` `"New feedback from the developers"`.
    - **Header Action Button**: `Button` (`variant="primary"`, `size="sm"`, `leftIcon={<Plus />}`) `dict.user.reportNewBug` `"Report New Bug"` (opens `BugReportModal`).
    - Expand/collapse toggle button + `ChevronDown` icon. Persistent key: `lemondbd_drawer_bugs` (default closed: `false`).
  - **Body** (`UserBugReportsList.tsx`, rendered with `hideHeading={true}` inside the drawer; standalone `hideHeading={false}` header has `FogReportIcon`, `h2` `dict.user.bugReportsTitle` `"Your Submitted Bug Reports"`, and `Report New Bug` button):
    - **Report Item Cards** (scrollable list of `Surface` accordions when `reports.length > 0`):
      - **Report Card Header (`h3 > button`)**:
        - Title: `{report.title}`
        - Date subtitle: `dict.user.reportedOn` `"Reported on"` + `{formatDate(report.created_at)}`
        - Status `Badge` (`size="sm"`, `square`):
          - `pending`: amber badge with `Clock` icon + `dict.user.statusPending` `"Pending"`
          - `in_progress`: red badge with `Wrench` icon + `dict.user.statusInProgress` `"In Progress"`
          - `resolved`: green badge with `CheckCircle2` icon + `dict.user.statusResolved` `"Resolved"`
          - `rejected`: neutral badge with `XCircle` icon + `dict.user.statusClosed` `"Closed"`
        - Unread feedback dot on badge (when `report.feedback_unread` is true): `UnreadDot` (`label`: `dict.user.newFeedback` `"New feedback from the developers"`). Opening the report marks it seen (`onReportSeen`).
        - Expand chevron (`ChevronDown` in red chip).
      - **Report Card Collapsible Body** (`Collapsible`):
        - Message text: `{report.message}`
        - **Attachments Section** (when `report.images.length > 0`):
          - Label: `ImageIcon` (`lucide-react`) + `dict.user.attachments` `"Attachments"` + `({report.images.length})`
          - Thumbnail buttons (`TileButton`, `aria-label`: `"Attachments {i + 1}"`): `Img` thumbnail + hover overlay with `Maximize2` icon. Clicking sets `previewImage` to open the Image Preview Lightbox Modal.
        - **Developer Admin Response** (when `report.admin_notes` is truthy):
          - Amber card with `CrownIcon` (`DbdIcons`) + `dict.user.devResponse` `"Developer Response"` + quoted italic text `"{report.admin_notes}"` (`dict.user.quoteOpen` / `dict.user.quoteClose`).
        - **Awaiting Reply Notice** (when `!report.admin_notes` and status is `pending` or `in_progress`):
          - Muted box with `Clock` icon + `dict.user.noDevResponseYet` `"No response from the developers yet. Check back here later."`
    - **Pagination** (`Pagination.tsx`, rendered when `!loading && reports.length > 0 && totalPages > 1`):
      - Range counter `{startIdx}-{endIdx} / {totalResults}` (`aria-label`: `"Showing {start}-{end} of {total} perks"`).
      - Navigation buttons: First Page (`ChevronsLeft`, `aria-label`: `dict.pagination.firstPage` `"First Page"`), Previous Page (`ChevronLeft`, `aria-label`: `dict.pagination.previous` `"Previous Page"`), Page number `Input` (`id="current-page-input"`, `type="number"`, `aria-label`: `dict.pagination.goTo` `"Go to"`) + `/ {safeTotalPages}`, Next Page (`ChevronRight`, `aria-label`: `dict.pagination.next` `"Next Page"`), Last Page (`ChevronsRight`, `aria-label`: `dict.pagination.lastPage` `"Last Page"`).

### Modes / states
- **Route & Client Loading State** (`app/[locale]/user/loading.tsx`, `UserProfileSkeleton.tsx`):
  - Renders `<output aria-busy="true">` with `DbdSpinner` (`size="responsive"`, `accent="blood"`, skill-check SVG needle & `LemonIcon` emblem):
    - Primary label: `dict.characterDetail.loading` `"Loading Character Details..."`
    - Sublabel: `dict.user.loadingProfileSub` `"Retrieving player inventory and perk mastery"`
- **Unauthenticated / Guest State** (`UserProfileClient.tsx` when `!isAuthenticated || !user`):
  - Centered `Surface` card (`max-w-md`):
    - Amber `IconTile` with `LemonIcon`
    - Heading `h1`: `dict.user.authRequiredTitle` `"Authentication Required"`
    - Description: `dict.user.authRequiredDesc` `"Please sign in or create an account to view your LemonDBD profile, manage your teachables, and track game challenges."`
    - Primary `Button` (`leftIcon={<User />}`): `dict.user.signIn` `"Sign In"` (opens `AuthModal`)
    - Link to={`/${currentLocale}`}: `dict.user.returnToHome` `"Return to Home"`
- **Authenticated Account Variants**:
  - **Password Account (`hasPassword === true`)**: Username and Email inputs are editable; Current Password field (`*`) and New/Confirm Password fields are shown; 2FA switch is enabled.
  - **Google-only Account (`hasPassword === false`)**: Username and Email inputs are `readOnly`; Current/New Password inputs are replaced by the `"Set a new password"` email-link section (`dict.user.setPasswordTitle`, `dict.user.setPasswordDesc`, `dict.user.setPasswordButton`); 2FA switch is disabled with hint `dict.twoFactor.needsPasswordHint` unless 2FA is already enabled; Delete Account confirmation uses `GoogleSignInButton` instead of password input.
  - **Admin Account (`user.role === 'admin'`)**: Displays red `CrownIcon` badge on `UserAvatar` in `CampfireHeader`. Attempting to delete the sole admin account returns error `dict.user.deleteAccountLastAdmin` `"The only administrator account cannot be deleted."`.
  - **2FA Enabled vs Disabled (`twoFactorEnabled` / `status.enabled`)**:
    - When enabled: `UserProfileForm` shows `dict.twoFactor.codeOrRecoveryLabel` input (`id="profile-two-factor-code"`), `TwoFactorSection` shows enabled date (`dict.twoFactor.enabledSince`), remaining recovery codes (`dict.twoFactor.recoveryRemaining`), and `"New recovery codes"` button (`dict.twoFactor.regenerateButton`), and `DeleteAccountSection` modal shows the 2FA code input.
    - When server 2FA is unavailable (`status.available === false`): `Switch` is hidden and `dict.twoFactor.unavailable` is shown.
- **Bug Reports Drawer States**:
  - **Loading State** (`loadingReports === true` -> `UserBugReportsSkeleton.tsx`):
    - `<output aria-busy="true">` with `DbdSpinner` (`size="lg"`, `accent="blood"`, label: `dict.user.loadingReports` `"Loading your reported tickets..."`).
  - **Empty State** (`reports.length === 0` -> `EmptyState` `variant="compact"`):
    - `FogReportIcon` (`text-accent-red`)
    - Heading `h3`: `dict.user.noReportsTitle` `"No Bug Reports Submitted"`
    - Subtitle: `dict.user.noReportsSubtitle` `"You have not reported any glitches yet. If you spot incorrect perk numbers or map callout issues, report them!"`
  - **Populated State**: Scrollable list of collapsible bug report cards + `Pagination` when `totalPages > 1`.

### Modals & drawers (file)
1. **Auth Modal** (`components/AuthModal.tsx` + `components/auth/AuthModalParts.tsx`)
   - **Trigger**: Clicking `dict.user.signIn` `"Sign In"` button on the unauthenticated `/user` screen.
   - **Modal Chrome**: `Modal` (`variant="dialog"`, `size="md"`, `ariaLabel="Authentication"`, close button `aria-label`: `dict.modal.close` `"Close"`).
   - **Dynamic Title (`authModalTitle`)**:
     - `mode === 'login'`: `dict.user.authSignInTitle` `"Sign In"`
     - `mode === 'register'`: `dict.user.authRegisterTitle` `"Create Account"`
     - `mode === 'forgot'` or `notice.type === 'forgot-sent'`: `dict.user.resetPassword` `"Reset Password"`
     - `notice.type === 'verify-reminder' | 'register-success'`: `dict.user.authVerifyEmailTitle` `"Verify Email"`
     - `notice.type === 'two-factor'`: `dict.twoFactor.challengeTitle` `"Two-step verification"`
     - `notice.type === 'blocked'`: `dict.moderation.blocked.bannedTitle` `"This account is banned"` or `dict.moderation.blocked.suspendedTitle` `"This account is suspended"`
   - **Internal Modes / Views**:
     - **Security Check Loader** (`isAltchaVerifying` while no notice): `Spinner` + `dict.user.authSecurityCheck` `"Running security check"`.
     - **Login Mode (`mode === 'login'`)**:
       - `AuthField` text input: `dict.user.loginOrEmailLabel` `"Login or Email"`
       - `AuthField` password input: `dict.user.passwordLabel` `"Password"`
       - Forgot password button (`variant="linkMuted"`): `dict.user.forgotPasswordLink` `"Forgot password?"` (switches to `forgot` mode)
       - `AltchaWidget` (honeypot input + PoW status/error with `dict.modal.retry` `"Retry"` button)
       - Submit `Button` (`variant="primary"`): `LogIn` icon + `dict.user.signIn` `"Sign In"`
       - `GoogleSignInSection` (when `googleClientId` is configured): `"or"` divider (`dict.user.googleOrDivider`) + `GoogleSignInButton` (`GoogleLogo` + `dict.user.googleContinue` `"Continue with Google"`)
       - `DemoAccountButtons` (development only when `demoAccounts.length > 0`): heading `dict.user.quickDemoAccounts` `"Quick Demo Accounts"`, buttons `dict.user.adminDemo` `"Admin (lemon)"` (`ShieldAlert` icon) and `dict.user.userDemo` `"User (user)"`
       - `ModeSwitchLink`: `dict.user.dontHaveAccount` `"Don't have an account?"` + `dict.user.register` `"Register"`
     - **Register Mode (`mode === 'register'`)**:
       - `AuthField` text input: `dict.user.loginLabel` `"Login"`
       - `AuthField` text input: `dict.user.usernameLabel` `"Username"` (`minLength={3}`, `maxLength={50}`)
       - `AuthField` email input: `dict.user.emailLabel` `"Email Address"`
       - `AuthField` password input: `dict.user.passwordLabel` `"Password"` (`minLength={limits.passwordMinLength}`)
       - `LegalConsentField`: `Checkbox` with `dict.user.acceptLegalLabel` `"I have read and accept the {terms} and the {rules}, and I have read the {privacy}"` where `{terms}` (`dict.user.acceptTermsLink` `"Terms of Service"`) and `{rules}` (`dict.user.acceptRulesLink` `"Rules"`) open `LegalDocModal`, and `{privacy}` (`dict.user.acceptPrivacyLink` `"Privacy Policy"`) opens `/[locale]/privacy-policy` in a new tab. Validation error: `dict.user.legalNotAccepted` `"Please accept the Terms of Service and the Rules to create an account."`
       - Registration paused notice (when `!features.registrationOpen`): `dict.user.registrationClosedNotice` `"New accounts are paused at the moment. Please try again later."`
       - Submit `Button`: `UserPlus` icon + `dict.user.createAccount` `"Create Account"`
       - `GoogleSignInSection`, `DemoAccountButtons`, and `ModeSwitchLink` (`dict.user.alreadyHaveAccount` `"Already have an account?"` + `dict.user.signIn` `"Sign In"`).
     - **Forgot Password Mode (`mode === 'forgot'`)**:
       - Subtitle: `dict.user.authResetSubtitle` `"We will send a reset link to your email."`
       - `AuthField` email input: `dict.user.emailLabel` `"Email Address"`
       - Submit `Button`: `Mail` icon + `dict.user.sendResetLink` `"Send Reset Link"`
       - `ModeSwitchLink`: `dict.user.backToSignIn` `"Back to Sign In"`
     - **Forgot Sent Notice (`notice.type === 'forgot-sent'`)**:
       - Amber box with `MailWarning` icon + `dict.user.forgotSentNotice` `"If that email is registered, a password reset link is on its way."` + `Button` `dict.modal.close` `"Close"`.
     - **Email Verification Notice (`notice.type === 'verify-reminder' | 'register-success'` -> `components/EmailVerificationForm.tsx`)**:
       - Subtitle: `dict.user.authVerifySubtitle` `"Enter the code we sent to {email}."`
       - 6-digit `CodeInput` (`aria-label` per box: `dict.user.digitAriaLabel` `"Digit {n} of verification code"`)
       - Submit `Button`: `dict.user.verifyEmailAction` `"Verify"` (or `dict.user.verifying` `"Verifying..."`)
       - Resend `Button` (`variant="link"`): `dict.user.resendCode` `"Resend code"` or cooldown `dict.user.resendCodeIn` `"Resend code in {seconds}s"`
       - Error alerts: `dict.user.invalidVerificationCode` `"Invalid verification code."`, `dict.user.failedToResendCode` `"Failed to resend code."`
     - **Two-Factor Challenge Notice (`notice.type === 'two-factor'` -> `components/auth/TwoFactorChallengeForm.tsx`)**:
       - App code mode vs Recovery code mode (`useRecovery` toggle):
         - Subtitle: `dict.twoFactor.challengeSubtitle` `"Enter the 6-digit code from your authenticator app."` OR `dict.twoFactor.challengeRecoverySubtitle` `"Enter one of your recovery codes. Each one works only once."`
         - Input: 6-digit `CodeInput` OR text `Input` (`aria-label`: `dict.twoFactor.recoveryCodeLabel` `"Recovery code"`, `placeholder`: `dict.twoFactor.recoveryCodePlaceholder` `"XXXXX-XXXXX"`)
         - Submit `Button`: `dict.twoFactor.challengeSubmit` `"Verify"`
         - Method switch `Button` (`variant="link"`): `dict.twoFactor.useRecoveryCode` `"Use a recovery code instead"` / `dict.twoFactor.useAppCode` `"Use the authenticator app instead"`
         - Back `Button` (`variant="linkMuted"`): `dict.twoFactor.backToSignIn` `"Back to sign in"`
     - **Account Blocked Notice (`notice.type === 'blocked'` -> `components/moderation/AccountBlockedNotice.tsx`)**:
       - Red alert card with `Ban` (banned) or `Clock` (suspended) icon + `dict.moderation.blocked.bannedBody` `"A moderator permanently banned this account, so it can no longer sign in."` or `dict.moderation.blocked.suspendedBody` `"A moderator suspended this account until {date}. You can sign in again after that."`
       - Reason line (if `reason_code`): `dict.moderation.blocked.reasonLabel` `"Reason"` + localized reason (`dict.moderation.reasons.*`)
       - Appeal text: `dict.moderation.blocked.appealWithContact` or `dict.moderation.blocked.appealNoContact`
       - Close `Button`: `dict.moderation.blocked.close` `"Close"`

2. **Legal Document Preview Modal** (`components/legal/LegalDocModal.tsx` + `components/legal/LegalSections.tsx`)
   - **Trigger**: Clicking `"Terms of Service"` or `"Rules"` inline links inside `AuthModal` (register mode).
   - **Modal Chrome**: `Modal` (`variant="dialog"`, `size="3xl"`, `layer="top"`, title: `dict.terms.heading` `"Terms of Service"` or `dict.rules.heading` `"Rules"`, close button `aria-label`: `dict.modal.close` `"Close"`).
   - **Body**: `LegalNotice` (`tldrNotice`, `translationNotice`) + `LegalSections` (`variant="modal"`) rendering Summary (`summaryHeading`) and all numbered sections with `TL;DR` badges, paragraphs, bullet lists, `HookStages` (for Rules enforcement), and `ContactLinks`.

3. **Two-Factor Setup Modal** (`components/user/TwoFactorSetupModal.tsx` + `components/user/RecoveryCodesPanel.tsx`)
   - **Trigger**: Toggling on the 2FA `Switch` in `TwoFactorSection` (`components/user/TwoFactorSection.tsx`).
   - **Modal Chrome**: `Modal` (`variant="dialog"`, `size="md"`, title: `dict.twoFactor.setupTitle` `"Turn on two-factor authentication"`). Cannot be dismissed via backdrop/Escape during step `'codes'`.
   - **Step 1 (`step === 'password'`)**:
     - Intro text: `dict.twoFactor.setupPasswordIntro` `"Confirm your password to start."`
     - Password `Input` (`aria-label` & `placeholder`: `dict.twoFactor.passwordLabel` `"Password"`)
     - Submit `Button` (`variant="primary"`): `dict.twoFactor.continueButton` `"Continue"`
   - **Step 2 (`step === 'scan'`)**:
     - Intro text: `dict.twoFactor.scanIntro` `"Open your authenticator app, add a new account and scan this QR code."`
     - `QrCode` SVG (`label`: `dict.twoFactor.qrAlt` `"QR code for your authenticator app"`)
     - Manual entry block: caption `dict.twoFactor.manualEntry` `"Can't scan? Enter this key instead:"` + `<code>` secret key in 4-char groups + Copy `Button` (`variant="secondary"`, `size="sm"`, `Copy`/`Check` icon, label: `dict.twoFactor.copyKey` `"Copy key"` / `dict.twoFactor.copied` `"Copied"`).
     - Verification code block: label `dict.twoFactor.codeLabel` `"6-digit code from the app"` + 6-digit `CodeInput` (`focusOnMount`).
     - Submit `Button` (`variant="primary"`): `dict.twoFactor.confirmButton` `"Verify"`
   - **Step 3 (`step === 'codes'` -> `RecoveryCodesPanel.tsx`)**:
     - Heading `h3`: `dict.twoFactor.codesTitle` `"Save your recovery codes"`
     - Intro text: `dict.twoFactor.codesIntro` `"If you lose your authenticator app, each of these codes lets you sign in once. Keep them somewhere safe: they will not be shown again."`
     - 2-column grid (`<ul>`) of monospace recovery `<code>` items.
     - Action buttons:
       - Copy `Button` (`variant="secondary"`, `size="sm"`, `Copy`/`Check` icon): `dict.twoFactor.copyCodes` `"Copy codes"` / `dict.twoFactor.copied` `"Copied"`
       - Download `Button` (`variant="secondary"`, `size="sm"`, `Download` icon): `dict.twoFactor.downloadCodes` `"Download"` (downloads `lemondbd-recovery-codes.txt` with header `dict.twoFactor.downloadFileHeader` `"LemonDBD recovery codes (each works once)"`)
     - Confirmation `Checkbox`: `dict.twoFactor.savedCheckbox` `"I have saved these codes"`
     - Finish `Button` (`variant="primary"`, disabled until checkbox is ticked): `dict.twoFactor.doneButton` `"Done"`

4. **Two-Factor Confirm Modal (Disable / Regenerate Recovery Codes)** (`components/user/TwoFactorConfirmModal.tsx` + `components/user/RecoveryCodesPanel.tsx`)
   - **Trigger**:
     - `action === 'disable'`: Toggling off the 2FA `Switch` in `TwoFactorSection`.
     - `action === 'regenerate'`: Clicking `dict.twoFactor.regenerateButton` `"New recovery codes"` button in `TwoFactorSection`.
   - **Modal Chrome**: `Modal` (`variant="dialog"`, `size="md"`).
     - Title when `action === 'disable'`: `dict.twoFactor.disableTitle` `"Turn off two-factor authentication"`
     - Title when `action === 'regenerate'`: `dict.twoFactor.regenerateTitle` `"Generate new recovery codes"`
   - **Form View (before regeneration completes)**:
     - Intro text: `dict.twoFactor.disableIntro` `"Enter your password and a code from your app, or a recovery code."` (disable) OR `dict.twoFactor.regenerateIntro` `"Your current recovery codes will stop working. Enter your password and a code from your app."` (regenerate).
     - Error alert (when `error` is set): localized 2FA error message (`twoFactorErrorMessage`).
     - Password `Input` (`aria-label` & `placeholder`: `dict.twoFactor.passwordLabel` `"Password"`).
     - Code `Input` (`aria-label` & `placeholder`: `dict.twoFactor.codeOrRecoveryLabel` `"App code or recovery code"`).
     - Submit `Button` (`variant="primary"`): `dict.twoFactor.disableButton` `"Turn off"` (disable) OR `dict.twoFactor.regenerateConfirm` `"Generate new codes"` (regenerate).
   - **New Codes View (after `action === 'regenerate'` succeeds)**:
     - Renders `RecoveryCodesPanel` (same elements as Step 3 of `TwoFactorSetupModal`).

5. **Delete Account Confirm Modal** (`components/user/DeleteAccountSection.tsx`)
   - **Trigger**: Clicking the red Trash (`Trash2`) Delete Account `Button` in `UserProfileForm`.
   - **Modal Chrome**: `Modal` (`variant="confirm"`, title: `dict.user.deleteAccountConfirmTitle` `"Delete your account?"`).
   - **Body**:
     - **Password Account Variant (`usesGoogle === false`)**:
       - Description: `dict.user.deleteAccountConfirmDesc` `"Enter your password to confirm. Your account and saved data are removed for good."`
       - Password `Input` (`placeholder` & `aria-label`: `dict.user.deleteAccountPassword` `"Password"`)
     - **Google Account Variant (`usesGoogle === true`)**:
       - Description: `dict.user.deleteAccountGoogleDesc` `"Confirm with Google to delete your account. Your account and saved data are removed for good."`
       - `GoogleSignInButton` (`dict.user.googleContinue` `"Continue with Google"`)
     - **2FA Code Input** (when `requiresCode` is true):
       - Text `Input` (`placeholder` & `aria-label`: `dict.twoFactor.codeOrRecoveryLabel` `"App code or recovery code"`)
     - **Error Alert** (when `error` is set):
       - `dict.user.deleteAccountWrongPassword` `"Incorrect password."`
       - `dict.user.deleteAccountLastAdmin` `"The only administrator account cannot be deleted."`
       - `dict.twoFactor.codeRequiredHint` or 2FA error message
       - `dict.user.deleteAccountFailed` `"Could not delete the account. Try again."`
   - **Footer**:
     - Cancel `Button` (`variant="secondary"`): `dict.user.deleteAccountCancel` `"Cancel"`
     - Confirm `Button` (`variant="danger"`, shown when `!usesGoogle`): `dict.user.deleteAccountConfirm` `"Delete permanently"`

6. **Showcase Character Picker Modal** (`components/user/ShowcaseCharacterModal.tsx`)
   - **Trigger**: Clicking the Survivor or Killer portrait `TileButton` (`"Change Main"`) in `MainCard` (`DualMainsShowcase.tsx`).
   - **Modal Chrome**: `Modal` (`size="2xl"`, `borderless`, title: `dict.user.selectCharacter` `"Select Character"`).
   - **Search Bar**: `SearchInput` (`placeholder`: `dict.user.searchCharacters` `"Search characters..."`, `data-autofocus`).
   - **Body States**:
     - **Loading**: `Spinner` (`size="lg"`, `tone="accent"`) + `dict.user.loadingCharacters` `"Consulting the Fog..."`
     - **Empty**: `EmptyState` (`variant="inline"`, title: `dict.user.noCharactersFound` `"No matching characters found."`)
     - **Character Grid**: 3–5 column grid of `CharacterGridItem` (`TileButton` with character portrait `Image` or 2-letter uppercase initials fallback + character name; selected character has red ring `ring-accent-red` and `aria-pressed="true"`). Selecting immediately updates the main character and closes the modal.

7. **Showcase Perk Picker Modal** (`components/user/ShowcasePerkModal.tsx` + `components/perks/PerkSearchBox.tsx`)
   - **Trigger**: Clicking any of the 4 diamond perk slots (`PerkDiamondSlot`) in `MainCard` (`DualMainsShowcase.tsx`).
   - **Modal Chrome**: `Modal` (`size="2xl"`, `borderless`, title: `dict.user.selectPerk` `"Select Perks"`).
   - **Search & Type Filter Bar** (`PerkSearchBox.tsx`):
     - Token `SearchInput` (`pill`, `placeholder`/`aria-label`: `dict.perkTypes.searchPlaceholder` `"Search perks, characters or types..."`, clear button `aria-label`: `dict.filters.clearSearch` `"Clear search"`):
       - Renders active `PerkType` filters as removable `ToggleChip` tokens inside the input (`aria-label`: `dict.perkTypes.removeType` `"Remove {type} filter"`).
     - Multi-select `CustomDropdown` (`label`: `dict.perkTypes.typesButton` `"Types"`, `ariaLabel`: `dict.perkTypes.typeFilters` `"Filter by perk type"`, `clearLabel`: `dict.perkTypes.clearTypes` `"Clear all"`):
       - Lists available perk types for the current role (`dict.perkTypes.labels.*`: Generator, Healing, Chase, Stealth, Tracking, Exhaustion, Sacrifice, Obsession, Totem, Hooks, Downed, Items, Endgame, Entity) with perk count sublabels and a badge showing selected count.
     - **Type Suggestions Popover** (`Popover` anchored to search input when typing matches a perk type):
       - Heading: `dict.perkTypes.suggestionsHeading` `"Perk types"`
       - `MenuItem` rows with type label + count `Badge`.
   - **Body States**:
     - **Loading**: `Spinner` (`size="lg"`, `tone="accent"`) + `dict.user.loadingPerks` `"Channeling teachable knowledge..."`
     - **Empty / Role Conflict**: `EmptyState` (`variant="inline"`, title: `roleOnlyMessage` `"{type} perks only exist for {role}."` when filtering by a type exclusive to the opposite role, else `dict.user.noPerksFound` `"No matching perks found."`)
     - **Perks Grid**: Progressive 2–4 column grid of `PerkGridItem` (`SelectableCard` with `PerkIcon` or `PerkHexIcon` fallback, perk name, primary perk type label, and top-right red circle `Check` badge when selected). Clicking a perk toggles it into the first free slot (fill order: `0, 3, 2, 1`) or removes it if already equipped.

8. **Bug Report Submission Modal** (`components/sidebar/BugReportModal.tsx` + `components/sidebar/BugReportScreenshots.tsx`)
   - **Trigger**: Clicking `dict.user.reportNewBug` `"Report New Bug"` button in `UserBugReportsDrawer` header.
   - **Modal Chrome**: `Modal` (`variant="sheet"`, `size="xl"` or `"sm"` on success, title: `dict.sidebar.bugReportModalTitle` `"Report a bug"`, close button `aria-label`: `dict.sidebar.bugCloseButton` `"Close"`).
   - **Modes / States**:
     - **Form State (Authenticated on `/user`)**:
       - Error `Alert` banner (when validation or submission fails: `dict.sidebar.bugErrorMessage` `"Failed to submit report. Please try again."`, `dict.sidebar.bugScreenshotRequired` `"Attach at least one screenshot."`, etc.).
       - **Reporter Identity Bar** (`Surface` `tone="elevated"`): `LemonIcon` + `dict.sidebar.bugLoggedInAs` `"Logged in as"` `{user.username}` + `{user.email}` + green `Badge` with `UserCheck` icon & `dict.sidebar.verified` `"Verified"`. (Note: for signed-out guests when enabled, shows required `FormField` `dict.sidebar.bugGuestEmailLabel` `"Email (for resolution updates)"` with `Input` placeholder `dict.sidebar.bugGuestEmailPlaceholder` `"you@example.com"`, or `Alert` `dict.sidebar.bugGuestsClosed` if guest reports are disabled).
       - **Issue Title Field** (`FormField` required): label `dict.sidebar.bugTitleLabel` `"Issue Title"` + text `Input` (`id="bug-report-title"`, `placeholder`: `dict.sidebar.bugTitlePlaceholder` `"Short summary"`).
       - **Detailed Description Field** (`FormField` required): label `dict.sidebar.bugDescriptionLabel` `"Detailed Description"` + `Textarea` (`id="bug-report-message"`, `rows={5}`, `placeholder`: `dict.sidebar.bugDescriptionPlaceholder` `"What happened?"`) + inset guide card (`Surface` `tone="inset"`):
         - Heading: `dict.sidebar.bugGuideTitle` `"A good report includes"`:
         - Ordered list (`<ol>`):
           1. `dict.sidebar.bugGuideHappenedLabel` `"What happened"`: `dict.sidebar.bugGuideHappenedText` `"Describe the problem in a sentence or two."`
           2. `dict.sidebar.bugGuideStepsLabel` `"Steps to reproduce"`: `dict.sidebar.bugGuideStepsText` `"What you clicked or typed, step by step."`
           3. `dict.sidebar.bugGuideExpectedLabel` `"Expected result"`: `dict.sidebar.bugGuideExpectedText` `"What you thought should happen instead."`
           4. `dict.sidebar.bugGuideScreenshotLabel` `"Screenshot"`: `dict.sidebar.bugGuideScreenshotText` `"A picture of the problem, if you can. It speeds up the fix."`
       - **Screenshots Uploader** (`BugReportScreenshots.tsx`):
         - Header: `IconLabel` (`ImageIcon` + `dict.sidebar.bugScreenshotsLabel` `"Screenshots"` + optional `*` if `bugReportRequireImage`) + counter `{images.length}/{maxImages}`.
         - Attached thumbnails list (`<ul>` of `Surface` tiles with `Img` alt `"Screenshot #{idx + 1}"` and hover delete button `TrashIcon` with `aria-label`: `dict.sidebar.bugRemoveScreenshot` `"Remove screenshot"`).
         - Drag-and-drop / browse `Button` (dashed `variant="secondary"`, shown while `images.length < maxImages`): `UploadIcon` + `dict.sidebar.bugDropImages` `"Drag screenshots here or click to browse"` (or `dict.sidebar.bugDropRelease` `"Drop to attach"` while dragging) + caption `dict.sidebar.bugImageLimits` `"Max {count} images, {mb} MB each"`.
         - Validation `Alert` (when file rejected): `dict.sidebar.bugNotImage` `"Only image files can be attached."`, `dict.sidebar.bugImageSizeLimit` `"Each screenshot must be {mb} MB or smaller."`, or `dict.sidebar.bugMaxScreenshots` `"You can attach up to {count} screenshots."`.
         - Hidden `<input type="file" accept="image/*" multiple />` (`aria-label`: `dict.sidebar.bugUploadImage` `"Upload Image"`).
       - **ALTCHA Widget** (`AltchaWidget.tsx`).
       - **Footer Submit Button**: `Button` (`type="submit"`, `variant="primary"`, `loading={isSubmitting}`) `dict.sidebar.bugSubmitButton` `"Submit"` (or `dict.sidebar.bugSubmitting` `"Submitting..."`).
     - **Success State (`isSuccess === true`)**:
       - Renders `SuccessState` (`CheckCircle2` green icon, heading `h2` `dict.sidebar.bugSuccessMessage` `"Report sent"`, description `dict.sidebar.bugSuccessThanks` `"Thank you for helping improve LemonDBD."`, floating close button).

9. **Bug Report Attachment Lightbox Modal** (`components/user/UserBugReportsList.tsx`)
   - **Trigger**: Clicking an attachment thumbnail `TileButton` inside an expanded bug report in `UserBugReportsList`.
   - **Modal Chrome**: `Modal` (`variant="lightbox"`, `layer="system"`, `ariaLabel`: `dict.user.imagePreview` `"Image Preview"`).
   - **Elements**:
     - Floating close `Button` (`PreviewCloseButton`, `icon`, `pill`, `X` icon, `aria-label`: `dict.modal.close` `"Close"`).
     - Full-size attachment image (`Img`, `alt`: `dict.user.attachmentPreview` `"Bug Report Attachment Full Preview"`).

---

## /settings

### Page & files
- **Route page**: `app/[locale]/settings/page.tsx` (`SettingsPage` — metadata title: `dict.settings.pageTitle` `"Settings"`, description: `dict.settings.subtitle` `"Fine-tune global site features, trial soundscapes, and visual performance."`)
- **Route loading state**: `app/[locale]/settings/loading.tsx` (`SettingsLoading`)
- **Main client component**: `app/[locale]/settings/SettingsClient.tsx` (`SettingsClient`)
- **Shared primitives**:
  - `components/common/SettingRow.tsx` (`SettingRow`)
  - `components/common/Surface.tsx` (`Surface`)
  - `components/common/Switch.tsx` (`Switch`)
  - `components/common/Button.tsx` (`Button`)
  - `components/icons/DbdIcons.tsx` (`CampfireIcon`, `ImageIcon`, `MatureIcon`, `VolumeIcon`, `MusicIcon`, `ClapperboardIcon`)
- **State / hooks**: `hooks/usePreferences.ts` (`usePreferences`), `context/DictionaryContext.tsx` (`useDictionary`), `utils/analytics.ts` (`trackEvent`)

### Layout elements
- **Main Settings Container** (`SettingsClient.tsx`):
  - Centered wrapper (`max-w-4xl`) containing a single `Surface` (`tone="flat"`, `padding="lg"`, `divide-y`) with 6 `SettingRow` items (each row renders a red `DbdIcons` icon on the left, a bold title `span`, a secondary description `p`, and a right-aligned control):
  1. **Campfire Particles Row** (`SettingRow`):
     - Icon: `CampfireIcon`
     - Title: `dict.settings.campfire` `"Campfire Particles"`
     - Description: `dict.settings.campfireDesc` `"Control background campfire particle density and rendering performance."`
     - Control: `<fieldset aria-label="Campfire Particles">` with 3 mode `Button`s (`size="sm"`, active mode uses `variant="primary"` and `aria-pressed="true"`, inactive modes use `variant="secondary"`):
       - `'on'`: `dict.settings.campfireOn` `"Full"`
       - `'eco'`: `dict.settings.campfireEco` `"Eco"`
       - `'off'`: `dict.settings.campfireOff` `"Off"`
  2. **GIFs Row** (`SettingRow`):
     - Icon: `ImageIcon`
     - Title: `dict.settings.gifs` `"GIFs"`
     - Description: `dict.settings.gifsDesc` `"Play animated GIFs. Off shows a still image instead."`
     - Control: `Switch` (`checked={preferences.gifs}`, `ariaLabel`: `dict.settings.gifs` `"GIFs"`)
  3. **NSFW / 18+ Content Row** (`SettingRow`):
     - Icon: `MatureIcon`
     - Title: `dict.settings.nsfw` `"NSFW / 18+ Content"`
     - Description: `dict.settings.nsfwDesc` `"Display mature content, suggestive art, and uncensored cards."`
     - Control: `Switch` (`checked={preferences.nsfw}`, `ariaLabel`: `dict.settings.nsfw` `"NSFW / 18+ Content"`)
  4. **Sound Effects Row** (`SettingRow`):
     - Icon: `VolumeIcon`
     - Title: `dict.settings.soundEffects` `"Sound Effects"`
     - Description: `dict.settings.soundEffectsDesc` `"Play sound effects during interactions and events."`
     - Control: `Switch` (`checked={preferences.sounds}`, `ariaLabel`: `dict.settings.soundEffects` `"Sound Effects"`)
  5. **Music Row** (`SettingRow`):
     - Icon: `MusicIcon`
     - Title: `dict.settings.music` `"Music"`
     - Description: `dict.settings.musicDesc` `"Play background music across minigames and trials."`
     - Control: `Switch` (`checked={preferences.music}`, `ariaLabel`: `dict.settings.music` `"Music"`)
  6. **Interactive Animations Row** (`SettingRow`):
     - Icon: `ClapperboardIcon`
     - Title: `dict.settings.animations` `"Interactive Animations"`
     - Description: `dict.settings.animationsDesc` `"Smooth motion and visual feedback, mostly on Smash or Pass."`
     - Control: `Switch` (`checked={preferences.effects}`, `ariaLabel`: `dict.settings.animations` `"Interactive Animations"`)

### Modes / states
- **Route Loading Skeleton** (`app/[locale]/settings/loading.tsx` — `SettingsLoading`):
  - Pulse skeleton (`aria-busy="true"`) with header bar placeholders (`h-8 w-48`, `h-4 w-80`) and 3 `Surface` cards each containing 2 skeleton setting rows with pill switch placeholders (`h-6 w-11 rounded-full`).
- **Preference States** (`usePreferences`):
  - `backgroundAnimation`: `'on'` (`"Full"`) | `'eco'` (`"Eco"`) | `'off'` (`"Off"`).
  - Boolean `Switch` toggles (`gifs`, `nsfw`, `sounds`, `music`, `effects`): `aria-checked="true"` (green track `bg-accent-green`) vs `aria-checked="false"` (elevated track `bg-bg-elevated`).
  - Available to both guests (persisted in `localStorage`) and authenticated users (synced with user preferences).

### Modals & drawers (file)
- None on `/settings`.

---

## /achievements

### Page & files
- **Route page**: `app/[locale]/achievements/page.tsx` (`AchievementsPage` — metadata title: `dict.app.achievementsPageTitle` `"LemonDBD - Achievements"`)
- **Route loading state**: `app/[locale]/achievements/loading.tsx` (`AchievementsLoading` -> `RouteLoading` + `DbdSpinner`)
- **Main hub & components**:
  - `components/achievements/AchievementsHub.tsx` (`AchievementsHub`)
  - `components/achievements/shelves.ts` (`getTrophyShelves`, `TrophyShelfDef`, `TrophyTierDef`)
  - `components/achievements/TrophyShelf.tsx` (`TrophyShelf`)
  - `components/achievements/TrophySlot.tsx` (`TrophySlot`)
- **Shared primitives**:
  - `components/common/Badge.tsx` (`Badge`)
  - `components/common/Tooltip.tsx` (`tip`)
  - `components/icons/DbdIcons.tsx` (`TrophyIcon`, `FullRosterLaurelIcon`)
  - `components/layout/RouteLoading.tsx` (`RouteLoading`)
  - `components/common/DbdSpinner.tsx` (`DbdSpinner`)

### Layout elements
- **Coming Soon Overlay Banner** (`AchievementsHub.tsx`):
  - Fixed centered overlay (`fixed left-[var(--sidebar-width,0rem)] inset-y-0 right-0 z-40`) displaying a large amber square `Badge` (`tone="amber"`, `size="lg"`, `plain`, `square`): `dict.achievements.comingSoon` `"Coming Soon"`.
- **Blurred Trophy Shelves Stack** (`AchievementsHub.tsx` -> `TrophyShelf.tsx` + `TrophySlot.tsx`, rendered inside `blur-sm select-none pointer-events-none` container with `aria-hidden="true"`):
  - Each `TrophyShelf` is an amber-tinted card (`border-accent-amber/30`) with:
    - Shelf heading `h2`: `{shelf.title}`
    - Flex row of tier groups (`{tier.label}` caption above a pair of `TrophySlot` cards)
    - Bottom decorative amber gradient bar (`h-2 rounded-full`).
  - Each tier renders 2 `TrophySlot` cards (`w-24`):
    1. **Owned Roster Slot** (`variant="owned"`): `TrophyIcon` (`DbdIcons`) + uppercase badge label `dict.achievements.ownedBadgeLabel` `"Owned roster"` + status tooltip (`tip(ownedHover, undefined, 'status')`).
    2. **Full Roster Slot** (`variant="all"`): `FullRosterLaurelIcon` (`DbdIcons`) + uppercase badge label `dict.achievements.allBadgeLabel` `"Full roster"` + status tooltip (`tip(allHover, undefined, 'status')`).
  - **All 7 Trophy Shelves & Tiers (`shelves.ts`)**:
    1. **Shelf 1 — Gauntlet** (`id: 'gauntlet'`, title: `dict.achievements.gauntletShelf` `"Gauntlet"`):
       - Tier `gauntlet_original`: label `dict.achievements.originalLabel` `"Original"`
         - Owned tooltip: `"Beat this challenge at Original difficulty using only your unlocked characters."`
         - All tooltip: `"Beat this challenge at Original difficulty using every character in the game."`
    2. **Shelf 2 — Chaos Streak** (`id: 'chaos'`, title: `dict.achievements.chaosShelf` `"Chaos Streak"`):
       - Tier `chaos_easy`: label `dict.achievements.easyLabel` `"Easy"` (tooltips: `"Beat this challenge at Easy difficulty using only your unlocked characters."` / `"...using every character in the game."`)
       - Tier `chaos_medium`: label `dict.achievements.mediumLabel` `"Medium"` (tooltips: `"Beat this challenge at Medium difficulty..."`)
       - Tier `chaos_hell`: label `dict.achievements.hellLabel` `"Hell"` (tooltips: `"Beat this challenge at Hell difficulty..."`)
    3. **Shelf 3 — History Streak** (`id: 'history'`, title: `dict.achievements.historyShelf` `"History Streak"`):
       - Tier `history_medium`: label `dict.achievements.mediumLabel` `"Medium"` (tooltips: `"Beat this challenge at Medium difficulty..."`)
       - Tier `history_hell`: label `dict.achievements.hellLabel` `"Hell"` (tooltips: `"Beat this challenge at Hell difficulty..."`)
    4. **Shelf 4 — Page Streak** (`id: 'page_streak'`, title: `dict.achievements.pageStreakShelf` `"Page Streak"`):
       - Tier `page_streak_all_killers`: label `dict.achievements.allKillersLabel` `"All Killers"`
         - Owned tooltip: `dict.achievements.pageStreakOwnedHover` `"Complete a full Page Streak run with every killer you own."`
         - All tooltip: `dict.achievements.pageStreakAllHover` `"Complete a full Page Streak run with every killer in the game."`
    5. **Shelf 5 — ID, Please (Mixed)** (`id: 'id_please'`, title: `dict.achievements.idPleaseShelf` `"ID, Please"`):
       - Tier `id_please_milestones`: label `dict.streaks.idPleaseMilestonesLabel` `"Milestones"` (both tooltips: `"Reach a win streak of 50 in Milestones."`)
       - Tier `id_please_hardcore`: label `dict.streaks.idPleaseHardcoreLabel` `"Hardcore"` (both tooltips: `"Reach a win streak of 30 in Hardcore."`)
       - Tier `id_please_hardcore_plus`: label `dict.streaks.idPleaseHardcorePlusLabel` `"Hardcore+"` (both tooltips: `"Reach a win streak of 25 in Hardcore+."`)
    6. **Shelf 6 — ID, Please (Survivor)** (`id: 'id_please_survivor'`, title: `dict.streaks.idPleaseSurvivorTitle` `"ID, Please (Survivor)"`):
       - Tier `id_please_survivor_milestones`: label `"Milestones"` (both tooltips: `dict.achievements.idPleaseEveryCharacterHover` `"Win with every Survivor in Milestones."`)
       - Tier `id_please_survivor_hardcore`: label `"Hardcore"` (both tooltips: `"Reach a win streak of 30 in Hardcore."`)
       - Tier `id_please_survivor_hardcore_plus`: label `"Hardcore+"` (both tooltips: `"Reach a win streak of 25 in Hardcore+."`)
    7. **Shelf 7 — ID, Please (Killer)** (`id: 'id_please_killer'`, title: `dict.streaks.idPleaseKillerTitle` `"ID, Please (Killer)"`):
       - Tier `id_please_killer_milestones`: label `"Milestones"` (both tooltips: `dict.achievements.idPleaseEveryCharacterHover` `"Win with every Killer in Milestones."`)
       - Tier `id_please_killer_hardcore`: label `"Hardcore"` (both tooltips: `"Reach a win streak of 30 in Hardcore."`)
       - Tier `id_please_killer_hardcore_plus`: label `"Hardcore+"` (both tooltips: `"Reach a win streak of 25 in Hardcore+."`)

### Modes / states
- **Route Loading State** (`app/[locale]/achievements/loading.tsx` — `AchievementsLoading`):
  - Renders `RouteLoading` wrapper with `DbdSpinner` (`size="responsive"`, `layout="inline"`, `accent="blood"`, default label: `dict.app.loading` `"Loading..."`).
- **Coming Soon Preview State** (`AchievementsHub.tsx`):
  - The entire shelf stack is blurred and non-interactive (`blur-sm select-none pointer-events-none`, `aria-hidden="true"`) behind the fixed `"Coming Soon"` badge.
- **Trophy Slot Locked vs Unlocked Prop State** (`TrophySlot.tsx`):
  - `unlocked={false}` (default): muted border and icon (`border-border-color bg-bg-surface`, `text-text-muted fill-text-muted/40`).
  - `unlocked={true}`: amber border and icon (`border-accent-amber/40 bg-accent-amber/10`, `text-accent-amber fill-accent-amber/20`).

### Modals & drawers (file)
- None on `/achievements`.
