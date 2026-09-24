# Design Spec: Onboarding UI Redesign & Configurable Email Verification

## 1. Overview

This design addresses two key areas:
1. **Onboarding Page (`/welcome`) UI/UX Redesign**:
   - Consolidate the disparate top header, the "Jak to działa" (How it works) explanation, and the DLC chapter grid into a unified, cleanly partitioned card container.
   - Center all elements within the "Jak to działa" block.
   - Position legend labels beneath (or above) the character preview cards instead of floating to their right.
   - Integrate the DLC chapter grid and "Posiadam wszystko" button directly inside the unified block, partitioned with horizontal divider lines.
2. **Configurable Email Verification via `.env`**:
   - Add a `REQUIRE_EMAIL_VERIFICATION` environment variable (boolean).
   - When set to `false`, new registrations automatically set `is_verified=True`, skip sending verification emails, and allow instant access without entering a verification code.
   - When set to `true`, existing email verification workflow is preserved.

---

## 2. Onboarding UI Redesign Details

### 2.1 Unified Layout Structure in `CharacterOnboardingWizard.tsx`

Currently, `/welcome` (in `roster` view) renders:
- An external `<header>` with title, subtitle, and an absolute "Pomiń" button.
- An external `<section>` for "Jak to działa" with left-aligned legend items.
- An external `<div>` with the "Posiadam wszystko" button.
- An external `<div>` grid with chapter cards.

**New Unified Structure:**
```tsx
<div className="min-h-screen bg-bg-primary p-4 sm:p-8">
  <div className="mx-auto max-w-5xl 2xl:max-w-[90rem]">
    {/* Unified Main Card Block */}
    <div className="rounded-2xl border border-border-color bg-bg-surface p-6 sm:p-8 shadow-2xl space-y-8">
      
      {/* 1. Header Section */}
      <div className="relative flex flex-col items-center text-center space-y-3 pt-2">
        {/* Skip button in header corner or row */}
        <div className="absolute right-0 top-0 hidden sm:block">
          <button onClick={() => setIsSkipModalOpen(true)} className="rounded-xl border border-accent-amber/50 bg-accent-amber/10 px-4 py-2 text-xs font-bold text-accent-amber hover:bg-accent-amber/20 transition-colors">
            {t?.skipButton || 'Skip'}
          </button>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-text-primary">
          {t?.heading}
        </h1>
        <p className="text-sm text-text-secondary max-w-2xl mx-auto">
          {t?.subheading}
        </p>
        {/* Mobile Skip button */}
        <div className="sm:hidden pt-1">
          <button onClick={() => setIsSkipModalOpen(true)} className="rounded-xl border border-accent-amber/50 bg-accent-amber/10 px-4 py-2 text-xs font-bold text-accent-amber">
            {t?.skipButton || 'Skip'}
          </button>
        </div>
      </div>

      {/* Horizontal Divider */}
      <hr className="border-t border-border-color/60 my-6" />

      {/* 2. "Jak to działa" (How it works) Legend Section */}
      <div className="flex flex-col items-center text-center space-y-6">
        <h2 className="text-xs font-black uppercase tracking-wider text-accent-red font-mono">
          {t?.legendTitle || 'Jak to działa'}
        </h2>

        {/* 3 Vertically Stacked Legend Cards Centered in Row */}
        <div className="flex flex-wrap items-start justify-center gap-6 sm:gap-10 w-full">
          {/* Legend Item 1: Owned */}
          <div className="flex flex-col items-center text-center gap-2 max-w-[130px]">
            <span className="relative flex aspect-[3/4] w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-accent-green/40 bg-accent-green/20 shadow-sm">
              <CharacterOwnershipOverlay isOwned hasPartialPerks={false} avatarSrc={...} />
            </span>
            <span className="text-xs font-semibold text-text-primary leading-tight">
              {t?.legendOwned}
            </span>
          </div>

          {/* Legend Item 2: Locked */}
          <div className="flex flex-col items-center text-center gap-2 max-w-[130px]">
            <span className="relative flex aspect-[3/4] w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-accent-red bg-bg-elevated shadow-sm">
              <CharacterOwnershipOverlay isOwned={false} hasPartialPerks={false} avatarSrc={...} />
            </span>
            <span className="text-xs font-semibold text-text-primary leading-tight">
              {t?.legendLocked}
            </span>
          </div>

          {/* Legend Item 3: Partial */}
          <div className="flex flex-col items-center text-center gap-2 max-w-[130px]">
            <span className="relative flex aspect-[3/4] w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-accent-amber bg-bg-elevated shadow-sm">
              <CharacterOwnershipOverlay isOwned={false} hasPartialPerks avatarSrc={...} />
            </span>
            <span className="text-xs font-semibold text-text-primary leading-tight">
              {t?.legendPartial}
            </span>
          </div>
        </div>

        {/* Legend Hint */}
        <p className="text-xs text-text-secondary max-w-lg mx-auto">
          {t?.legendCustomizeHint}
        </p>
      </div>

      {/* Horizontal Divider */}
      <hr className="border-t border-border-color/60 my-6" />

      {/* 3. DLC Section (Actions + Chapters Grid) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-text-secondary font-mono">
            {dict?.admin?.chapters || 'DLC & Chapters'}
          </span>
          <button
            type="button"
            onClick={handleSelectAllChapters}
            className="rounded-lg border border-border-color px-3.5 py-1.5 text-xs font-bold text-text-secondary hover:border-accent-amber hover:text-accent-amber transition-colors cursor-pointer"
          >
            {t?.selectAllButton || 'I own everything'}
          </button>
        </div>

        {/* DLC Chapter Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Chapter cards and expandable rows */}
        </div>
      </div>

    </div>
  </div>

  {/* Sticky bottom save bar */}
  ...
</div>
```

