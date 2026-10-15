# Ephemeral Content Moderation & CAS Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a zero-retention, cryptographically verified content moderation and revocation system for custom user-generated content (tier lists, smash-or-pass rosters, minigames) without persisting custom elements permanently on the server.

**Architecture:** Custom elements remain client-side (URLs and `localStorage`). Exporting attaches an HMAC-signed author stamp (`author_id` + `content_hash`). Reports are deduplicated by `content_hash` with priority count scoring. Admins review reported payloads in a sandboxed, read-only UI. Upon admin resolution (or 14-day TTL expiry), the evidence payload is immediately wiped to `NULL` (Zero-Retention), while the `content_hash` is recorded in `content_revocations` to be pruned from clients via a lightweight sync API.

**Architecture Diagram:**

```mermaid
graph TD
    subgraph "Frontend Client"
        A[User Custom Content] -->|Export / Share| B[Content Signing Hook]
        C[Report Button] -->|Submit JSON + Signature| D[Report Content Modal]
        E[useContentRevocationSync] -->|Batch Hash Check| F[Check Revocations API]
    end

    subgraph "Backend Flask API"
        B -->|POST /content/sign| G[ContentCryptoService]
        D -->|POST /content/reports| H[ModerationService]
        F -->|POST /content/revocations/check| I[RevocationService]
        
        H -->|Check Revoked & Deduplicate| J[(PostgreSQL DB)]
        K[Admin Panel Safe Preview] -->|GET /admin/content-reports/{id}/preview| H
        L[Admin Action: Ban / Dismiss] -->|POST /admin/content-reports/{id}/resolve| M[Zero-Retention Hard Wipe: evidence = NULL]
        M --> J
    end
```

**Tech Stack:**
- Backend: Python 3.12+, Flask, SQLAlchemy 2.0 (Flask-SQLAlchemy), Flask-Migrate / Alembic, hashlib, hmac.
- Frontend: Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide React, DictionaryContext (5 languages: `en`, `pl`, `de`, `es`, `ja`).
- Testing: Pytest for backend unit/integration tests; `tsx --test` (`node:test`) for frontend unit tests and structural guards (`npm run check`, `npm run test:unit`). There is no Vitest in this repo.

## Remediation Addendum (2026-10-15)

> This plan was executed and then audited. The audit found the gaps below; all were fixed, and where the original task text below disagrees with this addendum, **the addendum wins**. The task bodies are kept as the historical record. The design spec carries the corrected behaviour.

