# Admin Routes UI Inventory (`/admin`, `/admin-entry`)

## /admin

### Page & files
- **Route page**: `app/[locale]/admin/page.tsx` (metadata title `app.adminPageTitle`: `"LemonDBD - Admin Control Center"`, `noindex: true`)
- **Route loading**: `app/[locale]/admin/loading.tsx` -> `components/admin/AdminPanelSkeleton.tsx`
- **Feature barrel**: `features/admin/index.ts`
- **Main client shell & state**:
  - `components/admin/AdminPanelClient.tsx`
  - `components/admin/AdminHeader.tsx`
  - `components/admin/AdminSectionTabs.tsx`
  - `components/admin/AdminToast.tsx`
  - `components/admin/AdminPanelSkeleton.tsx`
  - `components/admin/AdminTabContentSkeleton.tsx`
  - `components/admin/adminTabs.ts`, `components/admin/adminStorage.ts`, `components/admin/adminLinks.ts`
  - `components/admin/useAdminOverview.ts`, `components/admin/useAdminUsers.ts`, `components/admin/useAdminBugReports.ts`, `components/admin/useAdminContentReports.ts`, `components/admin/useUserModeration.ts`
  - `hooks/useAdminSettingsDict.ts`, `locales/en/admin.ts`, `locales/en/adminSettings.ts`, `locales/en/moderation.ts`, `locales/en/scoreboardCheck.ts`
- **Users & Moderation**:
  - `components/admin/AdminUsersSection.tsx`
  - `components/admin/UserStandingBadge.tsx`
  - `components/admin/ReauthFields.tsx`
  - `components/admin/AdminUserFormModal.tsx`
  - `components/admin/AdminUserChallengesModal.tsx`
  - `components/admin/AdminModerationDrawer.tsx`
  - `components/admin/ModerationProfileCard.tsx`
  - `components/admin/SanctionForm.tsx`
  - `components/admin/SanctionHistory.tsx`
  - `components/admin/SanctionHistoryModal.tsx`
  - `components/admin/SanctionPreviewPanel.tsx` (`SanctionPreviewModal`, `SanctionPreviewPanel`, `EmailPreview`)
  - `components/admin/ModerationReasonModal.tsx`
  - `components/moderation/WarningDialog.tsx` (`WarningNoticeBody`), `components/moderation/AccountBlockedNotice.tsx`, `components/moderation/moderationLabels.ts`
- **Reports (Bug & Content)**:
  - `components/admin/AdminReportsSection.tsx`
  - `components/admin/AdminQueue.tsx`
  - `components/admin/BugReportDetail.tsx`
  - `components/admin/ContentReportDetail.tsx`
  - `components/admin/SandboxedContentPreview.tsx`
  - `components/admin/reportLabels.ts`
- **Availability**:
  - `components/admin/AdminAvailabilitySection.tsx`
  - `components/admin/AdminReasonModal.tsx`
- **Audit Log**:
  - `components/admin/AdminAuditSection.tsx`
- **Settings**:
  - `components/admin/AdminSettingsSection.tsx`
  - `components/admin/SettingGroupDrawer.tsx`
  - `components/admin/LocalizedTextControl.tsx`
  - `components/admin/settingsForm.ts`
  - `components/layout/SiteBanner.tsx` (`SiteBannerView`)
- **Tools & Maintenance**:
  - `components/admin/AdminToolsSection.tsx`
  - `components/admin/AdminMaintenanceModeCard.tsx`
  - `components/admin/AdminToolParts.tsx` (`ToolCard`, `ToolRow`, `ToolFormRow`)
  - `components/ScraperConfigModal.tsx`
  - `components/scraper-config/ScraperConfigTabs.tsx`, `ExportTab.tsx`, `ImportTab.tsx`, `PurgeTab.tsx`, `TargetPicker.tsx`, `StatusBanner.tsx`, `scraperTargets.ts`, `useLocalizedTargets.ts`, `useExportTab.ts`, `useImportTab.ts`, `usePurgeTab.ts`, `backupErrors.ts`
  - `components/common/ScoreboardCheckModal.tsx`
  - `components/admin/VectorMapTestModal.tsx`, `components/maps/MapLayoutView.tsx`, `components/maps/MapLandmarks.tsx`, `components/maps/MapLegend.tsx`
- **Shared primitives**:
  - `components/common/Tabs.tsx`, `Popover.tsx`, `MenuItem.tsx`, `ActionMenu.tsx`, `UnreadDot.tsx`, `ConfirmModal.tsx`, `Modal.tsx`, `Toast.tsx`, `AccordionSection.tsx`, `Pagination.tsx`, `DateTimePicker.tsx`, `CustomDropdown.tsx`, `SegmentedControl.tsx`, `Switch.tsx`, `Checkbox.tsx`, `ToggleChip.tsx`, `TileButton.tsx`, `SelectableCard.tsx`, `ImageLinkTile.tsx`, `EmptyState.tsx`, `LoadingState.tsx`, `DbdSpinner.tsx`, `Spinner.tsx`, `Badge.tsx`, `Button.tsx`, `Field.tsx`, `Surface.tsx`, `Table.tsx`, `Tooltip.tsx`, `InfoChip.tsx`
  - `components/UserAvatar.tsx`, `components/LemonIcon.tsx`, `components/icons/DbdIcons.tsx`, `components/layout/ErrorPage.tsx`

### Layout elements

#### 1. Top Navigation Row (`AdminPanelClient.tsx`, `AdminSectionTabs.tsx`, `AdminHeader.tsx`)
- **Screen-reader Heading (`h1.sr-only`)**: `"Admin Control Center"` (`sidebar.adminControlCenter`).
- **Section Tabs (`Tabs` underline, size `lg`, `aria-label`: `"Admin Sections"` / `admin.adminSections`, idBase `admin-sections`)**:
  - `users`: `Users` icon + `"Users"` (`admin.sectionUsers`).
  - `reports`: `FogReportIcon` + `"Reports"` (`admin.sectionReports`) + conditional `UnreadDot` (`label`: `"Waiting for a decision"` / `admin.needsAttention` when `pending.bug_reports + pending.content_reports > 0`) + `ChevronDown` icon (rotates 180° when menu open). Clicking opens/toggles the Reports queue popover menu (`aria-haspopup="menu"`, `aria-expanded`).
  - `availability`: `Power` icon + `"Availability"` (`admin.sectionAvailability`).
  - `audit`: `ScrollText` icon + `"Audit log"` (`admin.auditLog`).
  - `settings`: `Settings2` icon + `"Settings"` (`admin.sectionSettings`).
  - `tools`: `Wrench` icon + `"Tools"` (`admin.sectionTools`).
- **Reports Queue Popover Menu (`Popover`, role `menu`, `ariaLabel`: `"Reports"`)**:
  - Menu item `bugs`: `FogReportIcon` + `"Bug reports"` (`admin.bugReportsLabel`) + conditional `UnreadDot` (`"Waiting for a decision"` when `pending.bug_reports > 0`).
  - Menu item `content`: `Flag` icon + `"Content reports"` (`admin.contentReportsLabel`) + conditional `UnreadDot` (`"Waiting for a decision"` when `pending.content_reports > 0`).
- **Header Refresh Button (`AdminHeader.tsx`)**:
  - `Button` (size `sm`) with `RefreshCw` left icon, text `"Refresh"` (`admin.refresh`), tooltip `"Reload the open section"` (`admin.refreshTitle`).
- **Global Admin Toast (`AdminToast.tsx` -> `Toast.tsx`)**:
  - Pinned top-right (`fixed top-5 right-5`, `output` with `aria-live="polite"`).
  - Success variant (`tone="green"`): `CheckCircle2` icon + `message.text`.
  - Error variant (`tone="red"`): `CircleAlert` icon + `message.text`.
  - Dismiss button: `X` icon button (`aria-label`: `"Close"` / `admin.close`).

---

#### 2. Tab: `users` (`AdminUsersSection.tsx`)
- **Filter & Action Toolbar**:
  - **Search input (`SearchInput`)**: placeholder & `aria-label` `"Search username / email..."` (`admin.searchUserPlaceholder`).
  - **Role Filter Dropdown (`CustomDropdown<UserRoleFilter>`, `ariaLabel`: `"Role"` / `admin.thRole`)**:
    - `all`: `"All roles ({count})"` (`admin.roleFilterAll`, count from `overview.users.total` or `'–'`).
    - `admin`: `"Admins ({count})"` (`admin.roleFilterAdmins`, count from `overview.users.admins`).
    - `user`: `"Players ({count})"` (`admin.roleFilterPlayers`, count from `overview.users.players`).
  - **Standing Filter Dropdown (`CustomDropdown<UserStandingFilter>`, `ariaLabel`: `"Standing"` / `admin.thStanding`)**:
    - `all`: `"Any standing"` (`admin.standingFilterAll`).
    - `active`: `"Active ({count})"` (`admin.standingFilterActive`, count from `overview.users.active`).
    - `suspended`: `"Suspended ({count})"` (`admin.standingFilterSuspended`, count from `overview.users.suspended`).
    - `banned`: `"Banned ({count})"` (`admin.standingFilterBanned`, count from `overview.users.banned`).
  - **Create User Button**: primary `Button` (size `sm`), `UserPlus` left icon, label `"Create User"` (`admin.createUser`). Triggers `AdminUserFormModal` in `'new'` mode.
- **User Directory List / Table**:
  - **Responsive layouts**:
    - Mobile (`sm:hidden`): `ul` of cards per account showing identity + role badge on top row, status badges + action buttons on bottom row.
    - Desktop (`hidden sm:block`): `Table` with columns:
      - `Th`: `"User"` (`admin.thUser`)
      - `Th`: `"Role"` (`admin.thRole`)
      - `Th`: `"Standing"` (`admin.thStanding`)
      - `Th` (`lg:table-cell`, right-aligned): `"Characters"` (`admin.thCharacters`)
      - `Th` (`lg:table-cell`, right-aligned): `"Perks"` (`admin.thPerks`)
      - `Th` (`xl:table-cell`): `"Joined"` (`admin.thJoined`)
      - `Th` (right-aligned, `sr-only`): `"Actions"` (`admin.thActions`)
  - **Row / Card cells**:
    - **Identity**: `UserAvatar` (size `sm`, fallback `LemonIcon`), `u.username` (bold), `@{u.login}` (muted caption), conditional `"You"` (`admin.you`) amber `Badge` when `u.id === currentUserId`, `u.email` (muted caption).
    - **Role Badge**:
      - Admin (`u.role === 'admin'`): red square `Badge` with `CrownIcon` + `"Admin"` (`admin.roleAdmin`).
      - Player (`u.role !== 'admin'`): neutral square `Badge` + `"Player"` (`admin.rolePlayer`).
    - **Standing & Status Badges**:
      - `UserStandingBadge` (`UserStandingBadge.tsx`):
        - Active: green plain `Badge` with `CheckCircle2` icon + `"Active"` (`stats.active`).
        - Suspended: amber plain `Badge` with `Clock` icon + `"Suspended until {date}"` (`moderation.admin.badgeSuspended`).
        - Banned: red plain `Badge` with `XCircle` icon + `"Banned"` (`moderation.admin.badgeBanned`).
      - Conditional 2FA Badge (`u.two_factor_enabled`): green plain `Badge` with `ShieldCheck` icon + `"2FA"` (`admin.twoFactorBadge`), tooltip `"Two-factor authentication is on"` (`admin.twoFactorOn`).
      - Conditional Unverified Badge (`u.is_verified === false`): amber plain `Badge` + `"Unverified"` (`admin.unverifiedBadge`), tooltip `"The email address has not been verified yet"` (`admin.unverifiedTip`).
    - **Counts & Date (desktop table)**: `u.owned_characters_count ?? 0`, `u.unlocked_perks_count ?? 0`, formatted `u.created_at`.
    - **Row Actions**:
      - **Moderation Button** (shown only when `u.role !== 'admin' && u.id !== currentUserId`): icon `Button` (size `sm`) with `Gavel` icon, `aria-label` & tooltip `"Moderation"` (`moderation.admin.openButton`). Opens `AdminModerationDrawer`.
      - **More Actions Menu (`ActionMenu`)**: trigger button (`Ellipsis` icon, `aria-label`: `"More actions for {username}"` / `admin.userActions`). Popover menu (`role="menu"`) items:
        - `edit`: `Pencil` icon + `"Edit user"` (`admin.editUser`) -> opens `AdminUserFormModal` for `u`.
        - `challenges`: `TargetIcon` + `"Reset challenges"` (`admin.resetChallenges`) -> opens `AdminUserChallengesModal` for `u`.
        - `2fa` (only when `u.two_factor_enabled && !isSelf(u)`): `ShieldOff` icon + `"Reset two-factor authentication"` (`admin.resetTwoFactor`) -> opens 2FA reset `ConfirmModal`.
        - `download`: `Download` icon + `"Download user data"` (`admin.downloadUserData`) -> downloads JSON copy via `downloadAccountData(u.id)`.
        - `delete` (only when `!isSelf(u) && u.role !== 'admin'`, `danger: true`): `Trash2` icon + `"Delete user"` (`admin.deleteUser`) -> opens delete user `ConfirmModal`.
- **Pagination (`Pagination.tsx`, variant `embeddedCompact`, shown when `total > 0`)**:
  - Per-page `CustomDropdown` (`ariaLabel`: `"Per page"` / `pagination.perPage`, options `15`, `30`, `45`, `60`, default `15`), range indicator `{start}-{end} / {total}` (`aria-label`: `"Showing {start}-{end} of {total} perks"`), previous page button (`ChevronLeft`, `aria-label`: `"Previous Page"`), page number `Input` (`aria-label`: `"Go to"` / `pagination.goTo`) + `/ {totalPages}`, next page button (`ChevronRight`, `aria-label`: `"Next Page"`).