---

## 3. Configurable Email Verification

### 3.1 Environment Variable
- Name: `REQUIRE_EMAIL_VERIFICATION`
- Default: `true` (maintains backwards compatibility)
- Accepted values: `true`, `1`, `yes`, or `false`, `0`, `no` (case-insensitive)

### 3.2 Backend Implementation
1. **`backend/app/core/config.py`**:
   ```python
   REQUIRE_EMAIL_VERIFICATION: bool = os.getenv(
       "REQUIRE_EMAIL_VERIFICATION", "true"
   ).lower() in ("true", "1", "yes")
   ```
2. **`backend/app/services/user/auth.py` -> `create_user_account`**:
   - Check `current_app.config.get("REQUIRE_EMAIL_VERIFICATION", True)`.
   - If `False`:
     - Create user with:
       - `is_verified = True`
       - `verification_code = None`
       - `verification_code_expires_at = None`
     - Do not call `send_verification_email(new_user)`.
   - If `True`:
     - Keep current flow (`is_verified = False`, generate 6-digit code, dispatch verification email).
3. **Documentation**:
   - Add entry with explanatory comments to `.env.example`, `.env.dev`, and `.env.prod`.

### 3.3 Frontend Integration
1. **`frontend/src/components/AuthModal.tsx`**:
   - In `handleSubmit` during registration:
     - Check `if (res.user && !res.user.is_verified)`.
     - When `is_verified` is true (verification disabled):
       - Do not prompt for code or switch to email verification form.
       - Close modal (`onClose()`).
       - If onboarding is not completed (`!res.user.onboarding_completed_at`), redirect to `/${locale}/welcome`.

---

## 4. Verification & Testing

1. **Frontend Unit Tests**:
   - Verify `CharacterOnboardingWizard` renders the unified block, centered legend layout, stacked labels, and divider lines.
   - Run `npm run test:unit`, `npm run check:i18n`, `npm run check:styles`.
2. **Backend Unit & Live Tests**:
   - Add test case verifying registration with `REQUIRE_EMAIL_VERIFICATION=False` yields `user.is_verified == True` and sends 0 emails.
   - Add test case verifying registration with `REQUIRE_EMAIL_VERIFICATION=True` yields `user.is_verified == False` and sends verification code.
   - Run backend test suite.
