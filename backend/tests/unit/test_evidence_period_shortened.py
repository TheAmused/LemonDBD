# backend/tests/unit/test_evidence_period_shortened.py
"""Shortening the evidence period in Settings applies to reports already waiting, not only new ones."""
from datetime import datetime, timedelta, timezone

import pytest

from app.core.extensions import db
from app.models.content_moderation import ContentReport
from app.services import site_settings
from app.services.content_moderation_service import purge_expired_evidence


def _report(age_days: int) -> ContentReport:
    created = datetime.now(timezone.utc) - timedelta(days=age_days)
    report = ContentReport(
        content_type="tier_list", content_hash=f"{age_days:064d}", author_login="", primary_reason="spam",
        status="pending", evidence_payload="{}", created_at=created, expires_at=created + timedelta(days=14),
    )
    db.session.add(report)
    db.session.commit()
    return report


@pytest.mark.unit
def test_a_shorter_period_wipes_evidence_that_was_stored_under_the_longer_one(db_session) -> None:
    old, fresh = _report(age_days=5), _report(age_days=1)
    assert purge_expired_evidence() == 0
    site_settings.update_settings({"content_evidence_days": 3})
    site_settings.invalidate_cache()
    assert purge_expired_evidence() == 1
    db.session.expire_all()
    assert (old.status, old.evidence_payload) == ("expired", None)
    assert fresh.status == "pending" and fresh.evidence_payload == "{}"
