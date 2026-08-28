# backend/tests/conftest.py
import os
import pytest


def pytest_configure(config: pytest.Config) -> None:
    """Configure custom pytest markers and test environment flags."""
    config.addinivalue_line("markers", "unit: mark test as isolated in-memory unit test")
    config.addinivalue_line("markers", "live: mark test as live database clone test")
    config.addinivalue_line("markers", "workflow: mark test as multi-step E2E workflow test")
