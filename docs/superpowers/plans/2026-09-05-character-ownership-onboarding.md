# Character Ownership Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a new user verifies their email, send them to a standalone `/[locale]/welcome` page where they pick which Survivor/Killer characters (and, per-exception, individual perks) they already own, grouped by chapter/DLC so they aren't clicking through 98 characters one at a time -- with a bottom-right "Skip" button that opens a confirmation modal explaining that skipping leaves only the free base-game roster unlocked.

**Architecture:** Reuses the ownership data model and bulk-update API that already exist for `CharactersHub.tsx` (`bulkUpdateCharacterOwnership`, `bulkUpdatePerkOwnership` on `useAuth()`) -- no new ownership logic. Adds one new nullable `onboarding_completed_at` column on `users` (backend) plus a small "mark complete" endpoint, so the app can tell whether to redirect a freshly-verified user to the wizard or straight into the app. The wizard groups the existing character catalog by its existing `chapter_name` field and lets the user bulk-toggle a whole chapter, with a per-character "customize perks" escape hatch identical in behavior to `CharactersHub`'s existing perks popup. A new shared presentational component captures the exact locked/owned/partial visual treatment already used in `CharactersHub` so the wizard's legend and the real grid look identical.

**Tech Stack:** Flask + SQLAlchemy + Alembic (backend), Next.js 16 (App Router) + React + TypeScript + Tailwind (frontend), `node:test` via `tsx` (frontend unit tests), `pytest` (backend unit tests).

**Spec:** This plan's spec is this document's Goal/Architecture plus the conversation it came from -- no separate spec file exists. Key agreed decisions, carried forward as constraints below.

## Global Constraints

- No `dict?: any` anywhere -- every new type must be concrete (project-wide rule, `CLAUDE.md`).
- No em dash (`—`) in any UI copy or dictionary string (project-wide rule, `CLAUDE.md`).
- Keep commits to a single line, no long explanatory bodies (user preference).
- The onboarding wizard must expose **both** whole-character toggles (grouped by chapter) **and** per-perk overrides within an owned/unlocked character -- not characters-only (explicit user decision).
- Whether a user has completed onboarding must be tracked with a **new persisted column** (`onboarding_completed_at`), not inferred from existing ownership rows (explicit user decision).
- Skipping onboarding must leave the user in the same state a fresh registration already produces: only the hardcoded free base-game roster owned/unlocked, everything else locked. Confirmed via `backend/app/services/ownership/characters.py` (`seed_default_ownership_for_new_user`, called at `backend/app/routes/auth.py:44` on every registration) -- this already happens automatically, so "Skip" requires **no ownership API calls at all**, only stamping the new column.
- `CharactersHub.tsx`'s character grid should show 8 columns per row at the widest breakpoint instead of 6, to cut down on scrolling (separate, independent request bundled into this same branch).

---

### Task 1: Backend -- `onboarding_completed_at` column

**Files:**
- Modify: `backend/app/models/user.py` (add column to `User`, ~after line 50 `reset_token_expires_at`)
- Modify: `backend/app/schemas/user.py` (add field to `UserResponse`)
- Create: `backend/migrations/versions/onboarding_flag_001.py`
- Test: `backend/tests/unit/test_onboarding.py` (new file)

**Interfaces:**
- Produces: `User.onboarding_completed_at: datetime | None` (SQLAlchemy attribute), `UserResponse.onboarding_completed_at: datetime | None` (serialized as ISO string or `null` in every `/auth/*` and `/users/*` JSON response that already returns a user).

- [ ] **Step 1: Add the column to the `User` model**

In `backend/app/models/user.py`, add this attribute right after `reset_token_expires_at` (currently ends at line 50):

```python
    onboarding_completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
```

Also add it to `to_dict()` (the dict literal at line 82-92), right after `"is_verified": self.is_verified,`:

```python
            "onboarding_completed_at": self.onboarding_completed_at.isoformat() if self.onboarding_completed_at else None,
```

- [ ] **Step 2: Add the field to the API response schema**

In `backend/app/schemas/user.py`, add to `UserResponse` (currently `id`, `created_at`, `updated_at`, `model_config`):

```python
class UserResponse(UserBase):
    id: int
    created_at: datetime | None = None
    updated_at: datetime | None = None
    onboarding_completed_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
```

- [ ] **Step 3: Write the migration**

Create `backend/migrations/versions/onboarding_flag_001.py`:

```python
# backend/migrations/versions/onboarding_flag_001.py
"""add onboarding_completed_at to users

Revision ID: onboarding_flag_001
Revises: user_showcase_001
Create Date: 2026-09-05 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "onboarding_flag_001"
down_revision = "user_showcase_001"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("onboarding_completed_at", sa.DateTime(timezone=True), nullable=True)
        )


def downgrade():
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("onboarding_completed_at")
```

- [ ] **Step 4: Write the failing test**

Create `backend/tests/unit/test_onboarding.py`:

```python
# backend/tests/unit/test_onboarding.py
from flask.testing import FlaskClient


def test_fresh_user_has_no_onboarding_timestamp(client: FlaskClient) -> None:
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "username": "onboardcheck",
            "email": "onboardcheck@example.com",
            "password": "password123",
        },
    )
    assert reg_res.status_code == 201
    data = reg_res.get_json()
    assert data["user"]["onboarding_completed_at"] is None

    token = data["token"]
    me_res = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert me_res.status_code == 200
    assert me_res.get_json()["user"]["onboarding_completed_at"] is None
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `cd backend && python -m pytest tests/unit/test_onboarding.py -v`
Expected: FAIL (`onboarding_completed_at` missing from response, since the model/schema changes above are already applied at this point it should actually PASS if steps 1-3 were done correctly first -- if it fails with a `KeyError`/`None` mismatch, re-check steps 1-3 before proceeding, since this task's steps are ordered implementation-first by necessity of the DB column existing for the test DB to create it).

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd backend && python -m pytest tests/unit/test_onboarding.py -v`
Expected: PASS (unit tests use `sqlite:///:memory:` + `db.create_all()` per `backend/tests/unit/conftest.py:35-40`, which picks up the new mapped column directly from the model -- the Alembic migration is exercised only by the running dev/prod containers via `backend/scripts/sync_db_schema.py` on next `docker compose build backend && docker compose up -d backend`, not by this test suite).

