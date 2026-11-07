# backend/tests/unit/core/test_errors.py
"""The status a route answers for a service's ValueError."""
import pytest

from app.core.errors import NotFoundError, value_error_status


@pytest.mark.unit
class TestValueErrorStatus:
    def test_a_not_found_error_is_a_404_whatever_its_message_says(self) -> None:
        assert value_error_status(NotFoundError("No such thing")) == 404

    def test_a_not_found_error_is_still_a_value_error(self) -> None:
        assert isinstance(NotFoundError("x"), ValueError)

    def test_an_older_message_that_says_not_found_stays_a_404(self) -> None:
        assert value_error_status(ValueError("Run not found")) == 404

    def test_any_other_value_error_is_a_400(self) -> None:
        assert value_error_status(ValueError("Result must be 'win' or 'loss'")) == 400