---

#### 3. Tab: `reports` (`AdminReportsSection.tsx`, `AdminQueue.tsx`, `BugReportDetail.tsx`, `ContentReportDetail.tsx`, `SandboxedContentPreview.tsx`)
- **Shared Queue Layout (`AdminQueue.tsx`)**:
  - 2-column responsive grid (`lg:grid-cols-12`: 5 cols left list accordion, 7 cols right case detail accordion).
  - **Left Accordion (`AccordionSection`)**:
    - Title: `"Bug reports"` (`admin.bugReportsLabel`) or `"Content reports"` (`admin.contentReportsLabel`), collapsible with `ChevronDown` icon.
    - **Status Filter Tabs (`Tabs`, boxed, size `sm`, `ariaLabel`: `"Filter by status"` / `admin.filterByStatus`)**:
      - First tab: `"All"` (`admin.statusAll`) with count `stats?.total`.
      - Queue-specific status tabs with counts `stats?.[s]`.
    - **Search Input (`SearchInput`, bug reports queue only)**: placeholder & `aria-label` `"Search reports"` (`admin.searchTicketsPlaceholder`).
    - **Selectable Item List**: scrollable list (`max-h-list`) of `SelectableCard` items.
    - **Pagination (`Pagination`, variant `embedded`, shown when `total > 15`)**: range `{start}-{end} / {total}`, `ChevronsLeft` (`"First Page"`), `ChevronLeft` (`"Previous Page"`), page number input + `/ {totalPages}`, `ChevronRight` (`"Next Page"`), `ChevronsRight` (`"Last Page"`).
  - **Right Accordion (`AccordionSection`)**:
    - Title: `"Case"` (`admin.queueCaseTitle`), collapsible with `ChevronDown` icon.
    - Displays selected report detail component, or `EmptyState` (`Inbox` icon, `"Select a report to see it here."` / `admin.queueSelectPrompt`) when none selected.

- **Queue 1: Bug Reports (`queue === 'bugs'`)**:
  - **Status Tabs (`BUG_STATUSES`)**:
    - `all`: `"All"` (`admin.statusAll`)
    - `pending`: `"Pending"` (`admin.statusPending`, badge tone `red`)
    - `in_progress`: `"In progress"` (`admin.statusInProgress`, badge tone `amber`)
    - `resolved`: `"Resolved"` (`admin.statusResolved`, badge tone `green`)
    - `rejected`: `"Rejected"` (`admin.statusRejected`, badge tone `neutral`)
  - **Queue List Card (`renderItem`)**:
    - `report.title` (bold truncate) + status `Badge` (size `xs`).
    - `report.message` (2-line clamp caption).
    - Footer: `#{report.id} {report.reporter_name}`, conditional `ImageIcon` + `report.images.length` count, formatted `report.created_at`.
  - **Bug Report Case Detail (`BugReportDetail.tsx`)**:
    - **Header**: `#{report.id}` caption, `h3` `report.title`, status `CustomDropdown<BugReportStatus>` (`ariaLabel`: `"Update ticket status"` / `admin.updateStatus`, options: Pending, In progress, Resolved, Rejected), danger icon `Button` (`Trash2` icon, `aria-label` & tooltip: `"Delete bug report?"` / `admin.deleteBugReportTitle` -> opens delete `ConfirmModal`).
    - **Metadata Grid (`dl`)**:
      - `"Reported by"` (`admin.reportedBy`): `report.reporter_name` + either `UserSearch` ghost icon `Button` (`aria-label` & tooltip `"Show in Users"` / `admin.showInUsers`, switches to `users` tab filtered by `id:{user_id}`) if `report.user_id` exists, OR neutral `Badge` `"Guest"` (`admin.guestReporter`).
      - `"Email"` (`admin.thEmail`): `report.reporter_email` or `"No email provided"` (`admin.noEmailProvided`).
      - `"Submitted"` (`admin.submittedAt`): formatted `report.created_at`.
      - `"Last updated"` (`admin.updatedAt`, conditional on `report.updated_at`): formatted `report.updated_at`.
    - **Description Section**: heading `h4` `"Description"` (`admin.description`) + `report.message` (pre-wrapped text).
    - **Attachments Section (conditional on `report.images.length > 0`)**:
      - Heading `h4`: `"{count, plural, one {# attachment} other {# attachments}}"` (`admin.attachmentsCount`).
      - Grid of `ImageLinkTile` links (`target="_blank"`, `aria-label`: `"Attachment {index}"` / `admin.attachmentLabel`, thumbnail `Img` + `ExternalLink` hover icon) or plain `code` text if non-upload URL.
    - **Developer Reply Section**:
      - `FieldLabel`: `"Reply to the reporter"` (`admin.devFeedbackLabel`).
      - `Textarea`: placeholder `"Write a reply the reporter will see on their profile"` (`admin.devFeedbackPlaceholder`), prefilled with `report.admin_notes`.
      - Submit `Button` (primary, size `sm`, `Send` left icon, disabled when unchanged): `"Send reply"` (`admin.devFeedbackSubmit`).

- **Queue 2: Content Reports (`queue === 'content'`)**:
  - **Status Tabs (`CONTENT_STATUSES`)**:
    - `all`: `"All"` (`admin.statusAll`)
    - `pending`: `"Pending"` (`admin.contentStatusPending`, badge tone `amber`)
    - `resolved_banned`: `"Banned"` (`admin.contentStatusBanned`, badge tone `red`)
    - `dismissed`: `"Dismissed"` (`admin.contentStatusDismissed`, badge tone `green`)
    - `expired`: `"Expired"` (`admin.contentStatusExpired`, badge tone `neutral`)
  - **Content Type Labels (`reportLabels.ts`)**:
    - `tier_list`: `"Tier list"` (`admin.contentTypeTierList`)
    - `smash_roster`: `"Smash or Pass roster"` (`admin.contentTypeSmashRoster`)
    - `minigame`: `"Minigame"` (`admin.contentTypeMinigame`)
  - **Report Reason Labels (`reportLabels.ts`)**:
    - `hate_speech`: `"Hate speech"` (`admin.contentReasonHate`)
    - `harassment`: `"Harassment"` (`admin.contentReasonHarassment`)
    - `explicit`: `"Explicit content"` (`admin.contentReasonExplicit`)
    - `illegal`: `"Illegal content"` (`admin.contentReasonIllegal`)
    - `spam`: `"Spam"` (`admin.contentReasonSpam`)
    - `other`: `"Other"` (`admin.contentReasonOther`)
  - **Queue List Card (`renderItem`)**:
    - Content type label (bold) + status `Badge` (size `xs`).
    - Primary reason label + conditional `"{count, plural, one {(# report)} other {(# reports)}}"` (`admin.contentReportTimes`) when `report_count > 1`.
    - Footer: `#{report.id}` + formatted `report.created_at`.
  - **Content Report Case Detail (`ContentReportDetail.tsx`)**:
    - **Header Row**: `h3` `#{detail.id}`, content type `Badge` (neutral), status `Badge`, `"Reports:"` (`admin.contentReportCountLabel`) + `detail.report_count`.
    - **Metadata Grid (`dl`)**:
      - `"Author"` (`admin.contentReportAuthor`): `detail.author_login` (if `detail.attributed`) + `UserSearch` ghost icon `Button` (`aria-label` & tooltip `"Show in Users"` / `admin.showInUsers`), OR `"Unknown"` (`admin.contentReportUnattributedShort`).
      - `"Content ID"` (`admin.contentReportHash`): `code` `{detail.content_hash}`.
      - `"First reported"` (`admin.contentReportCreated`): formatted `detail.created_at`.
      - `"Evidence expires"` (`admin.contentReportExpires`, when pending) OR `"Resolved"` (`admin.contentReportResolvedAt`, when not pending): formatted `detail.expires_at` / `detail.resolved_at`.
    - **Author Standing Callouts (conditional)**:
      - Unattributed (`!detail.attributed`): amber alert box with `ShieldAlert` icon + `"This copy carried no valid author stamp, so no account can be linked to it. You can ban the content, but there is no author to deactivate."` (`admin.contentReportUnattributed`).
      - Author banned (`standing === 'banned'`): `"The author's account is already deactivated."` (`admin.contentReportAuthorInactive`).
      - Author suspended (`standing === 'suspended'`): `"The author is suspended at the moment. You can still warn them, suspend them for longer or ban them."` (`admin.contentReportAuthorSuspended`).
      - Author is admin (`detail.author_is_admin`): `"The author is an admin, so their account cannot be deactivated here."` (`admin.contentReportAuthorIsAdmin`).
    - **Reasons Breakdown**: label `"Reasons given"` (`admin.contentReportReasons`) + red plain `Badge` chips `"{Reason} × {count}"`.
    - **Reporter Notes (conditional on `reporterNotes.length > 0`)**: label `"Notes from reporters"` (`admin.contentReportReporterNotes`) + scrollable list (`ul`) of `"{Reason}: {notes}"`.
    - **Evidence Section (`SandboxedContentPreview.tsx`)**:
      - Label: `"Reported content"` (`admin.contentReportEvidence`).
      - When `detail.evidence_payload` is null: `"The evidence was wiped when the report was resolved or expired. Nothing of the content is kept."` (`admin.contentReportEvidenceWiped`).
      - When unreadable: `"This content could not be read."` (`admin.contentReportUnreadable`).
      - When readable (`SandboxedContentPreview`):
        - Optional `h4` `preview.title` and `p` `preview.description`.
        - Extracted strings list (when `preview.texts.length > 0`): label `"Text in the content ({count})"` (`admin.contentReportTextCount`) + scrollable `ul` of plain text strings.
        - Conditional truncation warning (`preview.truncated`): `"The content is larger than this preview; the raw view shows the start of it."` (`admin.contentReportTruncated`).
        - Toggle Images `Button` (size `xs`, `aria-pressed`, shown when `preview.images.length > 0`): `Eye` icon + `"Load images ({count})"` (`admin.contentReportShowImages`) when hidden; `EyeOff` icon + `"Hide images"` (`admin.contentReportHideImages`) when shown.
        - Toggle Raw JSON `Button` (size `xs`, `aria-expanded`): `FileJson` icon + `"Show raw data"` (`admin.contentReportShowRaw`) / `"Hide raw data"` (`admin.contentReportHideRaw`).
        - Expanded Image Grid (when `showImages` is true): 3/4-col grid of safe `Img` thumbnails + conditional blocked notice `"{count} images were not loaded because their address is not a safe image source."` (`admin.contentReportImagesBlocked`).
        - Expanded Raw Data (when `showRaw` is true): scrollable `pre` block (up to 20,000 chars of formatted JSON).
    - **Resolution Controls (when `detail.status === 'pending'`)**:
      - Admin notes `Textarea` (`maxLength={500}`, `aria-label`: `"Admin notes (kept in the audit log)"` / `admin.contentReportNotesLabel`, placeholder: `"Why this decision? (optional)"` / `admin.contentReportNotesPlaceholder`).
      - **Author Consequence Box (shown when `canActOnAuthor`: attributed, not banned, not admin)**:
        - `FieldLabel`: `"What happens to the author's account"` (`moderation.admin.authorActionLabel`).
        - `CustomDropdown<SanctionKind | 'none'>`:
          - `none`: `"Nothing"` (`moderation.admin.authorActionNone`)
          - `warning`: `"Warn the author"` (`moderation.admin.authorActionWarning`)
          - `suspension`: `"Suspend the author"` (`moderation.admin.authorActionSuspension`)
          - `ban`: `"Ban the author"` (`moderation.admin.authorActionBan`)
        - Hint text: `"The author gets one email covering the blocked content and this decision. The report's category is used as the reason."` (`moderation.admin.authorActionHint`).
        - Conditional embedded `SanctionForm` (when `authorKind !== 'none'`, `showReason={false}`, `showInternal={false}`):
          - When `authorKind === 'suspension'`: `"Duration (days) *"` (`moderation.admin.formDuration`) number `Input` (`1`–`365`, suffix `"days"` / `moderation.admin.formDurationUnit`, hint `"1–365"`).
          - `"Rule it breaks"` (`moderation.admin.formRule`) `CustomDropdown` (placeholder `"Select rule"` / `moderation.admin.formRulePlaceholder`, options `"Section 1: Don't be the Entity"` through `"Section 7: What happens if you break them"`).
          - `"What happened *"` (`moderation.admin.formFacts`) required `Textarea` (`maxLength={2000}`, hint `"The user reads this as written. The reported content itself is deleted, so describe what happened."` / `moderation.admin.formFactsRequired`).
      - **Action Buttons**:
        - `"Ban content"` (`admin.contentReportBanAction`): primary `Button` (size `sm`, `Ban` icon or `UserX` icon when `authorDecision` is set) -> opens ban confirmation `ConfirmModal`.
        - `"Dismiss report"` (`admin.contentReportDismissAction`): secondary `Button` (size `sm`, `CheckCircle2` icon) -> resolves report as `'dismiss'`.
        - `"Preview"` (`moderation.admin.previewTitle`, shown when `authorDecision` is set): `Button` (size `sm`) -> opens `SanctionPreviewModal`.
    - **Resolved Notes View (when `detail.status !== 'pending'` and `detail.admin_notes` exists)**:
      - Heading `"Admin notes (kept in the audit log)"` (`admin.contentReportNotesLabel`) + `detail.admin_notes` text.

---