- [ ] **Step 7: Commit**

```bash
git add backend/app/models/user.py backend/app/schemas/user.py backend/migrations/versions/onboarding_flag_001.py backend/tests/unit/test_onboarding.py
git commit -m "feat: add onboarding_completed_at column to users"
```

---

### Task 2: Backend -- mark-onboarding-complete endpoint

**Files:**
- Modify: `backend/app/services/user/profile.py` (add `mark_onboarding_complete`)
- Modify: `backend/app/services/user_service.py` (delegate to it)
- Modify: `backend/app/routes/users.py` (new route)
- Test: `backend/tests/unit/test_onboarding.py` (extend from Task 1)

**Interfaces:**
- Consumes: `User` model from Task 1 (`onboarding_completed_at` column).
- Produces: `UserService.mark_onboarding_complete(user_id: int) -> tuple[User | None, str | None]`; route `POST /api/v1/users/<int:user_id>/onboarding/complete` returning `{"status": "success", "user": UserResponse.model_validate(user).model_dump()}`.

- [ ] **Step 1: Write the failing test**

Append to `backend/tests/unit/test_onboarding.py`:

```python
from app.models import User
from app.core.extensions import db


def test_mark_onboarding_complete_endpoint(client: FlaskClient) -> None:
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "username": "onboardmarker",
            "email": "onboardmarker@example.com",
            "password": "password123",
        },
    )
    data = reg_res.get_json()
    token = data["token"]
    user_id = data["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    complete_res = client.post(
        f"/api/v1/users/{user_id}/onboarding/complete", headers=headers
    )
    assert complete_res.status_code == 200
    assert complete_res.get_json()["user"]["onboarding_completed_at"] is not None

    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.get_json()["user"]["onboarding_completed_at"] is not None


def test_mark_onboarding_complete_rejects_other_users(client: FlaskClient) -> None:
    reg_a = client.post(
        "/api/v1/auth/register",
        json={"username": "userA", "email": "usera@example.com", "password": "password123"},
    ).get_json()
    reg_b = client.post(
        "/api/v1/auth/register",
        json={"username": "userB", "email": "userb@example.com", "password": "password123"},
    ).get_json()

    headers_a = {"Authorization": f"Bearer {reg_a['token']}"}
    res = client.post(
        f"/api/v1/users/{reg_b['user']['id']}/onboarding/complete", headers=headers_a
    )
    assert res.status_code == 403
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/unit/test_onboarding.py -v`
Expected: FAIL with 404 (route doesn't exist yet).

- [ ] **Step 3: Implement the service function**

In `backend/app/services/user/profile.py`, add after `modify_user_profile` (which ends with `return user, None` around line 41):

```python
def mark_onboarding_complete(user_id: int) -> tuple[User | None, str | None]:
    """Stamp the character-ownership onboarding wizard as done for a user."""
    user = db.session.get(User, user_id)
    if not user:
        return None, "User not found."

    from app.models.base import utcnow
    user.onboarding_completed_at = utcnow()
    db.session.commit()
    return user, None
```

- [ ] **Step 4: Wire it through `UserService`**

In `backend/app/services/user_service.py`, add after `update_user_profile` (ends at line 75):

```python
    def mark_onboarding_complete(self, user_id: int) -> tuple[User | None, str | None]:
        return mark_onboarding_complete(user_id)
```

Add `mark_onboarding_complete` to the existing `from app.services.user.profile import (...)` import block at the top of that file (find it near the other `profile` imports such as `modify_user_profile`).

- [ ] **Step 5: Add the route**

In `backend/app/routes/users.py`, add after `set_single_character_ownership` (or anywhere alongside the other `/users/<int:user_id>/...` routes, e.g. right before `get_user_perks`):

```python
@users_bp.route("/users/<int:user_id>/onboarding/complete", methods=["POST"])
@login_required
def mark_user_onboarding_complete(user_id: int):
    """Stamp the character-ownership onboarding wizard as done."""
    curr = g.current_user
    if curr.id != user_id and curr.role != "admin":
        return jsonify({"error": "Unauthorized.", "status": 403}), 403

    user, err = user_service.mark_onboarding_complete(user_id)
    if err:
        return jsonify({"error": err, "status": 404}), 404

    return jsonify({
        "status": "success",
        "user": UserResponse.model_validate(user).model_dump(),
    }), 200
```

Check the top of `backend/app/routes/users.py` for an existing `from app.schemas.user import UserResponse` import (used by other routes in that file) and add it if missing.

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/unit/test_onboarding.py -v`
Expected: PASS (both tests).

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/user/profile.py backend/app/services/user_service.py backend/app/routes/users.py backend/tests/unit/test_onboarding.py
git commit -m "feat: add endpoint to mark character onboarding complete"
```

---

### Task 3: Frontend -- `AuthContext` plumbing

**Files:**
- Modify: `frontend/src/context/AuthContext.tsx`

**Interfaces:**
- Consumes: backend `onboarding_completed_at` field from Task 1/2 (present on every `/auth/*` and `/users/*` user JSON already).
- Produces: `UserProfile.onboarding_completed_at?: string | null`; `verifyEmail(email, code): Promise<{ success: boolean; error?: string; user?: UserProfile }>` (changed return shape -- now includes `user`, matching `login`/`register`); new `markOnboardingComplete(): Promise<boolean>` on `useAuth()`.

- [ ] **Step 1: Add the field to `UserProfile`**

In `frontend/src/context/AuthContext.tsx`, add to the `UserProfile` interface (currently lines 6-15, ends with `created_at?: string;`):

```typescript
  onboarding_completed_at?: string | null;
```

- [ ] **Step 2: Change `verifyEmail`'s return shape**

Update the interface declaration (line 46):

```typescript
  verifyEmail: (email: string, code: string) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
```

Update the implementation (currently lines 165-180):

```typescript
  const verifyEmail = async (email: string, code: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Invalid verification code.' };
      }
      return { success: true, user: data.user as UserProfile };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error occurred.' };
    }
  };
```

Update `handlersRef`'s `verifyEmail: (email: string, code: string) => handlersRef.current.verifyEmail(email, code),` line (line 375) -- no change needed there, the wrapper already forwards the return value as-is.

- [ ] **Step 3: Add `markOnboardingComplete`**

Add to the `AuthContextType` interface (after `bulkUpdatePerkOwnership` at line 53):

```typescript
  markOnboardingComplete: () => Promise<boolean>;
```

Add the implementation after `bulkUpdatePerkOwnership` (currently ends at line 329):

```typescript
  const markOnboardingComplete = async (): Promise<boolean> => {
    if (!token || !user) return false;
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/${user.id}/onboarding/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await refreshUser();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to mark onboarding complete:', err);
      return false;
    }
  };
```

Add `markOnboardingComplete` to both the `handlersRef` initial object and its reassignment (lines 338-351 and 352-365), and to the `actions` `useMemo` (after `bulkUpdatePerkOwnership`'s entry, ending at line 389):

```typescript
      markOnboardingComplete: () => handlersRef.current.markOnboardingComplete(),
```

- [ ] **Step 4: Write the failing unit test**

Create `frontend/src/__tests__/unit/authOnboarding.test.ts`:

```typescript
// frontend/src/__tests__/unit/authOnboarding.test.ts
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('AuthContext exposes onboarding fields and methods', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/context/AuthContext.tsx'),
    'utf-8'
  );
  assert.match(source, /onboarding_completed_at\?: string \| null;/);
  assert.match(source, /markOnboardingComplete: \(\) => Promise<boolean>;/);
  assert.match(
    source,
    /verifyEmail: \(email: string, code: string\) => Promise<\{ success: boolean; error\?: string; user\?: UserProfile \}>;/
  );
});
```

This is a source-inspection smoke test (matching the style of `frontend/src/__tests__/unit/umamiComponents.test.ts`, which asserts on component export shape rather than mounting React) -- `AuthContext.tsx` has no existing render-based test harness to hook into, so this catches accidental signature drift without introducing one.

- [ ] **Step 5: Run test to verify it fails**

Run: `cd frontend && npx tsx --test src/__tests__/unit/authOnboarding.test.ts`
Expected: FAIL (patterns not present yet, if run before Steps 1-3; if Steps 1-3 are already done, skip to Step 6).

- [ ] **Step 6: Run test to verify it passes**

Run: `cd frontend && npx tsx --test src/__tests__/unit/authOnboarding.test.ts`
Expected: PASS.

- [ ] **Step 7: Run full frontend typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors from `AuthContext.tsx`.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/context/AuthContext.tsx frontend/src/__tests__/unit/authOnboarding.test.ts
git commit -m "feat: add onboarding fields and mark-complete action to AuthContext"
```

---

### Task 4: Frontend -- redirect after verification

**Files:**
- Modify: `frontend/src/components/EmailVerificationForm.tsx`
- Modify: `frontend/src/components/AuthModal.tsx`

**Interfaces:**
- Consumes: `verifyEmail` new return shape and `UserProfile` type from Task 3.
- Produces: `EmailVerificationFormProps.onVerified?: (user?: UserProfile) => void` (changed signature).

- [ ] **Step 1: Update `EmailVerificationForm`'s `onVerified` signature**

In `frontend/src/components/EmailVerificationForm.tsx`, add the import:

```typescript
import type { UserProfile } from '@/context/AuthContext';
```

Change the prop type (currently `onVerified?: () => void;` in `EmailVerificationFormProps`):

```typescript
  onVerified?: (user?: UserProfile) => void;
```

Change `handleSubmit` (currently lines 75-88):

```typescript
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setVerifying(true);
    const res = await verifyEmail(email, code);
    setVerifying(false);

    if (res.success) {
      await refreshUser();
      onVerified?.(res.user);
    } else {
      setError(res.error || t?.invalidVerificationCode || null);
    }
  };
```

- [ ] **Step 2: Wire the redirect in `AuthModal`**

In `frontend/src/components/AuthModal.tsx`, add imports:

```typescript
import { useRouter, usePathname } from 'next/navigation';
```

Inside the component body, near the existing `const { login, register, forgotPassword } = useAuth();` (line 45), add:

```typescript
  const router = useRouter();
  const pathname = usePathname();
```

Change the `EmailVerificationForm`'s `onVerified` prop (currently `onVerified={onClose}` at line 217):

```typescript
              onVerified={(verifiedUser) => {
                onClose();
                if (verifiedUser && !verifiedUser.onboarding_completed_at) {
                  const locale = pathname?.split('/')[1] || 'en';
                  router.push(`/${locale}/welcome`);
                }
              }}
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors in `EmailVerificationForm.tsx` or `AuthModal.tsx`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/EmailVerificationForm.tsx frontend/src/components/AuthModal.tsx
git commit -m "feat: redirect freshly verified users to the onboarding wizard"
```

---

### Task 5: Frontend -- `onboarding` i18n namespace

**Files:**
- Create: `frontend/src/locales/en/onboarding.ts`
- Create: `frontend/src/locales/pl/onboarding.ts`
- Create: `frontend/src/locales/es/onboarding.ts`
- Create: `frontend/src/locales/de/onboarding.ts`
- Create: `frontend/src/locales/ja/onboarding.ts`
- Modify: `frontend/src/locales/en/index.ts`, `pl/index.ts`, `es/index.ts`, `de/index.ts`, `ja/index.ts`

**Interfaces:**
- Produces: `dict.onboarding.*` keys available on the shared `Dictionary` type (auto-derived from `en/index.ts`, per `frontend/src/locales/types.ts`).

- [ ] **Step 1: Create the English namespace**

Create `frontend/src/locales/en/onboarding.ts`:

```typescript
// frontend/src/locales/en/onboarding.ts
export default {
  pageTitle: "LemonDBD - Welcome, set up your roster",
  heading: "Which characters do you already own?",
  subheading: "Pick the chapters you own so the perk randomizer and streaks only offer you perks you can actually use. You can always change this later from your Characters page.",
  legendTitle: "How this works",
  legendOwned: "Owned - fully available",
  legendLocked: "Locked - not available yet",
  legendPartial: "Partially unlocked - some perks unlocked by hand",
  legendCustomizeHint: "Tap a locked character's Perks button to unlock individual perks without owning the whole character.",
  ownChapterButton: "I own this chapter",
  lockChapterButton: "I don't own this chapter",
  perksButton: "Perks",
  continueButton: "Continue",
  skipButton: "Skip",
  skipModalTitle: "Skip character setup?",
  skipModalBody: "If you skip, only the free base-game characters will be unlocked for you. Everything else stays locked until you unlock it yourself from your Characters page later.",
  skipModalConfirm: "Yes, skip for now",
  skipModalCancel: "Go back",
  savingLabel: "Saving...",
};
```

- [ ] **Step 2: Duplicate into the other 4 locales (English copy, translation is a follow-up)**

Create `frontend/src/locales/pl/onboarding.ts`, `frontend/src/locales/es/onboarding.ts`, `frontend/src/locales/de/onboarding.ts`, `frontend/src/locales/ja/onboarding.ts` -- each with the exact same content as Step 1's file (same keys, same English strings, just the file header comment path changed to match, e.g. `// frontend/src/locales/pl/onboarding.ts`). Flag in the PR description that these four need real translation before this ships to real users, matching how new namespaces have been introduced before in this repo.

- [ ] **Step 3: Register the namespace in every locale's index**

In `frontend/src/locales/en/index.ts`, add the import (alongside the other imports, e.g. after `import changelog from './changelog';`):

```typescript
import onboarding from './onboarding';
```

And add `onboarding,` to the `const en = { ... }` object (after `changelog,`).

Repeat the identical two edits in `frontend/src/locales/pl/index.ts`, `es/index.ts`, `de/index.ts`, `ja/index.ts` (import + add to the exported object), matching whatever each file's own top-level variable is named (check each file -- they mirror `en/index.ts`'s structure with a differently-named local const).

