# backend/tests/unit/test_page_streak_helpers.py
from datetime import datetime, timezone

import pytest

from app.services.page_streak.helpers import to_utc_iso


@pytest.mark.unit
class TestToUtcIso:
    """Regression coverage for the "+00:00Z" malformed-timestamp bug."""

    def test_tz_aware_datetime_gets_a_single_z_suffix(self) -> None:
        value = datetime(2026, 9, 12, 17, 10, 39, 649000, tzinfo=timezone.utc)
        result = to_utc_iso(value)
        assert result == "2026-09-12T17:10:39.649000Z"
        assert "+00:00" not in result
        # Must be parseable by round-tripping through fromisoformat.
        datetime.fromisoformat(result.replace("Z", "+00:00"))

    def test_naive_datetime_gets_a_z_suffix_appended(self) -> None:
        value = datetime(2026, 9, 12, 17, 10, 39)
        assert to_utc_iso(value) == "2026-09-12T17:10:39Z"

    def test_none_passes_through(self) -> None:
        assert to_utc_iso(None) is None

    def test_string_already_ending_in_z_is_unchanged(self) -> None:
        assert to_utc_iso("2026-09-12T17:10:39Z") == "2026-09-12T17:10:39Z"