#### 4. Tab: `availability` (`AdminAvailabilitySection.tsx`)
- **Section 1: Challenge Modes Accordion (`AccordionSection`, title `"Challenge modes"` / `admin.challengeModesTitle`, persistent drawer key `lemondbd_admin_availability_modes_open`)**:
  - Subtitle: `"Switch a mode off to pause it for everyone. Players see the reason you give."` (`admin.challengeModesSubtitle`).
  - 2-column grid (`ul`) of challenge modes (`ChallengeModeSetting`):
    - `gauntlet`: `"Gauntlet"` (`streaks.gauntlet`)
    - `chaos`: `"Chaos Streak"` (`streaks.chaosStreak`)
    - `history`: `"History Streak"` (`streaks.historyStreak`)
    - `page_streak`: `"Page streak"` (`streaks.pageStreak`)
    - `id_please`: `"ID, Please"` (`streaks.idPleaseTitle`)
    - `id_please_survivor`: `"ID, Please (Survivor)"` (`streaks.idPleaseSurvivorTitle`)
    - `id_please_killer`: `"ID, Please (Killer)"` (`streaks.idPleaseKillerTitle`)
  - Each row shows: mode title, conditional red caption (`setting.disabled_reason` or `"Disabled"` / `admin.disabledLabel` when `!setting.is_enabled`), and `Switch` (`ariaLabel`: mode title). Turning off opens `AdminReasonModal`; turning on enables immediately.
- **Section 2: Characters and Perks Roster Accordion (`AccordionSection`, title `"Characters and perks"` / `admin.rosterTitle`, persistent drawer key `lemondbd_admin_availability_roster_open`)**:
  - Subtitle: `"Select a tile to keep it out of new challenge pools, or to bring it back."` (`admin.rosterSubtitle`).
  - **Filter Bar**:
    - **Kind Segmented Control (`SegmentedControl<Kind>`, `ariaLabel`: `"Characters and perks"`)**:
      - `characters`: `MaskIcon` + `"Characters"` (`admin.characters`)
      - `perks`: `PerkHexIcon` + `"Perks"` (`admin.perks`)
    - **Role Segmented Control (`SegmentedControl<Role>`, `ariaLabel`: `"Role"`)**:
      - `Survivor`: `"Survivor"` (`admin.roleSurvivor`, green active fill)
      - `Killer`: `"Killer"` (`admin.roleKiller`)
    - **Disabled-Only Toggle Chip (`ToggleChip`)**: `Ban` icon + `"Disabled only ({count})"` (`admin.disabledOnly`).
    - **Search Input (`SearchInput`)**: placeholder & `aria-label` `"Search by name"` (`admin.searchGenericPlaceholder`).
  - **Tile Grid (`ul`, responsive 3 / 5 / 8 / 10 columns, `max-h-roster` scrollable)**:
    - Each item is a `TileButton` (`aria-pressed={!item.is_disabled}`, `aria-label`: `item.disabled_reason ? "{name}: {reason}" : item.name`).
    - Square thumbnail box: `Img` portrait/icon (or fallback `PersonIcon` / `PerkHexIcon`), dimmed & grayscale when `item.is_disabled`, with red bottom banner `"Disabled"` (`admin.disabledLabel`) when disabled.
    - Item name below tile (red text when disabled, secondary text when enabled).
    - Clicking an enabled tile opens `AdminReasonModal`; clicking a disabled tile re-enables immediately.

---

#### 5. Tab: `audit` (`AdminAuditSection.tsx`)
- **Filter Toolbar**:
  - **Category Dropdown (`CustomDropdown<Category>`, `ariaLabel`: `"Show actions about"` / `admin.auditFilterLabel`)**:
    - `all`: `"Everything"` (`admin.auditCategoryAll`)
    - `users`: `"Users and moderation"` (`admin.auditCategoryUsers` -> targets `user`)
    - `reports`: `"Reports"` (`admin.auditCategoryReports` -> targets `bug_report,content`)
    - `availability`: `"Availability"` (`admin.auditCategoryAvailability` -> targets `challenge_mode,character,perk`)
    - `publishing`: `"Published content"` (`admin.auditCategoryPublishing` -> targets `tier_list,roster,changelog_post,minigame_challenge`)
    - `system`: `"Settings and maintenance"` (`admin.auditCategorySystem` -> targets `site_settings,maintenance,maintenance_mode,database`)
- **Audit Log Table (`Table`)**:
  - **Columns (`TableHead`)**:
    - `Th`: `"When"` (`admin.thWhen`)
    - `Th`: `"Action"` (`admin.thAction`)
    - `Th` (`hidden sm:table-cell`): `"Target"` (`admin.thTarget`)
    - `Th` (`hidden md:table-cell`): `"Details"` (`admin.thDetails`)
    - `Th`: `"Admin"` (`admin.thAdmin`)
  - **Row Cells (`TableBody`)**:
    - **When**: formatted timestamp (`dateStyle: 'medium', timeStyle: 'short'`).
    - **Action**: colored action label (red for destructive/disable/ban/purge actions, green for enable/restore/revoke/dismiss, amber for `user_warned`, primary for others) + mobile-only target subtitle (`sm:hidden`).
      - Translated action labels (`ACTION_LABEL_KEYS` in `locales/en/admin.ts`):
        - `bug_report_deleted`: `"Bug report deleted"`
        - `bug_report_updated`: `"Bug report updated"`
        - `challenge_mode_disabled`: `"Challenge mode disabled"`
        - `challenge_mode_enabled`: `"Challenge mode enabled"`
        - `character_disabled`: `"Character disabled"`
        - `character_enabled`: `"Character enabled"`
        - `content_ban`: `"Content banned"`
        - `content_dismiss`: `"Content report dismissed"`
        - `perk_disabled`: `"Perk disabled"`
        - `perk_enabled`: `"Perk enabled"`
        - `site_settings_updated`: `"Site settings updated"`
        - `maintenance_run`: `"Maintenance job run"`
        - `maintenance_mode_updated`: `"Maintenance mode changed"`
        - `user_data_exported`: `"User data exported"`
        - `user_warned`: `"User warned"`
        - `user_suspended`: `"User suspended"`
        - `user_banned`: `"User banned"`
        - `sanction_revoked`: `"Decision revoked"`
        - `account_restored`: `"Account restored"`
        - `user_deleted`: `"User deleted"`
        - `user_created`: `"User created"`
        - `database_exported`: `"Database exported"`
        - `database_imported`: `"Database imported"`
        - `database_purged`: `"Database tables purged"`
        - `user_two_factor_reset`: `"Two-factor reset"`
        - `user_challenge_reset`: `"Challenge progress reset"`
        - `user_updated`: `"User updated"`
        - `tier_list.create`: `"Tier list published"`, `tier_list.update`: `"Tier list updated"`, `tier_list.delete`: `"Tier list deleted"`
        - `smash_roster.create`: `"Roster published"`, `smash_roster.update`: `"Roster updated"`, `smash_roster.delete`: `"Roster deleted"`
        - `changelog.create`: `"Changelog post published"`, `changelog.update`: `"Changelog post updated"`, `changelog.reorder`: `"Changelog reordered"`, `changelog.delete`: `"Changelog post deleted"`, `changelog.announce`: `"Changelog post announced on Discord"`, `changelog.announce_update`: `"Discord announcement updated"`, `changelog.announce_remove`: `"Discord announcement removed"`
        - `minigame_challenge.delete`: `"Minigame challenge deleted"`
    - **Target**: translated target type + optional `#{target_id}` (`"User"`, `"Bug report"`, `"Content report"`, `"Challenge mode"`, `"Character"`, `"Perk"`, `"Tier list"`, `"Smash or Pass roster"`, `"Changelog post"`, `"Minigame challenge"`, `"Settings"`, `"Maintenance job"`, `"Maintenance mode"`, `"Database"`, or `'–'`).
    - **Details**: extracted reason, `admin_notes`, `name`, `title`, `username`, changed setting labels (`config_<key>`), or `status` (with tooltip on hover), or `'–'`.
    - **Admin**: `log.admin_username` or `#{log.admin_user_id ?? '?'}`.
- **Pagination (`Pagination`, variant `embeddedCompact`, default page size `30` / `DENSE_PAGE_SIZE`, shown when `total > 0`)**.

---