- [ ] **Step 4: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors -- `Dictionary` is derived automatically from `en/index.ts`'s shape (per `frontend/src/locales/types.ts`), so `dict?.onboarding?.heading` etc. become valid immediately with no manual type edits.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/locales/en/onboarding.ts frontend/src/locales/pl/onboarding.ts frontend/src/locales/es/onboarding.ts frontend/src/locales/de/onboarding.ts frontend/src/locales/ja/onboarding.ts frontend/src/locales/en/index.ts frontend/src/locales/pl/index.ts frontend/src/locales/es/index.ts frontend/src/locales/de/index.ts frontend/src/locales/ja/index.ts
git commit -m "feat: add onboarding i18n namespace"
```

---

### Task 6: Frontend -- shared ownership-overlay component + `CharactersHub` grid density

**Files:**
- Create: `frontend/src/components/characters/CharacterOwnershipOverlay.tsx`
- Modify: `frontend/src/components/CharactersHub.tsx`
- Test: `frontend/src/__tests__/unit/characterOwnershipOverlay.test.ts`

**Interfaces:**
- Produces: `CharacterOwnershipOverlay(props: { isOwned: boolean; hasPartialPerks: boolean; avatarSrc: string; lockedTitle?: string; ownedTitle?: string }): JSX.Element` -- renders exactly the badge + grayscale/dim overlay treatment `CharactersHub.tsx` already uses (lines 441-492), reusable both inside `CharactersHub`'s grid and standalone (fixed props) for the onboarding wizard's 3 legend example images.
- Consumes: nothing new -- pure presentational component using the same Tailwind classes already in `CharactersHub.tsx`.

- [ ] **Step 1: Extract the component**

Create `frontend/src/components/characters/CharacterOwnershipOverlay.tsx`:

```typescript
// frontend/src/components/characters/CharacterOwnershipOverlay.tsx
import React from 'react';
import { Lock, Check } from 'lucide-react';

