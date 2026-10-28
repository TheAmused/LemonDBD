import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.exc import IntegrityError
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


def test_content_revocation_lifecycle(app):
    with app.app_context():
        author = User(
            login="revoked_author",
            username="Revoked Author",
            email="revoked@example.com",
            role="user",
        )
        admin = User(
            login="admin_user",
            username="Admin",
            email="admin@example.com",
            role="admin",
        )
        db.session.add_all([author, admin])
        db.session.commit()

        revocation = ContentRevocation(
            content_hash="b" * 64,
            content_type="tier_list",
            author_id=author.id,
            reason="copyright_infringement",
            revoked_by_id=admin.id,
        )
        db.session.add(revocation)
        db.session.commit()

        assert revocation.id is not None
        assert revocation.content_hash == "b" * 64
        assert revocation.created_at is not None

        reloaded = db.session.get(ContentRevocation, revocation.id)
        assert reloaded is not None
        assert reloaded.reason == "copyright_infringement"


def test_content_report_subscriber_uniqueness_and_cascade(app):
    with app.app_context():
        reporter = User(
            login="subscriber_user",
            username="Subscriber",
            email="sub@example.com",
            role="user",
        )
        db.session.add(reporter)
        db.session.commit()

        expires = datetime.now(timezone.utc) + timedelta(days=7)
        report = ContentReport(
            content_type="custom_tier_list",
            content_hash="c" * 64,
            author_login="anonymous_or_user",
            primary_reason="harassment",
            expires_at=expires,
        )
        db.session.add(report)
        db.session.commit()

        sub1 = ContentReportSubscriber(
            report_id=report.id,
            reporter_id=reporter.id,
            reason="harassment",
        )
        db.session.add(sub1)
        db.session.commit()

        # Duplicate reporter for same report should violate unique constraint
        sub_duplicate = ContentReportSubscriber(
            report_id=report.id,
            reporter_id=reporter.id,
            reason="spam",
        )
        db.session.add(sub_duplicate)
        with pytest.raises(IntegrityError):
            db.session.commit()
        db.session.rollback()

        # Cascade delete verification
        db.session.delete(report)
        db.session.commit()
        remaining_subs = db.session.query(ContentReportSubscriber).filter_by(report_id=report.id).all()
        assert len(remaining_subs) == 0


def test_content_moderation_models_to_dict(app):
    with app.app_context():
        expires = datetime.now(timezone.utc) + timedelta(days=1)
        report = ContentReport(
            content_type="tier_list",
            content_hash="d" * 64,
            author_login="someone",
            primary_reason="nsfw",
            expires_at=expires,
        )
        db.session.add(report)
        db.session.commit()

        sub = ContentReportSubscriber(
            report_id=report.id,
            reason="nsfw",
            notes="Not safe for work content",
        )
        db.session.add(sub)

        revocation = ContentRevocation(
            content_hash="e" * 64,
            content_type="tier_list",
            reason="nsfw",
        )
        db.session.add(revocation)
        db.session.commit()

        report_dict = report.to_dict()
        assert report_dict["id"] == report.id
        assert report_dict["content_hash"] == "d" * 64
        assert report_dict["report_count"] == 1
        assert report_dict["status"] == "pending"
        assert isinstance(report_dict["created_at"], str)
        assert isinstance(report_dict["expires_at"], str)

        sub_dict = sub.to_dict()
        assert sub_dict["id"] == sub.id
        assert sub_dict["report_id"] == report.id
        assert sub_dict["reason"] == "nsfw"
        assert sub_dict["notes"] == "Not safe for work content"

        rev_dict = revocation.to_dict()
        assert rev_dict["id"] == revocation.id
        assert rev_dict["content_hash"] == "e" * 64
        assert rev_dict["reason"] == "nsfw"