#### 6. Tab: `settings` (`AdminSettingsSection.tsx`, `SettingGroupDrawer.tsx`, `LocalizedTextControl.tsx`, `settingsForm.ts`)
- **10 Collapsible Setting Group Accordions (`SettingGroupDrawer` -> `AccordionSection`, ordered by `SETTING_GROUP_ORDER`)**:
  - Each group header displays: group icon + title (`configGroup_<group>`), optional amber `Badge` `"Unsaved changes ({count})"` (`adminSettings.configUnsaved`) when group has dirty fields, and `ChevronDown` icon.
  - Below header: centered group description (`configGroupDesc_<group>`).
  - Each setting row displays:
    - Left column: setting label (`config_<key>`), conditional status `Badge` (`"Modified"` / `configModified` in amber when dirty, or `"Custom"` / `configCustom` in neutral when overridden from default), conditional `"Security"` (`configSecuritySwitch`) red `Badge` when `row.risky_when !== null`, and description (`config_<key>_desc`).
    - Right column:
      - Per-field reset icon `Button` (`RotateCcw` icon, `aria-label` & tooltip `"Use default"` / `configResetDefault`, visible when non-bool/non-secret/non-translated/non-locked field differs from default).
      - Setting control (by `row.kind` / key):
        - `bool`: state text `"On"` (`configOn`) / `"Off"` (`configOff`) + `Switch`.
        - `choice`: `Select` dropdown with translated choices (`configChoice_<choice>`).
        - `datetime`: `Input` (`type="datetime-local"`) + conditional `"No end time"` (`configClearTime`) link button when value is set.
        - `secret`: status `Badge` (`"Set by an admin"` / `configSecretSet` in green when `overridden`, `"Using the server’s own value"` / `configSecretServer` in neutral when `env_set`, `"Not set"` / `configSecretNone` otherwise) + password `Input` (placeholder `"Paste a new address to replace it"` / `configSecretPlaceholder`) + conditional `"Remove"` (`configSecretRemove`) danger link button when `overridden`.
        - `TRANSLATED_TEXT_KEYS` (`site_banner_text`, `donation_message`): `LocalizedTextControl` containing a language `CustomDropdown` (`EN` English, `PL` Polski, `ES` Español, `DE` Deutsch, `JA` 日本語, with a green dot icon on languages that have non-empty text) + text `Input` + character counter `{length}/{max_length}`.
        - `text` / `url` / `email`: `Input` (with placeholder from default or `"https://"` / `configLinkPlaceholder` for URLs) + character counter `{length}/{max_length}` for `text`.
        - `int` (number): number `Input` (`w-28`) with optional unit suffix inside right edge (`"h"`, `"min"`, `"d"`, `"s"`, `"MB"`, `"/min"`).
      - Validation error (`p[role="alert"]`, red): `"Enter a whole number."` (`configInvalidNumber`), `"Must be between {min} and {max}."` (`configInvalidRange`), `"Enter a link that starts with https://."` (`configInvalidLink`), or `"At most {max} characters."` (`configInvalidLength`).
      - Default value caption (for `bool`, `choice`, `int`, `datetime` with non-empty default): `"Default: {value}"` (`configDefaultValue`).

  - **All 10 Groups & Their Settings (`locales/en/adminSettings.ts`)**:
    1. **`notices` — `"Site notice"`** (`Megaphone` icon) — `"A banner under the top of every page, for outages and planned maintenance. Plain text only."`
       - **Live Banner Preview** (shown when `site_banner_text` draft is non-empty): label `"Preview"` (`configBannerPreview`) + `SiteBannerView` rendering the current level (`Info` / `TriangleAlert` / `OctagonAlert` icon) and text.
       - `site_banner_enabled` (`bool`): `"Show the banner"` — `"Display the notice on every page for all visitors. Write the English text first."`
       - `site_banner_level` (`choice`: `"Info"`, `"Warning"`, `"Critical"`): `"Banner level"` — `"Info and warning can be dismissed by visitors; critical stays on screen."`
       - `site_banner_until` (`datetime`): `"Hide automatically at"` — `"Optional end time in your local time. Empty keeps the banner until you switch it off."`
       - `site_banner_text` (`LocalizedTextControl`, `text` across `en`/`pl`/`es`/`de`/`ja`): `"Banner text (English)"` — `"One line of plain text. Pick a language; empty falls back to English."`
    2. **`access` — `"Access & switches"`** (`DoorOpen` icon) — `"Who can join and which features are open. Flip these during a spam wave or an outage."`
       - `registration_open` (`bool`): `"New accounts"` — `"Let visitors create an account (form and first Google sign-in). Admins can always create accounts here."`
       - `email_verification_required` (`bool`, security switch): `"Require e-mail confirmation"` — `"Accounts must confirm their e-mail with a code before signing in. Turn off only while mail delivery is down."`
       - `altcha_enforced` (`bool`, security switch): `"Require the security check (ALTCHA)"` — `"Sign-up, sign-in, password reset and guest bug reports need a solved check. Turn off only if it is broken."`
       - `google_sign_in_enabled` (`bool`): `"Google sign-in"` — `"Show the Google sign-in button. Needs a Google client ID on the server."`
       - `content_reports_open` (`bool`): `"Content reports"` — `"Let signed-in users report tier lists, rosters and minigames. When off, reporting answers that it is paused."`
       - `scoreboard_ocr_enabled` (`bool`, locked/frozen in `LOCKED_SETTING_KEYS`, `opacity-50`): `"Scoreboard screenshot check"` — `"Let users check a match screenshot. Switch off if the server struggles with image processing."`
    3. **`links` — `"Links"`** (`Link2` icon) — `"Where visitors are sent for support and chat. Only https links; leave a link empty to hide it."`
       - `discord_invite_url` (`url`): `"Discord invite"` — `"Shown on the About us and Rules pages. Discord addresses only; empty hides it."`
       - `donation_bmc_url` (`url`): `"Buy Me a Coffee link"` — `"Empty hides this option in the support window."`
       - `donation_kofi_url` (`url`): `"Ko-fi link"` — `"Empty hides this option in the support window."`
       - `donation_message` (`LocalizedTextControl`, `text` across `en`/`pl`/`es`/`de`/`ja`): `"Support window message"` — `"Text above the support options. Pick a language; empty falls back to English, then to the built-in message."`
    4. **`limits` — `"Abuse limits"`** (`Gauge` icon) — `"Request limits and brute-force protection. Tighten them during an attack; every value has a safe minimum and maximum."`
       - `rate_auth_per_minute` (`int`, `/min`): `"Sign-in & sign-up requests"` — `"Requests per minute from one address to sign in, sign up or sign in with Google. Lower it during an attack."`
       - `rate_recovery_per_minute` (`int`, `/min`): `"Password-reset requests"` — `"Requests per minute from one address for password reset and e-mail confirmation. Lower it during an attack."`
       - `rate_two_factor_per_minute` (`int`, `/min`): `"Two-factor requests"` — `"Requests per minute from one address to the two-factor endpoints. Lower it during an attack."`
       - `rate_bug_report_per_minute` (`int`, `/min`): `"Bug report requests"` — `"Requests per minute from one address to send a bug report. Lower it during an attack."`
       - `rate_content_report_per_minute` (`int`, `/min`): `"Content report requests"` — `"Requests per minute from one address to report content (60 per hour at most). Lower it during an attack."`
       - `rate_scoreboard_per_minute` (`int`, `/min`, locked in `LOCKED_SETTING_KEYS`): `"Screenshot check requests"` — `"Requests per minute from one address to check a screenshot. Lower it during an attack."`
       - `two_factor_max_attempts` (`int`): `"Wrong 2FA codes before a lock"` — `"After this many wrong codes the account's second factor is locked."`
       - `two_factor_lockout_minutes` (`int`, `min`): `"2FA lock length"` — `"How long the second factor stays locked after too many wrong codes."`
       - `verification_max_attempts` (`int`): `"Wrong e-mail codes before a new one is needed"` — `"After this many wrong confirmation codes the code is cancelled and a new one must be requested."`
       - `resend_cooldown_seconds` (`int`, `s`): `"Wait before a new code or reset e-mail"` — `"How long a person must wait before asking for another confirmation code or reset e-mail."`
       - `password_min_length` (`int`): `"Minimum password length"` — `"For new accounts and password resets. Existing passwords keep working."`
       - `scoreboard_upload_max_mb` (`int`, `MB`, locked in `LOCKED_SETTING_KEYS`): `"Screenshot upload limit"` — `"Largest screenshot the check accepts. Cannot be raised above 8 MB."`
       - `smash_image_max_mb` (`int`, `MB`): `"Imported image limit"` — `"Largest picture the Smash or Pass image import downloads. Cannot be raised above 5 MB."`
       - `sanction_email_attempts` (`int`): `"Moderation e-mail attempts"` — `"How often a failed moderation e-mail is retried before it is given up. At most 5."`
    5. **`tokens` — `"Sign-in & email codes"`** (`KeyRound` icon) — `"How long sign-in sessions, verification codes and reset links stay valid."`
       - `verification_code_hours` (`int`, `h`): `"Email verification code lifetime"` — `"How long a verification code stays valid."`
       - `reset_token_minutes` (`int`, `min`): `"Password reset link lifetime"` — `"How long a password reset link stays valid."`
       - `session_hours` (`int`, `h`): `"Login session length"` — `"After this, users must sign in again. Applies to new sign-ins."`
    6. **`integrations` — `"Integrations"`** (`Plug` icon) — `"Webhook addresses are secrets: they are stored encrypted and never shown again. Paste a new one to replace it."`
       - `discord_webhook_url` (`secret`): `"Bug report webhook"` — `"Discord webhook for new bug reports. Empty uses the server value. Test it under Tools."`
       - `discord_changelog_webhook_url` (`secret`): `"What’s New webhook"` — `"Discord webhook for published What is New entries. Empty uses the server value."`
    7. **`moderation` — `"Moderation"`** (`Scale` icon) — `"Thresholds behind the escalation suggestion in the moderation drawer. A person always makes the decision."`
       - `warning_lifetime_days` (`int`, `d`): `"Warning lifetime"` — `"How long a warning counts towards escalation. Applies to running warnings too."`
       - `warnings_before_suspension` (`int`): `"Warnings before a suspension"` — `"Active warnings after which the moderation drawer suggests a suspension instead of another warning."`
       - `suspension_first_days` (`int`, `d`): `"First suspension"` — `"Suggested length of the first suspension."`
       - `suspension_second_days` (`int`, `d`): `"Second suspension"` — `"Suggested length of the second suspension; after that a permanent ban is suggested."`
    8. **`bug_reports` — `"Bug reports"`** (`FogReportIcon`) — `"Who can report bugs and where the team hears about them."`
       - `guest_bug_reports` (`bool`): `"Bug reports from guests"` — `"Let signed-out visitors send bug reports. When off, they are asked to sign in first."`
       - `bug_report_discord` (`bool`): `"Announce on Discord"` — `"Post every new bug report to the team's Discord channel (needs a webhook, see Integrations)."`
       - `bug_report_require_image` (`bool`): `"Require a screenshot"` — `"Reporters must attach at least one screenshot before a bug report can be sent."`
       - `bug_report_max_images` (`int`): `"Screenshots per bug report"` — `"How many screenshots a reporter can attach to a bug report. Between 1 and 4."`
       - `bug_report_image_max_mb` (`int`, `MB`): `"Bug report screenshot limit"` — `"Largest single screenshot a bug report accepts. Cannot be raised above 3 MB."`
    9. **`retention` — `"Data retention"`** (`Hourglass` icon) — `"How long unfinished data is kept before it is cleaned up."`
       - `streak_prune_days` (`int`, `d`): `"Streak inactivity limit"` — `"In-progress streak runs untouched for this long are ended."`
       - `ban_list_retention_days` (`int`, `d`): `"Ban-evasion list retention"` — `"How long the hash of a banned e-mail stays on the ban list. Applies to existing entries too."`
       - `content_evidence_days` (`int`, `d`): `"Report evidence retention"` — `"How long a reported item is kept for review. At most 14 days, as the Privacy Policy states."`
       - `match_log_max_entries` (`int`): `"Match log size per run"` — `"Matches kept per challenge run; older ones are pruned. At most 100."`
    10. **`privacy` — `"Privacy & contact"`** (`ShieldCheck` icon) — `"Quoted publicly on the Privacy Policy page."`
        - `contact_email` (`email`): `"Contact email"` — `"Shown on the Privacy Policy page for data and deletion requests."`

- **Sticky Bottom Save Bar (`AdminSettingsSection.tsx`)**:
  - Status `output`: `"Unsaved changes ({count})"` (`adminSettings.configUnsaved`, amber text) when `changed.length > 0`, or `"All saved"` (`adminSettings.configAllSaved`, muted text).
  - `"Reset to default"` (`adminSettings.configResetAll`): secondary `Button` (size `sm`, `RotateCcw` left icon, disabled when `saving || allAtDefault`).
  - `"Discard"` (`adminSettings.configDiscard`): secondary `Button` (size `sm`, disabled when `saving || changed.length === 0`).
  - `"Save changes"` (`adminSettings.configSave`): primary `Button` (size `sm`, disabled when `changed.length === 0 || problems.length > 0`). Saves directly, or opens the `"Lower a protection?"` `ConfirmModal` when `risky.length > 0`.

---

#### 7. Tab: `tools` (including Maintenance Mode & Scheduled Maintenance Jobs) (`AdminToolsSection.tsx`, `AdminMaintenanceModeCard.tsx`, `AdminToolParts.tsx`)
- 2-column responsive grid (`xl:grid-cols-2`) of collapsible `ToolCard` accordions (each persisted via `lemondbd_admin_tool_<id>`):

  1. **Card: `"Maintenance mode"` (`id="maintenance-mode"`, `AdminMaintenanceModeCard.tsx`, spans 2 cols `xl:col-span-2`)**:
     - Title: `"Maintenance mode"` (`adminSettings.mmTitle`).
     - **Row 1 (`ToolRow`)**: title `"Close the site to visitors"` (`adminSettings.mmSwitchTitle`).
       - Control when `state.status !== 'scheduled'`: `Switch` (`checked={state.status === 'active'}`, `ariaLabel`: `"Close the site to visitors"`). Turning on with no future start opens `"Close the site?"` `ConfirmModal`; turning on with a future start schedules immediately; turning off stops immediately.
       - Control when `state.status === 'scheduled'`: `Button` (size `sm`) `"Cancel"` (`adminSettings.mmCancel`) to cancel scheduled window.
     - **Row 2 (`ToolFormRow`)**:
       - 2-column grid of `DateTimePicker` controls (`DateTimePicker.tsx`, locked/dimmed while `active` or `scheduled`):
         - `"Starts"` (`adminSettings.mmFieldStart`, `#mm-start`): button field showing selected date/time or placeholder `"Now"` (`adminSettings.mmStartNow`); opens `react-datepicker` calendar + 5-min time list (`"Time"` / `adminSettings.mmPickTime`) with clear button (`"Clear"` / `adminSettings.mmPickClear`).
         - `"Ends"` (`adminSettings.mmFieldEnd`, `#mm-end`): button field showing selected date/time or placeholder `"Until stopped"` (`adminSettings.mmEndNever`); opens `react-datepicker` calendar + time list.
       - Conditional `"Save"` button (`adminSettings.mmSave`, primary `Button` size `sm`): shown when `!locked` and `"Starts"` is set to a future timestamp.

  2. **Card: `"System status"` (`id="system"`, `AdminToolsSection.tsx`)**:
     - Title: `"System status"` (`admin.systemTitle`), subtitle: `"Read live from the server each time you open this tab."` (`admin.systemSubtitle`).
     - 9 live dependency rows (`ToolRow`), each with title, description, optional meta (`"switched off in Settings"` / `admin.systemSwitchedOff` or technical detail, `"{ms} ms"` / `admin.systemLatency`, `"Last ran on schedule {date}"` / `admin.lastRunScheduled`), and status `Badge` (`"OK"` / `systemStateOk` in green, `"Degraded"` / `systemStateWarn` in amber, `"Off"` / `systemStateOff` in neutral, `"Failing"` / `systemStateError` in red):
       - `database`: `"Database"` — `"Answers a test query."`
       - `cache`: `"Shared cache"` — `"Redis keeps the server workers in step."`
       - `mail`: `"Email delivery"` — `"Verification codes, password resets and moderation notices."`
       - `discord`: `"Discord webhook"` — `"Where new bug reports are announced."`
       - `ocr`: `"Screenshot reader"` — `"The OCR engine behind the scoreboard check."`
       - `scheduler`: `"Scheduled jobs"` — `"Runs the jobs below by itself. Degraded: nothing ran in the last hour."`
       - `email_verification`: `"Email verification"` — `"New accounts must confirm their address."`
       - `altcha`: `"Bot protection"` — `"Needed for sign-up, sign-in and guest bug reports."`
       - `ban_list`: `"Ban-evasion list"` — `"Stops banned email addresses from registering again."`

  3. **Card: `"Maintenance"` (`id="maintenance"`, `AdminToolsSection.tsx`)**:
     - Title: `"Maintenance"` (`admin.maintenanceTitle`), subtitle: `"These jobs run on a schedule. Run one now when you cannot wait for it."` (`admin.maintenanceSubtitle`).
     - 8 scheduled housekeeping job rows (`ToolRow`), each showing job title, description, last-run metadata (`"Has not run yet"` / `admin.neverRun`, `"Last ran on schedule {date}"` / `admin.lastRunScheduled`, or `"Last run by an admin {date}"` / `admin.lastRunManual`), and `"Run now"` (`admin.runNow`) `Button` (size `sm`, `Play` left icon):
       - `streak_inactivity`: `"End inactive streaks"` — `"Closes streak runs nobody has played for a long time (nightly)."`
       - `content_evidence`: `"Wipe expired report evidence"` — `"Deletes unreviewed report copies once their time is up (hourly)."`
       - `sanction_emails`: `"Send waiting moderation emails"` — `"Retries moderation emails that failed to send (every 3 minutes)."`
       - `ban_list`: `"Clean the ban-evasion list"` — `"Removes entries past their retention period (nightly)."`
       - `minigame_sessions`: `"Clean up practice minigame sessions"` — `"Deletes practice rounds older than 24 hours (hourly)."`
       - `bug_report_files`: `"Remove orphaned bug report screenshots"` — `"Deletes screenshots no bug report refers to any more (daily)."`
       - `revoked_sessions`: `"Forget expired sign-outs"` — `"Forgets signed-out sessions once their token has expired (daily)."`
       - `catalog_cache`: `"Clear the catalog cache"` — `"Shows fresh perks, characters and maps after a direct database edit."`

  4. **Card: `"Database"` (`id="database"`, `AdminToolsSection.tsx`)**:
     - Title: `"Database"` (`admin.databaseTitle`), subtitle: `"Back up, restore or reset tables. Large restores can take a minute."` (`admin.databaseSubtitle`).
     - 3 action rows (`ToolRow`) opening `ScraperConfigModal` (`DatabaseBackupModal`) at the corresponding `initialTab`:
       - `"Export JSON"` (`admin.exportJson`) — `"Download the tables you pick as one JSON file."` (`admin.exportBackupDesc`) -> `Button` `"Export"` (`admin.export`, `Download` icon) -> opens modal on `'export'` tab.
       - `"Import JSON"` (`admin.importJson`) — `"Load a JSON backup, merged into or replacing the data."` (`admin.importBackupDesc`) -> `Button` `"Import"` (`admin.import`, `Upload` icon) -> opens modal on `'import'` tab.
       - `"Purge"` (`admin.purge`) — `"Empty the tables you pick. This cannot be undone."` (`admin.purgeDesc`) -> danger `Button` `"Purge"` (`admin.purge`, `Trash2` icon) -> opens modal on `'purge'` tab.

  5. **Card: `"Testing"` (`id="testing"`, `AdminToolsSection.tsx`)**:
     - Title: `"Testing"` (`admin.testingTitle`), subtitle: `"Check that a feature works end to end before players rely on it."` (`admin.testingSubtitle`).
     - 4 feature-test rows (`ToolRow`):
       - `"Vector Map Engine"` (`admin.vectorMapTest`) — `"Inspect the interactive vector map layouts."` (`admin.vectorMapTestDesc`) -> `Button` `"Open"` (`admin.openTest`, `MapPin` icon) -> opens `VectorMapTestModal`.
       - `"OCR check"` (`admin.ocrCheck`) — `"Upload a scoreboard screenshot and see what the reader finds."` (`admin.ocrCheckDesc`) -> `Button` `"Open"` (`admin.openTest`, `ScanText` icon) -> opens `ScoreboardCheckModal`.
       - `"Test email"` (`admin.testEmail`) — `"Sends a short message to your own address."` (`admin.testEmailDesc`) -> `Button` `"Send"` (`admin.sendTest`, `Mail` icon) -> calls `sendTestEmail()` and toasts `"Test email sent to {email}."` (`admin.testEmailSent`).
       - `"Test Discord notification"` (`admin.testDiscord`) — `"Posts a test message to the bug-report webhook."` (`admin.testDiscordDesc`) -> `Button` `"Send"` (`admin.sendTest`, `MessageSquare` icon) -> calls `sendTestDiscord()` and toasts `"Test notification sent to Discord."` (`admin.testDiscordSent`).

  6. **Card: `"Analytics"` (`id="analytics"`, `AdminToolsSection.tsx`, spans 2 cols `xl:col-span-2`)**:
     - Title: `"Analytics"` (`admin.analytics`).
     - Row: `"Analytics"` — `"Open the Umami analytics dashboard (page views, feature usage)"` (`admin.analyticsTitle`) -> external link `a` (`href={analyticsUrl()}`, `target="_blank"`) styled as secondary button with `LineChart` icon + `"Analytics"` + `ExternalLink` icon.