export interface CharacterOwnershipOverlayProps {
  isOwned: boolean;
  hasPartialPerks: boolean;
  avatarSrc: string;
  lockedTitle?: string;
  ownedTitle?: string;
}

/** The exact badge + grayscale/dim overlay treatment used for a character
 * card's ownership state (owned / locked / partially unlocked). Shared
 * between CharactersHub's real ownership grid and the onboarding wizard's
 * legend/example images, so both always look identical. */
export const CharacterOwnershipOverlay: React.FC<CharacterOwnershipOverlayProps> = ({
  isOwned,
  hasPartialPerks,
  avatarSrc,
  lockedTitle,
  ownedTitle,
}) => {
  const showLockedOverlay = !isOwned;

  return (
    <>
      {showLockedOverlay && (
        <div
          className="absolute top-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-bg-surface border border-accent-amber text-accent-amber shadow-xs backdrop-blur-md"
          title={lockedTitle}
        >
          <Lock className="h-3.5 w-3.5" />
        </div>
      )}
      {isOwned && (
        <div
          className="absolute top-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 backdrop-blur-md shadow-xs"
          title={ownedTitle}
        >
          <Check className="h-3.5 w-3.5" />
        </div>
      )}
      {showLockedOverlay && (
        <img
          src={avatarSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-top grayscale pointer-events-none"
          style={{ clipPath: hasPartialPerks ? 'inset(0 50% 0 0)' : 'inset(0 0 0 0)' }}
        />
      )}
      {showLockedOverlay && !hasPartialPerks && (
        <div className="absolute inset-0 bg-slate-950/50" />
      )}
      {hasPartialPerks && <div className="absolute inset-y-0 left-0 w-1/2 bg-slate-950/50" />}
    </>
  );
};

export default CharacterOwnershipOverlay;
```

- [ ] **Step 2: Write the failing test**

Create `frontend/src/__tests__/unit/characterOwnershipOverlay.test.ts`:

```typescript
// frontend/src/__tests__/unit/characterOwnershipOverlay.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { CharacterOwnershipOverlay } from '@/components/characters/CharacterOwnershipOverlay';

test('CharacterOwnershipOverlay is exported as a function component', () => {
  assert.strictEqual(typeof CharacterOwnershipOverlay, 'function');
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx tsx --test src/__tests__/unit/characterOwnershipOverlay.test.ts`
Expected: FAIL (module doesn't exist yet, if Step 1 wasn't done first; otherwise skip to Step 4).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx tsx --test src/__tests__/unit/characterOwnershipOverlay.test.ts`
Expected: PASS.

- [ ] **Step 5: Use it inside `CharactersHub.tsx` and bump the grid to 8 columns**

In `frontend/src/components/CharactersHub.tsx`:

1. Add the import: `import { CharacterOwnershipOverlay } from '@/components/characters/CharacterOwnershipOverlay';`
2. Change the grid container class (currently line 388):

```typescript
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 sm:gap-6"
```

3. Replace the inline ownership-badge blocks (currently lines 441-456: the two `{ownershipMode && !isOwned && (...)}` / `{ownershipMode && isOwned && (...)}` badge divs) and the inline overlay blocks (currently lines 478-492: the grayscale `<img>` + dim-overlay divs) with a single call, placed where the badges currently start:

```typescript
                {ownershipMode && (
                  <CharacterOwnershipOverlay
                    isOwned={isOwned}
                    hasPartialPerks={hasPartialPerks}
                    avatarSrc={avatarSrc}
                    lockedTitle={dict?.modal?.unownedPerk}
                    ownedTitle={dict?.filters?.ownedOnly}
                  />
                )}
```

Note this single block replaces two separate locations in the original file (the badges near the top of the card, and the grayscale overlay inside the image container) -- since `CharacterOwnershipOverlay` uses `absolute` positioning relative to its nearest positioned ancestor, place it directly inside the same `relative` image container div (`<div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-900">`, currently line 458) rather than at the old badge location, so both the badge and the image overlay keep rendering in the right place. Delete the old badge divs (lines 441-456) entirely since the new component already renders that badge.

- [ ] **Step 6: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Manual visual check**

Run: `docker compose build frontend && docker compose up -d frontend`, then open `https://localhost/en/characters`, toggle ownership mode, and confirm the grid now shows 8 columns at a wide viewport and the locked/owned/partial badges and overlays look pixel-identical to before the refactor.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/characters/CharacterOwnershipOverlay.tsx frontend/src/components/CharactersHub.tsx frontend/src/__tests__/unit/characterOwnershipOverlay.test.ts
git commit -m "refactor: extract character ownership overlay, widen CharactersHub grid to 8 columns"
```

---

### Task 7: Frontend -- Skip confirmation modal

**Files:**
- Create: `frontend/src/components/onboarding/SkipOnboardingModal.tsx`
- Test: `frontend/src/__tests__/unit/skipOnboardingModal.test.ts`

**Interfaces:**
- Produces: `SkipOnboardingModal(props: { isOpen: boolean; onCancel: () => void; onConfirm: () => void; dict?: Dictionary }): JSX.Element | null`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/unit/skipOnboardingModal.test.ts`:

```typescript
// frontend/src/__tests__/unit/skipOnboardingModal.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { SkipOnboardingModal } from '@/components/onboarding/SkipOnboardingModal';

test('SkipOnboardingModal is exported as a function component', () => {
  assert.strictEqual(typeof SkipOnboardingModal, 'function');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx tsx --test src/__tests__/unit/skipOnboardingModal.test.ts`
Expected: FAIL (module doesn't exist yet).

- [ ] **Step 3: Implement the modal**

Create `frontend/src/components/onboarding/SkipOnboardingModal.tsx`, following the exact overlay/dialog convention from `frontend/src/components/QuestsModal.tsx` (`fixed inset-0 z-50 ... bg-slate-950/70 backdrop-blur-md`, `role="dialog" aria-modal="true"`, outer `onClick={onCancel}` + inner `onClick={(e) => e.stopPropagation()}`):

```typescript
// frontend/src/components/onboarding/SkipOnboardingModal.tsx
'use client';
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Dictionary } from '@/locales/types';

export interface SkipOnboardingModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  dict?: Dictionary;
}

export const SkipOnboardingModal: React.FC<SkipOnboardingModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  dict,
}) => {
  if (!isOpen) return null;

  const t = dict?.onboarding;

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skip-onboarding-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl border border-border-color bg-bg-surface shadow-2xl text-text-primary animate-in zoom-in-95 duration-200 cursor-default p-6"
      >
        <div className="flex flex-col items-center text-center gap-3">
          <AlertTriangle className="h-9 w-9 text-accent-amber" />
          <h2 id="skip-onboarding-title" className="text-lg font-black">
            {t?.skipModalTitle || 'Skip character setup?'}
          </h2>
          <p className="text-xs text-text-secondary">
            {t?.skipModalBody ||
              'If you skip, only the free base-game characters will be unlocked for you. Everything else stays locked until you unlock it yourself from your Characters page later.'}
          </p>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border-color bg-bg-elevated py-2.5 text-xs font-black uppercase tracking-wider text-text-secondary hover:bg-bg-elevated/80 transition-colors cursor-pointer"
          >
            {t?.skipModalCancel || 'Go back'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-accent-amber hover:bg-accent-amber-hover py-2.5 text-xs font-black uppercase tracking-wider text-text-inverted transition-colors cursor-pointer"
          >
            {t?.skipModalConfirm || 'Yes, skip for now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SkipOnboardingModal;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx tsx --test src/__tests__/unit/skipOnboardingModal.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/onboarding/SkipOnboardingModal.tsx frontend/src/__tests__/unit/skipOnboardingModal.test.ts
git commit -m "feat: add skip-onboarding confirmation modal"
```

---

### Task 8: Frontend -- the `/welcome` onboarding page

**Files:**
- Create: `frontend/src/components/onboarding/CharacterOnboardingWizard.tsx`
- Create: `frontend/src/app/[locale]/welcome/page.tsx`
- Test: `frontend/src/__tests__/unit/characterOnboardingWizard.test.ts`

**Interfaces:**
- Consumes: `useAuth()` (`user`, `bulkUpdateCharacterOwnership`, `bulkUpdatePerkOwnership`, `markOnboardingComplete` from Task 3), `CharacterOwnershipOverlay` from Task 6, `SkipOnboardingModal` from Task 7, `dict.onboarding.*` from Task 5, `getBackendBaseUrl` from `@/utils/perkUtils`, character data shape `{ id, name, role, category, chapter_name, release_number, is_owned }` from `GET /api/v1/users/<id>/characters`, perk data shape `{ perk_id, name, character_id, is_teachable, is_unlocked, icon_url?, icon_local_path? }` from `GET /api/v1/users/<id>/perks` (both endpoints already existing, used today by `CharactersHub.tsx`).
- Produces: `CharacterOnboardingWizard(props: { locale: string; dict?: Dictionary; onFinished: () => void }): JSX.Element`. Supports both whole-character toggling (grouped by chapter) and per-perk overrides within a locked character, per the explicit decision in Global Constraints.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/__tests__/unit/characterOnboardingWizard.test.ts`:

```typescript
// frontend/src/__tests__/unit/characterOnboardingWizard.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { CharacterOnboardingWizard } from '@/components/onboarding/CharacterOnboardingWizard';
import { groupCharactersByChapter } from '@/components/onboarding/CharacterOnboardingWizard';

test('CharacterOnboardingWizard is exported as a function component', () => {
  assert.strictEqual(typeof CharacterOnboardingWizard, 'function');
});

test('groupCharactersByChapter groups and orders by release_number', () => {
  const chars = [
    { id: 3, name: 'C', chapter_name: 'Chapter Two', release_number: 2, is_owned: false, role: 'Killer', category: 'Killer' },
    { id: 1, name: 'A', chapter_name: 'Base Game', release_number: 1, is_owned: true, role: 'Survivor', category: 'Survivor' },
    { id: 2, name: 'B', chapter_name: 'Base Game', release_number: 1, is_owned: true, role: 'Killer', category: 'Killer' },
  ];
  const groups = groupCharactersByChapter(chars as any);
  assert.strictEqual(groups.length, 2);
  assert.strictEqual(groups[0].chapterName, 'Base Game');
  assert.strictEqual(groups[0].characters.length, 2);
  assert.strictEqual(groups[1].chapterName, 'Chapter Two');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx tsx --test src/__tests__/unit/characterOnboardingWizard.test.ts`
Expected: FAIL (module doesn't exist yet).

- [ ] **Step 3: Implement the wizard component**

Create `frontend/src/components/onboarding/CharacterOnboardingWizard.tsx`:

```typescript
// frontend/src/components/onboarding/CharacterOnboardingWizard.tsx
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Check, Lock, Loader2, X } from 'lucide-react';
import type { Dictionary } from '@/locales/types';
import { useAuth } from '@/context/AuthContext';
import { getBackendBaseUrl } from '@/utils/perkUtils';
import { CharacterOwnershipOverlay } from '@/components/characters/CharacterOwnershipOverlay';
import { SkipOnboardingModal } from '@/components/onboarding/SkipOnboardingModal';

export interface OnboardingCharacter {
  id: number;
  name: string;
  role: string;
  category: string;
  chapter_name: string | null;
  release_number: number | null;
  is_owned: boolean;
  avatar_url?: string;
}

export interface OnboardingPerk {
  perk_id: number;
  name: string;
  character_id: number | null;
  is_teachable: boolean;
  is_unlocked: boolean;
  icon_url?: string;
  icon_local_path?: string;
}

export interface ChapterGroup {
  chapterName: string;
  releaseNumber: number;
  characters: OnboardingCharacter[];
}

/** Groups characters by `chapter_name` (falling back to "Base Game" for
 * null, matching the backend's own default in Character.to_dict), ordered
 * by each chapter's `release_number` ascending. */
export function groupCharactersByChapter(characters: OnboardingCharacter[]): ChapterGroup[] {
  const byChapter = new Map<string, ChapterGroup>();

  for (const c of characters) {
    const chapterName = c.chapter_name || 'Base Game';
    if (!byChapter.has(chapterName)) {
      byChapter.set(chapterName, {
        chapterName,
        releaseNumber: c.release_number ?? 0,
        characters: [],
      });
    }
    byChapter.get(chapterName)!.characters.push(c);
  }

  return Array.from(byChapter.values()).sort((a, b) => a.releaseNumber - b.releaseNumber);
}

export interface CharacterOnboardingWizardProps {
  locale: string;
  dict?: Dictionary;
  onFinished: () => void;
}

export const CharacterOnboardingWizard: React.FC<CharacterOnboardingWizardProps> = ({
  dict,
  onFinished,
}) => {
  const { user, bulkUpdateCharacterOwnership, bulkUpdatePerkOwnership, markOnboardingComplete } =
    useAuth();
  const backendBase = getBackendBaseUrl();
  const t = dict?.onboarding;

  const [characters, setCharacters] = useState<OnboardingCharacter[]>([]);
  const [allPerks, setAllPerks] = useState<OnboardingPerk[]>([]);
  const [ownershipDraft, setOwnershipDraft] = useState<Record<number, boolean>>({});
  const [perkUnlockDraft, setPerkUnlockDraft] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [perksPopupCharacter, setPerksPopupCharacter] = useState<OnboardingCharacter | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      fetch(`${backendBase}/api/v1/users/${user.id}/characters`).then((res) => res.json()),
      fetch(`${backendBase}/api/v1/users/${user.id}/perks`).then((res) => res.json()),
    ])
      .then(
        ([charsJson, perksJson]: [
          { data?: OnboardingCharacter[] },
          { data?: OnboardingPerk[] },
        ]) => {
          if (cancelled) return;
          const chars = charsJson.data || [];
          const perks = perksJson.data || [];
          setCharacters(chars);
          setAllPerks(perks);

          const charDraft: Record<number, boolean> = {};
          chars.forEach((c) => {
            charDraft[c.id] = c.is_owned;
          });
          setOwnershipDraft(charDraft);

          const perkDraft: Record<number, boolean> = {};
          perks.forEach((p) => {
            perkDraft[p.perk_id] = p.is_unlocked;
          });
          setPerkUnlockDraft(perkDraft);

          setLoading(false);
        }
      )
      .catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user, backendBase]);

  const chapterGroups = useMemo(() => groupCharactersByChapter(characters), [characters]);

  /** Whole-character toggle cascades to that character's teachable perks in
   * the draft too, mirroring the backend's own cascade in
   * mutate_character_ownership -- so a chapter-level "I own this" click
   * unlocks its perks immediately instead of leaving them stuck locked
   * until the next save round-trip. */
  const setCharacterOwned = (characterId: number, owned: boolean) => {
    setOwnershipDraft((prev) => ({ ...prev, [characterId]: owned }));
    setPerkUnlockDraft((prev) => {
      const next = { ...prev };
      allPerks
        .filter((p) => p.character_id === characterId)
        .forEach((p) => {
          next[p.perk_id] = owned;
        });
      return next;
    });
  };

  const toggleChapter = (group: ChapterGroup, own: boolean) => {
    group.characters.forEach((c) => setCharacterOwned(c.id, own));
  };

  const togglePerkUnlocked = (perkId: number) => {
    setPerkUnlockDraft((prev) => ({ ...prev, [perkId]: !(prev[perkId] ?? true) }));
  };

  const getCharacterPerkStats = (characterId: number) => {
    const perksForChar = allPerks.filter((p) => p.character_id === characterId);
    const unlocked = perksForChar.filter((p) => perkUnlockDraft[p.perk_id] ?? true).length;
    return { total: perksForChar.length, unlocked };
  };

  const handleContinue = async () => {
    setSaving(true);
    const characterUpdates = characters.map((c) => ({
      character_id: c.id,
      is_owned: ownershipDraft[c.id] ?? c.is_owned,
    }));
    const perkUpdates = allPerks.map((p) => ({
      perk_id: p.perk_id,
      is_unlocked: perkUnlockDraft[p.perk_id] ?? p.is_unlocked,
    }));
    await bulkUpdateCharacterOwnership(characterUpdates);
    await bulkUpdatePerkOwnership(perkUpdates);
    await markOnboardingComplete();
    setSaving(false);
    onFinished();
  };

  const handleSkipConfirm = async () => {
    setSaving(true);
    await markOnboardingComplete();
    setSaving(false);
    onFinished();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-amber" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-2xl font-black">{t?.heading || 'Which characters do you already own?'}</h1>
          <p className="text-sm text-text-secondary max-w-2xl mx-auto">
            {t?.subheading ||
              'Pick the chapters you own so the perk randomizer and streaks only offer you perks you can actually use. You can always change this later from your Characters page.'}
          </p>
        </header>

        <section className="rounded-2xl border border-border-color bg-bg-surface p-4 flex flex-wrap items-center gap-6">
          <h2 className="w-full text-xs font-black uppercase tracking-wider text-text-secondary">
            {t?.legendTitle || 'How this works'}
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" />
            </span>
            {t?.legendOwned || 'Owned - fully available'}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-bg-elevated border border-accent-amber text-accent-amber">
              <Lock className="h-4 w-4" />
            </span>
            {t?.legendLocked || 'Locked - not available yet'}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-bg-elevated border border-accent-amber text-accent-amber overflow-hidden">
              <CharacterOwnershipOverlay isOwned={false} hasPartialPerks avatarSrc="" />
            </span>
            {t?.legendPartial || 'Partially unlocked - some perks unlocked by hand'}
          </div>
          <p className="w-full text-[11px] text-text-secondary">
            {t?.legendCustomizeHint ||
              "Tap a locked character's Perks button to unlock individual perks without owning the whole character."}
          </p>
        </section>

        {chapterGroups.map((group) => (
          <section key={group.chapterName} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm">{group.chapterName}</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleChapter(group, true)}
                  className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 cursor-pointer"
                >
                  {t?.ownChapterButton || 'I own this chapter'}
                </button>
                <button
                  type="button"
                  onClick={() => toggleChapter(group, false)}
                  className="rounded-lg border border-border-color bg-bg-elevated px-3 py-1 text-[11px] font-bold text-text-secondary cursor-pointer"
                >
                  {t?.lockChapterButton || "I don't own this chapter"}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {group.characters.map((c) => {
                const isOwned = ownershipDraft[c.id] ?? c.is_owned;
                const perkStats = getCharacterPerkStats(c.id);
                const hasPartialPerks = !isOwned && perkStats.unlocked > 0;
                return (
                  <div
                    key={c.id}
                    className="group relative flex flex-col overflow-hidden rounded-xl border border-border-color bg-bg-surface"
                  >
                    <button
                      type="button"
                      onClick={() => setCharacterOwned(c.id, !isOwned)}
                      className="relative aspect-[3/4] w-full cursor-pointer"
                    >
                      <CharacterOwnershipOverlay
                        isOwned={isOwned}
                        hasPartialPerks={hasPartialPerks}
                        avatarSrc={c.avatar_url || ''}
                        lockedTitle={c.name}
                        ownedTitle={c.name}
                      />
                      <span className="absolute bottom-1 left-1 right-1 truncate rounded bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-bold text-white text-center">
                        {c.name}
                      </span>
                    </button>
                    {!isOwned && perkStats.total > 0 && (
                      <button
                        type="button"
                        onClick={() => setPerksPopupCharacter(c)}
                        className="w-full border-t border-border-color bg-accent-amber/10 px-1.5 py-1 text-[10px] font-bold text-accent-amber hover:bg-accent-amber/20 transition-colors cursor-pointer"
                      >
                        {t?.perksButton || 'Perks'} ({perkStats.unlocked}/{perkStats.total})
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <div className="flex justify-end pt-4">
          <button
            type="button"
            disabled={saving}
            onClick={handleContinue}
            className="rounded-xl bg-accent-amber hover:bg-accent-amber-hover px-6 py-3 text-sm font-black uppercase tracking-wider text-text-inverted disabled:opacity-50 cursor-pointer"
          >
            {saving ? t?.savingLabel || 'Saving...' : t?.continueButton || 'Continue'}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsSkipModalOpen(true)}
        className="fixed bottom-4 right-4 rounded-xl border border-border-color bg-bg-surface px-4 py-2 text-xs font-bold text-text-secondary shadow-lg cursor-pointer"
      >
        {t?.skipButton || 'Skip'}
      </button>

      {perksPopupCharacter && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-perks-popup-title"
        >
          <div
            onClick={() => setPerksPopupCharacter(null)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border-color bg-bg-surface shadow-2xl text-text-primary"
          >
            <div className="flex items-center justify-between border-b border-border-color p-5">
              <h3 id="onboarding-perks-popup-title" className="text-base font-bold text-text-primary">
                {perksPopupCharacter.name} {t?.perksButton || 'Perks'}
              </h3>
              <button
                type="button"
                onClick={() => setPerksPopupCharacter(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-2">
              {allPerks
                .filter((p) => p.character_id === perksPopupCharacter.id)
                .map((perk) => {
                  const isUnlocked = perkUnlockDraft[perk.perk_id] ?? true;
                  return (
                    <button
                      key={perk.perk_id}
                      type="button"
                      onClick={() => togglePerkUnlocked(perk.perk_id)}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-xs font-semibold transition-all ${
                        isUnlocked
                          ? 'border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'border-border-color bg-bg-primary text-text-muted hover:border-accent-amber/50'
                      }`}
                    >
                      <span className="flex-1 text-text-primary">{perk.name}</span>
                      {isUnlocked ? (
                        <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Lock className="h-4 w-4 shrink-0 text-text-muted" />
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      <SkipOnboardingModal
        isOpen={isSkipModalOpen}
        onCancel={() => setIsSkipModalOpen(false)}
        onConfirm={handleSkipConfirm}
        dict={dict}
      />
    </div>
  );
};

export default CharacterOnboardingWizard;
```

This mirrors `CharactersHub.tsx`'s existing perks-popup pattern (lines 520-599) exactly, minus the perk icon images (kept text-only here to keep this file's code sample focused -- add `icon_url`/`icon_local_path` rendering identical to `CharactersHub.tsx:574-580` if the executing engineer wants full visual parity, using the same `getAssetUrl(backendBase, perk.icon_local_path, perk.icon_url)` helper already imported there).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx tsx --test src/__tests__/unit/characterOnboardingWizard.test.ts`
Expected: PASS.

- [ ] **Step 5: Create the page**

Create `frontend/src/app/[locale]/welcome/page.tsx`, following the standalone-page pattern from `frontend/src/app/[locale]/reset-password/page.tsx` (no `Sidebar`, wraps in `Suspense`, uses `useParams()` for locale):

```typescript
'use client';
// frontend/src/app/[locale]/welcome/page.tsx
import React, { Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Locale } from '@/i18n/config';
import { useDictionary } from '@/context/DictionaryContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { CharacterOnboardingWizard } from '@/components/onboarding/CharacterOnboardingWizard';

export default function WelcomePage() {
  return (
    <Suspense fallback={null}>
      <WelcomeContent />
    </Suspense>
  );
}

function WelcomeContent() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as Locale) || 'en';
  const dict = useDictionary();

  useDocumentTitle(dict?.onboarding?.pageTitle || 'LemonDBD - Welcome, set up your roster');

  return (
    <CharacterOnboardingWizard
      locale={locale}
      dict={dict}
      onFinished={() => router.push(`/${locale}`)}
    />
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Manual verification**

Run: `docker compose build frontend && docker compose up -d frontend`, then use the `run` skill's Playwright pattern (register a brand-new account, verify its email with the code printed in `docker compose logs backend`, `https://localhost`, `ignoreHTTPSErrors: true`) to:
- Confirm verifying a fresh registration's email redirects to `/en/welcome` (not just closing the modal).
- Confirm the page shows chapters grouped with "Base Game" characters pre-marked owned and everything else locked.
- Click "I own this chapter" on one non-base chapter, click Continue, and confirm `GET /api/v1/users/<id>/characters` (or the Characters page) now shows that chapter's characters as owned.
- Register a second fresh account, click Skip, confirm the modal appears, confirm it navigates home after confirming, and confirm a second visit to `/en/welcome` for that same account no longer happens automatically on next login (re-verify via `/auth/me` that `onboarding_completed_at` is set).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/onboarding/CharacterOnboardingWizard.tsx frontend/src/app/[locale]/welcome/page.tsx frontend/src/__tests__/unit/characterOnboardingWizard.test.ts
git commit -m "feat: add character ownership onboarding wizard page"
```

---

### Task 9: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full frontend unit suite**

Run: `cd frontend && npm run test:unit`
Expected: all tests pass, including every new file added in Tasks 3-8.

- [ ] **Step 2: Run the full backend unit suite**

Run: `cd backend && python -m pytest tests/unit -v`
Expected: all tests pass, including `test_onboarding.py`.

- [ ] **Step 3: Full typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors anywhere in the frontend.

- [ ] **Step 4: Rebuild both containers and smoke-test the full flow**

Run: `docker compose build backend frontend && docker compose up -d`, then repeat the manual verification from Task 8 Step 7 end-to-end once more against the freshly rebuilt containers.

- [ ] **Step 5: Report**

Summarize pass/fail for each check above. If anything fails, fix as a targeted follow-up commit on this same branch (not folded into earlier tasks) and re-run this task.