| # | Gap in the original plan / first implementation | Fix |
| :-- | :-- | :-- |
| 1 | Task 4 only built admin **endpoints**; no task built an admin screen, and Task 8 passed without one. An admin could not see reported content. | Admin **Reports** tab: queue, case view, sandboxed preview (images hidden until clicked), ban / dismiss with confirmation and notes, pending badge. |
| 2 | Minigame reports always failed the hash check: the signed copy and the reported copy were different documents (ids, timestamps, default round fields). | One `signingPayload(contentType, doc)` normalizer used for signing, reporting and checking; proven by `contentRoundTrip.test.ts`. |
| 3 | `report_count` went up on every report, including repeats from the same account. | Count moves only when a new subscriber row is inserted, in SQL; repeats return `already_reported: true`. |
| 4 | The 14-day purge existed but nothing ran it. | Hourly scheduler job with an advisory lock, plus a start-up run. |
| 5 | A ban was only enforced by the login-time localStorage sweep, so share links and JSON imports still worked. | `POST /content/revocations/check-document`; import dialogs and the minigame play page refuse revoked documents. |
| 6 | Content without an author stamp could not be reported at all. | Reports are accepted unsigned; they are attributed only when a valid stamp matches the server-computed hash. A mismatched stamp is **not** a `400` (this plan's Task 3 `submit_report` text is superseded); it yields an unattributed report. |
| 7 | Smaller: free-text `content_type` / `reason` / `status`; no protection against two reporters creating the same pending row; raw action names in the audit log; the ledger's deferred items (`allow_nan=False`, composite index). | Allow-lists (`400`); partial unique index `uq_content_reports_pending_hash` with savepoint + `IntegrityError` fallback; translated audit-log labels; `allow_nan=False`; index `idx_content_reports_status_count` (migration `0015`). |

**Corrections to the text below:**
- The backend is Flask (not FastAPI) and there is no Redis; nothing here uses a cache layer.
- `localStorage` keys are `lemondbd_tier_lists`, `lemondbd_smash_rosters`, `lemondbd_custom_minigames` (Task 7's `tier_lists:custom:` / `smash:custom:` keys never existed), and the frontend tests live in `frontend/src/__tests__/unit/` and run with `tsx --test`, not Vitest.
- Resolving an already-resolved or expired report returns `409`; an unknown status filter returns `400`.
- Verification commands are `pytest` from `backend/` and, from `frontend/`, `npm run check` and `npm run test:unit`.

---

## Global Constraints

- **File Length:** Frontend files must not exceed 600 lines (`file length: frontend` guard).
- **Internationalization (i18n):** Zero dead keys, full 5-language parity (`en`, `pl`, `de`, `es`, `ja`), no literal English text in components, use `useDictionary()`.
- **UI & Accessibility:** Theme token compliance (`bg-bg-surface`, `border-border-color`, `text-text-primary`), touch targets >= 44px, icon buttons require `aria-label`.
- **Zero Toxic Retention:** Database column `evidence_payload` in `content_reports` MUST be set to `NULL` immediately upon resolution (Ban or Dismiss) and upon 14-day TTL expiry.

---

### Task 1: Backend Database Models for Content Moderation & Revocations

**Files:**
- Create: `backend/app/models/content_moderation.py`
- Modify: `backend/app/models/__init__.py:1-40`
- Test: `backend/tests/unit/test_content_moderation_models.py`

**Interfaces:**
- Produces:
  - `ContentReport`: SQLAlchemy model for pending reports and ephemeral evidence payloads.
  - `ContentReportSubscriber`: SQLAlchemy model for deduplicated reporter tracking.
  - `ContentRevocation`: SQLAlchemy model for permanently revoked content hashes.

- [ ] **Step 1: Write the failing test for models**

Create `backend/tests/unit/test_content_moderation_models.py`:
```python
import pytest
from datetime import datetime, timezone, timedelta
from app.core.extensions import db
from app.models.content_moderation import (
    ContentReport,
    ContentReportSubscriber,
    ContentRevocation,
)
from app.models.user import User

def test_content_report_lifecycle_and_relationships(app):
    with app.app_context():
        author = User(
            login="author_user",
            username="Author",
            email="author@example.com",
            role="user",
        )
        reporter = User(
            login="reporter_user",
            username="Reporter",
            email="reporter@example.com",
            role="user",
        )
        db.session.add_all([author, reporter])
        db.session.commit()

        expires = datetime.now(timezone.utc) + timedelta(days=14)
        report = ContentReport(
            content_type="tier_list",
            content_hash="a" * 64,
            author_id=author.id,
            author_login=author.login,
            first_reporter_id=reporter.id,
            report_count=1,
            primary_reason="hate_speech",
            status="pending",
            evidence_payload='{"test": "abusive payload"}',
            expires_at=expires,
        )
        db.session.add(report)
        db.session.commit()

        assert report.id is not None
        assert report.status == "pending"
        assert report.evidence_payload is not None

        # Add subscriber (deduplicated reporter)
        sub = ContentReportSubscriber(
            report_id=report.id,
            reporter_id=reporter.id,
            reason="hate_speech",
            notes="Very offensive list",
        )
        db.session.add(sub)
        db.session.commit()

        # Zero-retention wipe test
        report.evidence_payload = None
        report.status = "resolved_banned"
        db.session.commit()

        reloaded = db.session.get(ContentReport, report.id)
        assert reloaded.evidence_payload is None
        assert reloaded.status == "resolved_banned"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv\Scripts\pytest backend/tests/unit/test_content_moderation_models.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.models.content_moderation'`

- [ ] **Step 3: Implement minimal models**

Create `backend/app/models/content_moderation.py`:
```python
# backend/app/models/content_moderation.py
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.extensions import Base
from app.models.base import ColumnDictMixin, utcnow

if TYPE_CHECKING:
    from app.models.user import User


class ContentReport(Base, ColumnDictMixin):
    """Stores reports and ephemeral evidence payloads during investigation.
    The evidence_payload column MUST be wiped to NULL upon resolution or expiry.
    """
    __tablename__ = "content_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    content_type: Mapped[str] = mapped_column(String(32), nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    author_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    author_login: Mapped[str] = mapped_column(String(50), nullable=False)
    first_reporter_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    report_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    primary_reason: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), default="pending", index=True, nullable=False
    )
    evidence_payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    subscribers: Mapped[list["ContentReportSubscriber"]] = relationship(
        back_populates="report", cascade="all, delete-orphan"
    )


class ContentReportSubscriber(Base, ColumnDictMixin):
    """Tracks distinct reporters for a deduplicated report."""
    __tablename__ = "content_report_subscribers"
    __table_args__ = (
        UniqueConstraint("report_id", "reporter_id", name="uq_report_reporter"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(
        ForeignKey("content_reports.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reporter_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    reason: Mapped[str] = mapped_column(String(64), nullable=False)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )

    report: Mapped["ContentReport"] = relationship(back_populates="subscribers")


class ContentRevocation(Base, ColumnDictMixin):
    """Permanent index of blocked content hashes for client synchronization."""
    __tablename__ = "content_revocations"

    id: Mapped[int] = mapped_column(primary_key=True)
    content_hash: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    content_type: Mapped[str] = mapped_column(String(32), nullable=False)
    author_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    reason: Mapped[str] = mapped_column(String(64), nullable=False)
    revoked_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True, nullable=False
    )
```

Export in `backend/app/models/__init__.py`:
```python
from app.models.content_moderation import (
    ContentReport,
    ContentReportSubscriber,
    ContentRevocation,
)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv\Scripts\pytest backend/tests/unit/test_content_moderation_models.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/content_moderation.py backend/app/models/__init__.py backend/tests/unit/test_content_moderation_models.py
git commit -m "feat(moderation): add ContentReport, Subscriber, and Revocation models"
```

---

### Task 2: Backend Cryptographic & Canonicalization Service

**Files:**
- Create: `backend/app/services/content_crypto.py`
- Test: `backend/tests/unit/test_content_crypto.py`

**Interfaces:**
- Produces:
  - `canonicalize_payload(payload: dict[str, Any]) -> str`: Deterministic JSON serialization.
  - `compute_content_hash(canonical_str: str) -> str`: SHA-256 hexdigest.
  - `sign_content(user_id: int, content_hash: str, secret_key: str) -> str`: HMAC-SHA256 signature.
  - `verify_content_signature(user_id: int, content_hash: str, signature: str, secret_key: str) -> bool`: Safe constant-time verification.

- [ ] **Step 1: Write the failing test for crypto service**

Create `backend/tests/unit/test_content_crypto.py`:
```python
import pytest
from app.services.content_crypto import (
    canonicalize_payload,
    compute_content_hash,
    sign_content,
    verify_content_signature,
)

def test_canonicalize_and_hash_is_order_independent():
    dict1 = {"title": "My List", "items": [1, 2, 3], "desc": "Hello"}
    dict2 = {"desc": "Hello", "items": [1, 2, 3], "title": "My List"}
    
    canon1 = canonicalize_payload(dict1)
    canon2 = canonicalize_payload(dict2)
    assert canon1 == canon2
    
    hash1 = compute_content_hash(canon1)
    hash2 = compute_content_hash(canon2)
    assert hash1 == hash2
    assert len(hash1) == 64

def test_sign_and_verify_signature():
    secret = "test-secret-key-very-secure-1234567890"
    user_id = 42
    content_hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    
    sig = sign_content(user_id, content_hash, secret)
    assert sig is not None
    assert len(sig) == 64
    
    # Valid verification
    assert verify_content_signature(user_id, content_hash, sig, secret) is True
    
    # Fails if tampered hash
    assert verify_content_signature(user_id, "different_hash" + "0"*50, sig, secret) is False
    
    # Fails if tampered author
    assert verify_content_signature(999, content_hash, sig, secret) is False
    
    # Fails if tampered signature
    assert verify_content_signature(user_id, content_hash, "f" * 64, secret) is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv\Scripts\pytest backend/tests/unit/test_content_crypto.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.content_crypto'`

- [ ] **Step 3: Implement content crypto service**

Create `backend/app/services/content_crypto.py`:
```python
# backend/app/services/content_crypto.py
import hashlib
import hmac
import json
from typing import Any


def canonicalize_payload(payload: dict[str, Any]) -> str:
    """Produces a deterministic, compact canonical JSON string with sorted keys."""
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def compute_content_hash(canonical_str: str) -> str:
    """Computes SHA-256 hexdigest of the canonical string."""
    return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()


def sign_content(user_id: int, content_hash: str, secret_key: str) -> str:
    """Signs user_id and content_hash using HMAC-SHA256."""
    message = f"{user_id}:{content_hash}".encode("utf-8")
    return hmac.new(secret_key.encode("utf-8"), message, hashlib.sha256).hexdigest()


def verify_content_signature(user_id: int, content_hash: str, signature: str, secret_key: str) -> bool:
    """Constant-time verification of HMAC-SHA256 content signature."""
    if not signature or not content_hash or not user_id:
        return False
    expected = sign_content(user_id, content_hash, secret_key)
    return hmac.compare_digest(expected, signature)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv\Scripts\pytest backend/tests/unit/test_content_crypto.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/content_crypto.py backend/tests/unit/test_content_crypto.py
git commit -m "feat(moderation): add deterministic canonicalization and HMAC content signing"
```

---

### Task 3: Backend Content Signing, Reporting & Revocation Endpoints

> **Superseded in part:** the `submit_report` below rejects unsigned or mismatched reports with `400` and counts repeat reporters. See the Remediation Addendum (items 3 and 6) and spec section 5.2 for the behaviour that shipped.

**Files:**
- Create: `backend/app/routes/content_moderation.py`
- Create: `backend/app/services/content_moderation_service.py`
- Modify: `backend/app/features/__init__.py:1-59`
- Test: `backend/tests/unit/test_content_moderation_api.py`

**Interfaces:**
- Produces routes:
  - `POST /api/v1/content/sign` (requires auth): returns `{ content_hash, author_id, author_login, signature, created_at }`.
  - `POST /api/v1/content/reports` (requires auth): submits a report with deduplication.
  - `POST /api/v1/content/revocations/check` (public): returns `{ revoked_hashes: [...] }`.

- [ ] **Step 1: Write the failing tests for API endpoints**

Create `backend/tests/unit/test_content_moderation_api.py`:
```python
import pytest
from app.core.extensions import db
from app.models.user import User
from app.models.content_moderation import ContentReport, ContentRevocation
from app.services.content_crypto import canonicalize_payload, compute_content_hash, sign_content

def test_sign_content_flow(client, auth_headers):
    payload = {"format": "lemon-tier-list", "version": 1, "title": "Great Perks"}
    res = client.post("/api/v1/content/sign", json={"content_type": "tier_list", "payload": payload}, headers=auth_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert "content_hash" in data
    assert "signature" in data
    assert data["author_id"] is not None

def test_report_and_deduplication_flow(client, auth_headers, app):
    with app.app_context():
        author = User(login="author_boy", username="Author", email="author@test.com", role="user")
        db.session.add(author)
        db.session.commit()
        author_id = author.id
        author_login = author.login

    secret = app.config["SECRET_KEY"]
    payload = {"format": "lemon-tier-list", "version": 1, "title": "Violent Tier List"}
    canon = canonicalize_payload(payload)
    content_hash = compute_content_hash(canon)
    sig = sign_content(author_id, content_hash, secret)

    # First report
    report_data = {
        "content_type": "tier_list",
        "content_hash": content_hash,
        "author_id": author_id,
        "author_login": author_login,
        "signature": sig,
        "payload": payload,
        "reason": "hate_speech",
        "notes": "Very toxic",
    }
    res1 = client.post("/api/v1/content/reports", json=report_data, headers=auth_headers)
    assert res1.status_code == 201
    assert res1.get_json()["status"] == "pending"

    # Second report for same content (deduplication)
    res2 = client.post("/api/v1/content/reports", json=report_data, headers=auth_headers)
    assert res2.status_code == 200
    assert res2.get_json()["status"] == "queued"
    assert res2.get_json()["report_count"] == 2

def test_check_revocations(client, app):
    with app.app_context():
        rev = ContentRevocation(
            content_hash="b" * 64,
            content_type="tier_list",
            reason="hate_speech",
        )
        db.session.add(rev)
        db.session.commit()

    res = client.post("/api/v1/content/revocations/check", json={"hashes": ["b" * 64, "c" * 64]})
    assert res.status_code == 200
    data = res.get_json()
    assert "b" * 64 in data["revoked_hashes"]
    assert "c" * 64 not in data["revoked_hashes"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv\Scripts\pytest backend/tests/unit/test_content_moderation_api.py -v`
Expected: FAIL with 404 Not Found

- [ ] **Step 3: Implement moderation service and routes**

Create `backend/app/services/content_moderation_service.py`:
```python
# backend/app/services/content_moderation_service.py
from datetime import datetime, timezone, timedelta
from typing import Any
from sqlalchemy import select, update
from app.core.extensions import db
from app.models.content_moderation import (
    ContentReport,
    ContentReportSubscriber,
    ContentRevocation,
)
from app.models.user import User
from app.services.content_crypto import (
    canonicalize_payload,
    compute_content_hash,
    sign_content,
    verify_content_signature,
)


def sign_user_content(user: User, content_type: str, payload: dict[str, Any], secret_key: str) -> dict[str, Any]:
    canonical_str = canonicalize_payload(payload)
    content_hash = compute_content_hash(canonical_str)
    sig = sign_content(user.id, content_hash, secret_key)
    return {
        "content_type": content_type,
        "content_hash": content_hash,
        "author_id": user.id,
        "author_login": user.login,
        "signature": sig,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def submit_report(
    reporter: User,
    data: dict[str, Any],
    secret_key: str,
) -> tuple[dict[str, Any], int]:
    content_type = str(data.get("content_type") or "tier_list")
    content_hash = str(data.get("content_hash") or "").strip()
    author_id = data.get("author_id")
    author_login = str(data.get("author_login") or "").strip()
    signature = str(data.get("signature") or "").strip()
    payload = data.get("payload")
    reason = str(data.get("reason") or "other").strip()
    notes = str(data.get("notes") or "").strip() or None

    if not content_hash or not author_id or not signature or not payload:
        return {"error": "Missing required report fields"}, 400

    # 1. Verify HMAC signature
    if not verify_content_signature(int(author_id), content_hash, signature, secret_key):
        return {"error": "Invalid cryptographic content signature"}, 400

    # 2. Check if already revoked
    is_revoked = db.session.scalar(
        select(ContentRevocation.id).where(ContentRevocation.content_hash == content_hash)
    )
    if is_revoked:
        return {
            "status": "already_banned",
            "message": "Content is already revoked and blocked site-wide",
            "content_hash": content_hash,
        }, 200

    # 3. Check for existing pending report (deduplication)
    existing_report = db.session.scalar(
        select(ContentReport).where(
            ContentReport.content_hash == content_hash,
            ContentReport.status == "pending",
        )
    )

    if existing_report:
        existing_report.report_count += 1
        # Add subscriber if not already recorded
        already_sub = db.session.scalar(
            select(ContentReportSubscriber.id).where(
                ContentReportSubscriber.report_id == existing_report.id,
                ContentReportSubscriber.reporter_id == reporter.id,
            )
        )
        if not already_sub:
            sub = ContentReportSubscriber(
                report_id=existing_report.id,
                reporter_id=reporter.id,
                reason=reason,
                notes=notes,
            )
            db.session.add(sub)
        db.session.commit()
        return {
            "status": "queued",
            "message": "Report received and added to pending queue",
            "report_count": existing_report.report_count,
            "content_hash": content_hash,
        }, 200

    # 4. New pending report with 14-day TTL
    canonical_str = canonicalize_payload(payload)
    expires_at = datetime.now(timezone.utc) + timedelta(days=14)
    report = ContentReport(
        content_type=content_type,
        content_hash=content_hash,
        author_id=int(author_id),
        author_login=author_login,
        first_reporter_id=reporter.id,
        report_count=1,
        primary_reason=reason,
        status="pending",
        evidence_payload=canonical_str,
        expires_at=expires_at,
    )
    db.session.add(report)
    db.session.flush()

    sub = ContentReportSubscriber(
        report_id=report.id,
        reporter_id=reporter.id,
        reason=reason,
        notes=notes,
    )
    db.session.add(sub)
    db.session.commit()

    return {
        "status": "pending",
        "message": "Report created successfully",
        "report_id": report.id,
        "content_hash": content_hash,
    }, 201


def check_revocations_batch(hashes: list[str]) -> list[str]:
    if not hashes:
        return []
    clean_hashes = [h.strip() for h in hashes if isinstance(h, str) and len(h.strip()) == 64]
    if not clean_hashes:
        return []
    stmt = select(ContentRevocation.content_hash).where(ContentRevocation.content_hash.in_(clean_hashes))
    revoked = db.session.scalars(stmt).all()
    return list(revoked)
```

Create `backend/app/routes/content_moderation.py`:
```python
# backend/app/routes/content_moderation.py
from flask import Blueprint, current_app, g, jsonify, request
from app.core.security import get_current_user
from app.services.content_moderation_service import (
    check_revocations_batch,
    sign_user_content,
    submit_report,
)

content_moderation_bp = Blueprint("content_moderation", __name__, url_prefix="/api/v1/content")


@content_moderation_bp.route("/sign", methods=["POST"])
def route_sign_content():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required"}), 401

    data = request.get_json(silent=True) or {}
    payload = data.get("payload")
    content_type = data.get("content_type", "tier_list")
    if not payload or not isinstance(payload, dict):
        return jsonify({"error": "Payload dictionary required"}), 400

    secret_key = current_app.config["SECRET_KEY"]
    res = sign_user_content(user, content_type, payload, secret_key)
    return jsonify(res), 200


@content_moderation_bp.route("/reports", methods=["POST"])
def route_submit_report():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Authentication required"}), 401

    data = request.get_json(silent=True) or {}
    secret_key = current_app.config["SECRET_KEY"]
    res, code = submit_report(user, data, secret_key)
    return jsonify(res), code


@content_moderation_bp.route("/revocations/check", methods=["POST"])
def route_check_revocations():
    data = request.get_json(silent=True) or {}
    hashes = data.get("hashes") or []
    if not isinstance(hashes, list):
        return jsonify({"error": "hashes must be a list"}), 400

    revoked = check_revocations_batch(hashes)
    return jsonify({"revoked_hashes": revoked}), 200
```

Register blueprint in `backend/app/features/__init__.py`:
```python
from app.routes.content_moderation import content_moderation_bp
# add content_moderation_bp to blueprints list
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv\Scripts\pytest backend/tests/unit/test_content_moderation_api.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/content_moderation.py backend/app/services/content_moderation_service.py backend/app/features/__init__.py backend/tests/unit/test_content_moderation_api.py
git commit -m "feat(moderation): add content sign, report, and revocation check endpoints"
```

---

### Task 4: Backend Admin Moderation & Zero-Retention Hard Wipe

> **Incomplete as written:** this task is backend-only. The admin screen was added later (see the Remediation Addendum, item 1; spec section 6.2).

**Files:**
- Modify: `backend/app/routes/admin_control.py:380-406`
- Modify: `backend/app/services/content_moderation_service.py`
- Test: `backend/tests/unit/test_admin_content_moderation.py`

**Interfaces:**
- Produces routes (admin only):
  - `GET /api/v1/admin/content-reports`: Paginated list of pending reports sorted by `report_count DESC`.
  - `GET /api/v1/admin/content-reports/<id>/preview`: Safe preview payload of evidence.
  - `POST /api/v1/admin/content-reports/<id>/resolve`: Approves ban or dismisses; **always sets `evidence_payload = None`**.
  - `POST /api/v1/admin/content-reports/purge-expired`: TTL purge setting `evidence_payload = None` for expired rows.

- [ ] **Step 1: Write the failing tests for admin resolution**

Create `backend/tests/unit/test_admin_content_moderation.py`:
```python
import pytest
from datetime import datetime, timezone, timedelta
from app.core.extensions import db
from app.models.user import User
from app.models.content_moderation import ContentReport, ContentRevocation

def test_admin_list_preview_and_zero_retention_ban(client, admin_headers, app):
    with app.app_context():
        author = User(login="bad_author", username="BadAuthor", email="bad@test.com", role="user")
        db.session.add(author)
        db.session.commit()
        author_id = author.id

        report = ContentReport(
            content_type="tier_list",
            content_hash="d" * 64,
            author_id=author_id,
            author_login="bad_author",
            report_count=5,
            primary_reason="hate_speech",
            status="pending",
            evidence_payload='{"abusive": "content"}',
            expires_at=datetime.now(timezone.utc) + timedelta(days=14),
        )
        db.session.add(report)
        db.session.commit()
        report_id = report.id

    # 1. Admin list
    res_list = client.get("/api/v1/admin/content-reports?status=pending", headers=admin_headers)
    assert res_list.status_code == 200
    items = res_list.get_json()["items"]
    assert any(r["id"] == report_id for r in items)

    # 2. Admin preview
    res_prev = client.get(f"/api/v1/admin/content-reports/{report_id}/preview", headers=admin_headers)
    assert res_prev.status_code == 200
    assert "abusive" in res_prev.get_json()["evidence_payload"]

    # 3. Admin ban & resolve
    res_resolve = client.post(
        f"/api/v1/admin/content-reports/{report_id}/resolve",
        json={"action": "ban", "ban_author": True, "admin_notes": "Confirmed hate speech"},
        headers=admin_headers,
    )
    assert res_resolve.status_code == 200

    # 4. Verify ZERO-RETENTION: evidence is wiped to None!
    with app.app_context():
        updated_report = db.session.get(ContentReport, report_id)
        assert updated_report.status == "resolved_banned"
        assert updated_report.evidence_payload is None  # Wiped!

        rev = db.session.scalar(db.select(ContentRevocation).where(ContentRevocation.content_hash == "d" * 64))
        assert rev is not None
        assert rev.author_id == author_id

        author_user = db.session.get(User, author_id)
        assert author_user.is_active is False  # Banned!
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv\Scripts\pytest backend/tests/unit/test_admin_content_moderation.py -v`
Expected: FAIL with 404 Not Found

- [ ] **Step 3: Implement admin endpoints and resolution service**

In `backend/app/services/content_moderation_service.py`, add:
```python
def get_admin_reports(status: str = "pending", page: int = 1, per_page: int = 20) -> dict[str, Any]:
    query = select(ContentReport).where(ContentReport.status == status).order_by(
        ContentReport.report_count.desc(), ContentReport.created_at.asc()
    )
    total = db.session.scalar(select(db.func.count(ContentReport.id)).where(ContentReport.status == status)) or 0
    items = db.session.scalars(query.offset((page - 1) * per_page).limit(per_page)).all()
    return {
        "items": [r.to_dict() for r in items],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


def resolve_report(
    report_id: int,
    admin_user: User,
    action: str,
    ban_author: bool = False,
    admin_notes: str | None = None,
) -> tuple[dict[str, Any], int]:
    report = db.session.get(ContentReport, report_id)
    if not report:
        return {"error": "Report not found"}, 404

    now = datetime.now(timezone.utc)
    report.resolved_by_id = admin_user.id
    report.resolved_at = now
    report.admin_notes = admin_notes

    if action == "ban":
        report.status = "resolved_banned"
        # Add to revocations if not already present
        existing_rev = db.session.scalar(
            select(ContentRevocation.id).where(ContentRevocation.content_hash == report.content_hash)
        )
        if not existing_rev:
            rev = ContentRevocation(
                content_hash=report.content_hash,
                content_type=report.content_type,
                author_id=report.author_id,
                reason=report.primary_reason,
                revoked_by_id=admin_user.id,
            )
            db.session.add(rev)

        if ban_author and report.author_id:
            author = db.session.get(User, report.author_id)
            if author:
                author.is_active = False
    else:
        report.status = "dismissed"

    # ZERO-RETENTION HARD WIPE: Scrub evidence payload immediately!
    report.evidence_payload = None
    db.session.commit()

    return {"message": f"Report resolved with action: {action}", "report_id": report.id}, 200


def purge_expired_evidence() -> int:
    """Scrubs evidence payloads for pending reports past their expires_at date."""
    now = datetime.now(timezone.utc)
    stmt = (
        update(ContentReport)
        .where(ContentReport.status == "pending", ContentReport.expires_at <= now)
        .values(evidence_payload=None, status="expired", updated_at=now)
    )
    res = db.session.execute(stmt)
    db.session.commit()
    return res.rowcount
```

In `backend/app/routes/admin_control.py`, add routes:
```python
@admin_control_bp.route("/content-reports", methods=["GET"])
@admin_required
def route_get_content_reports():
    status = request.args.get("status", "pending")
    page = max(1, int(request.args.get("page", 1)))
    per_page = max(1, min(100, int(request.args.get("per_page", 20))))
    from app.services.content_moderation_service import get_admin_reports
    return jsonify(get_admin_reports(status, page, per_page)), 200


@admin_control_bp.route("/content-reports/<int:report_id>/preview", methods=["GET"])
@admin_required
def route_get_content_report_preview(report_id: int):
    from app.models.content_moderation import ContentReport
    report = db.session.get(ContentReport, report_id)
    if not report:
        return jsonify({"error": "Report not found"}), 404
    return jsonify({
        "id": report.id,
        "content_type": report.content_type,
        "content_hash": report.content_hash,
        "author_login": report.author_login,
        "report_count": report.report_count,
        "primary_reason": report.primary_reason,
        "status": report.status,
        "evidence_payload": report.evidence_payload,
    }), 200


@admin_control_bp.route("/content-reports/<int:report_id>/resolve", methods=["POST"])
@admin_required
def route_resolve_content_report(report_id: int):
    data = request.get_json(silent=True) or {}
    action = data.get("action", "dismiss")
    ban_author = bool(data.get("ban_author", False))
    admin_notes = data.get("admin_notes")
    from app.services.content_moderation_service import resolve_report
    res, code = resolve_report(report_id, g.current_user, action, ban_author, admin_notes)
    return jsonify(res), code


@admin_control_bp.route("/content-reports/purge-expired", methods=["POST"])
@admin_required
def route_purge_expired_reports():
    from app.services.content_moderation_service import purge_expired_evidence
    count = purge_expired_evidence()
    return jsonify({"purged_count": count}), 200
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv\Scripts\pytest backend/tests/unit/test_admin_content_moderation.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/admin_control.py backend/app/services/content_moderation_service.py backend/tests/unit/test_admin_content_moderation.py
git commit -m "feat(moderation): add admin report review, safe preview, and zero-retention hard wipe"
```

---

### Task 5: Frontend Content Signing on Export & Manifest Embedding

**Files:**
- Create: `frontend/src/utils/contentSigning.ts`
- Modify: `frontend/src/utils/shareCodec.ts:1-120`
- Modify: `frontend/src/components/common/ExportModal.tsx:40-80`
- Test: `frontend/src/tests/unit/contentSigning.test.ts`

**Interfaces:**
- Produces:
  - `signExportPayload(contentType: string, payload: Record<string, unknown>): Promise<ContentManifest | null>`: fetches HMAC signature from `/api/v1/content/sign`.
  - Embeds `manifest` into exported share link fragment `#import=` and downloaded JSON file.

- [ ] **Step 1: Write failing unit test for signing utility**

Create `frontend/src/tests/unit/contentSigning.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { signExportPayload } from '@/utils/contentSigning';

describe('signExportPayload', () => {
  it('calls /api/v1/content/sign and returns manifest', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content_hash: 'abc123',
        author_id: 42,
        author_login: 'testuser',
        signature: 'sig123',
        created_at: '2026-10-14T12:00:00Z',
      }),
    });

    const manifest = await signExportPayload('tier_list', { title: 'Test List' });
    expect(manifest).not.toBeNull();
    expect(manifest?.signature).toBe('sig123');
    expect(manifest?.author_id).toBe(42);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- contentSigning.test.ts`
Expected: FAIL with missing module `contentSigning`

- [ ] **Step 3: Implement `contentSigning.ts`**

Create `frontend/src/utils/contentSigning.ts`:
```typescript
// frontend/src/utils/contentSigning.ts
export interface ContentManifest {
  content_type: string;
  content_hash: string;
  author_id: number;
  author_login: string;
  signature: string;
  created_at: string;
}

export async function signExportPayload(
  contentType: string,
  payload: Record<string, unknown>
): Promise<ContentManifest | null> {
  try {
    const res = await fetch('/api/v1/content/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content_type: contentType, payload }),
    });
    if (!res.ok) return null;
    return (await res.json()) as ContentManifest;
  } catch {
    return null;
  }
}
```

Integrate into `frontend/src/utils/shareCodec.ts` and `frontend/src/components/common/ExportModal.tsx`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- contentSigning.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/contentSigning.ts frontend/src/tests/unit/contentSigning.test.ts frontend/src/utils/shareCodec.ts frontend/src/components/common/ExportModal.tsx
git commit -m "feat(moderation): integrate client content signing into export modal"
```

---

### Task 6: Frontend Report Content Modal & View Integration

**Files:**
- Create: `frontend/src/components/common/ReportContentModal.tsx`
- Modify: `frontend/src/components/tier-lists/CustomTierListView.tsx`
- Modify: `frontend/src/locales/en.json`, `pl.json`, `de.json`, `es.json`, `ja.json`
- Test: `frontend/src/tests/unit/ReportContentModal.test.tsx`

**Interfaces:**
- Produces:
  - `<ReportContentModal />`: Allows users to report custom lists with reasons (`hate_speech`, `harassment`, `explicit`, `illegal`, `other`).
  - Calls `POST /api/v1/content/reports`.

- [ ] **Step 1: Write failing test for ReportContentModal**

Create `frontend/src/tests/unit/ReportContentModal.test.tsx`:
```typescript
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReportContentModal } from '@/components/common/ReportContentModal';

describe('ReportContentModal', () => {
  it('renders modal with reasons and submits report', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ status: 'pending', message: 'Report created' }),
    });

    const onClose = vi.fn();
    render(
      <ReportContentModal
        isOpen
        onClose={onClose}
        contentType="tier_list"
        contentHash="a".repeat(64)
        authorId={42}
        authorLogin="badguy"
        signature="s".repeat(64)
        payload={{ title: 'Toxic List' }}
      />
    );

    expect(screen.getByText(/Zgłoś treść|Report Content/i)).toBeDefined();
    const submitBtn = screen.getByRole('button', { name: /Wyślij zgłoszenie|Submit Report/i });
    fireEvent.click(submitBtn);

    expect(global.fetch).toHaveBeenCalledWith('/api/v1/content/reports', expect.any(Object));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- ReportContentModal.test.tsx`
Expected: FAIL with missing component

- [ ] **Step 3: Implement ReportContentModal & add i18n keys**

Add i18n keys in `frontend/src/locales/en.json`, `pl.json`, `de.json`, `es.json`, `ja.json` under `moderation`:
- `reportTitle`, `reportSubtitle`, `reasonLabel`, `reasonHateSpeech`, `reasonHarassment`, `reasonExplicit`, `reasonIllegal`, `reasonOther`, `notesLabel`, `notesPlaceholder`, `submitReport`, `submitting`, `reportSuccess`, `reportAlreadyBanned`, `reportError`, `cancel`.

Implement `frontend/src/components/common/ReportContentModal.tsx` (< 200 lines, theme tokens, accessible touch targets).
Add "Report" flag button in `frontend/src/components/tier-lists/CustomTierListView.tsx`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- ReportContentModal.test.tsx`
Run: `npm run check` (ensuring 0 dead keys, full 5-language parity, <600 lines)
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/common/ReportContentModal.tsx frontend/src/components/tier-lists/CustomTierListView.tsx frontend/src/locales/*.json frontend/src/tests/unit/ReportContentModal.test.tsx
git commit -m "feat(moderation): add ReportContentModal with full i18n and custom tier list trigger"
```

---

### Task 7: Frontend LocalStorage Revocation Sync Hook

> **Superseded in part:** the storage keys and Vitest imports in the sample code below are wrong (see the Remediation Addendum). Import-time enforcement (item 5) was added on top of this hook.

**Files:**
- Create: `frontend/src/hooks/useContentRevocationSync.ts`
- Modify: `frontend/src/components/common/AppShell.tsx` (or layout provider)
- Test: `frontend/src/tests/unit/useContentRevocationSync.test.ts`

**Interfaces:**
- Produces:
  - `useContentRevocationSync()`: Collects local custom content hashes from `localStorage`, calls `/api/v1/content/revocations/check`, and removes revoked items.

- [ ] **Step 1: Write failing test for revocation sync hook**

Create `frontend/src/tests/unit/useContentRevocationSync.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkAndPurgeRevokedContent } from '@/hooks/useContentRevocationSync';

describe('checkAndPurgeRevokedContent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('purges banned tier list from localStorage', async () => {
    const bannedHash = 'b'.repeat(64);
    const validHash = 'c'.repeat(64);

    localStorage.setItem('tier_lists:custom:list1', JSON.stringify({
      id: 'list1',
      contentHash: bannedHash,
      title: 'Bad List',
    }));
    localStorage.setItem('tier_lists:custom:list2', JSON.stringify({
      id: 'list2',
      contentHash: validHash,
      title: 'Good List',
    }));

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ revoked_hashes: [bannedHash] }),
    });

    const purged = await checkAndPurgeRevokedContent();
    expect(purged).toEqual([bannedHash]);
    expect(localStorage.getItem('tier_lists:custom:list1')).toBeNull();
    expect(localStorage.getItem('tier_lists:custom:list2')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- useContentRevocationSync.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `useContentRevocationSync.ts`**

Create `frontend/src/hooks/useContentRevocationSync.ts`:
```typescript
// frontend/src/hooks/useContentRevocationSync.ts
import { useEffect } from 'react';

export async function checkAndPurgeRevokedContent(): Promise<string[]> {
  try {
    const hashesToKey = new Map<string, string>();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith('tier_lists:custom:') || key.startsWith('smash:custom:')) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const data = JSON.parse(raw);
          if (data && typeof data.contentHash === 'string' && data.contentHash.length === 64) {
            hashesToKey.set(data.contentHash, key);
          }
        } catch {}
      }
    }

    if (hashesToKey.size === 0) return [];

    const res = await fetch('/api/v1/content/revocations/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hashes: Array.from(hashesToKey.keys()) }),
    });

    if (!res.ok) return [];
    const data = (await res.json()) as { revoked_hashes: string[] };
    const purged: string[] = [];

    for (const hash of data.revoked_hashes || []) {
      const key = hashesToKey.get(hash);
      if (key) {
        localStorage.removeItem(key);
        purged.push(hash);
      }
    }

    return purged;
  } catch {
    return [];
  }
}

export function useContentRevocationSync() {
  useEffect(() => {
    checkAndPurgeRevokedContent().then((purged) => {
      if (purged.length > 0) {
        window.dispatchEvent(new CustomEvent('content-revoked', { detail: { count: purged.length } }));
      }
    });
  }, []);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- useContentRevocationSync.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useContentRevocationSync.ts frontend/src/tests/unit/useContentRevocationSync.test.ts
git commit -m "feat(moderation): implement client localStorage revocation sync hook"
```

---

### Task 8: Full Verification & Quality Assurance Gate

**Files:**
- None (verification phase across all layers)

- [ ] **Step 1: Run all backend tests**

Run: `cd backend && pytest tests/unit -q`
Expected: ALL PASS

- [ ] **Step 2: Run frontend code quality guards**

Run: `cd frontend && npm run check`
Expected: 72/72 PASS (0 dead i18n keys, full 5-language parity, no file > 600 lines)

- [ ] **Step 3: Run all frontend unit tests**

Run: `cd frontend && npm run test:unit`
Expected: 1140+ unit tests PASS

- [ ] **Step 4: Final commit**

```bash
git commit --allow-empty -m "chore(moderation): full test suite and guard verification complete"
```