---

### Modes / states

- **Route & Auth-Gated States**:
  - **Proxy Gate (`proxy.ts`)**: Unauthenticated visitors or non-admin users requesting `/admin` are served `/admin-entry` by the proxy.
  - **Route-level & Auth-Verifying Skeleton (`app/[locale]/admin/loading.tsx`, `AdminPanelSkeleton.tsx`)**: Shown while the route segment loads or while `!dict || isLoading` in `AdminPanelClient`. Displays `<output aria-busy="true" aria-label="Verifying administrative access...">` with a blood-accented `DbdSpinner` labeled `"Verifying administrative access..."` (`admin.verifyingAdminAccess`).
  - **Forbidden State (`!isAuthenticated || !isAdmin` in `AdminPanelClient.tsx`)**: Renders `<ErrorPage variant="forbidden" />` (`components/layout/ErrorPage.tsx`):
    - Centered card with `LemonIcon`, badge `"403"` (`errorPages.forbidden.code`), `h1` `"Forbidden"` (`errorPages.forbidden.title`), body text `"Your account doesn't have permission to open this page."` (`errorPages.forbidden.textSignedIn`, when signed in as non-admin) or `"You need to sign in with an administrator account to open this page."` (`errorPages.forbidden.textGuest`, when guest), and primary link button with `Home` icon `"Back to home"` (`errorPages.backHome` -> `/{locale}`).
- **Tab Lazy-Loading & Persistence States**:
  - **Active Tab Persistence**: Remembered in `localStorage` under `lemondbd_admin_tab` (`'users'` default).
  - **Lazy Tab Skeleton (`AdminTabContentSkeleton.tsx`)**: Shown while dynamically imported sections (`AdminReportsSection`, `AdminAvailabilitySection`, `AdminAuditSection`, `AdminSettingsSection`, `AdminToolsSection`) or the `adminSettings` dictionary load, and while a selected Content Report's detail is loading. Displays `Surface` (`as="output"`, `aria-busy="true"`) with `DbdSpinner` labeled `"Loading users..."` (`admin.loading`).
  - **Cross-Tab User Jump (`showUser` in `AdminPanelClient.tsx`)**: Clicking `"Show in Users"` (`UserSearch` icon button) on a Bug Report or Content Report sets the `users` search input to `id:{user_id}` (or `author_login`), resets role/standing filters to `'all'`, and switches to the `users` tab.
  - **Unsaved Settings Guard (`settingsDirty > 0`)**:
    - Switching away from the `settings` tab while `changed.length > 0` intercepts tab navigation and opens the `"Leave without saving?"` `ConfirmModal`.
    - Browser tab close/reload triggers a native `beforeunload` prompt.
- **Section Loading, Empty & Error States**:
  - **`users` tab**:
    - Loading empty list: inline `EmptyState` `"Loading users..."` (`admin.loading`).
    - Loading with existing rows: table/list dims (`opacity-60`, `aria-busy="true"`).
    - No matching users: inline `EmptyState` `"No users found matching query."` (`admin.noUsers`).
  - **`reports` tab**:
    - Active queue persisted in `lemondbd_admin_queue` (`'bugs'` or `'content'`); status filters persisted in `lemondbd_admin_bugs_status` and `lemondbd_admin_content_status`; list/case accordion open states persisted in `lemondbd_admin_{queue}_{list|case}_open`.
    - Empty bug queue: inline `EmptyState` (`Inbox` icon) `"Loading users..."` while loading, else `"No bug reports match this filter."` (`admin.noBugReports`).
    - Empty content queue: inline `EmptyState` (`Inbox` icon) `"Loading users..."` while loading, else `"No reports match this filter."` (`admin.contentReportsEmpty`).
    - No report selected: compact `EmptyState` (`Inbox` icon) `"Select a report to see it here."` (`admin.queueSelectPrompt`).
    - Content report detail load failure: compact `EmptyState` `"Could not load content reports."` (`admin.contentReportsLoadFailed`).
  - **`availability` tab**:
    - Kind (`characters` | `perks`), role (`Survivor` | `Killer`), disabled-only toggle, and accordion open states persisted in `localStorage`.
    - Loading empty roster: inline `EmptyState` `"Loading users..."` (`admin.loading`); existing grid dims (`opacity-60`) during search/switch.
    - No matching items: inline `EmptyState` `"Nothing matches these filters."` (`admin.rosterEmpty`).
  - **`audit` tab**:
    - Category filter (`lemondbd_admin_audit_category`) and page size (`lemondbd_admin_audit_per_page`, default `30`) persisted in `localStorage`.
    - Loading empty log: inline `EmptyState` (`ScrollText` icon) `"Loading audit log..."` (`admin.loadingAuditLog`).
    - Empty audit log: inline `EmptyState` (`ScrollText` icon) `"No admin actions logged yet."` (`admin.noAuditLogs`).
  - **`settings` tab**:
    - Group drawer open states persisted in `lemondbd_admin_setting_<group>`.
    - Initial settings fetch: inline `EmptyState` `"Loading users..."` (`admin.loading`).
    - Refresh preservation: clicking header `"Refresh"` or removing a secret reloads server settings while preserving any other unsaved draft edits (`keepDirty = true`).
  - **`tools` tab**:
    - Tool card open states persisted in `lemondbd_admin_tool_<id>`.
    - Maintenance mode card loading state: inline `EmptyState` `"Loading users..."` (`admin.loading`).
    - Maintenance mode states (`MaintenanceStatus`): `'off'`, `'scheduled'` (shows `"Cancel"` button, locks pickers, auto-refreshes timer when `starts_at` arrives), `'active'` (switch is ON, locks pickers, auto-refreshes timer when `until` arrives), `'ended'`.
- **Toast Feedback Messages (`AdminToast`)**:
  - Users: `"{username} was created."`, `"{username} was updated."`, `"{username} was deleted."`, `"Two-factor authentication was reset for {username}."`, `"{challenge} was reset for {username}."`, `"Reset done, but the email could not be sent."`, `"Could not download this user's data."`.
  - Moderation: `"Decision recorded for {username}."`, `"Decision revoked."`, `"The account of {username} was restored."`, `"Could not save the decision."`.
  - Bug reports: `"Status of report #{id} updated."`, `"Reply to report #{id} saved. The reporter sees it on their profile."`, `"Bug report #{id} deleted."`.
  - Content reports: `"Content banned. Its evidence was wiped and every copy is now blocked."`, `"Report dismissed. Its evidence was wiped."`, `"Could not load content reports."`, `"Could not resolve the report."`.
  - Availability: `"{name} is enabled."`, `"{name} is disabled."`.
  - Settings: `"Configuration saved."`, `"Failed to save configuration."`, `"Failed to load configuration."`.
  - Tools & Maintenance: `"Maintenance mode is on."`, `"Maintenance is scheduled."`, `"Maintenance mode is off."`, `"That did not work. Try again."`, `"{name}: done, {count, plural, =0 {nothing needed changing} one {# record changed} other {# records changed}}."`, `"Test email sent to {email}."`, `"Test notification sent to Discord."`.

---

### Modals & drawers (file)

1. **Create / Edit User Modal (`components/admin/AdminUserFormModal.tsx`)**:
   - **Trigger**: Clicking `"Create User"` button in `AdminUsersSection` (`target = 'new'`), or selecting `"Edit user"` in a user row's `"⋯"` `ActionMenu` (`target = user`).
   - **Modes**:
     - **Create Mode (`target === 'new'`)**:
       - Title: `"Create New User"` (`admin.createUserTitle`).
       - Fields:
         - `"Login"` (`admin.thLogin`): required text `Input` (`minLength={3}`, placeholder `"e.g. killer_master"` / `admin.createUserLoginPlaceholder`).
         - `"Username"` (`admin.thUsername`): required text `Input` (`minLength={3}`, `maxLength={50}`, placeholder `"e.g. killer_master"` / `admin.createUserUsernamePlaceholder`).
         - `"Email"` (`admin.thEmail`): required email `Input` (placeholder `"e.g. master@lemondbd.com"` / `admin.createUserEmailPlaceholder`).
         - `"Password"` (`admin.thPassword`): required password `Input` (`minLength={passwordMinLength}`, placeholder `"At least {min} characters"` / `admin.createUserPasswordPlaceholder`).
         - `"Role Privilege"` (`admin.rolePrivilege`): `CustomDropdown` with options `"User"` (`admin.roleStandard`) and `"Admin"` (`admin.roleAdministrator`).
       - Conditional `ReauthFields` (when `"Admin"` role is selected): `"Your password"` (`admin.confirmOwnPasswordLabel`) with hint `"Giving someone admin rights needs your own password."` (`admin.reauthGrantAdminHint`), plus conditional `"Code from your authenticator app"` (`admin.confirmOwnTwoFactorLabel`) when the acting admin has 2FA enabled.
       - Footer button: primary `Button` (`UserPlus` icon) `"Create Account"` (`admin.createAccount`).
     - **Edit Mode (`target` is a `UserRow`)**:
       - Title: `"Edit {username}"` (`admin.editUserTitle`).
       - Read-only inset `Surface` (`dl`): displays `"Login"` (`editing.login`) and `"Email"` (`editing.email`).
       - Fields:
         - `"Username"` (`admin.thUsername`): required text `Input` (`minLength={3}`, `maxLength={50}`).
         - `"Role Privilege"` (`admin.rolePrivilege`): `CustomDropdown` (`"User"`, `"Admin"`). Disabled/locked when editing own account (`editing.id === currentUserId`) with caption `"You cannot remove your own admin role."` (`admin.ownRoleLocked`).
         - Conditional `ReauthFields` (when granting Admin to a User, or demoting another Admin to User): `"Your password"` (hint `"Giving someone admin rights needs your own password."` or `"Changing another administrator's account needs your own password."` / `admin.confirmOwnPasswordHint`) + conditional 2FA code input.
         - `Checkbox`: `"Email address verified"` (`admin.emailVerifiedLabel`).
       - Footer button: primary `Button` (`Save` icon) `"Save changes"` (`admin.saveUser`).

2. **User Challenges Progress & Reset Modal (`components/admin/AdminUserChallengesModal.tsx`)**:
   - **Trigger**: Selecting `"Reset challenges"` in a user row's `"⋯"` `ActionMenu`.
   - **Elements**:
     - Title: `"Challenges"` (`admin.challengesTitle`), close button (`"Close"` / `modal.close`).
     - States:
       - Loading: `LoadingState` (`DbdSpinner` + `"Loading challenges..."` / `admin.loadingChallenges`).
       - Empty: inline `EmptyState` `"This player has no challenge progress."` (`admin.noChallenges`).
       - Populated: list (`ul`) of `Surface` cards per challenge run/completion:
         - Title: `"{modeLabel}: {variantLabel}"` (modes: `"Gauntlet"`, `"Chaos Streak"`, `"History Streak"`, `"Page Streak"`, `"ID, Please"`, `"ID, Please (Survivor)"`, `"ID, Please (Killer)"`).
         - Progress metadata: conditional `"Streak: {current} / {total}"` (`streaks.streakLabel`), conditional green `Badge` `"Completed"` (`admin.challengeCompleted`).
         - Action: `Button` (size `sm`, `RotateCcw` icon) `"Reset"` (`admin.resetChallenge`) -> opens nested **Reset Challenge ConfirmModal**.
   - **Nested Modal — Reset Challenge ConfirmModal (`ConfirmModal.tsx` inside `AdminUserChallengesModal.tsx`)**:
     - Trigger: Clicking `"Reset"` on a challenge row.
     - Title: `"Reset challenge?"` (`admin.resetChallengeTitle`).
     - Body: `FormField` labeled `"Note for the player"` (`admin.challengeNoteLabel`) with hint `"After the reset, the player will receive an email."` (`admin.resetChallengeMessage`) and `Textarea` (`rows={3}`, `maxLength={500}`).
     - Confirm button: `"Reset"` (`admin.resetChallenge`).

3. **Delete User / Reset 2FA Confirmation Modal (`components/common/ConfirmModal.tsx` in `AdminUsersSection.tsx`)**:
   - **Trigger**: Selecting `"Delete user"` (`pending.kind === 'delete'`) or `"Reset two-factor authentication"` (`pending.kind === 'resetTwoFactor'`) in a user row's `"⋯"` `ActionMenu`.
   - **Variants**:
     - **Delete User**:
       - Title: `"Delete user?"` (`admin.deleteUserTitle`).
       - Message: `"Delete {username} and everything their account owns? This cannot be undone."` (`admin.confirmDeleteUser`).
       - Confirm button: `"Delete"` (`admin.delete`).
     - **Reset 2FA**:
       - Title: `"Reset two-factor authentication?"` (`admin.resetTwoFactorTitle`).
       - Message: `"This turns off two-factor sign-in for {username}, who may have lost their device and recovery codes. They will be emailed, and the reset is recorded in the audit log."` (`admin.resetTwoFactorMessage`).
       - Conditional `ReauthFields` (when resetting another admin's 2FA): `"Your password"` (hint `"Changing another administrator's account needs your own password."`) + conditional `"Code from your authenticator app"`.
       - Confirm button: `"Reset 2FA"` (`admin.resetTwoFactorConfirm`, disabled until reauth fields are filled when required).

4. **User Moderation Drawer (`components/admin/AdminModerationDrawer.tsx`, `ModerationProfileCard.tsx`, `SanctionForm.tsx`)**:
   - **Trigger**: Clicking the `Gavel` (`"Moderation"`) icon button on a non-admin user row in `AdminUsersSection`.
   - **Layout (`Modal` with `variant="drawer-right"`, `size="lg"`, title `"Moderation"` / `moderation.admin.drawerTitle`)**:
     - **Profile Card (`ModerationProfileCard.tsx`)**:
       - Left column: `UserAvatar` (`size="2xl"`) with colored status ring (`good`: green, `warned`: amber, `suspended`: orange, `banned`: red) and status tooltip (`"In good standing"` / `"Warned"` / `"Suspended until {date}"` / `"Banned"`), `user.username`, `@{user.login}`.
       - Right column (shows `Spinner` while summary loads):
         - Stats list (`dl`): `"Active warnings"` (`moderation.admin.statWarningsActive`), `"All warnings"` (`statWarningsTotal`), `"Suspensions"` (`statSuspensions`), `"Blocked content"` (`statBlockedContent`).
         - Buttons: `"History"` (`moderation.admin.historyTitle` -> opens `SanctionHistoryModal`) and conditional `"Restore account"` (`moderation.admin.restoreButton`, shown when `state === 'banned' || state === 'suspended'` -> opens `ModerationReasonModal`).
     - **Loading / Error States**:
       - Initial load: centered `Spinner`.
       - Load failed: alert text `"Could not load the moderation history."` (`moderation.admin.loadFailed`) + `"Refresh"` `Button`.
     - **Escalation Suggestion & Email Box (`Surface`)**:
       - Conditional Suggestion Row (when `summary.suggestion` is present): `"Suggested next step: {Warning | Suspension for {days} days | Permanent ban}"` (`moderation.admin.suggestionTitle`) + `Button` `"Use this suggestion"` (`moderation.admin.suggestionApply`).
       - Email Toggle Row: `"Also email the user"` (`moderation.admin.formSendEmail`, with red `*` when `draft.kind !== 'warning'`) + `Switch` (editable for warnings; locked ON for suspensions and bans).
     - **Sanction Form (`SanctionForm.tsx`)**:
       - `"Decision *"` (`moderation.admin.formKind`): `CustomDropdown<SanctionKind>` (`"Warning"` / `kindWarning`, `"Suspension"` / `kindSuspension`, `"Ban"` / `kindBan`).
       - Conditional `"Duration (days) *"` (`moderation.admin.formDuration`, shown when `kind === 'suspension'`): number `Input` (`1`–`365`, suffix `"days"`, range hint `"1–365"`).
       - `"Reason *"` (`moderation.admin.formReason`): `CustomDropdown` (placeholder `"Select reason"`, options from `moderation.reasons`: `"Hate speech"`, `"Harassment"`, `"Explicit content"`, `"Illegal content"`, `"Spam"`, `"Cheating"`, `"Ban evasion"`, `"Other"`).
       - `"Rule it breaks"` (`moderation.admin.formRule`): `CustomDropdown` (placeholder `"Select rule"`, options: `"Section 1: Don't be the Entity"`, `"Section 2: Fair play"`, `"Section 3: Your stuff, your responsibility"`, `"Section 4: Smash or Pass etiquette"`, `"Section 5: Be gentle with the generators"`, `"Section 6: See something? Say something"`, `"Section 7: What happens if you break them"`).
       - `"What happened *"` (`moderation.admin.formFacts`): required `Textarea` (`maxLength={2000}`, hint `"The user reads this as written. The reported content itself is deleted, so describe what happened."`).
       - `"Internal notes"` (`moderation.admin.formInternal`): optional `Textarea` (`maxLength={2000}`, hint `"Only admins see this and it is never emailed. Keep it factual: a user can ask for their data."` / `moderation.admin.formInternalHint`).
     - **Drawer Footer Buttons**:
       - `"Preview"` (`moderation.admin.previewTitle`) `Button` -> opens `SanctionPreviewModal`.
       - Submit `Button` (primary, disabled until form is valid): `"Issue warning"` (`submitWarning`) / `"Suspend account"` (`submitSuspension`) / `"Ban account"` (`submitBan`) -> opens **Confirm Sanction Modal**.

5. **Sanction History Modal (`components/admin/SanctionHistoryModal.tsx`, `SanctionHistory.tsx`)**:
   - **Trigger**: Clicking `"History"` inside `ModerationProfileCard` in `AdminModerationDrawer`.
   - **Elements (`Modal` `variant="dialog"`, `size="xl"`, `layer="top"`, title `"History"` / `moderation.admin.historyTitle`)**:
     - Empty state: `"No warnings, suspensions or bans yet."` (`moderation.admin.historyEmpty`).
     - Timeline list (`ul`) of `Surface` cards per sanction (`AdminSanction`):
       - Badges row: kind `Badge` (`"Warning"` in amber, `"Suspension"` / `"Ban"` in red), status `Badge` (`"Active"` in green, `"Revoked"` or `"Expired"` in neutral), reason `Badge` (neutral plain), optional rule `Badge` (neutral plain), conditional `"From a content report"` (`moderation.admin.sourceReport`) blue plain `Badge`.
       - Timestamp caption: `"Issued by {login} on {date}"` (`issuedBy`) or `"Issued on {date}"` (`issuedOn`), plus conditional `"· Until {date}"` (`untilDate`) for suspensions.
       - Details: `"What happened"` (`factsLabel`) and `"Internal notes"` (`internalLabel`) text blocks when present.
       - Warning acknowledgement status (when `kind === 'warning'`): `"Seen by the user on {date}"` (`acknowledgedAt`) or `"Not seen by the user yet"` (`notAcknowledged`).
       - Revoked line (when `revoked_at !== null`): `"Revoked by {login}: {reason}"` (`revokedLine`).
       - Action (when `s.active` is true): `"Revoke"` (`moderation.admin.revokeButton`) `Button` -> opens `ModerationReasonModal`.

6. **Sanction Preview Modal (`components/admin/SanctionPreviewPanel.tsx`)**:
   - **Trigger**: Clicking `"Preview"` in `AdminModerationDrawer` or in `ContentReportDetail` (when an author sanction is selected).
   - **Elements (`Modal` `variant="dialog"`, `size="lg"`, `layer="top"`, title `"Preview"` / `moderation.admin.previewTitle`)**:
     - **View Switcher (`SegmentedControl`, persisted in `lemondbd_moderation_preview_tab`)**:
       - `app`: `"In the app"` (`moderation.admin.previewApp`)
       - `email`: `"Email"` (`moderation.admin.previewEmail`)
     - **States & Views**:
       - Incomplete form (`!valid`): `"Fill in the required fields to see a preview."` (`moderation.admin.previewIncomplete`).
       - Loading preview: `"Loading the preview…"` (`moderation.admin.previewLoading`).
       - Error: `"The preview could not be loaded."` (`moderation.admin.previewFailed`).
       - **`app` tab — Warning (`draft.kind === 'warning'`)**: `Surface` card with heading `"You have received a warning"` (`moderation.warning.title`), `WarningNoticeBody` (amber alert box with `TriangleAlert` icon + `"A moderator reviewed your activity on LemonDBD..."`, plus `"Reason"`, `"Rule"`, `"What happened"`), and `"This warning expires on {date}."` (`moderation.warning.expires`).
       - **`app` tab — Suspension / Ban (`draft.kind !== 'warning'`)**: `Surface` card with `AccountBlockedNotice` (`showClose={false}`): red alert box with `Ban` or `Clock` icon + `"A moderator permanently banned this account..."` / `"A moderator suspended this account until {date}..."`, `"Reason: {reason}"`, and appeal contact notice.
       - **`email` tab (`EmailPreview`)**: conditional notice `"No email will be sent for this decision."` (`moderation.admin.previewNoEmail`, with preview dimmed `opacity-50` when warning email is switched off), `"Subject: LemonDBD: {subject}"` (`moderation.admin.previewSubject`), and `Surface` body rendering email paragraphs, labeled fields, blockquotes, and footer.

7. **Confirm Sanction Decision Modal (`components/common/ConfirmModal.tsx` in `AdminModerationDrawer.tsx`)**:
   - **Trigger**: Clicking `"Issue warning"` / `"Suspend account"` / `"Ban account"` in `AdminModerationDrawer`.
   - **Elements**:
     - Title: `"Confirm the decision"` (`moderation.admin.confirmTitle`).
     - Message:
       - Warning: `"Warn {username}? Their account stays fully usable."` (`moderation.admin.confirmWarning`).
       - Suspension: `"Suspend {username} for {days} days? They are signed out at once and cannot sign in until it ends."` (`moderation.admin.confirmSuspension`).
       - Ban: `"Permanently ban {username}? They are signed out at once and can no longer sign in."` (`moderation.admin.confirmBan`).
     - Confirm button: `"Issue warning"` / `"Suspend account"` / `"Ban account"`.

8. **Revoke Decision / Restore Account Reason Modal (`components/admin/ModerationReasonModal.tsx`)**:
   - **Trigger**:
     - Clicking `"Revoke"` on an active sanction in `SanctionHistoryModal` (`revoking !== null`).
     - Clicking `"Restore account"` in `ModerationProfileCard` (`restoring === true`).
   - **Variants (`Modal` `variant="dialog"`, `size="md"`, `layer="top"`)**:
     - **Revoke**: title `"Revoke this decision"` (`moderation.admin.revokeTitle`), message `"Why is this decision being taken back? A lifted suspension or ban is emailed to the user."` (`revokeMessage`), confirm button `"Revoke"` (`revokeConfirm`).
     - **Restore**: title `"Restore this account"` (`moderation.admin.restoreTitle`), message `"This lifts every running suspension and ban and emails the user. Say why."` (`restoreMessage`), confirm button `"Restore"` (`restoreConfirm`).
     - Shared controls: required `Textarea` (`rows={3}`, `maxLength={500}`, placeholder & `aria-label`: `"Reason (kept in the audit log)"` / `moderation.admin.reasonPlaceholder`), footer `"Cancel"` (`admin.cancel`) button + primary confirm button (disabled when reason is blank).

9. **Delete Bug Report Confirmation Modal (`components/common/ConfirmModal.tsx` in `BugReportDetail.tsx`)**:
   - **Trigger**: Clicking the danger `Trash2` icon button in `BugReportDetail` header.
   - **Elements**:
     - Title: `"Delete bug report?"` (`admin.deleteBugReportTitle`).
     - Message: `"Delete bug report #{id}? This cannot be undone."` (`admin.confirmDeleteBugReport`).
     - Confirm button: `"Delete"` (`admin.delete`).

10. **Ban Content Report Confirmation Modal (`components/common/ConfirmModal.tsx` in `ContentReportDetail.tsx`)**:
    - **Trigger**: Clicking `"Ban content"` in `ContentReportDetail`.
    - **Elements**:
      - Title: `"Ban this content?"` (`admin.contentReportBanTitle`).
      - Message: `"Every copy of this content will be blocked from import, sharing and opening, and its evidence is wiped permanently."` (`admin.contentReportBanMessage`), appended with author consequence (`confirmWarning` / `confirmSuspension` / `confirmBan`) when an author sanction is also selected.
      - Confirm button: `"Ban content"` (`admin.contentReportBanAction`).

11. **Disable Mode / Character / Perk Reason Modal (`components/admin/AdminReasonModal.tsx`)**:
    - **Trigger**: Switching off an enabled challenge mode or clicking an enabled character/perk tile in `AdminAvailabilitySection`.
    - **Elements (`Modal` `variant="dialog"`, `size="md"`)**:
      - Title: `"Disable {name}?"` (`admin.disableConfirmTitle`).
      - Subtitle:
        - Mode: `"Blocks new runs and match submissions for everyone."` (`admin.disableModeSubtitle`).
        - Character: `"Won't be rollable into new challenge pools."` (`admin.disableCharacterSubtitle`).
        - Perk: `"Won't be offered in new challenge pools/pages."` (`admin.disablePerkSubtitle`).
      - `FieldLabel`: `"Reason (shown to players)"` (`admin.reasonShownToPlayers`).
      - `Textarea` (`rows={3}`, `maxLength={255}`, placeholder `"e.g. power is bugged, temporarily disabled while we fix it"` / `admin.reasonPlaceholder`) + character counter `{reason.length}/255`.
      - Footer button: primary `Button` `"Disable"` (`admin.disable`).

12. **Unsaved Settings Tab-Leave Confirmation Modal (`components/common/ConfirmModal.tsx` in `AdminPanelClient.tsx`)**:
    - **Trigger**: Clicking another section tab while `tab === 'settings'` and `settingsDirty > 0`.
    - **Elements**:
      - Title: `"Leave without saving?"` (`admin.unsavedSettingsTitle`).
      - Message: `"Your changes in Settings are not saved yet. They are lost if you leave this tab."` (`admin.unsavedSettingsMessage`).
      - Alternative button: `"Stay in Settings"` (`admin.unsavedSettingsStay`).
      - Confirm button: `"Discard and leave"` (`admin.unsavedSettingsLeave`).

13. **Lower a Security Protection Confirmation Modal (`components/common/ConfirmModal.tsx` in `AdminSettingsSection.tsx`)**:
    - **Trigger**: Clicking `"Save changes"` in `AdminSettingsSection` when one or more modified settings lower a security safeguard (`isRiskyDraft`, e.g. turning off `"Require e-mail confirmation"` or `"Require the security check (ALTCHA)"`).
    - **Elements (`size="md"`)**:
      - Title: `"Lower a protection?"` (`adminSettings.configRiskTitle`).
      - Body: `"You are about to switch off a safeguard. Do it only while the cause is being fixed, and switch it back on afterwards. The change is recorded in the audit log with your reason."` (`configRiskBody`), bullet list (`ul`) of affected setting names, and required `Input` (`#cfg-risk-reason`, `maxLength={300}`, min 5 chars, label `"Reason"` / `configRiskReason`, placeholder `"For example: mail provider outage"` / `configRiskReasonPlaceholder`).
      - Alternative button: `"Discard"` (`adminSettings.configDiscard`).
      - Confirm button: `"Switch off"` (`adminSettings.configRiskConfirm`, disabled until `reason.trim().length >= 5`).

14. **Close Site Immediately (Maintenance Mode) Confirmation Modal (`components/common/ConfirmModal.tsx` in `AdminMaintenanceModeCard.tsx`)**:
    - **Trigger**: Toggling on `"Close the site to visitors"` in `AdminMaintenanceModeCard` when `"Starts"` is empty (`"Now"`) or not in the future.
    - **Elements (`size="md"`)**:
      - Title: `"Close the site?"` (`adminSettings.mmConfirmTitle`).
      - Message: `"Visitors will see the maintenance page right away. Signed-in admins keep full access."` (`adminSettings.mmConfirmBody`).
      - Confirm button: `"Start"` (`adminSettings.mmStart`).

15. **Database Backup, Restore & Purge Modal (`components/ScraperConfigModal.tsx`, `components/scraper-config/*`)**:
    - **Trigger**: Clicking `"Export"`, `"Import"`, or `"Purge"` in the `"Database"` card of `AdminToolsSection`.
    - **Shell (`Modal` `variant="dialog"`, `size="2xl"`, title `"Database Backup & Snapshots"` / `admin.dbBackupSnapshots`, close `aria-label`: `"Close database modal"` / `admin.closeDbModal`)**:
      - **Mode Switcher (`ScraperConfigTabs.tsx` -> `SegmentedControl<ScraperTab>`)**:
        - `export`: `Download` icon (red) + `"Export JSON"` (`admin.exportJson`)
        - `import`: `Upload` icon (green) + `"Import JSON"` (`admin.importJson`)
        - `purge`: `Trash2` icon (red) + `"Purge"` (`admin.purge`)
      - **Sub-mode 1: `export` (`ExportTab.tsx`, `TargetPicker.tsx`)**:
        - Conditional `StatusBanner` (error in red with `CircleAlert`, success in green with `CheckCircle2`, e.g. `"{count, plural, one {Exported # table group.} other {Exported # table groups.}}"` / `admin.exportDone`).
        - `TargetPicker` heading: `"Select Entities to Include in JSON Backup"` (`admin.selectBackupEntities`) + `"Select All"` / `"Deselect All"` (`admin.selectAll` / `admin.deselectAll`) link button.
        - 4 target category groups with group icon, group title, `InfoChip` `{selected}/{total}`, and group `"Select All"` / `"Deselect All"` button:
          1. `"Game Content"` (`admin.groupContent`, `Database` icon):
             - `chapters`: `"Chapters"` — `"DLC chapters and banner art"`
             - `realms`: `"Realms"` — `"Realms and their artwork"`
             - `item_categories`: `"Item Categories"` — `"Toolbox, med-kit, flashlight and the other item types"`
             - `map_sources`: `"Map Sources"` — `"Where map callouts were taken from"`
             - `survivors`: `"Survivors"` — `"Survivors, lore, stats and portraits"`
             - `killers`: `"Killers"` — `"Killers, powers, lore, stats and portraits"`
             - `perks`: `"Perks"` — `"Survivor and Killer teachable & general perks"`
             - `items`: `"Items & Equipment"` — `"Survivor items and tools"`
             - `killer_addons`: `"Killer Add-ons"` — `"Add-ons for every killer power"`
             - `item_addons`: `"Item Add-ons"` — `"Add-ons for survivor items"`
             - `offerings`: `"Offerings"` — `"Survivor and Killer offerings"`
             - `maps`: `"Maps & Callouts"` — `"Map realms, tiles, and objective landmarks"`
             - `map_layouts`: `"Map Layouts"` — `"Vector layout footprints for drawn maps"`
             - `tier_lists`: `"Tier Lists"` — `"Official tier lists and their artwork"`
          2. `"Users & Accounts"` (`admin.groupUsers`, `Users` icon):
             - `users`: `"User Accounts"` — `"Registered user profiles and roles"`
             - `ownerships`: `"User Ownership Records"` — `"Unlocked perks, character prestige and favorites"`
             - `user_showcases`: `"Player Showcases"` — `"Public profile mains and prestige display"`
             - `banned_email_hashes`: `"Ban-Evasion List"` — `"Keyed hashes of permanently banned e-mail addresses (no addresses, no pepper)"`
          3. `"Community & Streaks"` (`admin.groupCommunity`, `Globe` icon):
             - `bug_reports`: `"Bug Reports"` — `"Submitted bug reports and admin notes"`
             - `changelog_posts`: `"Changelog Posts"` — `"Published What is New feed entries"`
             - `gauntlet_runs`: `"Gauntlet Runs"` — `"In-progress and completed Gauntlet history"`
             - `chaos_runs`: `"Chaos Streak Runs"` — `"In-progress and completed chaos streak history"`
             - `history_runs`: `"History Streak Runs"` — `"In-progress and completed history streak history"`
             - `id_please_runs`: `"ID, Please Runs"` — `"In-progress ID, Please runs and their match history"`
             - `page_streak_runs`: `"Page Streak Runs"` — `"In-progress and completed page streak history"`
             - `rosters`: `"Smash or Pass Rosters"` — `"Rosters, entities, stats and votes"`
          4. `"Configuration & System"` (`admin.groupSettings`, `Settings` icon):
             - `challenge_mode_settings`: `"Challenge Mode Toggles"` — `"Site-wide enable and disable state per mode"`
             - `admin_audit_logs`: `"Admin Audit Log"` — `"History of administrative actions"`
        - Footer action: primary `Button` (`Download` icon, disabled when 0 selected): `"Download Backup ({count})"` (`admin.downloadBackup`) / `"Exporting... ({count})"` (`admin.exportingStatus`).
      - **Sub-mode 2: `import` (`ImportTab.tsx`)**:
        - Conditional `StatusBanner` (error/success, e.g. `"Backup restored."` / `admin.importDone`, `"Please select a valid .json file."` / `admin.invalidJsonFile`, `"The file is larger than the server accepts. Ask the server admin to raise DATABASE_IMPORT_MAX_MB."` / `admin.importTooLarge`).
        - **Drag-and-Drop JSON Dropzone (`input[type="file"][accept=".json,application/json"]`)**:
          - Overlay button (`aria-label`: `"Click or drag & drop a LemonDBD .json backup file"` / `admin.clickOrDragBackup`) + `FileJson` icon badge.
          - Empty state: `"Click or drag & drop a LemonDBD .json backup file"` (`clickOrDragBackupPrefix` + `.json` + `clickOrDragBackupSuffix`).
          - Dragging state: `"Drop the .json backup file here..."` (`admin.dropFilePrompt`).
          - File selected state: file name (with tooltip), `X` icon button (`aria-label` & tooltip `"Remove file"` / `admin.removeFile`), `"{kb} KB, ready to restore"` (`admin.kbReadySuffix`), `"Change file"` (`admin.changeFile`).
        - **Import Strategy Radio Cards (`"Choose Import Strategy"` / `admin.chooseImportStrategy`)**:
          - `merge`: `ShieldCheck` icon + `"Merge & Update (Safe)"` (`admin.mergeUpdate`) — `"Upserts entities by name/slug without deleting existing data"` (`admin.mergeUpdateDesc`).
          - `replace`: `RotateCcw` icon + `"Wipe & Replace (Clean)"` (`admin.wipeReplace`) — `"Clears target tables first, then restores uploaded records"` (`admin.wipeReplaceDesc`).
        - **Import Results Breakdown (shown after import when `importSummary` exists)**:
          - Heading `"Import Results Breakdown"` (`admin.importResultsBreakdown`) + grid of entity cards showing `+{created} ({updated} updated)` and conditional `"{count} skipped"` (`admin.skippedCount`).
        - Footer action: success `Button` (`Upload` icon, disabled without file): `"Execute Import"` (`admin.executeImport`) / `"Importing..."` (`admin.importingStatus`) -> opens **Confirm Import Modal**.
      - **Sub-mode 3: `purge` (`PurgeTab.tsx`)**:
        - Conditional `StatusBanner` (error/success, e.g. `"Tables purged."` / `admin.purgeDone`).
        - `TargetPicker` heading: `"Select Target Tables to Wipe"` (`admin.selectTablesToWipe`). Lists the 25 purgeable targets (`PURGEABLE_TARGET_IDS`: excludes `users`, `admin_audit_logs`, `banned_email_hashes`; selecting a parent automatically selects required dependents in `PURGE_REQUIRES`).
        - Footer action: primary `Button` (`Trash2` icon, disabled when 0 selected): `"Purge Selected ({count})"` (`admin.purgeSelected`) / `"Purging..."` (`admin.purgingStatus`) -> opens **Confirm Purge Modal**.
    - **Nested Modal A — Confirm Import Modal (`ConfirmModal.tsx` in `ScraperConfigModal.tsx`)**:
      - Trigger: Clicking `"Execute Import"` in `ImportTab`.
      - Title: `"Wipe & Replace (Clean)"` (when `importMode === 'replace'`) or `"Merge & Update (Safe)"` (when `importMode === 'merge'`).
      - Body: conditional warning `"The selected tables are emptied and refilled from the backup. Data that is not in the backup is lost."` (`admin.wipeReplaceConfirm` when `replace`) + `ReauthFields` (`"Your password"` with hint `"Importing or purging data needs your own password."` / `admin.reauthDatabaseHint` + conditional 2FA code input).
      - Confirm button: `"Wipe & Replace (Clean)"` or `"Execute Import"` (disabled until reauth ready).
    - **Nested Modal B — Confirm Purge Modal (`ConfirmModal.tsx` in `ScraperConfigModal.tsx`)**:
      - Trigger: Clicking `"Purge Selected ({count})"` in `PurgeTab`.
      - Title: `"Purge"` (`admin.purge`).
      - Body: `"{count, plural, one {# table group is emptied permanently.} other {# table groups are emptied permanently.}}"` (`admin.purgeConfirm`), conditional cascade warning (when `survivors`, `killers`, or `perks` selected) `"Purging characters or perks also deletes every player's ownership of them; a killer's add-ons go with the killer, and teachable perks of purged characters become general perks."` (`admin.purgeCascadeNote`), and `ReauthFields` (hint `"Importing or purging data needs your own password."`).
      - Confirm button: `"Purge"` (`admin.purge`, disabled until reauth ready).

16. **OCR Scoreboard Check Modal (`components/common/ScoreboardCheckModal.tsx`)**:
    - **Trigger**: Clicking `"Open"` on the `"OCR check"` row in `AdminToolsSection`.
    - **Elements (`Modal` `size="3xl"`, title `"OCR check"` / `scoreboardCheck.title`)**:
      - **Alerts**:
        - Error banner (`role="alert"` with `CircleAlert` icon): `"Please choose an image file."` (`notImage`), `"The image is too large (max {mb} MB)."` (`tooLarge`), `"The OCR engine is not available on the server."` (`unavailable`), `"This does not look like an end-of-match scoreboard."` (`notAScoreboard`), `"Too many checks. Try again in a minute."` (`rateLimited`), or `"Could not analyze the screenshot."` (`failed`).
        - Switched-off warning (`output` with `CircleSlash` icon, when `!site.features.scoreboardOcr`): `"The screenshot check is switched off in Settings (Access & switches → Scoreboard screenshot check)."` (`scoreboardCheck.switchedOff`).
      - **Mode 1: Upload / Setup View (`!report`)**:
        - Hidden file input (`input[type="file"][accept="image/*"]`).
        - When no image chosen: dashed dropzone button (`ImagePlus` icon + `"Choose a screenshot"` / `chooseImage` + `"Drop an image here or click to browse"` / `dropHint`).
        - When image chosen: preview container with `Img` (`alt="Scoreboard preview"` / `previewAlt`) + top-right `"Remove"` (`remove`) `Button` (`X` icon).
        - Notes: `"Your account name is compared with the screenshot; role, character, result and loadout are read from the image. Nothing to fill in."` (`autoNote`) and `"The image is analysed in memory and discarded. Nothing is stored."` (`privacyNote`).
        - Footer button: primary `Button` `"Analyze"` (`analyze`) / `"Analyzing…"` (`analyzing`, disabled when `!file || switchedOff`).
      - **Mode 2: Analysis Result View (`report` present)**:
        - Verdict header: `Badge` (`"Passed"` / `passed` in green or `"Not passed"` / `notPassed` in red) + POV summary (`"The screenshot owner won"` / `povWon`, `"The screenshot owner lost"` / `povLost`, or `"Result could not be determined"` / `povUnknown`).
        - Identity check line: `CheckMark` icon (`Check` green / `X` red / `CircleSlash` muted) + `"Your account name {expected} {is on the screenshot | is not on the screenshot | could not be checked}"`.
        - POV Result card: `"Your result"` (`yourResult`), `"{Survivor | Killer} · {character} · {Escaped | Died | Surrendered | Killer | Still in the trial | Unknown} · {Won | Lost | Draw}"`, and settlement status (`"settled, can be counted now"` / `resultSettled` or `"not settled yet"` / `resultOpen`).
        - 5 Summary Stat Cards: `"Status"` (`"Match ended"` / `"Match still in progress"`), `"Verdict"` (`"Survivors win"` / `"Draw"` / `"Killer wins"` / `"Incomplete"`, with optional `"(decided before the end)"`), `"Kills"` (`{n}` or `"at least {n}"`), `"Escapes"`, `"In trial"`.
        - Conditional owner line: `"Owner: {owner_name}"`.
        - 5-Player Scoreboard `Table` with columns: `"Role"` (`colRole`), `"Character"` (`colCharacter`), `"Player"` (`colPlayer`, with optional `"(bot)"`), `"Prestige"` (`colPrestige`), `"Bloodpoints"` (`colBloodpoints`), `"Status"` (`colStatus`), and `"Loadout"` (`colLoadout`: `"Perks:"`, optional `"Item:"`, `"Add-ons:"`, `"Offering:"`, or `"Hidden until the match ends"`, with `"none"`, `"not recognised"`, or `"(unsure)"` slot markers).
        - Verification Checks list (`"Checks"` / `checks`): `"Screenshot owner identified"` (`checkPovIdentified`) and `"Your account name is on the screenshot"` (`checkPlayerName`) with `CheckMark` + `"Matched"` / `"Failed"` / `"Skipped"`.
        - Conditional `"Warnings"` (`warnings`) bullet list and `"Fingerprint: {fingerprint}"` (`fingerprint`).
        - Footer button: primary `Button` `"Check another"` (`checkAnother`, resets modal to Upload view).

17. **Vector Map Engine Test Modal (`components/admin/VectorMapTestModal.tsx`, `components/maps/MapLayoutView.tsx`, `components/maps/MapLegend.tsx`)**:
    - **Trigger**: Clicking `"Open"` on the `"Vector Map Engine"` row in `AdminToolsSection`.
    - **Elements (`Modal` `variant="dialog"`, `size="5xl"`, `testId="vector-map-test-modal"`, title `"Vector Map Engine"` / `admin.vectorMapTest`)**:
      - **Header Controls**:
        - `"Select a map"` (`admin.vectorMapSelect`, `#admin-vector-map-select`): `Select` dropdown listing all maps as `"{map.name} ({map.realm || 'No Realm'})"`.
        - Surface Area Chip (when `activeMap.size_sq_tiles != null`): `Compass` icon + `{size_sq_tiles}` + `"sqT"` (`maps.sqTilesUnit`) + optional `"({value} m²)"` (`maps.sqMetersSuffix`).
        - Floor Switcher (`SegmentedControl`, shown when `layout.floors.length > 1`, `ariaLabel`: `"Floor"` / `maps.floorAria`): options `"Upper floor"` (`maps.floorUpper`), `"Lower floor"` (`maps.floorLower`), or `"Floor {n}"`.
        - Legend Toggle `Button` (`Info` icon, `aria-label`: `"Toggle Map Legend"` / `maps.legendToggleAria`, tooltip `"Map Legend"` / `maps.legendTitle`, `aria-pressed={isLegendOpen}`).
      - **Viewport States & Canvas**:
        - Loading layout: pulsing `MapIcon` + `"Loading layout..."` (`admin.vectorMapLoading`).
        - Error state: red alert text.
        - No layout footprint: `"No vector layout footprint found for this map."` (`admin.vectorMapNoLayout`).
        - Active layout: `MapLayoutView` SVG rendering floor outline, 8 m grid, 16 m dashed game tiles, blocked zones, room labels, `MapLandmarks` (`Building2` Main Building, `Home` Shack, feature callout chips), 12-clock orientation numbers (`1`–`12` + `"MID"` / `maps.calloutMid`), and `"32 m"` scale bar (`maps.metresValue`).
        - Conditional Legend Overlay (`MapLegend.tsx`, shown when `isLegendOpen` is true): floating card (`aria-label`: `"Map Legend"`) with header `"Map Legend"`, close `X` icon button (`"Close"`), `"Main Building"` (`Building2` icon), `"Shack"` (`Home` icon), `"12-Clock Orientation"` (`Compass` icon + `"Clock numbers 1–12 indicate competitive compass callouts from map center"`), and floor `"Landmarks & Features"` code chips (`C|H`, `H/FB`, `WT`, `CT`, `GARDEN`, `STATUE`, `H`, `T`, `P`, `UFO`, `MD`, `BD` mapped to localized names).
      - **Scale / Landmark Approximation Footnote (conditional)**: `"Approximate scale: no measured outline is published for this map."` (`maps.layoutApprox`) or `"Landmark positions are approximate."` (`maps.landmarksApprox`).

---

## /admin-entry

### Page & files
- **Route page**: `app/[locale]/admin-entry/page.tsx` (metadata title `app.title`: `"LemonDBD"`, `noindex: true`; served by `proxy.ts` in place of `/admin` to any visitor who is not a signed-in admin, including during maintenance mode)
- **Main component**: `components/admin/AdminEntryPage.tsx`
- **Rendered modal & sub-components**:
  - `components/AuthModal.tsx` (rendered with `isOpen={true}`, `adminOnly={true}`)
  - `components/auth/AuthModalParts.tsx` (`authModalTitle`, `AuthField`, `SecurityCheck`, `SubmitLabel`, `DemoAccountButtons`)
  - `components/common/AltchaWidget.tsx`
  - `components/EmailVerificationForm.tsx`
  - `components/auth/TwoFactorChallengeForm.tsx`
  - `components/auth/CodeInput.tsx`
  - `components/moderation/AccountBlockedNotice.tsx`
  - `components/legal/LegalDocModal.tsx`
- **Locales**: `locales/en/user.ts`, `locales/en/twoFactor.ts`, `locales/en/moderation.ts`, `locales/en/modal.ts`

### Layout elements
- **Shell Override (`useShellOverride(false)`)**: suppresses the standard `AppShell` sidebar/navigation chrome so the page is a bare backdrop hosting the sign-in dialog.
- **Admin Sign-In Dialog (`AuthModal` with `isOpen`, `adminOnly={true}`)**:
  - `Modal` (`variant="dialog"`, `size="md"`, `ariaLabel="Authentication"`, close button `X` `aria-label`: `"Close"` / `modal.close`).
  - Closing the dialog (`onClose`) navigates via `window.location.assign('/{locale}')` to the public home page.
  - Completing sign-in (`onSignedIn`) navigates via `window.location.assign('/{locale}/admin')` to the admin panel.
  - **Admin-Only Restrictions (`adminOnly={true}`)**:
    - Hides `"Forgot password?"` link.
    - Hides `GoogleSignInSection` (`"or"` divider + Google button).
    - Hides `ModeSwitchLink` (`"Don't have an account? Register"`), locking the form to sign-in (`mode === 'login'`).
    - Sends `admin_only: true` in the login payload so the server rejects non-admin accounts.
  - **Primary Sign-In Form (`mode === 'login'`, shown when `!notice && !isAltchaVerifying`)**:
    - Dialog Title: `"Sign In"` (`user.authSignInTitle`).
    - `"Login or Email"` (`user.loginOrEmailLabel`): required text `Input`.
    - `"Password"` (`user.passwordLabel`): required password `Input`.
    - **Bot Protection (`AltchaWidget.tsx`)**:
      - Hidden honeypot input (`website_trap`, `tabIndex={-1}`, `aria-hidden="true"`).
      - Conditional status `output` when verifying or on error (`ShieldAlert` icon + error message + `"Retry"` / `modal.retry` button).
    - **Submit Button**: primary `Button` (`type="submit"`, full-width, disabled until ALTCHA is verified) with `LogIn` icon + `"Sign In"` (`user.signIn`).
    - **Development-Only Demo Account Section (`DemoAccountButtons`, shown only when `demoAccounts.length > 0`, i.e. `FLASK_ENV=development`)**:
      - Divider + heading `"Quick Demo Accounts"` (`user.quickDemoAccounts`).
      - Single button (since `adminOnly={true}` hides the player demo button): `Button` (variant `soft`, size `xs`) with `ShieldAlert` icon + `"Admin (lemon)"` (`user.adminDemo`), which autofills the demo admin login and password.

### Modes / states
- **Mode 1: ALTCHA Security Check Loader (`!notice && isAltchaVerifying`)**:
  - Replaces the form body while the proof-of-work challenge is being solved: centered `Spinner` + `"Running security check"` (`user.authSecurityCheck`).
- **Mode 2: Sign-In Form (`!notice && !isAltchaVerifying`, `mode === 'login'`)**:
  - Standard admin login form with optional red alert banner (`div[role="alert"]` with `CircleAlert` icon + `error` or `"Invalid credentials"` / `user.invalidCredentials`).
- **Mode 3: Two-Factor Challenge Step (`notice.type === 'two-factor'`, `TwoFactorChallengeForm.tsx`)**:
  - Dialog Title switches to: `"Two-step verification"` (`twoFactor.challengeTitle`).
  - **Sub-mode 3a: Authenticator App Code (`!useRecovery`, default)**:
    - Subtitle: `"Enter the 6-digit code from your authenticator app."` (`twoFactor.challengeSubtitle`).
    - `CodeInput` (`CodeInput.tsx`): 6 single-digit numeric inputs (`aria-label`: `"Digit {n} of verification code"` / `user.digitAriaLabel`).
  - **Sub-mode 3b: Recovery Code (`useRecovery === true`)**:
    - Subtitle: `"Enter one of your recovery codes. Each one works only once."` (`twoFactor.challengeRecoverySubtitle`).
    - `Input`: text input (`aria-label`: `"Recovery code"` / `twoFactor.recoveryCodeLabel`, placeholder `"XXXXX-XXXXX"` / `twoFactor.recoveryCodePlaceholder`).
  - Shared 2FA controls:
    - Conditional error alert (`p[role="alert"]`): `"That code is not valid. Check it and try again."` (`errInvalidCode`), `"Too many wrong codes. Try again in a few minutes."` (`errLocked`), `"This sign-in step expired. Go back and sign in again."` (`errChallengeExpired`), etc.
    - Submit `Button` (primary, full-width): `"Verify"` (`twoFactor.challengeSubmit`).
    - Toggle method link `Button`: `"Use a recovery code instead"` (`twoFactor.useRecoveryCode`) / `"Use the authenticator app instead"` (`twoFactor.useAppCode`).
    - Back link `Button`: `"Back to sign in"` (`twoFactor.backToSignIn`).
- **Mode 4: Email Verification Step (`notice.type === 'verify-reminder'`, `EmailVerificationForm.tsx`)**:
  - Triggered if the account requires email verification before sign-in completes.
  - Dialog Title switches to: `"Verify Email"` (`user.authVerifyEmailTitle`).
  - Subtitle: `"Enter the code we sent to {email}."` (`user.authVerifySubtitle`).
  - Conditional error alert (`p[role="alert"]`): `"Invalid verification code."` (`user.invalidVerificationCode`) or `"Failed to resend code."` (`user.failedToResendCode`).
  - `CodeInput`: 6 single-digit numeric inputs.
  - Submit `Button` (primary, full-width): `"Verify"` (`user.verifyEmailAction`) / `"Verifying..."` (`user.verifying`).
  - Resend link `Button`: `"Resend code"` (`user.resendCode`) or `"Resend code in {seconds}s"` (`user.resendCodeIn` during cooldown).
- **Mode 5: Account Blocked / Suspended Notice (`notice.type === 'blocked'`, `AccountBlockedNotice.tsx`)**:
  - Dialog Title switches to: `"This account is banned"` (`moderation.blocked.bannedTitle`) or `"This account is suspended"` (`moderation.blocked.suspendedTitle`).
  - Red alert box with `Ban` or `Clock` icon + `"A moderator permanently banned this account, so it can no longer sign in."` (`bannedBody`) or `"A moderator suspended this account until {date}. You can sign in again after that."` (`suspendedBody`).
  - `"Reason: {reason}"` (`moderation.blocked.reasonLabel`).
  - Appeal text: `"If you think this is a mistake, write to {contact} within 6 months and a person will review the decision."` (`appealWithContact`) or `"If you think this is a mistake, contact the site team and ask for the decision to be reviewed."` (`appealNoContact`).
  - Primary full-width `Button`: `"Close"` (`moderation.blocked.close` -> navigates to `/{locale}`).

### Modals & drawers (file)
- **Admin Sign-In Dialog (`components/AuthModal.tsx`)**:
  - Always open (`isOpen={true}`, `adminOnly={true}`) as the sole UI of `/admin-entry`; closing redirects to `/{locale}`.
- **Legal Document Preview Modal (`components/legal/LegalDocModal.tsx`)**:
  - Mounted inside `AuthModal.tsx` (`<LegalDocModal doc={legalDoc} onClose={() => setLegalDoc(null)} />`); remains closed (`doc === null`) in `adminOnly` mode because registration is hidden.
